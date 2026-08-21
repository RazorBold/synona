import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import type { SatuanBahan } from "@/lib/satuan";

export type BarisResep = {
  materialId: string;
  nama: string;
  satuan: SatuanBahan;
  qty: number;
  hargaMilli: number;
  biaya: number;
  stok: number;
};

export type ResepProduk = {
  productId: string;
  mode: "manual" | "resep";
  laborCost: number;
  overheadCost: number;
  cost: number;
  harga: number;
  item: BarisResep[];
  biayaBahan: number;
  hpp: number;
};

export async function getResepProduk(
  productId: string,
): Promise<ResepProduk | null> {
  const p = db.get<{
    id: string;
    mode: "manual" | "resep";
    labor: number;
    overhead: number;
    cost: number;
    price: number;
  }>(sql`
    SELECT id, hpp_mode AS mode, labor_cost AS labor,
           overhead_cost AS overhead, cost, price
      FROM products WHERE id = ${productId}
  `);
  if (!p) return null;

  const item = db.all<BarisResep>(sql`
    SELECT r.material_id           AS materialId,
           m.name                  AS nama,
           m.unit                  AS satuan,
           r.qty                   AS qty,
           m.cost_per_unit_milli   AS hargaMilli,
           CAST(ROUND(r.qty * m.cost_per_unit_milli / 1000.0) AS INTEGER) AS biaya,
           m.stock                 AS stok
      FROM recipe_items r
      JOIN materials m ON m.id = r.material_id
     WHERE r.product_id = ${productId}
     ORDER BY m.name COLLATE NOCASE
  `);

  const biayaBahan = item.reduce((a, i) => a + i.biaya, 0);

  return {
    productId: p.id,
    mode: p.mode,
    laborCost: p.labor,
    overheadCost: p.overhead,
    cost: p.cost,
    harga: p.price,
    item,
    biayaBahan,
    hpp: biayaBahan + p.labor + p.overhead,
  };
}

/** Produk yang punya resep — dipakai halaman Produksi. */
export async function getProdukBerresep(outletId: string) {
  return db.all<{
    id: string;
    nama: string;
    emoji: string | null;
    gambar: string | null;
    stok: number;
    unit: string;
    hpp: number;
    harga: number;
    jumlahBahan: number;
  }>(sql`
    SELECT p.id AS id, p.name AS nama, p.emoji AS emoji, p.image_url AS gambar,
           p.stock AS stok, p.unit AS unit, p.cost AS hpp, p.price AS harga,
           COUNT(r.id) AS jumlahBahan
      FROM products p
      JOIN recipe_items r ON r.product_id = p.id
     WHERE p.outlet_id = ${outletId} AND p.is_active = 1
     GROUP BY p.id
     ORDER BY p.name COLLATE NOCASE
  `);
}
