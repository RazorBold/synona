"use server";

import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { reconciliations } from "@/db/schema";
import { wajibSesi } from "@/server/auth";
import { getOutletAktif } from "@/server/queries/dashboard";
import { getRingkasanKas } from "@/server/queries/rekonsiliasi";

export type HasilAksi = { ok: true } | { ok: false; error: string };

const RekonInput = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
  kasFisik: z.coerce.number().int().min(0),
  qrisSettled: z.coerce.number().int().min(0),
  catatan: z.string().trim().max(300).nullable().default(null),
});

/**
 * Tutup buku harian.
 *
 * Angka "versi sistem" tidak diambil dari klien — dihitung ulang di server
 * dari transaksi hari itu. Kalau tidak, selisih kas bisa dimanipulasi hanya
 * dengan mengubah nilai di browser.
 */
export async function simpanRekonsiliasi(input: unknown): Promise<HasilAksi> {
  await wajibSesi();
  const parsed = RekonInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }
  const d = parsed.data;
  const outlet = await getOutletAktif();
  const sistem = await getRingkasanKas(outlet.id, d.tanggal);

  const selisihKas = d.kasFisik - sistem.kasSistem;
  const selisihQris = d.qrisSettled - sistem.qrisSistem;

  try {
    const ada = db
      .select({ id: reconciliations.id })
      .from(reconciliations)
      .where(
        and(
          eq(reconciliations.outletId, outlet.id),
          eq(reconciliations.businessDate, d.tanggal),
        ),
      )
      .get();

    const nilai = {
      cashSystem: sistem.kasSistem,
      cashPhysical: d.kasFisik,
      cashDiff: selisihKas,
      qrisSystem: sistem.qrisSistem,
      qrisSettled: d.qrisSettled,
      qrisDiff: selisihQris,
      note: d.catatan,
      approvedBy: outlet.ownerId,
      approvedAt: Date.now(),
    };

    if (ada) {
      db.update(reconciliations)
        .set(nilai)
        .where(eq(reconciliations.id, ada.id))
        .run();
    } else {
      db.insert(reconciliations)
        .values({
          id: nanoid(),
          outletId: outlet.id,
          businessDate: d.tanggal,
          ...nilai,
        })
        .run();
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Tutup buku gagal disimpan",
    };
  }

  revalidatePath("/rekonsiliasi");
  revalidatePath("/");
  return { ok: true };
}
