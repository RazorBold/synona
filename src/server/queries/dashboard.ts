import "server-only";

import { and, asc, eq, lte, ne, sql } from "drizzle-orm";

import { cookies } from "next/headers";

import { db } from "@/db";
import {
  customers,
  debts,
  outlets,
  pengguna,
  products,
  staff,
  users,
} from "@/db/schema";
import { NAMA_COOKIE_OUTLET } from "@/lib/auth-const";
import { businessDate, rentangHari, tambahHari } from "@/lib/date";
import { statusLangganan } from "@/lib/paket";
import { wajibSesi } from "@/server/auth";
import { getBebanHarianEfektif } from "@/server/queries/beban";

const KOLOM_OUTLET = {
  id: outlets.id,
  name: outlets.name,
  timezone: outlets.timezone,
  jenisUsaha: outlets.jenisUsaha,
  ownerId: outlets.ownerId,
  ownerName: users.name,
  ownerPhone: users.phone,
  plan: users.plan,
  planEndsAt: users.planEndsAt,
  trialEndsAt: users.trialEndsAt,
  wajibBayar: users.wajibBayar,
  qrisGambar: outlets.qrisGambar,
  pajakNama: outlets.pajakNama,
  pajakBp: outlets.pajakBp,
  pajakMode: outlets.pajakMode,
};

/**
 * Chokepoint data usaha: hampir semua query sensitif berangkat dari sini, jadi
 * di sinilah sesi diverifikasi sekali untuk seluruh pohon query. Melempar
 * kalau tidak ada sesi yang sah.
 *
 * Outletnya dipilih dari SESI, lewat jembatan `pengguna.user_id` → `staff` →
 * `outlets`. Ini yang membuat pendaftaran lebih dari satu usaha aman: tanpa
 * ini, siapa pun yang mendaftar akan mendarat di outlet pertama di database —
 * yaitu data milik orang lain.
 *
 * Akun lama yang belum punya `user_id` (mis. `admin` bawaan `npm run
 * auth:init`) jatuh ke outlet pertama, persis seperti perilaku sebelumnya,
 * supaya pemasangan yang sudah jalan tidak terkunci saat pembaruan ini
 * dipasang. Begitu akunnya ditautkan lewat Pengaturan → Outlet, ia ikut
 * memakai jalur sesi di atas.
 */
export async function getOutletAktif() {
  const sesi = await wajibSesi();

  const akun = db
    .select({ userId: pengguna.userId, peran: pengguna.peran })
    .from(pengguna)
    .where(eq(pengguna.id, sesi.penggunaId))
    .get();

  /**
   * Akun yang sudah tertaut HARUS lewat keanggotaan stafnya. Kalau
   * pencariannya gagal (stafnya dinonaktifkan, outletnya ditutup), yang benar
   * adalah melempar — BUKAN jatuh ke outlet pertama, karena outlet pertama
   * bisa jadi milik usaha orang lain.
   */
  if (akun?.userId) {
    const keanggotaan = and(
      eq(staff.userId, akun.userId),
      eq(staff.isActive, 1),
      eq(outlets.isActive, 1),
    );

    /**
     * Pemilik dengan beberapa outlet memilih outlet lewat cookie. Nilai
     * cookie tidak pernah dipercaya apa adanya: id itu hanya dipakai kalau
     * pengguna memang anggota aktif outlet tersebut (syarat `keanggotaan`
     * ikut di WHERE). Kasir tidak berpindah — cookie-nya diabaikan.
     */
    if (akun.peran === "pemilik") {
      const dipilih = (await cookies()).get(NAMA_COOKIE_OUTLET)?.value;
      if (dipilih) {
        const cocok = db
          .select(KOLOM_OUTLET)
          .from(staff)
          .innerJoin(outlets, eq(outlets.id, staff.outletId))
          .innerJoin(users, eq(users.id, outlets.ownerId))
          .where(and(keanggotaan, eq(outlets.id, dipilih)))
          .get();
        if (cocok) return cocok;
      }
    }

    // Urutan dibuat tetap (outlet tertua dulu) supaya outlet bawaan tidak
    // berganti-ganti mengikuti urutan baris di SQLite.
    const milikSesi = db
      .select(KOLOM_OUTLET)
      .from(staff)
      .innerJoin(outlets, eq(outlets.id, staff.outletId))
      .innerJoin(users, eq(users.id, outlets.ownerId))
      .where(keanggotaan)
      .orderBy(asc(outlets.createdAt))
      .limit(1)
      .get();

    if (!milikSesi) {
      throw new Error("Akun ini tidak terdaftar di outlet mana pun yang aktif.");
    }
    return milikSesi;
  }

  /**
   * Hanya akun warisan yang belum punya `user_id` sama sekali (mis. `admin`
   * bawaan `npm run auth:init`) yang memakai outlet pertama — persis
   * perilaku sebelum multi-usaha, supaya pemasangan lama tidak terkunci.
   */
  const warisan = db
    .select(KOLOM_OUTLET)
    .from(outlets)
    .innerJoin(users, eq(users.id, outlets.ownerId))
    .orderBy(asc(outlets.createdAt))
    .limit(1)
    .get();

  if (!warisan) throw new Error("Belum ada outlet. Jalankan `npm run db:seed`.");
  return warisan;
}

