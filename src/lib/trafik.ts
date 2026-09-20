/**
 * Konstanta pelacakan trafik halaman publik, dipakai bersama oleh pelacak di
 * peramban, endpoint /api/jejak, dan halaman laporan /trafik. Bebas
 * dependency supaya aman diimpor dari sisi klien maupun server.
 */

/** Id acak per peramban. Bukan httpOnly: dibuat dan dibaca oleh pelacaknya. */
export const NAMA_COOKIE_PENGUNJUNG = "synona_pgj";

export const RUTE_JEJAK = "/api/jejak";

/** Hanya halaman ini yang dicatat — sisanya ditolak endpoint. */
export const HALAMAN_DILACAK = ["/beranda", "/register", "/masuk"] as const;
export type HalamanDilacak = (typeof HALAMAN_DILACAK)[number];

/**
 * Nama manusiawi untuk nilai `data-jejak` / `data-jejak-bagian`. Nilai yang
 * tidak ada di sini tetap dicatat dan ditampilkan apa adanya.
 */
export const LABEL_TARGET: Record<string, string> = {
  "nav:masuk": "Tombol Masuk (menu atas)",
  "nav:daftar": "Tombol Daftar (menu atas)",
  "nav:jenis-usaha": "Menu: Jenis usaha",
  "nav:cara-kerja": "Menu: Cara kerja",
  "nav:fitur": "Menu: Fitur",
  "hero:mulai": "Mulai Pakai Synona (hero)",
  "hero:cara-kerja": "Lihat cara kerjanya (hero)",
  "kartu:biru": "Kartu fitur: Penjualan",
  "kartu:hijau": "Kartu fitur: Stok",
  "kartu:merah": "Kartu fitur: Laporan",
  "ajakan:masuk": "Masuk ke Synona (penutup)",
  "kaki:masuk": "Masuk ke aplikasi (kaki halaman)",
  "masuk:daftar": "Daftar dari halaman Masuk",
  "daftar:masuk": "Masuk dari halaman Daftar",
  "jenis-usaha": "Bagian: Jenis usaha",
  "cara-kerja": "Bagian: Cara kerja",
  fitur: "Bagian: Fitur",
  ajakan: "Bagian: Ajakan penutup",
};

/**
 * Warna grafik /trafik: calon pelanggan vs pelanggan lama.
 *
 * Pasangan warna ini lolos validator dataviz (CVD ΔE & kontras) — jangan
 * diganti dengan biru-ungu: keduanya nyaris sama bagi pembaca buta warna.
 * Hijau/oranye juga dihindari karena sudah dipakai sebagai warna status.
 */
export const WARNA_TRAFIK = { calon: "#6d5df6", lama: "#0d9488" };

export function labelTarget(target: string | null): string {
  if (!target) return "—";
  return LABEL_TARGET[target] ?? target;
}
