/**
 * Tujuan tombol "Masuk" dan "Daftar" di halaman depan.
 *
 * Branch ini HANYA memuat halaman depan — rute /masuk dan /register tinggal di
 * `main` bersama database SQLite-nya dan dilayani sendiri lewat nginx + pm2,
 * bukan di sini. Jadi tombolnya harus menunjuk ke luar: set
 * `NEXT_PUBLIC_URL_APLIKASI` di Environment Variables Vercel ke origin aplikasi
 * yang sebenarnya (mis. https://app.synona.id).
 *
 * Selama variabel itu belum diisi, tombol jatuh ke bagian ajakan di bawah
 * halaman — jauh lebih baik daripada melempar pengunjung ke 404.
 */
const ASAL = process.env.NEXT_PUBLIC_URL_APLIKASI?.replace(/\/+$/, "");

export const URL_MASUK = ASAL ? `${ASAL}/masuk` : "#ajakan";
export const URL_DAFTAR = ASAL ? `${ASAL}/register` : "#ajakan";
