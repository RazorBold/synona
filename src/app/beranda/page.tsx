import type { Metadata } from "next";
import Link from "next/link";


import { AjakanSection } from "@/components/beranda/ajakan-section";
import { FiturSection } from "@/components/beranda/fitur-section";
import { Hero } from "@/components/beranda/hero";
import { JenisUsahaSection } from "@/components/beranda/jenis-usaha-section";
import { LangkahSection } from "@/components/beranda/langkah-section";
import { LogoSynona } from "@/components/ui/logo-synona";

export const metadata: Metadata = {
  title: "Synona — Kelola usaha, makin untung",
  description:
    "Aplikasi pencatatan usaha untuk UMKM dagang, jasa, dan campuran: POS, papan antrean jasa, stok, kas & bank, kasbon, dan laporan kesehatan usaha.",
};

const TAUTAN_NAV = [
  { href: "#jenis-usaha", label: "Jenis usaha" },
  { href: "#cara-kerja", label: "Cara kerja" },
  { href: "#fitur", label: "Fitur" },
];

export default function BerandaPage() {
  return (
    <div className="min-h-dvh bg-white">
      {/* -------------------------------------------------------- kepala */}
      {/* Sengaja melayang di atas hero, bukan sticky: ilustrasi latar hero
          (lampu gantung, karakter) menyambung sampai tepi atas, dan pita
          berlatar yang ikut bergulir akan memotongnya. Ajakan utama tetap
          terjangkau lewat tombol di hero dan bagian penutup. */}
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="wadah flex items-center justify-between gap-6 py-5 lg:py-7">
          <Link href="/beranda" className="flex shrink-0 items-center gap-2.5">
            <LogoSynona tinggi={38} prioritas />
            <span className="text-xl font-extrabold tracking-tight text-ink">
              Synona
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {TAUTAN_NAV.map((t) => (
              <a
                key={t.href}
                href={t.href}
                className="text-tubuh font-semibold text-ink-soft transition-colors hover:text-ink"
              >
                {t.label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
            <Link
              href="/masuk"
              className="rounded-full border border-ink/15 bg-white/70 px-5 py-2.5 text-tubuh font-bold text-ink backdrop-blur transition-colors hover:bg-white"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-[#2f3d5e] px-5 py-2.5 text-tubuh font-bold text-white shadow-[0_10px_24px_-12px_rgba(47,61,94,0.8)] transition-transform hover:-translate-y-0.5"
            >
              Daftar
            </Link>
          </div>
        </div>
      </header>

      <Hero />

      {/* -------------------------------------------------- jenis usaha */}
      <JenisUsahaSection />

      {/* ------------------------------------------------------- langkah */}
      <LangkahSection />

      {/* --------------------------------------------------------- fitur */}
      <FiturSection />

      {/* ------------------------------------------------------ ajakan */}
      <AjakanSection />

      {/* --------------------------------------------------------- kaki */}
      <footer className="border-t border-line">
        <div className="wadah flex flex-wrap items-center justify-between gap-4 py-8">
          <div className="flex items-center gap-2.5">
            <LogoSynona tinggi={28} />
            <span className="text-tubuh font-extrabold tracking-tight text-ink">
              Synona
            </span>
            <span className="text-tubuh text-muted">— Kelola usaha, makin untung.</span>
          </div>
          <Link
            href="/masuk"
            className="text-tubuh font-semibold text-brand-500 hover:text-brand-600"
          >
            Masuk ke aplikasi →
          </Link>
        </div>
      </footer>
    </div>
  );
}
