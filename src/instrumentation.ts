/**
 * Dijalankan Next.js sekali saat server boot.
 *
 * Gunanya satu: membuat konfigurasi yang salah ketahuan saat start, bukan
 * saat pengguna pertama mencoba masuk.
 *
 * Melempar saja tidak cukup — Next mencatat galat dari `register()` lalu tetap
 * melayani permintaan, sehingga aplikasi berjalan setengah hidup: halaman
 * /masuk tampil tapi setiap login gagal dengan galat 500 yang membingungkan.
 * `process.exit(1)` membuat kegagalannya tegas dan terlihat di `pm2 list`.
 */
import { PESAN_SECRET_HILANG } from "@/lib/jwt";

export async function register() {
  if (process.env.SYNONA_JWT_SECRET) return;

  // eslint-disable-next-line no-console
  console.error(`\n✗ Synona menolak start.\n\n${PESAN_SECRET_HILANG}\n`);
  process.exit(1);
}
