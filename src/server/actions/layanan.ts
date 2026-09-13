"use server";

import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { services } from "@/db/schema";
import { wajibSesi } from "@/server/auth";
import { getOutletAktif } from "@/server/queries/dashboard";

export type HasilAksi = { ok: true } | { ok: false; error: string };

const LayananInput = z.object({
  id: z.string().nullable().default(null),
  nama: z.string().trim().min(2, "Nama layanan minimal 2 huruf").max(80),
  emoji: z.string().trim().max(8).nullable().default(null),
  kategoriId: z.string().nullable().default(null),
  harga: z.coerce.number().int().min(0, "Harga tidak boleh minus"),
  modal: z.coerce.number().int().min(0).default(0),
  satuan: z.enum(["pcs", "kg", "jam", "hari", "meter", "m2"]),
  hargaBisaDiubah: z.boolean().default(false),
  estimasiJam: z.coerce.number().int().min(0).max(24 * 90).default(0),
});

export async function simpanLayanan(input: unknown): Promise<HasilAksi> {
  await wajibSesi();
  const parsed = LayananInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }
  const d = parsed.data;
  const outlet = await getOutletAktif();

  if (d.modal > d.harga && !d.hargaBisaDiubah) {
    return {
      ok: false,
      error: "Biaya bahan lebih besar dari harga — layanan ini pasti rugi",
    };
  }

  try {
    const nilai = {
      name: d.nama,
      emoji: d.emoji,
      categoryId: d.kategoriId,
      price: d.harga,
      cost: d.modal,
      unit: d.satuan,
      hargaBisaDiubah: d.hargaBisaDiubah ? 1 : 0,
      estimasiJam: d.estimasiJam,
    };

    if (d.id) {
      const ada = db
        .select({ id: services.id })
        .from(services)
        .where(and(eq(services.id, d.id), eq(services.outletId, outlet.id)))
        .get();
      if (!ada) throw new Error("Layanan tidak ditemukan di outlet ini");

      db.update(services).set(nilai).where(eq(services.id, d.id)).run();
    } else {
      db.insert(services)
        .values({ id: nanoid(), outletId: outlet.id, ...nilai })
        .run();
    }
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidateLayanan();
  return { ok: true };
}

/**
 * Diarsipkan, bukan dihapus: pesanan lama masih menunjuk ke layanan ini lewat
 * `transaction_items.service_id`, dan menghapusnya membuat laporan per
 * layanan berlubang.
 */
export async function arsipkanLayanan(id: string): Promise<HasilAksi> {
  await wajibSesi();
  const outlet = await getOutletAktif();

  try {
    const dipakai = db.get<{ n: number }>(sql`
      SELECT COUNT(*) AS n FROM service_orders o
        JOIN transaction_items i ON i.transaction_id = o.transaction_id
       WHERE o.outlet_id = ${outlet.id} AND i.service_id = ${id}
         AND o.status IN ('masuk', 'dikerjakan', 'selesai')
    `);
    if ((dipakai?.n ?? 0) > 0) {
      throw new Error(
        "Masih ada pesanan berjalan yang memakai layanan ini. Selesaikan dulu.",
      );
    }

    db.update(services)
      .set({ isActive: 0 })
      .where(and(eq(services.id, id), eq(services.outletId, outlet.id)))
      .run();
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidateLayanan();
  return { ok: true };
}

function revalidateLayanan() {
  revalidatePath("/layanan");
  revalidatePath("/pesanan");
  revalidatePath("/");
}

function pesan(e: unknown): string {
  return e instanceof Error ? e.message : "Gagal menyimpan";
}
