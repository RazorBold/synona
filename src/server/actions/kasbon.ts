"use server";

import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { customers, debtPayments, debts } from "@/db/schema";
import { getOutletAktif } from "@/server/queries/dashboard";
import { getRiwayatCicilan } from "@/server/queries/kasbon";

export type HasilAksi = { ok: true } | { ok: false; error: string };

const BayarInput = z.object({
  debtId: z.string().min(1),
  jumlah: z.coerce.number().int().positive("Jumlah bayar harus lebih dari 0"),
  metode: z.enum(["cash", "qris", "transfer", "other"]).default("cash"),
  catatan: z.string().trim().max(120).nullable().default(null),
});

/**
 * Mencatat cicilan atau pelunasan.
 *
 * Semua angka dihitung ulang dari baris utang di database — nilai sisa yang
 * dikirim klien tidak dipercaya, karena bisa saja sudah berubah (mis. kasir
 * lain baru menerima cicilan dari orang yang sama).
 */
export async function catatPembayaran(input: unknown): Promise<HasilAksi> {
  const parsed = BayarInput.safeParse(input);
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
      const utang = tx
        .select()
        .from(debts)
        .where(and(eq(debts.id, d.debtId), eq(debts.outletId, outlet.id)))
        .get();

      if (!utang) throw new Error("Utang tidak ditemukan di outlet ini");
      if (utang.status === "paid") throw new Error("Utang ini sudah lunas");
      if (d.jumlah > utang.remaining) {
        throw new Error(
          `Melebihi sisa utang (sisa Rp ${utang.remaining.toLocaleString("id-ID")})`,
        );
      }

      const dibayar = utang.paid + d.jumlah;
      const sisa = utang.amount - dibayar;

      tx.insert(debtPayments)
        .values({
          id: nanoid(),
          debtId: utang.id,
          amount: d.jumlah,
          method: d.metode,
          paidAt: Date.now(),
          note: d.catatan,
          recordedBy: outlet.ownerId,
        })
        .run();

      tx.update(debts)
        .set({
          paid: dibayar,
          remaining: sisa,
          status: sisa === 0 ? "paid" : "partial",
        })
        .where(eq(debts.id, utang.id))
        .run();
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Pembayaran gagal dicatat",
    };
  }

  revalidatePath("/kasbon");
  revalidatePath("/pelanggan");
  revalidatePath("/");
  return { ok: true };
}

const UtangInput = z.object({
  customerId: z.string().min(1, "Pilih pelanggan dulu"),
  jumlah: z.coerce.number().int().positive("Jumlah utang harus lebih dari 0"),
  jatuhTempo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .default(null),
});

/** Kasbon yang dicatat manual, bukan dari transaksi POS (mis. utang lama). */
export async function tambahUtang(input: unknown): Promise<HasilAksi> {
  const parsed = UtangInput.safeParse(input);
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
      const pelanggan = tx
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq(customers.id, d.customerId),
            eq(customers.outletId, outlet.id),
          ),
        )
        .get();
      if (!pelanggan) throw new Error("Pelanggan tidak ditemukan di outlet ini");

      tx.insert(debts)
        .values({
          id: nanoid(),
          outletId: outlet.id,
          customerId: d.customerId,
          amount: d.jumlah,
          paid: 0,
          remaining: d.jumlah,
          dueDate: d.jatuhTempo,
          status: "open",
        })
        .run();
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Utang gagal disimpan",
    };
  }

  revalidatePath("/kasbon");
  revalidatePath("/pelanggan");
  revalidatePath("/");
  return { ok: true };
}

/** Mengubah tanggal jatuh tempo (mis. pelanggan minta ditunda). */
export async function ubahJatuhTempo(
  debtId: string,
  jatuhTempo: string | null,
): Promise<HasilAksi> {
  const outlet = await getOutletAktif();

  if (jatuhTempo && !/^\d{4}-\d{2}-\d{2}$/.test(jatuhTempo)) {
    return { ok: false, error: "Tanggal tidak valid" };
  }

  try {
    db.update(debts)
      .set({ dueDate: jatuhTempo })
      .where(and(eq(debts.id, debtId), eq(debts.outletId, outlet.id)))
      .run();
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal mengubah jatuh tempo",
    };
  }

  revalidatePath("/kasbon");
  return { ok: true };
}

/** Riwayat cicilan satu utang (dipakai di dialog pembayaran). */
export async function ambilRiwayatCicilan(debtId: string) {
  const outlet = await getOutletAktif();

  const milikOutlet = db.get<{ n: number }>(
    sql`SELECT COUNT(*) AS n FROM debts
         WHERE id = ${debtId} AND outlet_id = ${outlet.id}`,
  );
  if (!milikOutlet?.n) return [];

  return getRiwayatCicilan(debtId);
}
