"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { customers } from "@/db/schema";
import { normalisasiNomorHp } from "@/lib/wa";
import { wajibSesi } from "@/server/auth";
import { getOutletAktif } from "@/server/queries/dashboard";
import { getRiwayatPelanggan } from "@/server/queries/pelanggan";

export type HasilAksi = { ok: true } | { ok: false; error: string };

const PelangganInput = z.object({
  id: z.string().nullable().default(null),
  nama: z.string().trim().min(2, "Nama pelanggan minimal 2 huruf").max(80),
  phone: z.string().trim().max(24).nullable().default(null),
  catatan: z.string().trim().max(200).nullable().default(null),
});

export async function simpanPelanggan(input: unknown): Promise<HasilAksi> {
  await wajibSesi();
  const parsed = PelangganInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }
  const d = parsed.data;

  // Nomor disimpan dalam format 62xxx supaya tautan wa.me selalu jalan.
  const phone = d.phone ? normalisasiNomorHp(d.phone) : null;
  if (phone && phone.length < 9) {
    return { ok: false, error: "Nomor WhatsApp sepertinya belum lengkap" };
  }

  // TODO(langkah 5): ganti dengan requireOutlet() berbasis sesi.
  const outlet = await getOutletAktif();

  try {
    db.transaction((tx) => {
      if (phone) {
        // Nomor ganda bikin pengingat utang salah kirim, jadi ditolak lebih awal.
        const kembar = tx
          .select({ nama: customers.name })
          .from(customers)
          .where(
            and(
              eq(customers.outletId, outlet.id),
              eq(customers.phone, phone),
              eq(customers.isActive, 1),
              d.id ? ne(customers.id, d.id) : undefined,
            ),
          )
          .get();

        if (kembar) {
          throw new Error(`Nomor itu sudah dipakai ${kembar.nama}`);
        }
      }

      if (d.id) {
        const ada = tx
          .select({ id: customers.id })
          .from(customers)
          .where(
            and(eq(customers.id, d.id), eq(customers.outletId, outlet.id)),
          )
          .get();
        if (!ada) throw new Error("Pelanggan tidak ditemukan di outlet ini");

        tx.update(customers)
          .set({ name: d.nama, phone, note: d.catatan })
          .where(eq(customers.id, d.id))
          .run();
        return;
      }

      tx.insert(customers)
        .values({
          id: nanoid(),
          outletId: outlet.id,
          name: d.nama,
          phone,
          note: d.catatan,
        })
        .run();
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal menyimpan" };
  }

  revalidatePath("/pelanggan");
  revalidatePath("/kasir");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Pelanggan diarsipkan, bukan dihapus — transaksi dan kasbon lama menunjuk
 * ke barisnya. Pelanggan yang masih punya utang tidak boleh diarsipkan.
 */
export async function arsipkanPelanggan(id: string): Promise<HasilAksi> {
  await wajibSesi();
  const outlet = await getOutletAktif();

  try {
    db.transaction((tx) => {
      const sisa = tx.get<{ sisa: number }>(
        sql`SELECT COALESCE(SUM(remaining), 0) AS sisa FROM debts
             WHERE outlet_id = ${outlet.id} AND customer_id = ${id}
               AND status != 'paid'`,
      );

      if ((sisa?.sisa ?? 0) > 0) {
        throw new Error("Pelanggan masih punya utang belum lunas");
      }

      tx.update(customers)
        .set({ isActive: 0 })
        .where(and(eq(customers.id, id), eq(customers.outletId, outlet.id)))
        .run();
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal mengarsipkan" };
  }

  revalidatePath("/pelanggan");
  revalidatePath("/kasir");
  return { ok: true };
}

/** Riwayat belanja & utang satu pelanggan (dipakai di dialog detail). */
export async function ambilRiwayatPelanggan(customerId: string) {
  await wajibSesi();
  const outlet = await getOutletAktif();
  return getRiwayatPelanggan(outlet.id, customerId);
}
