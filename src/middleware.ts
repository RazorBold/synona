import { NextResponse, type NextRequest } from "next/server";

import { NAMA_COOKIE_SESI, RUTE_MASUK } from "@/lib/auth-const";
import { bacaToken } from "@/lib/jwt";

/**
 * Lapisan pertama: memblokir navigasi tanpa JWT sesi yang sah.
 *
 * Middleware berjalan di Edge Runtime, jadi ia tidak bisa membuka SQLite —
 * tapi karena sesinya JWT, tanda tangannya tetap bisa diverifikasi penuh di
 * sini lewat `jose`. Yang TIDAK bisa dicek di sini adalah keadaan terkini
 * pengguna di database (mis. akunnya sudah dihapus), jadi `wajibSesi()` di
 * setiap server action tetap wajib. Jangan pernah menjadikan middleware ini
 * satu-satunya penjaga.
 */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname === RUTE_MASUK) return NextResponse.next();

  /**
   * Aset statis di public/ (bg.png, ikon) harus tetap termuat di halaman
   * /masuk. Rute di bawah /api/ TIDAK pernah dihitung sebagai aset statis
   * meski namanya berakhiran .webp — `/api/gambar/<id>.webp` adalah foto
   * produk dan ikut dilindungi.
   */
  if (!pathname.startsWith("/api/") && /\.[a-z0-9]+$/i.test(pathname)) {
    return NextResponse.next();
  }

  const sesi = await bacaToken(req.cookies.get(NAMA_COOKIE_SESI)?.value);
  if (sesi) return NextResponse.next();

  // Server action datang sebagai POST ke URL halaman mana pun. Memberi
  // redirect 307 pada POST akan membuat browser mengulang POST-nya ke /masuk,
  // jadi tolak langsung dengan 401.
  if (req.method !== "GET") {
    return new NextResponse("Tidak terautentikasi", { status: 401 });
  }

  /**
   * Redirect dibangun dari header Host yang diteruskan nginx, BUKAN dari
   * `req.nextUrl`.
   *
   * `req.nextUrl` memakai origin proses itu sendiri (127.0.0.1:5028) — port
   * internal yang, setelah listener dikunci ke localhost, tidak bisa
   * dijangkau klien. Location relatif juga bukan pilihan: middleware Next 15
   * mem-parse header Location sebagai URL absolut dan menolak "/masuk"
   * dengan ERR_INVALID_URL.
   *
   * Karena itu nginx wajib mengirim `Host $http_host` (bukan `$host`, yang
   * membuang nomor port) — lihat deploy/nginx/synona.conf.
   */
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
    req.nextUrl.protocol.replace(":", "");
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;

  const lanjut =
    pathname === "/" ? "" : `?lanjut=${encodeURIComponent(`${pathname}${search}`)}`;

  return NextResponse.redirect(
    new URL(`${RUTE_MASUK}${lanjut}`, `${proto}://${host}`),
    307,
  );
}

export const config = {
  // Semua rute kecuali endpoint internal Next. Sisanya disaring di atas.
  matcher: ["/((?!_next/).*)"],
};
