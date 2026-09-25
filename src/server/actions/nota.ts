"use server";

import type { DataNota } from "@/lib/nota";
import { wajibSesi } from "@/server/auth";
import { getNota } from "@/server/nota";
import { getOutletAktif } from "@/server/queries/dashboard";

/** Data nota untuk dicetak dari kasir — hanya transaksi milik outlet sesi. */
export async function ambilNota(
  id: string,
): Promise<{ ok: true; nota: DataNota } | { ok: false; error: string }> {
  await wajibSesi();
  if (typeof id !== "string" || !id) return { ok: false, error: "Nota tidak ditemukan" };
  const outlet = await getOutletAktif();
  const nota = getNota(id, outlet.id);
  return nota ? { ok: true, nota } : { ok: false, error: "Nota tidak ditemukan" };
}
