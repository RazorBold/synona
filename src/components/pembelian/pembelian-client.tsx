"use client";

import {
  HandCoins,
  Receipt,
  ShoppingBasket,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { useState } from "react";

import { BayarHutangDialog } from "@/components/pembelian/bayar-hutang-dialog";
import { PembelianDialog } from "@/components/pembelian/pembelian-dialog";
import { Chip } from "@/components/ui/chip";
import { formatTanggalPendek, labelJatuhTempo } from "@/lib/date";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { AkunKas } from "@/server/queries/kas";
import type { BarisPembelian, ProdukBelanja } from "@/server/queries/pembelian";
import type { BarisBahan } from "@/server/queries/persediaan";

type Statistik = {
  belanja: number;
  nota: number;
  hutangSupplier: number;
  jumlahHutang: number;
  jatuhTempo: number;
};

type Tab = "riwayat" | "hutang";

export function PembelianClient({
  pembelian,
  bahan,
  produk,
  akun,
  statistik,
  hariIni,
}: {
  pembelian: BarisPembelian[];
  bahan: BarisBahan[];
  produk: ProdukBelanja[];
  akun: AkunKas[];
  statistik: Statistik;
  hariIni: string;
}) {
  const [tab, setTab] = useState<Tab>("riwayat");
  const [beliOpen, setBeliOpen] = useState(false);
  const [bayar, setBayar] = useState<BarisPembelian | null>(null);

  const hutang = pembelian.filter((p) => p.status !== "paid");

  return (
    <div className="relative z-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">
            Pembelian Stok
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            Belanja bahan dan barang jual ke supplier — terpisah dari beban.
          </p>
        </div>

        <button
          onClick={() => setBeliOpen(true)}
          disabled={bahan.length === 0 && produk.length === 0}
          className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 px-5 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none"
        >
          <ShoppingBasket className="size-4" />
          Catat Pembelian
        </button>
      </div>

      <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        <Kartu
          label="Belanja Bulan Ini"
          nilai={formatRupiah(statistik.belanja)}
          icon={ShoppingBasket}
          tone="brand"
        />
        <Kartu
          label="Jumlah Nota"
          nilai={String(statistik.nota)}
          icon={Receipt}
          tone="success"
        />
        <Kartu
          label="Hutang Supplier"
          nilai={formatRupiah(statistik.hutangSupplier)}
          catatan={`${statistik.jumlahHutang} nota belum lunas`}
          icon={HandCoins}
          tone="danger"
        />
        <Kartu
          label="Jatuh Tempo"
          nilai={String(statistik.jatuhTempo)}
          catatan="nota lewat tanggal"
          icon={TriangleAlert}
          tone="warning"
        />
      </div>

      <section className="card min-w-0 p-5">
        <div className="thin-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Chip aktif={tab === "riwayat"} onClick={() => setTab("riwayat")}>
            Riwayat Pembelian ({pembelian.length})
          </Chip>
          <Chip aktif={tab === "hutang"} onClick={() => setTab("hutang")}>
            Hutang Supplier ({hutang.length})
          </Chip>
        </div>

        {tab === "riwayat" && (
          <ul className="mt-4 divide-y divide-line/70">
            {pembelian.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-canvas">
                  🧾
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {p.supplier ?? "Tanpa supplier"}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {formatTanggalPendek(p.tanggal)} · {p.jumlahItem} barang ·{" "}
                    {p.rincian}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular text-sm font-bold text-ink">
                    {formatRupiah(p.total)}
                  </p>
                  <p
                    className={cn(
                      "text-[11px] font-semibold",
                      p.status === "paid" ? "text-success" : "text-warning",
                    )}
                  >
                    {p.status === "paid"
                      ? `Lunas${p.namaAkun ? ` · ${p.namaAkun}` : ""}`
                      : `sisa ${formatRupiah(p.sisa)}`}
                  </p>
                </div>
              </li>
            ))}
            {pembelian.length === 0 && (
              <Kosong
                judul="Belum ada pembelian"
                pesan="Catat belanja ke supplier lewat tombol Catat Pembelian. Stok bertambah dan harga modal ikut diperbarui."
              />
            )}
          </ul>
        )}

        {tab === "hutang" && (
          <ul className="mt-4 space-y-3">
            {hutang.map((p) => {
              const tempo = labelJatuhTempo(p.jatuhTempo, hariIni);
              return (
                <li
                  key={p.id}
                  className={cn(
                    "flex flex-wrap items-center gap-4 rounded-2xl border p-4",
                    tempo.tone === "danger"
                      ? "border-red-100 bg-red-50/40"
                      : "border-line",
                  )}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-canvas">
                    🚚
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">
                      {p.supplier ?? "Tanpa supplier"}
                    </p>
                    <p className="truncate text-xs">
                      <span
                        className={cn(
                          "font-medium",
                          tempo.tone === "danger"
                            ? "text-danger"
                            : tempo.tone === "warning"
                              ? "text-warning"
                              : "text-muted",
                        )}
                      >
                        {tempo.text}
                      </span>
                      <span className="text-muted">
                        {" · dibeli "}
                        {formatTanggalPendek(p.tanggal)}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular text-lg font-extrabold text-ink">
                      {formatRupiah(p.sisa)}
                    </p>
                    <p className="tabular text-[11px] text-muted">
                      dari {formatRupiah(p.total)}
                    </p>
                  </div>
                  <button
                    onClick={() => setBayar(p)}
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-400 px-4 text-[13px] font-bold text-white shadow-pop transition-opacity hover:opacity-95"
                  >
                    <HandCoins className="size-4" />
                    Bayar
                  </button>
                </li>
              );
            })}
            {hutang.length === 0 && (
              <Kosong
                judul="Tidak ada hutang supplier"
                pesan="Semua pembelian sudah lunas. 🎉"
              />
            )}
          </ul>
        )}
      </section>

      <PembelianDialog
        open={beliOpen}
        onOpenChange={setBeliOpen}
        bahan={bahan}
        produk={produk}
        akun={akun}
        hariIni={hariIni}
      />
      <BayarHutangDialog
        open={bayar !== null}
        onOpenChange={(v) => !v && setBayar(null)}
        pembelian={bayar}
        akun={akun}
      />
    </div>
  );
}

function Kosong({ judul, pesan }: { judul: string; pesan: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-canvas text-muted">
        <ShoppingBasket className="size-6" />
      </span>
      <p className="mt-3 text-sm font-semibold text-ink">{judul}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{pesan}</p>
    </div>
  );
}

const TONE = {
  brand: "from-brand-400 to-brand-600",
  success: "from-emerald-400 to-emerald-600",
  warning: "from-amber-400 to-orange-500",
  danger: "from-rose-400 to-red-500",
} as const;

function Kartu({
  label,
  nilai,
  catatan,
  icon: Icon,
  tone,
}: {
  label: string;
  nilai: string;
  catatan?: string;
  icon: typeof Wallet;
  tone: keyof typeof TONE;
}) {
  return (
    <div className="card flex items-center gap-3.5 p-4">
      <span
        className={cn(
          "grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white",
          TONE[tone],
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-muted">{label}</span>
        <span className="tabular block text-[15px] font-extrabold leading-tight tracking-tight text-ink sm:text-lg">
          {nilai}
        </span>
        {catatan && (
          <span className="block text-[11px] leading-tight text-muted">
            {catatan}
          </span>
        )}
      </span>
    </div>
  );
}
