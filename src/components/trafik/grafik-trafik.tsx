"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatTanggalPendek } from "@/lib/date";
import { WARNA_TRAFIK } from "@/lib/trafik";
import type { TitikTrafik } from "@/server/queries/trafik";

function TooltipKustom({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: TitikTrafik }[];
}) {
  const t = active ? payload?.[0]?.payload : undefined;
  if (!t) return null;
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 shadow-card">
      <p className="mb-1 text-xs font-bold text-ink">{formatTanggalPendek(t.tanggal)}</p>
      <Baris warna={WARNA_TRAFIK.calon} label="Calon pelanggan" nilai={t.calon} />
      <Baris label="· yang mengklik" nilai={t.tertarik} />
      <Baris label="· berhasil daftar" nilai={t.daftar} />
      <Baris warna={WARNA_TRAFIK.lama} label="Pelanggan lama" nilai={t.lama} />
    </div>
  );
}

function Baris({ warna, label, nilai }: { warna?: string; label: string; nilai: number }) {
  return (
    <p className="flex items-center gap-2 text-xs">
      <span
        className="size-2 rounded-full"
        style={{ background: warna ?? "transparent", border: warna ? 0 : "1px solid #8a90a6" }}
      />
      <span className="text-muted">{label}</span>
      <span className="tabular ml-auto pl-4 font-semibold text-ink">{nilai}</span>
    </p>
  );
}

export function GrafikTrafik({ data }: { data: TitikTrafik[] }) {
  const puncak = Math.max(...data.map((d) => Math.max(d.calon, d.lama)), 0);
  // Skala bulat kecil: trafik halaman depan UMKM biasanya puluhan, bukan ribuan.
  const langkah = puncak <= 5 ? 1 : puncak <= 20 ? 5 : puncak <= 100 ? 20 : 100;
  const atas = Math.max(langkah * 4, Math.ceil(puncak / langkah) * langkah);

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="gradCalon" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={WARNA_TRAFIK.calon} stopOpacity={0.18} />
              <stop offset="100%" stopColor={WARNA_TRAFIK.calon} stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="gradLama" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={WARNA_TRAFIK.lama} stopOpacity={0.16} />
              <stop offset="100%" stopColor={WARNA_TRAFIK.lama} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#eef0f6" vertical={false} />
          <XAxis
            dataKey="tanggal"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#8a90a6", fontSize: 12 }}
            tickFormatter={(t: string) => formatTanggalPendek(t)}
            dy={8}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            domain={[0, atas]}
            tick={{ fill: "#8a90a6", fontSize: 12 }}
          />
          <Tooltip content={<TooltipKustom />} cursor={{ stroke: "#d3ccff", strokeWidth: 1 }} />
          <Area
            type="linear"
            dataKey="calon"
            stroke={WARNA_TRAFIK.calon}
            strokeWidth={2}
            fill="url(#gradCalon)"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
          />
          <Area
            type="linear"
            dataKey="lama"
            stroke={WARNA_TRAFIK.lama}
            strokeWidth={2}
            fill="url(#gradLama)"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
