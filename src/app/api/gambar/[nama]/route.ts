import fs from "node:fs/promises";
import path from "node:path";

import { POLA_NAMA_GAMBAR } from "@/lib/gambar";
import { sesiSaatIni } from "@/server/auth";

// Membaca berkas dari disk — wajib runtime Node, bukan Edge.
export const runtime = "nodejs";

const DIR = process.env.UPLOAD_DIR ?? "./data/uploads/produk";

const TIPE: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

export async function GET(
  _req: Request,
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

  try {
    const berkas = await fs.readFile(path.join(DIR, nama));
    return new Response(new Uint8Array(berkas), {
      headers: {
        "Content-Type": TIPE[path.extname(nama).toLowerCase()] ?? "application/octet-stream",
        // Nama berkas unik per unggahan, jadi aman di-cache selamanya.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Gambar tidak ditemukan", { status: 404 });
  }
}
