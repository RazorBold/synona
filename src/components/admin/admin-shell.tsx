"use client";

import {
  BadgeCheck,
  ChartNoAxesCombined,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { LogoSynona } from "@/components/ui/logo-synona";
import { cn } from "@/lib/utils";
import { keluar } from "@/server/actions/auth";

/**
 * Kerangka area pengelola platform. Sengaja terpisah dari AppShell usaha:
 * pengelola tidak punya kasir, produk, atau kas — yang ia urus adalah akun
 * pelanggan, pembayaran langganan, dan trafik halaman depan.
 */
export function AdminShell({
  nama,
  perluDiperiksa,
  children,
}: {
  nama: string;
  perluDiperiksa: number;
  children: React.ReactNode;
}) {
  const [buka, setBuka] = useState(false);
  const pathname = usePathname();

  const nav = [
    { href: "/admin", label: "Ringkasan", ikon: LayoutDashboard, lencana: 0 },
    { href: "/admin/langganan", label: "Verifikasi Langganan", ikon: BadgeCheck, lencana: perluDiperiksa },
    { href: "/admin/akun", label: "Akun Usaha", ikon: Users, lencana: 0 },
    { href: "/admin/trafik", label: "Trafik Pengunjung", ikon: ChartNoAxesCombined, lencana: 0 },
  ];

  return (
    <div className="min-h-dvh bg-canvas">
      <div
        onClick={() => setBuka(false)}
        className={cn(
          "fixed inset-0 z-30 bg-ink/30 backdrop-blur-[2px] transition-opacity lg:hidden",
          buka ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[#171a33] text-white transition-transform duration-300 lg:translate-x-0",
          buka ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <button
          onClick={() => setBuka(false)}
          aria-label="Tutup menu"
          className="absolute right-3 top-4 grid size-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 lg:hidden"
        >
          <X className="size-4" />
        </button>

        <div className="px-6 pb-6 pt-6">
          <Link href="/admin" className="flex items-center gap-3">
            <LogoSynona tinggi={36} prioritas />
            <span className="text-xl font-extrabold tracking-tight">Synona</span>
          </Link>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-violet-200">
            <ShieldCheck className="size-3.5" /> Pengelola platform
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {nav.map(({ href, label, ikon: Ikon, lencana }) => {
            const aktif = href === "/admin" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setBuka(false)}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors",
                  aktif ? "bg-brand-500 text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                <Ikon className="size-[18px]" />
                <span className="flex-1">{label}</span>
                {lencana > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-amber-400 px-1.5 text-[11px] font-extrabold text-ink">
                    {lencana}
                  </span>
                )}
              </Link>
            );
          })}

          <a
            href="/beranda"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold text-white/50 hover:bg-white/10 hover:text-white"
          >
            <ExternalLink className="size-[18px]" /> Lihat halaman depan
          </a>
        </nav>

        <div className="flex items-center gap-3 border-t border-white/10 px-5 py-4">
          <Link
            href="/ganti-sandi"
            title="Ganti sandi"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-[13px] font-bold"
          >
            {nama
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase()}
          </Link>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">{nama}</span>
            <Link href="/ganti-sandi" className="text-xs text-white/50 hover:text-white">
              Ganti sandi
            </Link>
          </span>
          <form action={keluar}>
            <button
              type="submit"
              aria-label="Keluar"
              title="Keluar"
              className="grid size-9 place-items-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/80 px-4 backdrop-blur lg:hidden">
          <button
            onClick={() => setBuka(true)}
            aria-label="Buka menu"
            className="grid size-10 place-items-center rounded-xl text-ink-soft hover:bg-canvas"
          >
            <Menu className="size-5" />
          </button>
          <span className="font-extrabold text-ink">Synona · Pengelola</span>
        </header>
        <main className="px-4 pb-12 pt-6 sm:px-6 lg:pt-8">{children}</main>
      </div>
    </div>
  );
}
