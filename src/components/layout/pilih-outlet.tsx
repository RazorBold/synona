"use client";

import { Check, ChevronDown, Loader2, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { aman } from "@/lib/aksi";
import { cn } from "@/lib/utils";
import { pilihOutlet } from "@/server/actions/outlet";
import { useCart } from "@/store/cart";

/**
 * Nama outlet di kanan atas. Kalau pemilik punya lebih dari satu outlet, ia
 * jadi tombol pemindah; selain itu tetap label biasa — menampilkan panah
 * tanpa pilihan hanya akan membuat orang mengira aplikasinya rusak.
 */
export function PilihOutlet({
  namaOutlet,
  outletId,
  daftar,
}: {
  namaOutlet: string;
  outletId: string;
  daftar: { id: string; nama: string }[];
}) {
  const router = useRouter();
  const kosongkan = useCart((s) => s.kosongkan);
  const [buka, setBuka] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, mulai] = useTransition();
  const kotak = useRef<HTMLDivElement | null>(null);

  // Tutup saat klik di luar.
  useEffect(() => {
    if (!buka) return;
    const tutup = (e: MouseEvent) => {
      if (!kotak.current?.contains(e.target as Node)) setBuka(false);
    };
    document.addEventListener("mousedown", tutup);
    return () => document.removeEventListener("mousedown", tutup);
  }, [buka]);

  const label = (
    <>
      <Store className="size-[18px] text-ink-soft" />
      <span className="max-w-[140px] truncate">{namaOutlet}</span>
    </>
  );

  if (daftar.length < 2) {
    return (
      <div className="hidden h-12 items-center gap-2.5 rounded-2xl border border-line bg-white px-4 text-sm font-semibold text-ink shadow-card sm:flex">
        {label}
      </div>
    );
  }

  function pindah(id: string) {
    if (id === outletId) return setBuka(false);
    setError(null);
    mulai(async () => {
      const r = await aman(pilihOutlet(id));
      if (!r.ok) return setError(r.error);
      /**
       * Keranjang kasir dikosongkan: produknya milik outlet lama. Kalau
       * dibiarkan, transaksi pertama di outlet baru ditolak server karena
       * produknya "tidak ditemukan di outlet ini".
       */
      kosongkan();
      setBuka(false);
      router.refresh();
    });
  }

  return (
    <div ref={kotak} className="relative">
      <button
        onClick={() => setBuka((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={buka}
        className="flex h-12 items-center gap-2.5 rounded-2xl border border-line bg-white px-3 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-canvas sm:px-4"
      >
        {pending ? <Loader2 className="size-[18px] animate-spin text-muted" /> : label}
        <ChevronDown className={cn("size-4 text-muted transition-transform", buka && "rotate-180")} />
      </button>

      {buka && (
        <div className="absolute right-0 top-14 z-30 w-64 overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-2xl">
          <p className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted">
            Pindah outlet
          </p>
          <ul role="listbox">
            {daftar.map((o) => (
              <li key={o.id}>
                <button
                  role="option"
                  aria-selected={o.id === outletId}
                  onClick={() => pindah(o.id)}
                  disabled={pending}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                    o.id === outletId
                      ? "bg-brand-50 font-bold text-brand-600"
                      : "text-ink hover:bg-canvas",
                  )}
                >
                  <Store className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{o.nama}</span>
                  {o.id === outletId && <Check className="size-4" />}
                </button>
              </li>
            ))}
          </ul>
          {error && <p className="px-3 py-2 text-xs text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
