import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Ada package-lock.json nyasar di /home/ipul yang bikin Next menyimpulkan
  // root monorepo terlalu tinggi dan menaruh output standalone di path
  // bersarang (.next/standalone/synona/synona). Kunci ke folder proyek.
  outputFileTracingRoot: path.join(__dirname),
  // better-sqlite3 adalah modul native: biarkan Next me-require-nya apa adanya
  // alih-alih membundelnya ke dalam output server.
  serverExternalPackages: ["better-sqlite3"],
  // Badge dev Next.js default di kiri-bawah menutupi profil di sidebar.
  devIndicators: { position: "bottom-right" },
  experimental: {
    // Foto produk dikirim lewat Server Action; batas bawaan 1 MB terlalu kecil
    // untuk foto kamera meski sudah dikompres di sisi klien.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
