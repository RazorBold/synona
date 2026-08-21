"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { formatRupiah, persen } from "@/lib/money";

export type IrisanPembayaran = {
  label: string;
  nilai: number;
  warna: string;
};

export function PaymentDonut({ data }: { data: IrisanPembayaran[] }) {
  const total = data.reduce((a, d) => a + d.nilai, 0);
  const terisi = data.filter((d) => d.nilai > 0);

  return (
    <section className="card flex flex-col p-5">
      <h2 className="card-title text-[17px]">Pembayaran Hari Ini</h2>

      <div className="mt-3 flex flex-1 items-center gap-4">
        <div className="size-[132px] shrink-0">
          {total > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={terisi}
                  dataKey="nilai"
                  innerRadius="58%"
                  outerRadius="100%"
                  paddingAngle={1.5}
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {terisi.map((d) => (
                    <Cell key={d.label} fill={d.warna} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid size-full place-items-center rounded-full border-[14px] border-line text-xs text-muted">
              Kosong
            </div>
          )}
        </div>

        <ul className="min-w-0 flex-1 space-y-2.5">
          {data.map((d) => (
            <li key={d.label} className="flex items-center gap-2 text-[13px]">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: d.warna }}
              />
              <span className="font-medium text-ink-soft">{d.label}</span>
              <span className="tabular ml-auto whitespace-nowrap font-semibold text-ink">
                {formatRupiah(d.nilai)}
              </span>
              <span className="tabular w-10 shrink-0 text-right text-muted">
                ({persen(d.nilai, total)}%)
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-canvas px-4 py-3">
        <span className="text-sm font-medium text-muted">Total Pembayaran</span>
        <span className="tabular text-base font-extrabold text-ink">
          {formatRupiah(total)}
        </span>
      </div>
    </section>
  );
}
