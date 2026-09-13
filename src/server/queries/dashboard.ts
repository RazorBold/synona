import "server-only";

import { and, asc, eq, lte, ne, sql } from "drizzle-orm";

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
import { businessDate, rentangHari, tambahHari } from "@/lib/date";
import { wajibSesi } from "@/server/auth";
import { getBebanHarianEfektif } from "@/server/queries/beban";
import { getRadar } from "@/server/queries/radar";
import { getPertanyaanCerdas } from "@/server/queries/tanya";

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
    .select({ userId: pengguna.userId })
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
    const milikSesi = db
      .select(KOLOM_OUTLET)
      .from(staff)
      .innerJoin(outlets, eq(outlets.id, staff.outletId))
      .innerJoin(users, eq(users.id, outlets.ownerId))
      .where(
        and(
          eq(staff.userId, akun.userId),
          eq(staff.isActive, 1),
          eq(outlets.isActive, 1),
        ),
      )
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
  (SELECT COALESCE(SUM((i.price_snapshot - i.cost_snapshot) * i.qty), 0)
     FROM transaction_items i
    WHERE i.transaction_id = tx.id) - tx.discount
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
    seriesPiutang,
    pembayaran,
    utang,
    jatuhTempo,
    stok,
    beban,
    bebanKemarin,
    radar,
    antrean,
    tanya,
  ] = await Promise.all([
    getRingkasanTanggal(outlet.id, hariIni),
    getRingkasanTanggal(outlet.id, kemarin),
    getSeriesHarian(outlet.id, hariIni, jumlahHari),
    getSeriesPiutang(outlet.id, hariIni, 7),
    getPembayaranTanggal(outlet.id, hariIni),
    getRingkasanUtang(outlet.id),
    getUtangJatuhTempo(outlet.id, 4),
    getStokMenipis(outlet.id, 4),
    getBebanHarianEfektif(outlet.id, hariIni),
    getBebanHarianEfektif(outlet.id, kemarin),
    getRadar(outlet.id, hariIni, outlet.jenisUsaha),
    getAntreanRingkas(outlet.id, hariIni),
    getPertanyaanCerdas(outlet.id, hariIni, outlet.jenisUsaha),
  ]);

  return {
    outlet,
    hariIni,
    jumlahHari,
    ringkasan,
    ringkasanKemarin,
    series,
    seriesPiutang,
    pembayaran,
    utang,
    jatuhTempo,
    stok,
    beban,
    bebanKemarin,
    radar,
    antrean,
    tanya,
    // Laba bersih = laba kotor - beban hari itu (PRD-TEKNIS.md §16.5)
    labaBersih: ringkasan.laba - beban,
    labaBersihKemarin: ringkasanKemarin.laba - bebanKemarin,
  };
}