/**
 * `getOutletAktif()` untuk server action yang MENGUBAH data. Menolak kalau
 * langganan usaha ini belum aktif atau sudah habis — di situ aplikasinya
 * hanya-baca. Aksi yang cuma membaca tetap memakai `getOutletAktif()`.
 *
 * Yang diperiksa adalah langganan PEMILIK outlet, jadi kasirnya ikut
 * tertahan bersama pemiliknya.
 */
export async function getOutletMenulis() {
  const outlet = await getOutletAktif();
  const status = statusLangganan(outlet);
  if (status === "belum-aktif") {
    throw new Error("Langganan belum aktif. Buka halaman Langganan untuk mengaktifkannya.");
  }
  if (status === "habis") {
    throw new Error(
      "Masa coba/langganan sudah berakhir — data hanya bisa dilihat. Perpanjang di halaman Langganan untuk mencatat lagi.",
    );
  }
  return outlet;
}

/**
 * Outlet yang boleh dibuka akun sesi — untuk tombol pemindah outlet.
 * Kasir selalu mendapat daftar kosong: ia terkunci di outletnya.
 */
export async function getOutletSaya(): Promise<{ id: string; nama: string }[]> {
  const sesi = await wajibSesi();
  const akun = db
    .select({ userId: pengguna.userId, peran: pengguna.peran })
    .from(pengguna)
    .where(eq(pengguna.id, sesi.penggunaId))
    .get();
  if (!akun?.userId || akun.peran !== "pemilik") return [];

  return db
    .select({ id: outlets.id, nama: outlets.name })
    .from(staff)
    .innerJoin(outlets, eq(outlets.id, staff.outletId))
    .where(
      and(eq(staff.userId, akun.userId), eq(staff.isActive, 1), eq(outlets.isActive, 1)),
    )
    .orderBy(asc(outlets.createdAt))
    .all();
}

export type RingkasanHarian = {
  omzet: number;
  laba: number;
  jumlahTransaksi: number;
};

const RINGKASAN_KOSONG: RingkasanHarian = {
  omzet: 0,
  laba: 0,
  jumlahTransaksi: 0,
};

/**
 * Laba per transaksi dihitung dari snapshot harga & modal di item,
 * bukan dari harga produk saat ini (lihat PRD-TEKNIS.md §4.3).
 */
const labaExpr = sql`
  (SELECT COALESCE(SUM(i.line_total - i.cost_snapshot * i.qty), 0)
     FROM transaction_items i
    WHERE i.transaction_id = tx.id) - tx.discount
  - CASE WHEN tx.tax_mode = 'termasuk' THEN tx.tax_amount ELSE 0 END
`;

