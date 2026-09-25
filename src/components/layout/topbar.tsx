"use client";

import { Bell, Menu, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { PilihOutlet } from "./pilih-outlet";

type Props = {
  namaOutlet: string;
  outletId: string;
  daftarOutlet: { id: string; nama: string }[];
  jumlahNotifikasi: number;
  onMenu: () => void;
};

export function Topbar({
  namaOutlet,
  outletId,
  daftarOutlet,
  jumlahNotifikasi,
  onMenu,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const params = useSearchParams();
  const [kueri, setKueri] = useState(params.get("q") ?? "");

  // Ctrl/Cmd + K memfokuskan pencarian (sesuai petunjuk di kolom pencarian).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function cari(e: React.FormEvent) {
    e.preventDefault();
    const q = kueri.trim();
    if (q.length < 2) return;
    router.push(`/cari?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="sticky top-0 z-20 flex h-[84px] items-center gap-3 bg-canvas/60 px-4 backdrop-blur-md sm:gap-5 sm:px-5">
      <button
        onClick={onMenu}
        aria-label="Buka menu"
        className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-white"
      >
        <Menu className="size-5" />
      </button>

      <form onSubmit={cari} role="search" className="relative min-w-0 flex-1 sm:max-w-[420px]">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
        <input
          ref={searchRef}
          type="search"
          name="q"
          value={kueri}
          onChange={(e) => setKueri(e.target.value)}
          aria-label="Cari produk, transaksi, atau pelanggan"
          placeholder="Cari produk, transaksi, pelanggan..."
          className="h-11 w-full rounded-full border border-line bg-white pl-11 pr-20 text-sm text-ink shadow-card outline-none transition-shadow placeholder:text-muted focus:border-brand-200 focus:ring-4 focus:ring-brand-100"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md bg-canvas px-2 py-1 text-[11px] font-semibold text-muted sm:block">
          Ctrl + K
        </kbd>
      </form>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <PilihOutlet namaOutlet={namaOutlet} outletId={outletId} daftar={daftarOutlet} />

        <Link
          href="/pengingat"
          aria-label={
            jumlahNotifikasi > 0
              ? `Pengingat (${jumlahNotifikasi} menunggu)`
              : "Pengingat"
          }
          className="relative grid size-11 place-items-center rounded-2xl text-ink-soft transition-colors hover:bg-white"
        >
          <Bell className="size-[22px]" />
          {jumlahNotifikasi > 0 && (
            <span className="absolute right-1 top-1 grid min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-canvas">
              {jumlahNotifikasi > 99 ? "99+" : jumlahNotifikasi}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
