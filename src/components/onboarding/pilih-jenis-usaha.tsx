"use client";

import { Check } from "lucide-react";

import { JENIS_USAHA, type JenisUsaha } from "@/lib/usaha";
import { cn } from "@/lib/utils";

/**
 * Pemilih jenis usaha. Sengaja tanpa aksi simpan sendiri supaya bisa dipakai
 * di dua tempat dengan cara menyimpan yang berbeda:
 *
 * - di halaman masuk, pilihannya ikut terkirim bersama kredensial dan baru
 *   disimpan setelah sandinya terbukti benar (tidak ada endpoint tanpa
 *   autentikasi yang bisa mengubah pengaturan outlet);
 * - di dalam aplikasi, disimpan lewat server action biasa yang sudah
 *   memverifikasi sesi.
 */
export function PilihJenisUsaha({
  nilai,
  onPilih,
  ringkas = false,
  disabled = false,
}: {
  nilai: JenisUsaha | null;
  onPilih: (jenis: JenisUsaha) => void;
  /** Versi padat untuk kartu login yang sempit. */
  ringkas?: boolean;
  disabled?: boolean;
}) {
  return (
    <ul className={cn("grid", ringkas ? "gap-2" : "gap-3.5")}>
      {JENIS_USAHA.map((j) => {
        const aktif = nilai === j.key;
        return (
          <li key={j.key}>
            <button
              type="button"
              onClick={() => onPilih(j.key)}
              disabled={disabled}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border bg-white text-left transition-all disabled:opacity-60",
                ringkas ? "p-3" : "rounded-3xl p-5",
                aktif
                  ? "border-brand-300 shadow-pop ring-4 ring-brand-100"
                  : "border-line shadow-card hover:border-brand-200",
              )}
            >
              <span
                className={cn(
                  "grid shrink-0 place-items-center rounded-2xl transition-colors",
                  ringkas ? "size-10 text-xl" : "size-14 text-2xl",
                  aktif ? "bg-brand-50" : "bg-canvas",
                )}
              >
                {j.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block font-extrabold tracking-tight text-ink",
                    ringkas ? "text-sm" : "text-base",
                  )}
                >
                  {j.label}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block font-medium text-ink-soft",
                    ringkas ? "text-xs" : "text-sm",
                  )}
                >
                  {j.ringkas}
                </span>
                {!ringkas && (
                  <span className="mt-1 block text-xs text-muted">
                    Contoh: {j.contoh}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors",
                  aktif ? "border-brand-500 bg-brand-500 text-white" : "border-line",
                )}
              >
                {aktif && <Check className="size-3.5" strokeWidth={3} />}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
