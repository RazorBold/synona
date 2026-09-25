import { and, eq } from "drizzle-orm";
import path from "node:path";

import { db } from "@/db";
import { pembayaranLangganan } from "@/db/schema";
import { sesiSaatIni } from "@/server/auth";
import {
  adminPlatform,
  bacaBerkasLangganan,
  bacaPengaturan,
  POLA_BERKAS_LANGGANAN,
} from "@/server/langganan";
import { getOutletAktif } from "@/server/queries/dashboard";

export const runtime = "nodejs";

const TIPE: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

/**
 * Gambar QRIS penerima dan bukti bayar langganan.
 * - QRIS: boleh dilihat siapa pun yang sudah masuk (pendaftar perlu memindainya).
 * - Bukti bayar: hanya pengelola platform dan pemilik tagihannya.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ nama: string }> },
) {
  const sesi = await sesiSaatIni();
  if (!sesi) return new Response("Tidak terautentikasi", { status: 401 });

  const { nama } = await params;
  if (!POLA_BERKAS_LANGGANAN.test(nama)) {
    return new Response("Nama berkas tidak sah", { status: 400 });
  }

  let boleh = nama === bacaPengaturan("qris_gambar") || adminPlatform(sesi);
  if (!boleh) {
    const outlet = await getOutletAktif().catch(() => null);
    boleh = Boolean(
      outlet &&
        db
          .select({ id: pembayaranLangganan.id })
          .from(pembayaranLangganan)
          .where(
            and(
              eq(pembayaranLangganan.bukti, nama),
              eq(pembayaranLangganan.userId, outlet.ownerId),
            ),
          )
          .get(),
    );
  }
  if (!boleh) return new Response("Tidak ditemukan", { status: 404 });

  const isi = await bacaBerkasLangganan(nama);
  if (!isi) return new Response("Tidak ditemukan", { status: 404 });

  return new Response(new Uint8Array(isi), {
    headers: {
      "Content-Type": TIPE[path.extname(nama).toLowerCase()] ?? "application/octet-stream",
      // Berisi data pribadi (bukti transfer): jangan disimpan cache bersama.
      "Cache-Control": "private, max-age=3600",
    },
  });
}
