"use server";

import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { products, recipeItems } from "@/db/schema";
import { hitungHppProduk } from "@/server/hpp";
import { getOutletAktif } from "@/server/queries/dashboard";
import { getResepProduk } from "@/server/queries/resep";

export type HasilAksi = { ok: true } | { ok: false; error: string };

const ResepInput = z.object({
  productId: z.string().min(1),
  mode: z.enum(["manual", "resep"]),
  laborCost: z.coerce.number().int().min(0).default(0),
  overheadCost: z.coerce.number().int().min(0).default(0),
  item: z
    .array(
      z.object({
        materialId: z.string().min(1),
        qty: z.coerce.number().int().positive(),
      }),
    )
    .default([]),
});

/**
 * Menyimpan resep sekaligus menghitung ulang HPP produk.
 *
 * Hasil hitungnya ditulis ke kolom `products.cost` supaya POS, laporan laba,
 * dan snapshot penjualan tetap membaca satu tempat yang sama — tidak ada
 * jalur perhitungan kedua yang bisa berbeda hasilnya.
 */
export async function simpanResep(input: unknown): Promise<HasilAksi> {
  const parsed = ResepInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }
  const d = parsed.data;
  const outlet = await getOutletAktif();

  if (d.mode === "resep" && d.item.length === 0) {
    return {
      ok: false,
      error: "Tambahkan minimal satu bahan sebelum memakai HPP otomatis",
    };
  }

  try {
    db.transaction((tx) => {
      const p = tx
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.id, d.productId),
            eq(products.outletId, outlet.id),
          ),
        )
        .get();
      if (!p) throw new Error("Produk tidak ditemukan di outlet ini");

      tx.delete(recipeItems)
        .where(eq(recipeItems.productId, d.productId))
        .run();

      if (d.item.length > 0) {
        tx.insert(recipeItems)
          .values(
            d.item.map((i) => ({
              id: nanoid(),
              productId: d.productId,
              materialId: i.materialId,
              qty: i.qty,
            })),
          )
          .run();
      }

      tx.update(products)
        .set({
          hppMode: d.mode,
          laborCost: d.laborCost,
          overheadCost: d.overheadCost,
        })
        .where(eq(products.id, d.productId))
        .run();

      if (d.mode === "resep") {
        const hpp = hitungHppProduk(tx as never, d.productId);
        tx.run(sql`UPDATE products SET cost = ${hpp} WHERE id = ${d.productId}`);
      }
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Resep gagal disimpan",
    };
  }

  revalidatePath("/produk");
  revalidatePath("/produksi");
  revalidatePath("/kasir");
  revalidatePath("/");
  return { ok: true };
}

export async function ambilResep(productId: string) {
  const outlet = await getOutletAktif();
  const milik = db
    .select({ id: products.id })
    .from(products)
    .where(
      and(eq(products.id, productId), eq(products.outletId, outlet.id)),
    )
    .get();
  if (!milik) return null;
  return getResepProduk(productId);
}
