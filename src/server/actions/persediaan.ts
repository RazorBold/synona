"use server";

import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  materialMovements,
  materials,
  payablePayments,
  purchaseItems,
  purchases,
} from "@/db/schema";
import { businessDate } from "@/lib/date";
import { perbaruiHppTerkaitBahan } from "@/server/hpp";
import { wajibSesi } from "@/server/auth";
import { getOutletAktif } from "@/server/queries/dashboard";
import { getRiwayatBahan } from "@/server/queries/persediaan";

export type HasilAksi = { ok: true } | { ok: false; error: string };

/* ----------------------------------------------------- bahan baku */

const BahanInput = z.object({
  id: z.string().nullable().default(null),
  nama: z.string().trim().min(2, "Nama bahan minimal 2 huruf").max(80),
  jenis: z.enum(["baku", "setengah_jadi", "jadi"]).default("baku"),
  satuan: z.enum(["g", "ml", "pcs"]),
  batasStok: z.coerce.number().int().min(0).default(0),
  stokAwal: z.coerce.number().int().min(0).default(0),
  hargaAwal: z.coerce.number().int().min(0).default(0),
});

export async function simpanBahan(input: unknown): Promise<HasilAksi> {
  await wajibSesi();
  const parsed = BahanInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }
  const d = parsed.data;
  const outlet = await getOutletAktif();

  try {
    db.transaction((tx) => {
      if (d.id) {
        const ada = tx
          .select({ id: materials.id })
          .from(materials)
          .where(
            and(eq(materials.id, d.id), eq(materials.outletId, outlet.id)),
          )
          .get();
        if (!ada) throw new Error("Bahan tidak ditemukan di outlet ini");

        // Stok & harga bahan hanya berubah lewat pembelian/penyesuaian,
        // supaya setiap perubahan punya jejak di material_movements.
        tx.update(materials)
          .set({
            name: d.nama,
            jenis: d.jenis,
            unit: d.satuan,
            lowStockThreshold: d.batasStok,
          })
          .where(eq(materials.id, d.id))
          .run();
        return;
      }

      const id = nanoid();
      // hargaAwal diisi per satuan besar (kg/liter/pcs) -> rupiah x1000 per
      // satuan terkecil kebetulan bernilai sama untuk g/ml (1 kg = 1000 g).
      const hargaMilli = d.satuan === "pcs" ? d.hargaAwal * 1000 : d.hargaAwal;

      tx.insert(materials)
        .values({
          id,
          outletId: outlet.id,
          name: d.nama,
          jenis: d.jenis,
          unit: d.satuan,
          stock: d.stokAwal,
          costPerUnitMilli: hargaMilli,
          lowStockThreshold: d.batasStok,
        })
        .run();

      if (d.stokAwal > 0) {
        tx.insert(materialMovements)
          .values({
            id: nanoid(),
            outletId: outlet.id,
            materialId: id,
            type: "purchase",
            qtyChange: d.stokAwal,
            stockAfter: d.stokAwal,
            costPerUnitMilli: hargaMilli,
            note: "Stok awal",
          })
          .run();
      }
    });
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidatePath("/persediaan");
  revalidatePath("/");
  return { ok: true };
}

const StokBahanInput = z.object({
  materialId: z.string().min(1),
  mode: z.enum(["masuk", "keluar", "opname"]),
  jumlah: z.coerce.number().int().min(0),
  catatan: z.string().trim().max(120).nullable().default(null),
});

export async function sesuaikanStokBahan(input: unknown): Promise<HasilAksi> {
  await wajibSesi();
  const parsed = StokBahanInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }
  const d = parsed.data;
  const outlet = await getOutletAktif();

  try {
    db.transaction((tx) => {
      const m = tx
        .select()
        .from(materials)
        .where(
          and(
            eq(materials.id, d.materialId),
            eq(materials.outletId, outlet.id),
          ),
        )
        .get();
      if (!m) throw new Error("Bahan tidak ditemukan di outlet ini");

      const stokBaru =
        d.mode === "opname"
          ? d.jumlah
          : d.mode === "masuk"
            ? m.stock + d.jumlah
            : m.stock - d.jumlah;

      if (stokBaru < 0) throw new Error(`Stok ${m.name} hanya ${m.stock}`);
      const selisih = stokBaru - m.stock;
      if (selisih === 0) throw new Error("Tidak ada perubahan stok");

      tx.update(materials)
        .set({ stock: stokBaru })
        .where(eq(materials.id, m.id))
        .run();

      tx.insert(materialMovements)
        .values({
          id: nanoid(),
          outletId: outlet.id,
          materialId: m.id,
          type: d.mode === "keluar" ? "waste" : "adjustment",
          qtyChange: selisih,
          stockAfter: stokBaru,
          costPerUnitMilli: m.costPerUnitMilli,
          note:
            d.catatan ??
            (d.mode === "masuk"
              ? "Penyesuaian tambah"
              : d.mode === "keluar"
                ? "Rusak / terbuang"
                : "Hasil opname"),
        })
        .run();
    });
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidatePath("/persediaan");
  revalidatePath("/");
  return { ok: true };
}

export async function arsipkanBahan(id: string): Promise<HasilAksi> {
  await wajibSesi();
  const outlet = await getOutletAktif();

  try {
    db.update(materials)
      .set({ isActive: 0 })
      .where(and(eq(materials.id, id), eq(materials.outletId, outlet.id)))
      .run();
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidatePath("/persediaan");
  return { ok: true };
}

export async function ambilRiwayatBahan(materialId: string) {
  await wajibSesi();
  const outlet = await getOutletAktif();
  const milik = db
    .select({ id: materials.id })
    .from(materials)
    .where(
      and(eq(materials.id, materialId), eq(materials.outletId, outlet.id)),
    )
    .get();
  if (!milik) return [];
  return getRiwayatBahan(materialId, 6);
}

function pesan(e: unknown): string {
  return e instanceof Error ? e.message : "Gagal menyimpan";
}
