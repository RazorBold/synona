/**
 * Konstanta auth yang dipakai bersama oleh middleware (runtime Edge) dan kode
 * server (runtime Node). Middleware tidak boleh mengimpor `node:crypto` atau
 * `@/db`, jadi apa pun yang dipakai keduanya harus tinggal di file bebas
 * dependency seperti ini.
 */

export const NAMA_COOKIE_SESI = "synona_sesi";

/**
 * Outlet yang sedang dibuka pemilik yang punya lebih dari satu outlet.
 * Hanya pilihan tampilan — server SELALU memeriksa ulang bahwa pengguna
 * memang terdaftar di outlet itu sebelum memakainya.
 */
export const NAMA_COOKIE_OUTLET = "synona_outlet";

/** Umur sesi: 30 hari. */
export const UMUR_SESI_MS = 30 * 24 * 60 * 60 * 1000;

export const RUTE_MASUK = "/masuk";

/** Halaman depan publik — satu-satunya layar yang boleh dilihat tanpa sesi. */
export const RUTE_BERANDA = "/beranda";
export const RUTE_GANTI_SANDI = "/ganti-sandi";
export const RUTE_LUPA_SANDI = "/lupa-sandi";

/**
 * Pendaftaran outlet pertama. Hanya bisa dibuka selama tabel `pengguna` masih
 * kosong — begitu akun pertama dibuat, rute ini menutup diri sendiri (lihat
 * `daftar()` di server/actions/auth.ts). Aplikasi ini satu-pemilik per
 * pemasangan, jadi ini bukan pendaftaran pelanggan baru berulang kali.
 */
export const RUTE_DAFTAR = "/register";

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
