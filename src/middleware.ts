import { NextResponse, type NextRequest } from "next/server";

import {
  NAMA_COOKIE_SESI,
  RUTE_BERANDA,
  RUTE_DAFTAR,
  RUTE_LUPA_SANDI,
  RUTE_MASUK,
} from "@/lib/auth-const";
import { bacaToken } from "@/lib/jwt";
import { RUTE_JEJAK } from "@/lib/trafik";

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

  // Halaman yang HARUS bisa dibuka tanpa sesi. /lupa-sandi termasuk: kalau
  // tidak, orang yang lupa sandinya justru dilempar ke /masuk terus-menerus.
  // /beranda adalah halaman depan publik — ia memang untuk orang yang belum
  // punya akun sama sekali. /register juga: pendaftaran usaha baru terbuka
  // untuk siapa pun yang belum punya sesi. Yang sudah masuk dipantulkan ke
  // dashboard oleh halaman itu sendiri — lihat src/app/register/page.tsx.
  if (
    pathname === RUTE_MASUK ||
    pathname === RUTE_DAFTAR ||
    pathname === RUTE_LUPA_SANDI ||
    pathname === RUTE_BERANDA
  ) {
    return NextResponse.next();
  }

  // Nota digital yang dituju QR code di nota cetak: dibuka pembeli yang
  // tentu tidak punya sesi. Halamannya sendiri menolak (404) tanpa tanda
  // tangan `k` yang cocok — lihat src/app/nota/[id]/page.tsx.
  if (pathname.startsWith("/nota/") && req.method === "GET") {
    return NextResponse.next();
  }

  // Penerima jejak trafik halaman depan: pengirimnya justru pengunjung yang
  // belum punya sesi. Hanya menerima tulisan berskema ketat dan tidak pernah
  // mengembalikan data — lihat src/app/api/jejak/route.ts.
  if (pathname === RUTE_JEJAK) {
    return NextResponse.next();
  }

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
   * `req.nextUrl` memakai origin proses itu sendiri (127.0.0.1:8029) — port
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

  /**
   * Pengunjung yang mendarat di akar situs belum tentu punya akun — ia
   * dibawa ke halaman depan, bukan ke formulir masuk. Tautan dalam
   * (mis. /laporan) tetap ke /masuk dengan `?lanjut=` supaya setelah masuk
   * ia mendarat di halaman yang tadi dituju.
   */
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(RUTE_BERANDA, `${proto}://${host}`),
      307,
    );
  }

  const lanjut = `?lanjut=${encodeURIComponent(`${pathname}${search}`)}`;

  return NextResponse.redirect(
    new URL(`${RUTE_MASUK}${lanjut}`, `${proto}://${host}`),
    307,
  );
}

export const config = {
  // Semua rute kecuali endpoint internal Next. Sisanya disaring di atas.
  matcher: ["/((?!_next/).*)"],
};
