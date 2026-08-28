/**
 * Konfigurasi PM2 untuk Synona.
 *
 * Menjalankan output `standalone` Next.js (.next/standalone/server.js), bukan
 * `next start`, sesuai `output: "standalone"` di next.config.ts.
 *
 * PENTING: instances tetap 1 dan exec_mode fork. Database-nya SQLite satu file
 * dengan satu penulis; mode cluster akan membuka beberapa koneksi ke file yang
 * sama dan berujung SQLITE_BUSY.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const DATA = path.join(ROOT, "data");

/**
 * Secret sesi dibaca dari .env di root proyek dan disuntikkan ke env pm2.
 *
 * Kenapa tidak dibiarkan dibaca Next sendiri: `next build` menyalin .env ke
 * .next/standalone/, dan server standalone memuat salinan ITU (relatif
 * terhadap dirinya sendiri), bukan .env di root. Akibatnya secret jadi
 * terduplikasi ke artefak build dan mengganti .env tidak berpengaruh sampai
 * di-build ulang. `postbuild` menghapus salinan itu; jalur inilah yang
 * menjadi satu-satunya sumber kebenaran.
 *
 * Kalau .env tidak ada, variabelnya sengaja dibiarkan kosong — aplikasi yang
 * menolak start dengan pesan jelas (src/instrumentation.ts) jauh lebih baik
 * daripada pm2 gagal memuat berkas konfigurasi ini dengan galat samar.
 */
function bacaEnvRahasia() {
  const berkas = path.join(ROOT, ".env");
  if (!fs.existsSync(berkas)) return {};

  const hasil = {};
  for (const baris of fs.readFileSync(berkas, "utf8").split("\n")) {
    const cocok = baris.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (cocok) hasil[cocok[1]] = cocok[2].replace(/^["']|["']$/g, "");
  }
  return hasil;
}

module.exports = {
  apps: [
    {
      name: "synona",
      cwd: ROOT,
      script: path.join(ROOT, ".next/standalone/server.js"),
      // Dimuat sebelum server.js: menolak start kalau SYNONA_JWT_SECRET
      // tidak ada. Lihat deploy/boot-check.js untuk alasannya.
      node_args: ["--require", path.join(ROOT, "deploy/boot-check.js")],
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        ...bacaEnvRahasia(),
        NODE_ENV: "production",
        PORT: 5028,
        // Hanya localhost. Akses dari luar HARUS lewat nginx
        // (/etc/nginx/sites-available/synona → port 8029), yang meneruskan
        // X-Forwarded-Proto sehingga cookie sesi tahu kapan harus `secure`.
        HOSTNAME: "127.0.0.1",
        // Absolut supaya DB dan foto produk tidak ikut berpindah kalau cwd berubah.
        DATABASE_PATH: path.join(DATA, "synona.db"),
        UPLOAD_DIR: path.join(DATA, "uploads/produk"),
      },
    },
  ],
};
