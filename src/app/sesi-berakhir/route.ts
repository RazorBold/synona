import { NextResponse, type NextRequest } from "next/server";

import { NAMA_COOKIE_SESI, RUTE_MASUK } from "@/lib/auth-const";
import { akunSesi, sesiSaatIni } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Jalan keluar dari sesi yang tokennya masih sah tapi akunnya sudah tidak ada
 * di database (kasir dihapus, DB dipulihkan dari backup, `db:reset`).
 *
 * Kenapa harus Route Handler dan bukan langsung di layout: Next tidak
 * mengizinkan cookie diubah saat merender Server Component. Tanpa penghapusan
 * cookie, layout mengalihkan ke /masuk, /masuk melihat token yang masih sah
 * lalu memantulkannya balik — dan pengguna terkunci dalam redirect tak
 * berujung tanpa bisa menekan tombol Keluar.
 */
export async function GET(req: NextRequest) {
  const sesi = await sesiSaatIni();

  /**
   * Sesi yang sehat tidak dibersihkan apa-apa.
   *
   * Ini bukan sekadar optimasi: tanpa penjagaan ini, rute GET ini menjadi
   * logout lewat URL, sehingga halaman lain cukup memasang <img src="…
   * /sesi-berakhir"> untuk mengeluarkan pengguna. Logout yang sesungguhnya
   * tetap lewat server action `keluar()` yang berbasis POST.
   */
  if (sesi && (await akunSesi(sesi))) {
    return NextResponse.redirect(asalPermintaan(req, "/"));
  }

  const res = NextResponse.redirect(asalPermintaan(req, RUTE_MASUK));
  res.cookies.delete(NAMA_COOKIE_SESI);
  return res;
}

/**
 * URL absolut berdasarkan Host yang diteruskan nginx — `req.nextUrl` memakai
 * origin proses (127.0.0.1:8029) yang tidak bisa dijangkau klien. Sama seperti
 * di src/middleware.ts.
 */
function asalPermintaan(req: NextRequest, path: string): URL {
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
    req.nextUrl.protocol.replace(":", "");
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  return new URL(path, `${proto}://${host}`);
}
