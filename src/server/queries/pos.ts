import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { categories, customers, products } from "@/db/schema";

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
};

export async function getProdukPos(outletId: string): Promise<ProdukPos[]> {
  return db
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
    })
    .from(customers)
    .where(and(eq(customers.outletId, outletId), eq(customers.isActive, 1)))
    .orderBy(asc(customers.name))
    .all();
}
