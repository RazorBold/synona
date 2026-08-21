import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const TONE = {
  brand: { ring: "from-brand-400 to-brand-600", stroke: "#7c6bf5" },
  success: { ring: "from-emerald-400 to-emerald-600", stroke: "#22c55e" },
  info: { ring: "from-sky-400 to-blue-600", stroke: "#3b82f6" },
  warning: { ring: "from-amber-400 to-orange-500", stroke: "#f97316" },
} as const;

export type KpiTone = keyof typeof TONE;

/** Membentuk path sparkline dari deret angka, dinormalisasi ke kotak 120×38. */
function sparkPath(values: number[], w = 120, h = 38): string {
  if (values.length < 2) return "";
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = w / (values.length - 1);

  return values
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

type Props = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: KpiTone;
  spark: number[];
  /** Persentase perubahan vs kemarin. null = tidak ada pembanding. */
  tren?: number | null;
  /** Teks pengganti baris tren (mis. "12 pelanggan"). */
  catatan?: string;
  catatanTone?: "danger" | "muted";
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  spark,
  tren,
  catatan,
  catatanTone = "muted",
}: Props) {
  const t = TONE[tone];
  const naik = (tren ?? 0) >= 0;

  return (
    <article className="card relative overflow-hidden p-5">
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br text-white",
            t.ring,
          )}
        >
          <Icon className="size-6" strokeWidth={2} />
        </span>

        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="tabular mt-1 truncate text-[26px] font-extrabold leading-tight tracking-tight text-ink">
            {value}
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-3 flex items-center gap-1.5 text-xs">
        {catatan && tren === undefined ? (
          <span
            className={cn(
              "font-semibold",
              catatanTone === "danger" ? "text-danger" : "text-muted",
            )}
          >
            {catatan}
          </span>
        ) : tren === null || tren === undefined ? (
          <span className="text-muted">Belum ada pembanding</span>
        ) : (
          <>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-bold",
                naik ? "text-success" : "text-danger",
              )}
            >
              {naik ? (
                <ArrowUpRight className="size-3.5" strokeWidth={2.6} />
              ) : (
                <ArrowDownRight className="size-3.5" strokeWidth={2.6} />
              )}
              {Math.abs(tren)}%
            </span>
            <span className="text-muted">{catatan ?? "vs kemarin"}</span>
          </>
        )}
      </div>

      <svg
        viewBox="0 0 120 38"
        aria-hidden
        className="pointer-events-none absolute bottom-4 right-4 h-[38px] w-[120px]"
      >
        <path
          d={sparkPath(spark)}
          fill="none"
          stroke={t.stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </article>
  );
}
