import { z } from "zod";

import { NAMA_COOKIE_SESI } from "@/lib/auth-const";
import { bacaToken } from "@/lib/jwt";
import { HALAMAN_DILACAK } from "@/lib/trafik";
import { catatJejak } from "@/server/trafik";

/**
 * Penerima jejak dari pelacak halaman depan (src/components/trafik/pelacak.tsx).
 *
 * Endpoint ini PUBLIK — pengunjung halaman depan belum punya sesi — jadi
 * middleware sengaja melewatkannya. Konsekuensinya siapa pun bisa mengirim
 * jejak palsu; yang membatasinya:
 * - skema ketat + daftar halaman yang boleh (HALAMAN_DILACAK),
 * - jenis "daftar" TIDAK diterima dari sini (hanya dari server action),
 * - batas per IP di memori, dan penyaring bot sederhana.
 *
 * Yang sedang login (pemilik usaha, admin) tidak dihitung: yang mau diukur
 * adalah calon pelanggan, bukan orang yang sudah memakai Synona.
 *
 * Selalu menjawab 204 tanpa isi, termasuk saat menolak: pelacak tidak
 * membaca jawabannya, dan jawaban seragam tidak memberi petunjuk ke peniru.
 */

const JejakInput = z.object({
  pengunjung: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  kunjungan: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  jenis: z.enum(["lihat", "klik", "baca"]),
  halaman: z.enum(HALAMAN_DILACAK),
  target: z.string().trim().max(60).regex(/^[a-z0-9:_-]+$/).nullable().default(null),
  rujukan: z.string().trim().max(100).nullable().default(null),
  utmSource: z.string().trim().max(60).nullable().default(null),
  utmCampaign: z.string().trim().max(60).nullable().default(null),
  perangkat: z.enum(["hp", "tablet", "desktop"]).nullable().default(null),
});

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|curl|wget|python|axios|node-fetch/i;

/** Satu proses pm2 (fork) — peta di memori cukup, sama seperti rate limit login. */
const BATAS = 120;
const JENDELA_MS = 10 * 60 * 1000;
const globalForJejak = globalThis as unknown as {
  __synonaJejak?: Map<string, { jumlah: number; mulai: number }>;
};
const hitungan = (globalForJejak.__synonaJejak ??= new Map());

function lewatBatas(ip: string): boolean {
  const sekarang = Date.now();
  const j = hitungan.get(ip);
  if (!j || sekarang - j.mulai > JENDELA_MS) {
    // Bersihkan sesekali supaya petanya tidak tumbuh tanpa batas.
    if (hitungan.size > 5000) hitungan.clear();
    hitungan.set(ip, { jumlah: 1, mulai: sekarang });
    return false;
  }
  j.jumlah += 1;
  return j.jumlah > BATAS;
}

const KOSONG = () => new Response(null, { status: 204 });

export async function POST(req: Request) {
  if (BOT.test(req.headers.get("user-agent") ?? "")) return KOSONG();

  // IP hanya dipakai untuk membatasi laju, TIDAK disimpan.
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "tanpa-ip";
  if (lewatBatas(ip)) return KOSONG();

  const tokenSesi = req.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((c) => c.startsWith(`${NAMA_COOKIE_SESI}=`))
    ?.slice(NAMA_COOKIE_SESI.length + 1);
  if (tokenSesi && (await bacaToken(tokenSesi))) return KOSONG();

  // sendBeacon mengirim text/plain; dibaca sebagai teks lalu di-parse sendiri.
  const teks = await req.text();
  if (teks.length > 2000) return KOSONG();

  let mentah: unknown;
  try {
    mentah = JSON.parse(teks);
  } catch {
    return KOSONG();
  }

  const parsed = JejakInput.safeParse(mentah);
  if (!parsed.success) return KOSONG();

  try {
    catatJejak(parsed.data);
  } catch (e) {
    console.error("[trafik] gagal menyimpan jejak:", e);
  }
  return KOSONG();
}
