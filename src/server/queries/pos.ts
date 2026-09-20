import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { categories, customers, products } from "@/db/schema";
import { promoPerProduk } from "@/server/promo";

export type ProdukPos = {
  id: string;
  nama: string;
  emoji: string | null;
  gambar: string | null;
  harga: number;
  stok: number;
  lacakStok: number;
  unit: string;
  batasStok: number;
  kategoriId: string | null;
  /** Diskon promo yang sedang berjalan untuk produk ini (basis poin). */
  promoBp: number;
  promoNama: string | null;
};

export async function getProdukPos(
  outletId: string,
  tanggal: string,
): Promise<ProdukPos[]> {
  const promo = promoPerProduk(outletId, tanggal);
  const baris = db
    .select({
      id: products.id,
      nama: products.name,
      emoji: products.emoji,
      gambar: products.imageUrl,
      harga: products.price,
      stok: products.stock,
      lacakStok: products.lacakStok,
      unit: products.unit,
      batasStok: products.lowStockThreshold,
      kategoriId: products.categoryId,
    })
    .from(products)
    .where(and(eq(products.outletId, outletId), eq(products.isActive, 1)))
    .orderBy(asc(products.name))
    .all();

  return baris.map((p) => ({
    ...p,
    promoBp: promo.get(p.id)?.diskonBp ?? 0,
    promoNama: promo.get(p.id)?.nama ?? null,
  }));
}

export async function getKategoriPos(outletId: string) {
  return db
    .select({ id: categories.id, nama: categories.name })
    .from(categories)
    .where(eq(categories.outletId, outletId))
    .orderBy(asc(categories.sortOrder))
    .all();
}

export async function getPelangganPos(outletId: string) {
  return db
    .select({
      id: customers.id,
      nama: customers.name,
      phone: customers.phone,
      diskonBp: customers.diskonBp,
    })
    .from(customers)
    .where(and(eq(customers.outletId, outletId), eq(customers.isActive, 1)))
    .orderBy(asc(customers.name))
    .all();
}
