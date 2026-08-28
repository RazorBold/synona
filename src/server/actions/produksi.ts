"use server";

import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  materialMovements,
  materials,
  productions,
  products,
  recipeItems,
  stockMovements,
} from "@/db/schema";
import { businessDate } from "@/lib/date";
import { wajibSesi } from "@/server/auth";
import { getOutletAktif } from "@/server/queries/dashboard";
import { getKebutuhanBahan } from "@/server/queries/produksi";

export type HasilAksi =
  | { ok: true; hpp: number; total: number }
  | { ok: false; error: string };

const ProduksiInput = z.object({
  productId: z.string().min(1),
  qty: z.coerce.number().int().positive("Jumlah produksi harus lebih dari 0"),
  catatan: z.string().trim().max(200).nullable().default(null),
});

/**
 * Mencatat produksi: bahan baku berkurang sesuai resep, produk jadi
 * bertambah, dan HPP saat itu disimpan sebagai snapshot.
 *
 * Semua efek berada dalam satu transaksi — bahan yang sudah terpakai tanpa
 * produk yang bertambah (atau sebaliknya) adalah kerusakan data yang tidak
 * bisa diperbaiki otomatis.
 */
export async function catatProduksi(input: unknown): Promise<HasilAksi> {
  await wajibSesi();
  const parsed = ProduksiInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }
  const d = parsed.data;
  const outlet = await getOutletAktif();
  const waktu = Date.now();
  const tanggal = businessDate(new Date(), outlet.timezone);

  try {
    const hasil = db.transaction((tx) => {
      const p = tx
        .select()
        .from(products)
        .where(
          and(
            eq(products.id, d.productId),
            eq(products.outletId, outlet.id),
          ),
        )
        .get();
      if (!p) throw new Error("Produk tidak ditemukan di outlet ini");

      const resep = tx
        .select({
          materialId: recipeItems.materialId,
          qty: recipeItems.qty,
        })
        .from(recipeItems)
        .where(eq(recipeItems.productId, d.productId))
        .all();

      if (resep.length === 0) {
        throw new Error("Produk ini belum punya resep");
      }

      // Cek kecukupan SEMUA bahan lebih dulu, baru dikurangi. Kalau dicampur,
      // bahan pertama bisa terlanjur berkurang saat bahan kedua ternyata kurang.
      const dipakai: {
        id: string;
        nama: string;
        butuh: number;
        stok: number;
        hargaMilli: number;
      }[] = [];

      for (const r of resep) {
        const m = tx
          .select()
          .from(materials)
          .where(eq(materials.id, r.materialId))
          .get();
        if (!m) throw new Error("Ada bahan resep yang sudah dihapus");

        const butuh = r.qty * d.qty;
        if (m.stock < butuh) {
          throw new Error(
            `${m.name} kurang: butuh ${butuh} ${m.unit}, tersedia ${m.stock} ${m.unit}`,
          );
        }
        dipakai.push({
          id: m.id,
          nama: m.name,
          butuh,
          stok: m.stock,
          hargaMilli: m.costPerUnitMilli,
        });
      }

      const biayaBahanMilli = dipakai.reduce(
        (a, m) => a + (m.butuh / d.qty) * m.hargaMilli,
        0,
      );
      const hppPerUnit =
        Math.round(biayaBahanMilli / 1000) + p.laborCost + p.overheadCost;
      const totalBiaya = hppPerUnit * d.qty;

      const produksiId = nanoid();
      tx.insert(productions)
        .values({
          id: produksiId,
          outletId: outlet.id,
          productId: p.id,
          qty: d.qty,
          hppPerUnit,
          totalCost: totalBiaya,
          note: d.catatan,
          occurredAt: waktu,
          businessDate: tanggal,
        })
        .run();

      for (const m of dipakai) {
        const stokBaru = m.stok - m.butuh;
        tx.update(materials)
          .set({ stock: stokBaru })
          .where(eq(materials.id, m.id))
          .run();

        tx.insert(materialMovements)
          .values({
            id: nanoid(),
            outletId: outlet.id,
            materialId: m.id,
            type: "production",
            qtyChange: -m.butuh,
            stockAfter: stokBaru,
            costPerUnitMilli: m.hargaMilli,
            refId: produksiId,
            note: `Produksi ${p.name} x${d.qty}`,
          })
          .run();
      }

      const stokProdukBaru = p.stock + d.qty;
      tx.update(products)
        .set({ stock: stokProdukBaru, cost: hppPerUnit })
        .where(eq(products.id, p.id))
        .run();

      tx.insert(stockMovements)
        .values({
          id: nanoid(),
          outletId: outlet.id,
          productId: p.id,
          type: "production",
          qtyChange: d.qty,
          stockAfter: stokProdukBaru,
          refId: produksiId,
          note: `Hasil produksi (HPP ${hppPerUnit})`,
        })
        .run();

      return { hpp: hppPerUnit, total: totalBiaya };
    });

    revalidatePath("/produksi");
    revalidatePath("/produk");
    revalidatePath("/bahan");
    revalidatePath("/kasir");
    revalidatePath("/");

    return { ok: true, hpp: hasil.hpp, total: hasil.total };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Produksi gagal dicatat",
    };
  }
}

export async function ambilKebutuhanBahan(productId: string) {
  await wajibSesi();
  const outlet = await getOutletAktif();
  const milik = db.get<{ n: number }>(
    sql`SELECT COUNT(*) AS n FROM products
         WHERE id = ${productId} AND outlet_id = ${outlet.id}`,
  );
  if (!milik?.n) return [];
  return getKebutuhanBahan(productId);
}
