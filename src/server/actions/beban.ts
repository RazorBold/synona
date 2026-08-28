"use server";

import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { expenses } from "@/db/schema";
import { wajibSesi } from "@/server/auth";
import { getOutletAktif } from "@/server/queries/dashboard";

export type HasilAksi = { ok: true } | { ok: false; error: string };

const BebanInput = z.object({
  id: z.string().nullable().default(null),
  kategori: z.enum([
    "listrik",
    "gaji",
    "sewa",
    "internet",
    "transport",
    "lainnya",
  ]),
  nama: z.string().trim().min(2, "Nama beban minimal 2 huruf").max(80),
  jumlah: z.coerce.number().int().positive("Jumlah beban harus lebih dari 0"),
  metode: z.enum(["cash", "qris", "transfer", "other"]).default("cash"),
  berulang: z.boolean().default(false),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
  catatan: z.string().trim().max(200).nullable().default(null),
});

export async function simpanBeban(input: unknown): Promise<HasilAksi> {
  await wajibSesi();
  const parsed = BebanInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }
  const d = parsed.data;
  const outlet = await getOutletAktif();

  try {
    if (d.id) {
      const ada = db
        .select({ id: expenses.id })
        .from(expenses)
        .where(and(eq(expenses.id, d.id), eq(expenses.outletId, outlet.id)))
        .get();
      if (!ada) throw new Error("Beban tidak ditemukan di outlet ini");

      db.update(expenses)
        .set({
          category: d.kategori,
          name: d.nama,
          amount: d.jumlah,
          method: d.metode,
          berulang: d.berulang ? 1 : 0,
          businessDate: d.tanggal,
          note: d.catatan,
        })
        .where(eq(expenses.id, d.id))
        .run();
    } else {
      db.insert(expenses)
        .values({
          id: nanoid(),
          outletId: outlet.id,
          category: d.kategori,
          name: d.nama,
          amount: d.jumlah,
          method: d.metode,
          berulang: d.berulang ? 1 : 0,
          occurredAt: Date.now(),
          businessDate: d.tanggal,
          note: d.catatan,
          recordedBy: outlet.ownerId,
        })
        .run();
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Beban gagal disimpan",
    };
  }

  revalidatePath("/beban");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Beban boleh dihapus — berbeda dengan penjualan yang hanya bisa di-void.
 * Alasannya: salah ketik nominal beban itu lumrah, dan memaksa pemilik warung
 * membuat "jurnal koreksi" bertentangan dengan prinsip bahasa sehari-hari.
 */
export async function hapusBeban(id: string): Promise<HasilAksi> {
  await wajibSesi();
  const outlet = await getOutletAktif();

  try {
    db.delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.outletId, outlet.id)))
      .run();
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Beban gagal dihapus",
    };
  }

  revalidatePath("/beban");
  revalidatePath("/");
  return { ok: true };
}
