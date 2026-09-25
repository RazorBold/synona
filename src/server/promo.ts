import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";

export type PromoBerlaku = {
  promoId: string;
  nama: string;
  diskonBp: number;
};

/**
 * Promo terbaik untuk tiap produk pada satu tanggal usaha.
 *
 * Dihitung sebagai satu query untuk seluruh outlet, bukan per produk:
 * layar kasir memuat ratusan produk sekaligus, dan satu query per produk
 * akan membuat halaman itu melambat persis saat toko sedang ramai.
 *
 * Produk bisa kena beberapa promo sekaligus (mis. "semua barang 5%" dan
 * "minyak goreng 10%"). Yang menang yang paling besar — diskon tidak
 * ditumpuk (lihat src/lib/diskon.ts).
 */
export function promoPerProduk(
  outletId: string,
  tanggal: string,
): Map<string, PromoBerlaku> {
  const rows = db.all<{ productId: string; promoId: string; nama: string; diskonBp: number }>(sql`
    WITH promo_aktif AS (
      SELECT id, nama, tipe, diskon_bp
        FROM promos
       WHERE outlet_id = ${outletId}
         AND aktif = 1
         AND mulai <= ${tanggal}
         AND (selesai IS NULL OR selesai >= ${tanggal})
    )
    SELECT p.id AS productId, pa.id AS promoId, pa.nama AS nama, pa.diskon_bp AS diskonBp
      FROM promo_aktif pa
      JOIN products p ON p.outlet_id = ${outletId} AND p.is_active = 1
     WHERE pa.tipe = 'semua'
        OR (pa.tipe = 'produk' AND EXISTS (
              SELECT 1 FROM promo_targets t
               WHERE t.promo_id = pa.id AND t.product_id = p.id))
        OR (pa.tipe = 'kategori' AND EXISTS (
              SELECT 1 FROM promo_targets t
               WHERE t.promo_id = pa.id AND t.category_id = p.category_id))
  `);

  const terbaik = new Map<string, PromoBerlaku>();
  for (const r of rows) {
    const ada = terbaik.get(r.productId);
    if (!ada || r.diskonBp > ada.diskonBp) {
      terbaik.set(r.productId, { promoId: r.promoId, nama: r.nama, diskonBp: r.diskonBp });
    }
  }
  return terbaik;
}
