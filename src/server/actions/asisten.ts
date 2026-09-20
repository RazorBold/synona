"use server";

import { businessDate } from "@/lib/date";
import { wajibSesi } from "@/server/auth";
import { adaPertanyaan, jawab, type Jawaban } from "@/server/queries/asisten";
import { getOutletAktif } from "@/server/queries/dashboard";

/**
 * Menjawab satu pertanyaan asisten. Hanya membaca, jadi tetap bisa dipakai
 * saat langganan habis (aplikasi hanya-baca).
 */
export async function tanyaAsisten(
  kode: string,
): Promise<{ ok: true; jawaban: Jawaban } | { ok: false; error: string }> {
  await wajibSesi();
  const outlet = await getOutletAktif();
  // Kode dari klien dicocokkan ke daftar yang memang tersedia untuk jenis
  // usaha ini — bukan dipakai apa adanya untuk memilih query.
  if (!adaPertanyaan(String(kode), outlet.jenisUsaha)) {
    return { ok: false, error: "Pertanyaan itu tidak tersedia." };
  }
  const hariIni = businessDate(new Date(), outlet.timezone);
  return { ok: true, jawaban: await jawab(String(kode), outlet.id, hariIni, outlet.jenisUsaha) };
}
