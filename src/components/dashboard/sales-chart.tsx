"use client";

import { ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatRingkas, formatRupiah } from "@/lib/money";

export type TitikChart = {
  label: string;
  penjualan: number;
  laba: number;
};

const WARNA = { penjualan: "#3b82f6", laba: "#22c55e" };

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
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 shadow-card">
      <p className="mb-1 text-xs font-bold text-ink">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-xs">
          <span
            className="size-2 rounded-full"
            style={{
              background:
                p.dataKey === "penjualan" ? WARNA.penjualan : WARNA.laba,
            }}
          />
          <span className="text-muted">
            {p.dataKey === "penjualan" ? "Penjualan" : "Laba Kotor"}
          </span>
          <span className="tabular ml-auto font-semibold text-ink">
            {formatRupiah(p.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

export function SalesChart({
  data,
  hari,
}: {
  data: TitikChart[];
  hari: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  // Sumbu Y memakai kelipatan bulat (500rb / 1jt / …) agar mudah dibaca,
  // bukan angka acak hasil pembagian otomatis.
  const puncak = Math.max(...data.map((d) => d.penjualan), 0);
  const langkahDasar = 500_000;
  const kelipatan = Math.max(
    1,
    Math.ceil(Math.ceil(puncak / langkahDasar) / 5),
  );
  const langkah = langkahDasar * kelipatan;
  const atas = Math.max(langkah, Math.ceil(puncak / langkah) * langkah);
  const ticks = Array.from({ length: atas / langkah + 1 }, (_, i) => i * langkah);

  function gantiPeriode(nilai: string) {
    const next = new URLSearchParams(params.toString());
    next.set("hari", nilai);
    startTransition(() => router.push(`${pathname}?${next}`, { scroll: false }));
  }

  return (
    <section className="card flex flex-col p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="card-title text-[17px]">
          Penjualan &amp; Laba ({hari} Hari Terakhir)
        </h2>

        <div className="relative">
          <select
            value={hari}
            onChange={(e) => gantiPeriode(e.target.value)}
            aria-label="Pilih periode"
            className="h-9 cursor-pointer appearance-none rounded-xl border border-line bg-white pl-3.5 pr-9 text-sm font-semibold text-ink-soft outline-none transition-colors hover:bg-canvas focus:ring-4 focus:ring-brand-100"
          >
            <option value="7">7 Hari</option>
            <option value="14">14 Hari</option>
            <option value="30">30 Hari</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-5">
        <Legenda warna={WARNA.penjualan} label="Penjualan" />
        <Legenda warna={WARNA.laba} label="Laba Kotor" />
      </div>

      <div
        className="mt-4 h-[268px] w-full transition-opacity"
        style={{ opacity: pending ? 0.5 : 1 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="gradPenjualan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={WARNA.penjualan} stopOpacity={0.22} />
                <stop offset="100%" stopColor={WARNA.penjualan} stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="gradLaba" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={WARNA.laba} stopOpacity={0.2} />
                <stop offset="100%" stopColor={WARNA.laba} stopOpacity={0.01} />
              </linearGradient>
            </defs>

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
              domain={[0, atas]}
              ticks={ticks}
              tick={{ fill: "#8a90a6", fontSize: 12 }}
              tickFormatter={(v: number) => (v === 0 ? "0" : formatRingkas(v))}
            />
            <Tooltip
              content={<TooltipKustom />}
              cursor={{ stroke: "#d3ccff", strokeWidth: 1 }}
            />
            <Area
              type="linear"
              dataKey="penjualan"
              stroke={WARNA.penjualan}
              strokeWidth={2.5}
              fill="url(#gradPenjualan)"
              dot={{ r: 3.5, fill: WARNA.penjualan, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
            />
            <Area
              type="linear"
              dataKey="laba"
              stroke={WARNA.laba}
              strokeWidth={2.5}
              fill="url(#gradLaba)"
              dot={{ r: 3.5, fill: WARNA.laba, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function Legenda({ warna, label }: { warna: string; label: string }) {
  return (
    <span className="flex items-center gap-2 text-[13px] font-medium text-ink-soft">
      <span className="size-2.5 rounded-full" style={{ background: warna }} />
      {label}
    </span>
  );
}
