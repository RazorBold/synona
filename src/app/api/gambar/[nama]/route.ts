import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { LEBAR_THUMBNAIL, POLA_NAMA_GAMBAR, type LebarThumbnail } from "@/lib/gambar";
import { sesiSaatIni } from "@/server/auth";

// Membaca berkas dari disk — wajib runtime Node, bukan Edge.
export const runtime = "nodejs";

const DIR = process.env.UPLOAD_DIR ?? "./data/uploads/produk";
const DIR_CACHE = path.join(DIR, "kecil");

const TIPE: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

/**
 * Membuat (sekali) lalu memakai ulang versi kecil sebuah foto.
 *
 * Hasilnya disimpan di disk, bukan di memori: proses Next bisa restart kapan
 * saja, dan resize ulang tiap permintaan akan membuat halaman POS dengan
 * ratusan produk membebani CPU server yang sama dengan yang melayani kasir.
 */
async function versiKecil(nama: string, lebar: LebarThumbnail): Promise<Buffer | null> {
  const tujuan = path.join(DIR_CACHE, `${lebar}-${nama.replace(/\.[^.]+$/, "")}.webp`);
  const sudahAda = await fs.readFile(tujuan).catch(() => null);
  if (sudahAda) return sudahAda;

  const asli = await fs.readFile(path.join(DIR, nama)).catch(() => null);
  if (!asli) return null;

  const kecil = await sharp(asli)
    // withoutEnlargement: foto yang sudah lebih kecil tidak diperbesar —
    // memperbesar hanya menambah byte tanpa menambah detail.
    .resize({ width: lebar, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();

  await fs.mkdir(DIR_CACHE, { recursive: true });
  await fs.writeFile(tujuan, kecil).catch(() => {});
  return kecil;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ nama: string }> },
) {
  // Foto produk ikut data usaha — middleware sudah menyaring, ini lapisan
  // keduanya (middleware hanya melihat ada-tidaknya cookie).
  if (!(await sesiSaatIni())) {
    return new Response("Tidak terautentikasi", { status: 401 });
  }

  const { nama } = await params;

  // Penjagaan path traversal: hanya nama hasil nanoid + ekstensi yang lolos.
  if (!POLA_NAMA_GAMBAR.test(nama)) {
    return new Response("Nama berkas tidak sah", { status: 400 });
  }

  const diminta = Number(new URL(req.url).searchParams.get("l"));
  const lebar = LEBAR_THUMBNAIL.find((l) => l === diminta) ?? null;

  try {
    const isi = lebar
      ? await versiKecil(nama, lebar)
      : await fs.readFile(path.join(DIR, nama));
    if (!isi) return new Response("Gambar tidak ditemukan", { status: 404 });

    return new Response(new Uint8Array(isi), {
      headers: {
        "Content-Type": lebar
          ? "image/webp"
          : TIPE[path.extname(nama).toLowerCase()] ?? "application/octet-stream",
        // Nama berkas unik per unggahan, jadi aman di-cache selamanya.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Gambar tidak ditemukan", { status: 404 });
  }
}
