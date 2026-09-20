import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { categories, products } from "@/db/schema";

export type BarisPromo = {
  id: string;
  nama: string;
  tipe: "semua" | "produk" | "kategori";
  diskonBp: number;
  mulai: string;
  selesai: string | null;
  aktif: number;
  /** Nama produk/kategori sasaran, dipisah koma; null untuk tipe "semua". */
  sasaran: string | null;
  jumlahSasaran: number;
  /** Id sasaran dipisah koma — untuk mengisi ulang formulir saat diubah. */
  sasaranIds: string | null;
};

export async function getDaftarPromo(outletId: string): Promise<BarisPromo[]> {
  return db.all<BarisPromo>(sql`
    SELECT p.id, p.nama, p.tipe, p.diskon_bp AS diskonBp, p.mulai, p.selesai, p.aktif,
           (SELECT GROUP_CONCAT(nama, ', ') FROM (
              SELECT COALESCE(pr.name, k.name) AS nama
                FROM promo_targets t
                LEFT JOIN products pr ON pr.id = t.product_id
                LEFT JOIN categories k ON k.id = t.category_id
               WHERE t.promo_id = p.id
               ORDER BY nama
           )) AS sasaran,
           (SELECT COUNT(*) FROM promo_targets t WHERE t.promo_id = p.id) AS jumlahSasaran,
           (SELECT GROUP_CONCAT(COALESCE(t.product_id, t.category_id))
              FROM promo_targets t WHERE t.promo_id = p.id) AS sasaranIds
      FROM promos p
     WHERE p.outlet_id = ${outletId}
     ORDER BY p.aktif DESC, p.mulai DESC
  `);
}

export async function getPilihanPromo(outletId: string) {
  const [produk, kategori] = [
    db
      .select({ id: products.id, nama: products.name })
      .from(products)
      .where(and(eq(products.outletId, outletId), eq(products.isActive, 1)))
      .orderBy(asc(products.name))
      .all(),
    db
      .select({ id: categories.id, nama: categories.name })
      .from(categories)
      .where(eq(categories.outletId, outletId))
      .orderBy(asc(categories.sortOrder))
      .all(),
  ];
  return { produk, kategori };
}
