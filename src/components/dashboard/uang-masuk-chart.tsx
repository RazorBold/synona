"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatRingkas, formatRupiah } from "@/lib/money";

export type TitikUangMasukChart = {
  label: string;
  penjualan: number;
  cicilan: number;
  lain: number;
};

const SUMBER = [
  { key: "penjualan", label: "Penjualan Lunas", warna: "#3b82f6" },
  { key: "cicilan", label: "Cicilan Kasbon", warna: "#f59e0b" },
  { key: "lain", label: "Pemasukan Lain", warna: "#8b7cf8" },
] as const;

type KunciSumber = (typeof SUMBER)[number]["key"];

function TooltipKustom({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((a, p) => a + (p.value ?? 0), 0);
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 shadow-card">
      <p className="mb-1 text-xs font-bold text-ink">{label}</p>
      {SUMBER.map((s) => {
        const nilai = payload.find((p) => p.dataKey === s.key)?.value ?? 0;
        return (
          <p key={s.key} className="flex items-center gap-2 text-xs">
            <span className="size-2 rounded-full" style={{ background: s.warna }} />
            <span className="text-muted">{s.label}</span>
            <span className="tabular ml-auto pl-3 font-semibold text-ink">
              {formatRupiah(nilai)}
            </span>
          </p>
        );
      })}
      <p className="mt-1 flex border-t border-line pt-1 text-xs font-bold text-ink">
        Total
        <span className="tabular ml-auto">{formatRupiah(total)}</span>
      </p>
    </div>
  );
}

/**
 * Uang yang benar-benar diterima per hari, ditumpuk per sumber. Beda dengan
 * grafik Penjualan: kasbon baru terhitung saat dicicil, dan modal/pinjaman
 * ikut masuk walau bukan omzet.
 */
export function UangMasukChart({
  data,
  hari,
}: {
  data: TitikUangMasukChart[];
  hari: number;
}) {
  const total: Record<KunciSumber, number> = { penjualan: 0, cicilan: 0, lain: 0 };
  for (const d of data) {
    total.penjualan += d.penjualan;
    total.cicilan += d.cicilan;
    total.lain += d.lain;
  }
  const semua = total.penjualan + total.cicilan + total.lain;
  const rataRata = Math.round(semua / Math.max(1, data.length));

  return (
    <section className="card flex flex-col p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="card-title text-[17px]">
          Uang Masuk ({hari} Hari Terakhir)
        </h2>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {SUMBER.map((s) => (
            <span
              key={s.key}
              className="flex items-center gap-2 text-[13px] font-medium text-ink-soft"
            >
              <span className="size-2.5 rounded-full" style={{ background: s.warna }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid stroke="#eef0f6" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#8a90a6", fontSize: 12 }}
              dy={8}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tick={{ fill: "#8a90a6", fontSize: 12 }}
              tickFormatter={(v: number) => (v === 0 ? "0" : formatRingkas(v))}
            />
            <Tooltip content={<TooltipKustom />} cursor={{ fill: "#f4f3ff" }} />
            {SUMBER.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                stackId="masuk"
                fill={s.warna}
                maxBarSize={36}
                // Hanya ruas paling atas yang dibulatkan.
                radius={i === SUMBER.length - 1 ? [6, 6, 0, 0] : 0}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Keterangan total uang di bawah grafik */}
      <div className="mt-5 grid grid-cols-1 gap-3 border-t border-line pt-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-brand-50 px-4 py-3">
          <p className="text-xs font-semibold text-ink-soft">Total Uang Masuk</p>
          <p className="tabular mt-1 text-xl font-extrabold text-ink">
            {formatRupiah(semua)}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            rata-rata {formatRupiah(rataRata)}/hari
          </p>
        </div>
        {SUMBER.map((s) => (
          <div key={s.key} className="rounded-2xl border border-line px-4 py-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
              <span className="size-2 rounded-full" style={{ background: s.warna }} />
              {s.label}
            </p>
            <p className="tabular mt-1 text-lg font-bold text-ink">
              {formatRupiah(total[s.key])}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {semua > 0 ? Math.round((total[s.key] / semua) * 100) : 0}% dari total
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
