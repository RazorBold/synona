import type { Metadata, Viewport } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";

import { DaftarSW } from "@/components/layout/daftar-sw";

import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

/**
 * Serif berkontras tinggi, dipakai HANYA di halaman depan (/beranda).
 * Aplikasi di dalamnya tetap memakai Jakarta Sans — halaman pemasaran boleh
 * bersuara lebih tegas, layar kerja harian tidak.
 */
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Synona — Kelola usaha, makin untung",
  description:
    "Aplikasi manajemen usaha untuk UMKM: POS, stok, kasbon, dan laporan untung harian.",
  manifest: "/manifest.webmanifest",
  applicationName: "Synona",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  // Supaya tampil sebagai aplikasi, bukan tab browser, saat dipasang di HP.
  appleWebApp: { capable: true, title: "Synona", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#6d5df6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${jakarta.variable} ${playfair.variable}`}>
      <body>
        {children}
        <DaftarSW />
      </body>
    </html>
  );
}