export async function getRingkasanTanggal(
  outletId: string,
  tanggal: string,
): Promise<RingkasanHarian> {
  const row = db
    .get<{ omzet: number; laba: number; jumlah: number }>(sql`
      SELECT COALESCE(SUM(tx.total), 0) AS omzet,
             COALESCE(SUM(${labaExpr}), 0) AS laba,
             COUNT(*) AS jumlah
        FROM transactions tx
       WHERE tx.outlet_id = ${outletId}
         AND tx.business_date = ${tanggal}
         AND tx.status != 'void'
    `);

  if (!row) return RINGKASAN_KOSONG;
  return {
    omzet: row.omzet ?? 0,
    laba: row.laba ?? 0,
    jumlahTransaksi: row.jumlah ?? 0,
  };
}

export type TitikGrafik = {
  tanggal: string;
  penjualan: number;
  laba: number;
  jumlah: number;
};

export async function getSeriesHarian(
  outletId: string,
  sampai: string,
  jumlahHari = 7,
): Promise<TitikGrafik[]> {
  const dari = tambahHari(sampai, -(jumlahHari - 1));

  const rows = db.all<TitikGrafik>(sql`
    SELECT tx.business_date AS tanggal,
           COALESCE(SUM(tx.total), 0) AS penjualan,
           COALESCE(SUM(${labaExpr}), 0) AS laba,
           COUNT(*) AS jumlah
      FROM transactions tx
     WHERE tx.outlet_id = ${outletId}
       AND tx.status != 'void'
       AND tx.business_date BETWEEN ${dari} AND ${sampai}
     GROUP BY tx.business_date
  `);

  const map = new Map(rows.map((r) => [r.tanggal, r]));
  // Hari tanpa transaksi harus tetap muncul sebagai 0, bukan hilang dari grafik.
  return rentangHari(sampai, jumlahHari).map((tanggal) => ({
    tanggal,
    penjualan: map.get(tanggal)?.penjualan ?? 0,
    laba: map.get(tanggal)?.laba ?? 0,
    jumlah: map.get(tanggal)?.jumlah ?? 0,
  }));
}

export type TitikUangMasuk = {
  tanggal: string;
  penjualan: number;
  cicilan: number;
  lain: number;
};

/**
 * Uang yang benar-benar masuk per hari — definisinya sama dengan `masuk` di
 * `getArusKas`: penjualan lunas + cicilan kasbon + pemasukan lain (modal,
 * pinjaman, hibah). Penjualan kasbon baru dihitung saat cicilannya dibayar.
 */
export async function getSeriesUangMasuk(
  outletId: string,
  sampai: string,
  jumlahHari: number,
  timezone: string,
): Promise<TitikUangMasuk[]> {
  const dari = tambahHari(sampai, -(jumlahHari - 1));

  const penjualan = db.all<{ tanggal: string; total: number }>(sql`
    SELECT business_date AS tanggal,
           COALESCE(SUM(total + CASE WHEN tax_mode = 'tambah' THEN tax_amount ELSE 0 END), 0) AS total
      FROM transactions
     WHERE outlet_id = ${outletId} AND status = 'paid'
       AND business_date BETWEEN ${dari} AND ${sampai}
     GROUP BY business_date
  `);

  const lain = db.all<{ tanggal: string; total: number }>(sql`
    SELECT business_date AS tanggal, COALESCE(SUM(amount), 0) AS total
      FROM other_incomes
     WHERE outlet_id = ${outletId}
       AND business_date BETWEEN ${dari} AND ${sampai}
     GROUP BY business_date
  `);

  // Cicilan hanya punya `paid_at`. Ambil dengan jendela sehari lebih lebar,
  // lalu kelompokkan per tanggal usaha di zona waktu outlet.
  const awal = new Date(`${tambahHari(dari, -1)}T00:00:00Z`).getTime();
  const akhir = new Date(`${tambahHari(sampai, 2)}T00:00:00Z`).getTime();
  const cicilanMentah = db.all<{ paidAt: number; amount: number }>(sql`
    SELECT p.paid_at AS paidAt, p.amount AS amount
      FROM debt_payments p
      JOIN debts d ON d.id = p.debt_id
     WHERE d.outlet_id = ${outletId}
       AND p.paid_at BETWEEN ${awal} AND ${akhir}
  `);

  const cicilan = new Map<string, number>();
  for (const c of cicilanMentah) {
    const tgl = businessDate(new Date(c.paidAt), timezone);
    cicilan.set(tgl, (cicilan.get(tgl) ?? 0) + c.amount);
  }

  const mapJual = new Map(penjualan.map((r) => [r.tanggal, r.total]));
  const mapLain = new Map(lain.map((r) => [r.tanggal, r.total]));
  return rentangHari(sampai, jumlahHari).map((tanggal) => ({
    tanggal,
    penjualan: mapJual.get(tanggal) ?? 0,
    cicilan: cicilan.get(tanggal) ?? 0,
    lain: mapLain.get(tanggal) ?? 0,
  }));
}

