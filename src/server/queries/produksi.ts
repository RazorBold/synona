import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import type { SatuanBahan } from "@/lib/satuan";

export type ProdukProduksi = {
  id: string;
  nama: string;
  emoji: string | null;
  gambar: string | null;
  stok: number;
  unit: string;
  hpp: number;
  harga: number;
  jumlahBahan: number;
  maksBisaDibuat: number;
};

/**
 * Produk yang punya resep, lengkap dengan berapa banyak yang masih bisa
 * dibuat dari stok bahan yang ada sekarang (bahan paling sedikit yang
 * menentukan).
 */
export async function getProdukProduksi(
  outletId: string,
): Promise<ProdukProduksi[]> {
  return db.all<ProdukProduksi>(sql`
    SELECT p.id AS id, p.name AS nama, p.emoji AS emoji, p.image_url AS gambar,
           p.stock AS stok, p.unit AS unit, p.cost AS hpp, p.price AS harga,
           COUNT(r.id) AS jumlahBahan,
           COALESCE(MIN(CAST(m.stock / NULLIF(r.qty, 0) AS INTEGER)), 0) AS maksBisaDibuat
      FROM products p
      JOIN recipe_items r ON r.product_id = p.id
      JOIN materials m ON m.id = r.material_id
     WHERE p.outlet_id = ${outletId} AND p.is_active = 1
     GROUP BY p.id
     ORDER BY p.name COLLATE NOCASE
  `);
}

export type KebutuhanBahan = {
  materialId: string;
  nama: string;
  satuan: SatuanBahan;
  qtyPerUnit: number;
  stok: number;
};

export async function getKebutuhanBahan(
  productId: string,
): Promise<KebutuhanBahan[]> {
  return db.all<KebutuhanBahan>(sql`
    SELECT r.material_id AS materialId, m.name AS nama, m.unit AS satuan,
           r.qty AS qtyPerUnit, m.stock AS stok
      FROM recipe_items r
      JOIN materials m ON m.id = r.material_id
     WHERE r.product_id = ${productId}
     ORDER BY m.name COLLATE NOCASE
  `);
}

export type BarisProduksi = {
  id: string;
  produk: string;
  qty: number;
  hppPerUnit: number;
  totalBiaya: number;
  catatan: string | null;
  tanggal: string;
  waktu: number;
};

export async function getRiwayatProduksi(
  outletId: string,
  batas = 20,
): Promise<BarisProduksi[]> {
  return db.all<BarisProduksi>(sql`
    SELECT pr.id AS id, p.name AS produk, pr.qty AS qty,
           pr.hpp_per_unit AS hppPerUnit, pr.total_cost AS totalBiaya,
           pr.note AS catatan, pr.business_date AS tanggal,
           pr.occurred_at AS waktu
      FROM productions pr
      JOIN products p ON p.id = pr.product_id
     WHERE pr.outlet_id = ${outletId}
     ORDER BY pr.occurred_at DESC
     LIMIT ${batas}
  `);
}

export async function getStatistikProduksi(outletId: string, bulan: string) {
  const row = db.get<{ batch: number; unit: number; biaya: number }>(sql`
    SELECT COUNT(*) AS batch,
           COALESCE(SUM(qty), 0) AS unit,
           COALESCE(SUM(total_cost), 0) AS biaya
      FROM productions
     WHERE outlet_id = ${outletId} AND substr(business_date, 1, 7) = ${bulan}
  `);
  return {
    batch: row?.batch ?? 0,
    unit: row?.unit ?? 0,
    biaya: row?.biaya ?? 0,
  };
}
