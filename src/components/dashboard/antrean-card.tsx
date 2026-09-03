import { ChevronRight, ClipboardList } from "lucide-react";
import Link from "next/link";

import { formatTanggalPendek } from "@/lib/date";
import { LABEL_STATUS_PESANAN, type StatusPesanan } from "@/lib/usaha";
import { cn } from "@/lib/utils";
import type { AntreanRingkas } from "@/server/queries/dashboard";

export function AntreanCard({ antrean }: { antrean: AntreanRingkas }) {
  const berjalan = antrean.masuk + antrean.dikerjakan;

  return (
    <section className="card flex flex-col p-5">
      <div className="flex items-center justify-between">
        <h2 className="card-title text-[17px]">Antrean Pekerjaan</h2>
        <Link href="/pesanan" className="link-more">
          Lihat Papan <ChevronRight className="size-3.5" />
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Angka label="Berjalan" nilai={berjalan} />
        <Angka label="Siap diambil" nilai={antrean.selesai} tone="success" />
        <Angka label="Lewat janji" nilai={antrean.telat} tone="danger" />
      </div>

      <ul className="mt-4 flex-1 space-y-3">
        {antrean.terdekat.length === 0 && (
          <li className="py-6 text-center text-sm text-muted">
            Tidak ada pekerjaan yang sedang antre. 🎉
          </li>
        )}
        {antrean.terdekat.map((p) => (
          <li key={p.nomor} className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-canvas text-muted">
              <ClipboardList className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {p.pelanggan ?? "Tanpa nama"}
              </p>
              <p className="tabular truncate text-xs text-muted">
                {p.nomor} ·{" "}
                {LABEL_STATUS_PESANAN[p.status as StatusPesanan] ?? p.status}
              </p>
            </div>
            <span className="shrink-0 text-[11px] font-semibold text-muted">
              {p.janjiSelesai ? formatTanggalPendek(p.janjiSelesai) : "—"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Angka({
  label,
  nilai,
  tone,
}: {
  label: string;
  nilai: number;
  tone?: "success" | "danger";
}) {
  return (
    <div className="rounded-xl bg-canvas px-2 py-2.5">
      <p
        className={cn(
          "tabular text-xl font-extrabold leading-none tracking-tight",
          tone === "success"
            ? "text-emerald-600"
            : tone === "danger" && nilai > 0
              ? "text-danger"
              : "text-ink",
        )}
      >
        {nilai}
      </p>
      <p className="mt-1 text-[11px] font-medium leading-tight text-muted">
        {label}
      </p>
    </div>
  );
}