/**
 * Sisa piutang pada akhir tiap hari = utang yang sudah tercatat pada hari itu
 * dikurangi cicilan yang sudah masuk sampai hari itu. Dipakai untuk sparkline
 * kartu "Utang Belum Lunas".
 */
export async function getSeriesPiutang(
  outletId: string,
  sampai: string,
  jumlahHari = 7,
): Promise<number[]> {
  return rentangHari(sampai, jumlahHari).map((tanggal) => {
    const batas = new Date(`${tanggal}T23:59:59`).getTime();
    const row = db.get<{ sisa: number }>(sql`
      SELECT COALESCE(SUM(d.amount), 0) - COALESCE((
               SELECT SUM(p.amount) FROM debt_payments p
                JOIN debts dd ON dd.id = p.debt_id
               WHERE dd.outlet_id = ${outletId} AND p.paid_at <= ${batas}
             ), 0) AS sisa
        FROM debts d
       WHERE d.outlet_id = ${outletId} AND d.created_at <= ${batas}
    `);
    return row?.sisa ?? 0;
  });
}

export type BarisPembayaran = {
  metode: "cash" | "qris" | "transfer" | "other";
  total: number;
};

export async function getPembayaranTanggal(
  outletId: string,
  tanggal: string,
): Promise<BarisPembayaran[]> {
  return db.all<BarisPembayaran>(sql`
    SELECT payment_method AS metode, COALESCE(SUM(total), 0) AS total
      FROM transactions
     WHERE outlet_id = ${outletId}
       AND business_date = ${tanggal}
       AND status != 'void'
     GROUP BY payment_method
     ORDER BY total DESC
  `);
}

export async function getRingkasanUtang(outletId: string) {
  const total = db.get<{ sisa: number; jumlah: number }>(sql`
    SELECT COALESCE(SUM(remaining), 0) AS sisa, COUNT(DISTINCT customer_id) AS jumlah
      FROM debts
     WHERE outlet_id = ${outletId} AND status IN ('open','partial')
  `);

  return { sisa: total?.sisa ?? 0, jumlahPelanggan: total?.jumlah ?? 0 };
}

export type BarisUtang = {
  id: string;
  nama: string;
  phone: string | null;
  sisa: number;
  jatuhTempo: string | null;
};

export async function getUtangJatuhTempo(
  outletId: string,
  batas = 4,
): Promise<BarisUtang[]> {
  return db
    .select({
      id: debts.id,
      nama: customers.name,
      phone: customers.phone,
      sisa: debts.remaining,
      jatuhTempo: debts.dueDate,
    })
    .from(debts)
    .innerJoin(customers, eq(customers.id, debts.customerId))
    .where(
      and(
        eq(debts.outletId, outletId),
        ne(debts.status, "paid"),
      ),
    )
    .orderBy(asc(debts.dueDate))
    .limit(batas)
    .all();
}

export type BarisStok = {
  id: string;
  nama: string;
  emoji: string | null;
  gambar: string | null;
  stok: number;
  unit: string;
};

export async function getStokMenipis(outletId: string, batas = 4) {
  const daftar = db
    .select({
      id: products.id,
      nama: products.name,
      emoji: products.emoji,
      gambar: products.imageUrl,
      stok: products.stock,
      unit: products.unit,
    })
    .from(products)
    .where(
      and(
        eq(products.outletId, outletId),
        eq(products.isActive, 1),
        lte(products.stock, products.lowStockThreshold),
      ),
    )
    .orderBy(asc(products.stock))
    .all();

  return { daftar: daftar.slice(0, batas), total: daftar.length };
}

