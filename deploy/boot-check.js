/**
 * Penjaga boot: dimuat lewat `node --require` SEBELUM server standalone Next.
 *
 * Kenapa tidak cukup mengandalkan src/instrumentation.ts: pada output
 * `standalone`, Next tidak memanggil `register()` sebelum mulai melayani
 * permintaan — server sudah menjawab 200 di /masuk padahal secretnya tidak
 * ada. Modul preload dijalankan Node sebelum modul utama, jadi `process.exit`
 * di sini benar-benar mencegah aplikasi start, bukan sekadar mencatat galat.
 *
 * instrumentation.ts tetap dipertahankan karena ia yang berjalan di `next dev`.
 */
if (!process.env.SYNONA_JWT_SECRET) {
  console.error(
    "\n✗ Synona menolak start.\n\n" +
      "SYNONA_JWT_SECRET tidak diset. Buat berkas .env di root proyek berisi\n" +
      "SYNONA_JWT_SECRET=<32 byte acak>, lalu jalankan ulang.\n\n" +
      "Aplikasi sengaja menolak jalan tanpa secret: nilai default yang\n" +
      "diam-diam terpakai di produksi jauh lebih berbahaya daripada\n" +
      "aplikasi yang gagal start.\n",
  );
  process.exit(1);
}
