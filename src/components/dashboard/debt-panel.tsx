import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { WhatsAppIcon } from "@/components/icons/whatsapp";
import { labelJatuhTempo } from "@/lib/date";
import { formatRupiah } from "@/lib/money";
import { buildWaLink, pesanPengingatUtang } from "@/lib/wa";
import { cn } from "@/lib/utils";
import type { BarisUtang } from "@/server/queries/dashboard";

const TONE = {
  danger: "text-danger",
  warning: "text-warning",
  muted: "text-muted",
} as const;

function inisial(nama: string) {
  return nama
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function DebtPanel({
  daftar,
  hariIni,
  namaToko,
}: {
  daftar: BarisUtang[];
  hariIni: string;
  namaToko: string;
}) {
  return (
    <section className="card flex flex-col p-5">
      <div className="flex items-center justify-between">
        <h2 className="card-title text-[17px]">Utang Jatuh Tempo</h2>
        <Link href="/kasbon" className="link-more">
          Lihat Semua <ChevronRight className="size-3.5" />
        </Link>
      </div>

      <ul className="mt-2 divide-y divide-line/70">
        {daftar.length === 0 && (
          <li className="py-8 text-center text-sm text-muted">
            Tidak ada utang jatuh tempo. 🎉
          </li>
        )}

        {daftar.map((d) => {
          const tempo = labelJatuhTempo(d.jatuhTempo, hariIni);
          const pesan = pesanPengingatUtang({
            nama: d.nama,
            toko: namaToko,
            sisa: d.sisa,
            jatuhTempo: d.jatuhTempo,
            tegas: tempo.tone === "danger",
          });

          return (
            <li key={d.id} className="flex items-center gap-2.5 py-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-[13px] font-bold text-brand-600">
                {inisial(d.nama)}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {d.nama}
                </p>
                <p
                  className={cn(
                    "text-[11px] font-medium",
                    TONE[tempo.tone],
                  )}
                >
                  {tempo.text}
                </p>
              </div>

              <p className="tabular shrink-0 whitespace-nowrap text-[13px] font-bold text-ink">
                {formatRupiah(d.sisa)}
              </p>

              {d.phone && (
                <a
                  href={buildWaLink(d.phone, pesan)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Ingatkan ${d.nama} via WhatsApp`}
                  className="grid size-9 shrink-0 place-items-center rounded-xl bg-success text-white transition-colors hover:bg-emerald-600"
                >
                  <WhatsAppIcon className="size-[18px]" />
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
