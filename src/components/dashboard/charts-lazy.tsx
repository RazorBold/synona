"use client";

import dynamic from "next/dynamic";

/**
 * Recharts adalah bagian terberat dari halaman ini. Memuatnya secara lazy
 * menjaga First Load JS tetap kecil — target NFR: HP Android kelas bawah.
 * ResponsiveContainer tidak menghasilkan apa pun saat SSR, jadi ssr:false
 * tidak mengurangi konten HTML awal.
 */

function KerangkaKartu({ tinggi }: { tinggi: number }) {
  return (
    <section className="card p-5">
      <div className="h-5 w-48 animate-pulse rounded-md bg-line" />
      <div
        className="mt-4 animate-pulse rounded-xl bg-canvas"
        style={{ height: tinggi }}
      />
    </section>
  );
}

export const SalesChart = dynamic(
  () => import("./sales-chart").then((m) => m.SalesChart),
  { ssr: false, loading: () => <KerangkaKartu tinggi={300} /> },
);

export const PaymentDonut = dynamic(
  () => import("./payment-donut").then((m) => m.PaymentDonut),
  { ssr: false, loading: () => <KerangkaKartu tinggi={220} /> },
);

export const UangMasukChart = dynamic(
  () => import("./uang-masuk-chart").then((m) => m.UangMasukChart),
  { ssr: false, loading: () => <KerangkaKartu tinggi={340} /> },
);
