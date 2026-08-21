import {
  Banknote,
  CalendarDays,
  ChevronDown,
  ReceiptText,
  ShoppingCart,
  Users,
} from "lucide-react";

import { PaymentDonut, SalesChart } from "@/components/dashboard/charts-lazy";
import { DebtPanel } from "@/components/dashboard/debt-panel";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LowStockCard } from "@/components/dashboard/low-stock-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RadarPanel } from "@/components/dashboard/radar-panel";
import { TipsBanner } from "@/components/dashboard/tips-banner";
import {
  formatTanggalPanjang,
  formatTanggalPendek,
  salamWaktu,
} from "@/lib/date";
import { formatRingkas, formatRupiah, hitungTren } from "@/lib/money";
import { getDataDashboard } from "@/server/queries/dashboard";

export const dynamic = "force-dynamic";

const PERIODE_SAH = [7, 14, 30];

const METODE = [
  { key: "cash", label: "Tunai", warna: "#22c55e" },
  { key: "qris", label: "QRIS", warna: "#3b82f6" },
  { key: "transfer", label: "Transfer", warna: "#8b7cf8" },
  { key: "other", label: "Lainnya", warna: "#f59e0b" },
] as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ hari?: string }>;
}) {
  const { hari } = await searchParams;
  const jumlahHari = PERIODE_SAH.includes(Number(hari)) ? Number(hari) : 7;

  const d = await getDataDashboard(jumlahHari);
  const sparkPendek = d.series.slice(-7);

  const pembayaran = METODE.map((m) => ({
    label: m.label,
    warna: m.warna,
    nilai: d.pembayaran.find((p) => p.metode === m.key)?.total ?? 0,
  }));

  return (
    <div className="relative">
      <div className="relative z-10 space-y-6">
        {/* Sapaan */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-ink sm:text-[30px]">
              {salamWaktu()}, {d.outlet.ownerName}! 👋
            </h1>
            <p className="mt-1 text-[15px] text-muted">
              Berikut ringkasan usaha Anda hari ini.
            </p>
          </div>

          <button className="flex h-12 items-center gap-2.5 rounded-2xl border border-line bg-white px-4 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-canvas">
            <CalendarDays className="size-[18px] text-ink-soft" />
            {formatTanggalPanjang(d.hariIni)}
            <ChevronDown className="size-4 text-muted" />
          </button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Penjualan Hari Ini"
            value={formatRupiah(d.ringkasan.omzet)}
            icon={ShoppingCart}
            tone="brand"
            spark={sparkPendek.map((s) => s.penjualan)}
            tren={hitungTren(d.ringkasan.omzet, d.ringkasanKemarin.omzet)}
          />
          <KpiCard
            label="Laba Bersih Hari Ini"
            value={formatRupiah(d.labaBersih)}
            icon={Banknote}
            tone="success"
            spark={sparkPendek.map((s) => s.laba)}
            tren={hitungTren(d.labaBersih, d.labaBersihKemarin)}
            catatan={`setelah beban ${formatRingkas(d.beban)}`}
          />
          <KpiCard
            label="Transaksi Hari Ini"
            value={String(d.ringkasan.jumlahTransaksi)}
            icon={ReceiptText}
            tone="info"
            spark={sparkPendek.map((s) => s.jumlah)}
            tren={hitungTren(
              d.ringkasan.jumlahTransaksi,
              d.ringkasanKemarin.jumlahTransaksi,
            )}
          />
          <KpiCard
            label="Utang Belum Lunas"
            value={formatRupiah(d.utang.sisa)}
            icon={Users}
            tone="warning"
            spark={d.seriesPiutang}
            catatan={`${d.utang.jumlahPelanggan} pelanggan`}
            catatanTone="danger"
          />
        </div>

        {/* Radar 6 pertanyaan */}
        <RadarPanel butir={d.radar} />

        {/* Grafik + utang jatuh tempo */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <SalesChart
              hari={jumlahHari}
              data={d.series.map((s) => ({
                label: formatTanggalPendek(s.tanggal),
                penjualan: s.penjualan,
                laba: s.laba,
              }))}
            />
          </div>
          <div className="xl:col-span-4">
            <DebtPanel
              daftar={d.jatuhTempo}
              hariIni={d.hariIni}
              namaToko={d.outlet.name}
            />
          </div>
        </div>

        {/* Stok, pembayaran, aksi cepat */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <LowStockCard daftar={d.stok.daftar} total={d.stok.total} />
          <PaymentDonut data={pembayaran} />
          <div className="md:col-span-2 xl:col-span-1">
            <QuickActions />
          </div>
        </div>

        <TipsBanner teks="Gunakan POS (Penjualan) untuk mencatat transaksi dengan cepat dan akurat." />
      </div>
    </div>
  );
}
