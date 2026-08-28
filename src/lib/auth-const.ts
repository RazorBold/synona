/**
 * Konstanta auth yang dipakai bersama oleh middleware (runtime Edge) dan kode
 * server (runtime Node). Middleware tidak boleh mengimpor `node:crypto` atau
 * `@/db`, jadi apa pun yang dipakai keduanya harus tinggal di file bebas
 * dependency seperti ini.
 */

export const NAMA_COOKIE_SESI = "synona_sesi";

/** Umur sesi: 30 hari. */
export const UMUR_SESI_MS = 30 * 24 * 60 * 60 * 1000;

export const RUTE_MASUK = "/masuk";
export const RUTE_GANTI_SANDI = "/ganti-sandi";
export const RUTE_LUPA_SANDI = "/lupa-sandi";

/** Route handler yang membersihkan cookie sesi yang sudah tidak sah. */
export const RUTE_SESI_BERAKHIR = "/sesi-berakhir";

/** Akun demo yang di-seed `npm run auth:init`. */
export const PENGGUNA_DEFAULT = "admin";

/**
 * Sandi demo bawaan. Bukan rahasia — justru sebaliknya: nilai ini dipakai
 * untuk MENDETEKSI bahwa sandi demo masih aktif, lalu memunculkan banner
 * peringatan di dalam aplikasi.
 */
export const SANDI_DEFAULT = "admin";
