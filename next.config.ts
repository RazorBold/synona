import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
