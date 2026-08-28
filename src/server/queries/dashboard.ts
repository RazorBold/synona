import "server-only";

import { and, asc, eq, lte, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  customers,
  debts,
  outlets,
  products,
  users,
} from "@/db/schema";
import { businessDate, rentangHari, tambahHari } from "@/lib/date";
import { wajibSesi } from "@/server/auth";
import { getBebanHarianEfektif } from "@/server/queries/beban";
import { getRadar } from "@/server/queries/radar";

/**
 * Chokepoint data usaha: hampir semua query sensitif berangkat dari sini, jadi
 * di sinilah sesi diverifikasi sekali untuk seluruh pohon query. Melempar
 * kalau tidak ada sesi yang sah.
 *
 * CATATAN: outlet masih diambil dari outlet pertama di database. Aplikasi ini
 * baru punya satu outlet aktif; saat multi-outlet diaktifkan, ganti dengan
 * pemilihan berdasarkan keanggotaan `staff` milik `sesi.penggunaId` — lihat
 * PRD-TEKNIS.md §6.
 */
export async function getOutletAktif() {
  await wajibSesi();

  const row = db
    .select({
      id: outlets.id,
      name: outlets.name,
      timezone: outlets.timezone,
      ownerId: outlets.ownerId,
      ownerName: users.name,
      ownerPhone: users.phone,
      plan: users.plan,
      planEndsAt: users.planEndsAt,
    })
    .from(outlets)
    .innerJoin(users, eq(users.id, outlets.ownerId))
    .limit(1)
    .get();

  if (!row) throw new Error("Belum ada outlet. Jalankan `npm run db:seed`.");
  return row;
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
    getRadar(outlet.id, hariIni),
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
    // Laba bersih = laba kotor - beban hari itu (PRD-TEKNIS.md §16.5)
    labaBersih: ringkasan.laba - beban,
    labaBersihKemarin: ringkasanKemarin.laba - bebanKemarin,
  };
}
