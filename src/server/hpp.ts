import "server-only";

import { sql } from "drizzle-orm";

/**
 * Mesin HPP (PRD-TEKNIS.md §16.5).
 *
 *   hpp = ROUND(S(qty_bahan x harga_milli) / 1000) + tenaga + overhead
 *
 * Pembulatan ke rupiah utuh hanya sekali di sini — harga bahan sendiri
 * disimpan dengan presisi x1.000 supaya bahan murah tidak jadi nol.
 */

type Tx = {
  get: <T>(q: unknown) => T | undefined;
  all: <T>(q: unknown) => T[];
  run: (q: unknown) => unknown;
};

export function hitungHppProduk(tx: Tx, productId: string): number {
  const row = tx.get<{
    milli: number;
    labor: number;
    overhead: number;
    mode: string;
    cost: number;
  }>(sql`
    SELECT COALESCE((SELECT SUM(r.qty * m.cost_per_unit_milli)
                       FROM recipe_items r
                       JOIN materials m ON m.id = r.material_id
                      WHERE r.product_id = p.id), 0) AS milli,
           p.labor_cost    AS labor,
           p.overhead_cost AS overhead,
           p.hpp_mode      AS mode,
           p.cost          AS cost
      FROM products p
     WHERE p.id = ${productId}
  `);

  if (!row) return 0;
  // Produk tanpa resep tetap memakai modal yang diketik manual.
  if (row.mode !== "resep") return row.cost;

  return Math.round(row.milli / 1000) + row.labor + row.overhead;
}

/**
 * Harga bahan berubah (mis. setelah pembelian) -> HPP semua produk yang
 * memakai bahan itu ikut diperbarui. Inilah yang membuat HPP "otomatis":
 * pemilik tidak perlu menghitung ulang sendiri.
 */
export function perbaruiHppTerkaitBahan(
  tx: Tx,
  outletId: string,
  materialIds: string[],
): number {
  if (materialIds.length === 0) return 0;

  const daftar = tx.all<{ id: string }>(sql`
    SELECT DISTINCT p.id AS id
      FROM products p
      JOIN recipe_items r ON r.product_id = p.id
     WHERE p.outlet_id = ${outletId}
       AND p.hpp_mode = 'resep'
       AND r.material_id IN (${sql.join(
         materialIds.map((m) => sql`${m}`),
         sql`, `,
       )})
  `);

  for (const p of daftar) {
    const hpp = hitungHppProduk(tx, p.id);
    tx.run(sql`UPDATE products SET cost = ${hpp} WHERE id = ${p.id}`);
  }

  return daftar.length;
}
