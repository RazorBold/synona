import { PosClient } from "@/components/pos/pos-client";
import { formatTanggalPanjang } from "@/lib/date";
import { formatRupiah } from "@/lib/money";
import { businessDate } from "@/lib/date";
import {
  getOutletAktif,
  getRingkasanTanggal,
} from "@/server/queries/dashboard";
import {
  getKategoriPos,
  getPelangganPos,
  getProdukPos,
} from "@/server/queries/pos";

export const dynamic = "force-dynamic";

export default async function KasirPage() {
  const outlet = await getOutletAktif();
  const hariIni = businessDate(new Date(), outlet.timezone);

  const [produk, kategori, pelanggan, ringkasan] = await Promise.all([
    getProdukPos(outlet.id),
    getKategoriPos(outlet.id),
    getPelangganPos(outlet.id),
    getRingkasanTanggal(outlet.id, hariIni),
  ]);

  return (
    <div className="relative z-10 space-y-6 pb-20 xl:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">
            Penjualan (POS)
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            Ketuk produk untuk menambah ke keranjang, lalu tekan Bayar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Ringkas label="Transaksi hari ini" nilai={String(ringkasan.jumlahTransaksi)} />
          <Ringkas
            label="Penjualan hari ini"
            nilai={formatRupiah(ringkasan.omzet)}
            tebal
          />
          <span className="hidden h-14 items-center rounded-2xl border border-line bg-white px-5 text-sm font-semibold text-ink shadow-card lg:flex">
            {formatTanggalPanjang(hariIni)}
          </span>
        </div>
      </div>

      <PosClient
        produk={produk}
        kategori={kategori}
        pelanggan={pelanggan}
        namaToko={outlet.name}
      />
    </div>
  );
}

function Ringkas({
  label,
  nilai,
  tebal = false,
}: {
  label: string;
  nilai: string;
  tebal?: boolean;
}) {
  return (
    <div className="flex h-14 flex-col justify-center gap-0.5 rounded-2xl border border-line bg-white px-5 shadow-card">
      <span className="text-[11px] font-medium text-muted">{label}</span>
      <span
        className={`tabular text-sm leading-tight text-ink ${
          tebal ? "font-extrabold" : "font-bold"
        }`}
      >
        {nilai}
      </span>
    </div>
  );
}
