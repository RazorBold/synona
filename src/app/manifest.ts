import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Synona — Kelola usaha, makin untung",
    short_name: "Synona",
    description:
      "Catat penjualan, untung harian otomatis, kasbon pelanggan, dan rekonsiliasi kas untuk UMKM.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f8fc",
    theme_color: "#6d5df6",
    lang: "id",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Kasir", short_name: "Kasir", url: "/kasir" },
      { name: "Kasbon", short_name: "Kasbon", url: "/kasbon" },
      { name: "Laporan", short_name: "Laporan", url: "/laporan" },
    ],
  };
}