export type AntreanRingkas = {
  masuk: number;
  dikerjakan: number;
  selesai: number;
  telat: number;
  terdekat: {
    nomor: string;
    pelanggan: string | null;
    status: string;
    janjiSelesai: string | null;
  }[];
};

/**
 * Ringkasan papan antrean untuk dashboard usaha jasa — menggantikan kartu
 * "Stok Menipis" yang tidak berarti apa-apa kalau tidak ada barang.
 */
export async function getAntreanRingkas(
  outletId: string,
  hariIni: string,
): Promise<AntreanRingkas> {
  const row = db.get<{
    masuk: number;
    dikerjakan: number;
    selesai: number;
    telat: number;
  }>(sql`
    SELECT COALESCE(SUM(status = 'masuk'), 0)      AS masuk,
           COALESCE(SUM(status = 'dikerjakan'), 0) AS dikerjakan,
           COALESCE(SUM(status = 'selesai'), 0)    AS selesai,
           COALESCE(SUM(status IN ('masuk', 'dikerjakan')
                        AND janji_selesai IS NOT NULL
                        AND janji_selesai < ${hariIni}), 0) AS telat
      FROM service_orders
     WHERE outlet_id = ${outletId}
  `);

  const terdekat = db.all<{
    nomor: string;
    pelanggan: string | null;
    status: string;
    janjiSelesai: string | null;
  }>(sql`
    SELECT o.order_no AS nomor, c.name AS pelanggan, o.status AS status,
           o.janji_selesai AS janjiSelesai
      FROM service_orders o
      JOIN transactions t ON t.id = o.transaction_id
      LEFT JOIN customers c ON c.id = t.customer_id
     WHERE o.outlet_id = ${outletId} AND o.status IN ('masuk', 'dikerjakan')
     ORDER BY o.janji_selesai IS NULL, o.janji_selesai, o.occurred_at
     LIMIT 4
  `);

  return {
    masuk: row?.masuk ?? 0,
    dikerjakan: row?.dikerjakan ?? 0,
    selesai: row?.selesai ?? 0,
    telat: row?.telat ?? 0,
    terdekat,
  };
}

/** Semua data dashboard dalam satu pintu masuk. */
export async function getDataDashboard(jumlahHari = 7) {
  const outlet = await getOutletAktif();
  const hariIni = businessDate(new Date(), outlet.timezone);
  const kemarin = tambahHari(hariIni, -1);

  const [
    ringkasan,
    ringkasanKemarin,
    series,
    uangMasuk,
    seriesPiutang,
    pembayaran,
    utang,
    jatuhTempo,
    stok,
    beban,
    bebanKemarin,
    antrean,
  ] = await Promise.all([
    getRingkasanTanggal(outlet.id, hariIni),
    getRingkasanTanggal(outlet.id, kemarin),
    getSeriesHarian(outlet.id, hariIni, jumlahHari),
    getSeriesUangMasuk(outlet.id, hariIni, jumlahHari, outlet.timezone),
    getSeriesPiutang(outlet.id, hariIni, 7),
    getPembayaranTanggal(outlet.id, hariIni),
    getRingkasanUtang(outlet.id),
    getUtangJatuhTempo(outlet.id, 4),
    getStokMenipis(outlet.id, 4),
    getBebanHarianEfektif(outlet.id, hariIni),
    getBebanHarianEfektif(outlet.id, kemarin),
    getAntreanRingkas(outlet.id, hariIni),
  ]);

  return {
    outlet,
    hariIni,
    jumlahHari,
    ringkasan,
    ringkasanKemarin,
    series,
    uangMasuk,
    seriesPiutang,
    pembayaran,
    utang,
    jatuhTempo,
    stok,
    beban,
    bebanKemarin,
    antrean,
    // Laba bersih = laba kotor - beban hari itu (PRD-TEKNIS.md §16.5)
    labaBersih: ringkasan.laba - beban,
    labaBersihKemarin: ringkasanKemarin.laba - bebanKemarin,
  };
}
