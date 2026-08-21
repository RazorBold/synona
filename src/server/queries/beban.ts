import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";

export type KategoriBeban =
  | "listrik"
  | "gaji"
  | "sewa"
  | "internet"
  | "transport"
  | "lainnya";

export type BarisBeban = {
  id: string;
  kategori: KategoriBeban;
  nama: string;
  jumlah: number;
  metode: string;
  berulang: number;
  tanggal: string;
  waktu: number;
  catatan: string | null;
};

/** Beban dalam rentang tanggal bisnis (inklusif). */
export async function getDaftarBeban(
  outletId: string,
  dari: string,
  sampai: string,
): Promise<BarisBeban[]> {
  return db.all<BarisBeban>(sql`
    SELECT id, category AS kategori, name AS nama, amount AS jumlah,
           method AS metode, berulang, business_date AS tanggal,
           occurred_at AS waktu, note AS catatan
      FROM expenses
     WHERE outlet_id = ${outletId}
       AND business_date BETWEEN ${dari} AND ${sampai}
     ORDER BY occurred_at DESC
  `);
}

/**
 * Beban yang wajar dibebankan ke SATU hari.
 *
 * Gaji dan sewa dibayar sebulan sekali. Kalau nominal penuhnya dipotong dari
 * laba hari pembayaran, hari itu seolah rugi besar dan hari lain seolah untung
 * besar — padahal usahanya biasa saja. Karena itu beban bertanda "rutin"
 * disebar rata ke seluruh hari dalam bulan berjalan, sementara beban tidak
 * rutin dibebankan pada tanggalnya sendiri. Cara yang sama dipakai rumus BEP
 * di PRD-TEKNIS.md §16.5.
 */
export async function getBebanHarianEfektif(
  outletId: string,
  tanggal: string,
): Promise<number> {
  const bulan = tanggal.slice(0, 7);
  const hariDalamBulan = new Date(
    Number(bulan.slice(0, 4)),
    Number(bulan.slice(5, 7)),
    0,
  ).getDate();

  const row = db.get<{ harian: number; rutin: number }>(sql`
    SELECT COALESCE(SUM(CASE WHEN berulang = 0 AND business_date = ${tanggal}
                             THEN amount ELSE 0 END), 0) AS harian,
           COALESCE(SUM(CASE WHEN berulang = 1 AND substr(business_date, 1, 7) = ${bulan}
                             THEN amount ELSE 0 END), 0) AS rutin
      FROM expenses
     WHERE outlet_id = ${outletId}
  `);

  return (row?.harian ?? 0) + Math.round((row?.rutin ?? 0) / hariDalamBulan);
}

export async function getStatistikBeban(
  outletId: string,
  dari: string,
  sampai: string,
) {
  const ringkas = db.get<{ total: number; jumlah: number; rutin: number }>(sql`
    SELECT COALESCE(SUM(amount), 0) AS total,
           COUNT(*) AS jumlah,
           COALESCE(SUM(CASE WHEN berulang = 1 THEN amount ELSE 0 END), 0) AS rutin
      FROM expenses
     WHERE outlet_id = ${outletId} AND business_date BETWEEN ${dari} AND ${sampai}
  `);

  const perKategori = db.all<{ kategori: KategoriBeban; total: number }>(sql`
    SELECT category AS kategori, COALESCE(SUM(amount), 0) AS total
      FROM expenses
     WHERE outlet_id = ${outletId} AND business_date BETWEEN ${dari} AND ${sampai}
     GROUP BY category
     ORDER BY total DESC
  `);

  // Laba kotor periode yang sama, supaya laba bersih bisa ditampilkan utuh.
  const labaKotor = db.get<{ omzet: number; laba: number }>(sql`
    SELECT COALESCE(SUM(tx.total), 0) AS omzet,
           COALESCE(SUM(
             (SELECT COALESCE(SUM((i.price_snapshot - i.cost_snapshot) * i.qty), 0)
                FROM transaction_items i WHERE i.transaction_id = tx.id) - tx.discount
           ), 0) AS laba
      FROM transactions tx
     WHERE tx.outlet_id = ${outletId}
       AND tx.status != 'void'
       AND tx.business_date BETWEEN ${dari} AND ${sampai}
  `);

  const total = ringkas?.total ?? 0;
  const kotor = labaKotor?.laba ?? 0;

  return {
    total,
    jumlah: ringkas?.jumlah ?? 0,
    rutin: ringkas?.rutin ?? 0,
    perKategori,
    omzet: labaKotor?.omzet ?? 0,
    labaKotor: kotor,
    labaBersih: kotor - total,
  };
}
