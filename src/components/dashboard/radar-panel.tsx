import { ArrowRight, Radar } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { ButirRadar } from "@/server/queries/radar";

const TITIK = {
  sehat: "bg-success",
  waspada: "bg-warning",
  bahaya: "bg-danger",
} as const;

const AKSI = {
  sehat: "text-success",
  waspada: "text-warning",
  bahaya: "text-danger",
} as const;

/** Tahap 4 flowchart: 6 pertanyaan yang harus bisa dijawab pemilik tiap hari. */
export function RadarPanel({ butir }: { butir: ButirRadar[] }) {
  const perluAksi = butir.filter((b) => b.aksi);

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="card-title flex items-center gap-2 text-[17px]">
          <Radar className="size-[18px] text-brand-500" />
          Radar 6 Pertanyaan
        </h2>
        <Link href="/laporan" className="link-more">
          Kesehatan usaha <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        {butir.map((b) => (
          <div
            key={b.kunci}
            className="rounded-2xl border border-line p-3.5 transition-colors hover:border-brand-200"
          >
            <div className="flex items-center gap-2">
              <span className={cn("size-2 rounded-full", TITIK[b.status])} />
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                {b.kunci} · {b.pertanyaan}
              </span>
            </div>

            <p className="tabular mt-1.5 truncate text-[17px] font-extrabold tracking-tight text-ink">
              {b.jawaban}
            </p>
            <p className="mt-0.5 line-clamp-2 min-h-[28px] text-[11px] leading-tight text-muted">
              {b.keterangan}
            </p>

            {b.aksi && (
              <Link
                href={b.href}
                className={cn(
                  "mt-2 inline-flex items-center gap-1 text-[11px] font-bold",
                  AKSI[b.status],
                )}
              >
                {b.aksi} <ArrowRight className="size-3" />
              </Link>
            )}
          </div>
        ))}
      </div>

      {perluAksi.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <span className="text-xs font-semibold text-muted">
            Aksi hari ini:
          </span>
          {perluAksi.map((b) => (
            <Link
              key={b.kunci}
              href={b.href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-opacity hover:opacity-85",
                b.status === "bahaya"
                  ? "bg-red-50 text-danger"
                  : b.status === "waspada"
                    ? "bg-amber-50 text-warning"
                    : "bg-emerald-50 text-emerald-700",
              )}
            >
              <span className={cn("size-1.5 rounded-full", TITIK[b.status])} />
              {b.aksi}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
