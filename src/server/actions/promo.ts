"use server";

import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { categories, products, promos, promoTargets } from "@/db/schema";
import { BP_DISKON_MAKS } from "@/lib/diskon";
import { wajibSesi } from "@/server/auth";
import { getOutletMenulis } from "@/server/queries/dashboard";

type HasilAksi = { ok: true } | { ok: false; error: string };

const PromoInput = z.object({
  id: z.string().nullable().default(null),
  nama: z.string().trim().min(2, "Nama promo minimal 2 huruf").max(60),
  tipe: z.enum(["semua", "produk", "kategori"]),
  diskonBp: z
    .number()
    .int()
    .min(1, "Diskon harus lebih dari 0")
    .max(BP_DISKON_MAKS, "Diskon maksimal 90%"),
  mulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal mulai belum diisi"),
  selesai: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .default(null),
  aktif: z.boolean().default(true),
  /** Id produk (tipe "produk") atau kategori (tipe "kategori"). */
  sasaran: z.array(z.string().min(1)).max(200).default([]),
});

export async function simpanPromo(input: unknown): Promise<HasilAksi> {
  await wajibSesi();
  const parsed = PromoInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const d = parsed.data;
  if (d.selesai && d.selesai < d.mulai) {
    return { ok: false, error: "Tanggal selesai lebih awal dari tanggal mulai" };
  }
  if (d.tipe !== "semua" && d.sasaran.length === 0) {
    return {
      ok: false,
      error: d.tipe === "produk" ? "Pilih minimal satu produk" : "Pilih minimal satu kategori",
    };
  }

  const outlet = await getOutletMenulis();

  try {
    db.transaction((tx) => {
      /**
       * Sasaran diperiksa kepemilikannya: tanpa ini, id produk milik outlet
       * lain bisa dititipkan lewat pemanggilan server action langsung.
       */
      let sasaranSah: string[] = [];
      if (d.tipe === "produk") {
        sasaranSah = tx
          .select({ id: products.id })
          .from(products)
          .where(and(eq(products.outletId, outlet.id), inArray(products.id, d.sasaran)))
          .all()
          .map((r) => r.id);
      } else if (d.tipe === "kategori") {
        sasaranSah = tx
          .select({ id: categories.id })
          .from(categories)
          .where(and(eq(categories.outletId, outlet.id), inArray(categories.id, d.sasaran)))
          .all()
          .map((r) => r.id);
      }
      if (d.tipe !== "semua" && sasaranSah.length === 0) {
        throw new Error("Sasaran promo tidak ditemukan di outlet ini");
      }

      let promoId = d.id;
      if (promoId) {
        const ada = tx
          .select({ id: promos.id })
          .from(promos)
          .where(and(eq(promos.id, promoId), eq(promos.outletId, outlet.id)))
          .get();
        if (!ada) throw new Error("Promo tidak ditemukan di outlet ini");

        tx.update(promos)
          .set({
            nama: d.nama,
            tipe: d.tipe,
            diskonBp: d.diskonBp,
            mulai: d.mulai,
            selesai: d.selesai,
            aktif: d.aktif ? 1 : 0,
          })
          .where(eq(promos.id, promoId))
          .run();
        tx.delete(promoTargets).where(eq(promoTargets.promoId, promoId)).run();
      } else {
        promoId = nanoid();
        tx.insert(promos)
          .values({
            id: promoId,
            outletId: outlet.id,
            nama: d.nama,
            tipe: d.tipe,
            diskonBp: d.diskonBp,
            mulai: d.mulai,
            selesai: d.selesai,
            aktif: d.aktif ? 1 : 0,
          })
          .run();
      }

      if (sasaranSah.length > 0) {
        tx.insert(promoTargets)
          .values(
            sasaranSah.map((id) => ({
              id: nanoid(),
              promoId: promoId!,
              productId: d.tipe === "produk" ? id : null,
              categoryId: d.tipe === "kategori" ? id : null,
            })),
          )
          .run();
      }
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Promo gagal disimpan" };
  }

  revalidatePath("/promo");
  revalidatePath("/kasir");
  return { ok: true };
}

export async function ubahAktifPromo(id: string, aktif: boolean): Promise<HasilAksi> {
  try {
    const outlet = await getOutletMenulis();
    db.update(promos)
      .set({ aktif: aktif ? 1 : 0 })
      .where(and(eq(promos.id, String(id)), eq(promos.outletId, outlet.id)))
      .run();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal mengubah promo" };
  }
  revalidatePath("/promo");
  revalidatePath("/kasir");
  return { ok: true };
}

/**
 * Promo dihapus permanen — tidak seperti produk, tidak ada data lain yang
 * menunjuk ke barisnya. Potongan yang sudah terjadi tetap tersimpan di
 * transaksi masing-masing sebagai nilai rupiah.
 */
export async function hapusPromo(id: string): Promise<HasilAksi> {
  try {
    const outlet = await getOutletMenulis();
    db.delete(promos)
      .where(and(eq(promos.id, String(id)), eq(promos.outletId, outlet.id)))
      .run();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal menghapus promo" };
  }
  revalidatePath("/promo");
  revalidatePath("/kasir");
  return { ok: true };
}
