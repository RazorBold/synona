import { ArrowRight, MessageCircleQuestion } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { ButirTanya, NadaTanya } from "@/server/queries/tanya";

const TITIK: Record<NadaTanya, string> = {
  baik: "bg-success",
  netral: "bg-brand-400",
  waspada: "bg-warning",
  bahaya: "bg-danger",
};

const TAUTAN: Record<NadaTanya, string> = {
  baik: "text-success",
  netral: "text-brand-500",
  waspada: "text-warning",
  bahaya: "text-danger",
};

/**
 * Pertanyaan yang kemungkinan ada di kepala pemilik pagi ini, beserta
 * jawabannya. Daftarnya berubah mengikuti keadaan outlet — lihat
 * server/queries/tanya.ts untuk aturan pemilihannya.
 */
export function PanelTanya({ butir }: { butir: ButirTanya[] }) {
  if (butir.length === 0) return null;

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="card-title flex items-center gap-2 text-[17px]">
          <MessageCircleQuestion className="size-[18px] text-brand-500" />
          Yang mungkin Anda tanyakan
        </h2>
        <span className="text-xs text-muted">
          Dirakit dari data outlet ini, bukan perkiraan
        </span>
      </div>

      <ul className="mt-4 grid gap-3 lg:grid-cols-2">
        {butir.map((b) => (
          <li
            key={b.kunci}
            className="rounded-2xl border border-line p-4 transition-colors hover:border-brand-200"
          >
            <div className="flex items-start gap-2.5">
              <span
                className={cn("mt-1.5 size-2 shrink-0 rounded-full", TITIK[b.nada])}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold tracking-tight text-ink">
                  {b.pertanyaan}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                  {b.jawaban}
                </p>
                {b.rincian && (
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {b.rincian}
                  </p>
                )}

                {b.aksi && b.href && (
                  <Link
                    href={b.href}
                    className={cn(
                      "mt-2.5 inline-flex items-center gap-1 text-xs font-bold",
                      TAUTAN[b.nada],
                    )}
                  >
                    {b.aksi} <ArrowRight className="size-3" />
                  </Link>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
