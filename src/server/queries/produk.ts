import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { categories, products, stockMovements } from "@/db/schema";

export type BarisProduk = {
  id: string;
  nama: string;
  emoji: string | null;
  gambar: string | null;
  sku: string | null;
  kategoriId: string | null;
  kategori: string | null;
  harga: number;
  modal: number;
  stok: number;
  batasStok: number;
  unit: string;
};

/** Semua produk aktif; penyaringan dilakukan di klien (jumlahnya kecil). */
export async function getDaftarProduk(outletId: string): Promise<BarisProduk[]> {
  return db
    .select({
      id: products.id,
      nama: products.name,
      emoji: products.emoji,
      gambar: products.imageUrl,
      sku: products.sku,
      kategoriId: products.categoryId,
      kategori: categories.name,
      harga: products.price,
      modal: products.cost,
      stok: products.stock,
      batasStok: products.lowStockThreshold,
      unit: products.unit,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.outletId, outletId), eq(products.isActive, 1)))
    .orderBy(asc(products.name))
    .all();
}

export async function getStatistikProduk(outletId: string) {
  const row = db.get<{
    jumlah: number;
    nilaiModal: number;
    nilaiJual: number;
    menipis: number;
    habis: number;
  }>(sql`
    SELECT COUNT(*) AS jumlah,
           COALESCE(SUM(cost * stock), 0) AS nilaiModal,
           COALESCE(SUM(price * stock), 0) AS nilaiJual,
           COALESCE(SUM(CASE WHEN stock > 0 AND stock <= low_stock_threshold THEN 1 ELSE 0 END), 0) AS menipis,
           COALESCE(SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END), 0) AS habis
      FROM products
     WHERE outlet_id = ${outletId} AND is_active = 1
  `);

  return {
    jumlah: row?.jumlah ?? 0,
    nilaiModal: row?.nilaiModal ?? 0,
    nilaiJual: row?.nilaiJual ?? 0,
    menipis: row?.menipis ?? 0,
    habis: row?.habis ?? 0,
  };
}

export type RiwayatStok = {
  id: string;
  tipe: "sale" | "purchase" | "production" | "adjustment" | "void";
  perubahan: number;
  stokAkhir: number;
  catatan: string | null;
  waktu: number;
};

/** Riwayat pergerakan stok satu produk — jawaban atas "kenapa stok berubah?". */
export async function getRiwayatStok(
  productId: string,
  batas = 8,
): Promise<RiwayatStok[]> {
  return db
    .select({
      id: stockMovements.id,
      tipe: stockMovements.type,
      perubahan: stockMovements.qtyChange,
      stokAkhir: stockMovements.stockAfter,
      catatan: stockMovements.note,
      waktu: stockMovements.createdAt,
    })
    .from(stockMovements)
    .where(eq(stockMovements.productId, productId))
    .orderBy(desc(stockMovements.createdAt))
    .limit(batas)
    .all();
}
