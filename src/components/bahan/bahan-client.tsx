"use client";

import {
  Archive,
  Boxes,
  HandCoins,
  PackagePlus,
  Pencil,
  Plus,
  ShoppingBasket,
  TriangleAlert,
  Wallet,
  Wheat,
} from "lucide-react";
import { useState } from "react";

import { BahanDialog } from "@/components/bahan/bahan-dialog";
import { PembelianDialog } from "@/components/bahan/pembelian-dialog";
import { StokBahanDialog } from "@/components/bahan/stok-bahan-dialog";
import { Chip } from "@/components/ui/chip";
import { IconButton } from "@/components/ui/icon-button";
import { formatTanggalPendek, labelJatuhTempo } from "@/lib/date";
import { formatRupiah } from "@/lib/money";
import { formatJumlahBahan, hargaPerSatuanBesar } from "@/lib/satuan";
import { cn } from "@/lib/utils";
import { arsipkanBahan, bayarHutangSupplier } from "@/server/actions/bahan";
import type { BarisBahan, BarisPembelian } from "@/server/queries/bahan";
import { aman } from "@/lib/aksi";

type Statistik = {
  jumlah: number;
  nilai: number;
  menipis: number;
  habis: number;
  hutangSupplier: number;
  jumlahHutang: number;
};

type Tab = "stok" | "pembelian" | "hutang";

export function BahanClient({
  bahan,
  pembelian,
  statistik,
  hariIni,
}: {
  bahan: BarisBahan[];
  pembelian: BarisPembelian[];
  statistik: Statistik;
  hariIni: string;
}) {
  const [tab, setTab] = useState<Tab>("stok");
  const [formOpen, setFormOpen] = useState(false);
  const [stokOpen, setStokOpen] = useState(false);
  const [beliOpen, setBeliOpen] = useState(false);
  const [terpilih, setTerpilih] = useState<BarisBahan | null>(null);

  const hutang = pembelian.filter((p) => p.status !== "paid");

  async function arsipkan(b: BarisBahan) {
    if (!confirm(`Arsipkan bahan "${b.nama}"?`)) return;
    const hasil = await aman(arsipkanBahan(b.id));
    if (!hasil.ok) alert(hasil.error);
  }

  async function bayar(p: BarisPembelian) {
    const isi = prompt(
      `Bayar hutang ke ${p.supplier ?? "supplier"}. Sisa ${formatRupiah(p.sisa)}.\nMasukkan jumlah bayar:`,
      String(p.sisa),
    );
    if (!isi) return;
    const hasil = await aman(bayarHutangSupplier({
      purchaseId: p.id,
      jumlah: Number(isi),
      metode: "cash",
      catatan: null,
    }));
    if (!hasil.ok) alert(hasil.error);
  }

  return (
    <div className="relative z-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">
            Bahan Baku
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            Stok bahan, pembelian ke supplier, dan hutangnya.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setTerpilih(null);
              setFormOpen(true);
            }}
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-line bg-white px-4 text-sm font-bold text-ink-soft shadow-card transition-colors hover:bg-canvas"
          >
            <Plus className="size-4" strokeWidth={2.6} />
            Tambah Bahan
          </button>
          <button
            onClick={() => setBeliOpen(true)}
            disabled={bahan.length === 0}
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 px-5 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none"
          >
            <ShoppingBasket className="size-4" />
            Beli Bahan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        <Kartu label="Jenis Bahan" nilai={String(statistik.jumlah)} icon={Boxes} tone="brand" />
        <Kartu
          label="Nilai Stok Bahan"
          nilai={formatRupiah(statistik.nilai)}
          icon={Wallet}
          tone="success"
        />
        <Kartu
          label="Bahan Menipis"
          nilai={String(statistik.menipis + statistik.habis)}
          catatan={`${statistik.habis} habis`}
          icon={TriangleAlert}
          tone="warning"
        />
        <Kartu
          label="Hutang Supplier"
          nilai={formatRupiah(statistik.hutangSupplier)}
          catatan={`${statistik.jumlahHutang} nota`}
          icon={HandCoins}
          tone="danger"
          onClick={() => setTab("hutang")}
        />
      </div>

      <section className="card min-w-0 p-5">
        <div className="thin-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Chip aktif={tab === "stok"} onClick={() => setTab("stok")}>
            Stok Bahan
          </Chip>
          <Chip aktif={tab === "pembelian"} onClick={() => setTab("pembelian")}>
            Pembelian
          </Chip>
          <Chip aktif={tab === "hutang"} onClick={() => setTab("hutang")}>
            Hutang Supplier
          </Chip>
        </div>

        {/* --- Stok bahan --- */}
        {tab === "stok" && (
          <>
            <div className="mt-4 hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="pb-3 pl-2 pr-3">Bahan</th>
                    <th className="pb-3 pr-3 text-right">Harga Rata-rata</th>
                    <th className="pb-3 pr-3 text-right">Stok</th>
                    <th className="pb-3 pr-3 text-right">Nilai Stok</th>
                    <th className="pb-3 pr-3 text-right">Dipakai</th>
                    <th className="pb-3 pr-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {bahan.map((b) => {
                    const harga = hargaPerSatuanBesar(b.hargaMilli, b.satuan);
                    const habis = b.stok <= 0;
                    const menipis = !habis && b.stok <= b.batasStok;

                    return (
                      <tr
                        key={b.id}
                        className="border-b border-line/70 transition-colors hover:bg-canvas/70"
                      >
                        <td className="py-3 pl-2 pr-3">
                          <div className="flex items-center gap-3">
                            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-canvas text-base">
                              🌾
                            </span>
                            <p className="truncate text-sm font-semibold text-ink">
                              {b.nama}
                            </p>
                          </div>
                        </td>
                        <td className="tabular py-3 pr-3 text-right text-sm text-ink-soft">
                          {formatRupiah(harga.nilai)}
                          <span className="text-xs text-muted"> /{harga.label}</span>
                        </td>
                        <td className="py-3 pr-3 text-right">
                          <span
                            className={cn(
                              "tabular inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                              habis
                                ? "bg-red-50 text-danger"
                                : menipis
                                  ? "bg-amber-50 text-warning"
                                  : "bg-emerald-50 text-emerald-600",
                            )}
                          >
                            {habis ? "Habis" : formatJumlahBahan(b.stok, b.satuan)}
                          </span>
                        </td>
                        <td className="tabular py-3 pr-3 text-right text-sm font-bold text-ink">
                          {formatRupiah(b.nilaiStok)}
                        </td>
                        <td className="py-3 pr-3 text-right text-xs text-muted">
                          {b.dipakaiOleh > 0
                            ? `${b.dipakaiOleh} resep`
                            : "belum dipakai"}
                        </td>
                        <td className="py-3 pr-2">
                          <div className="flex items-center justify-end gap-1.5">
                            <IconButton
                              label="Sesuaikan stok"
                              onClick={() => {
                                setTerpilih(b);
                                setStokOpen(true);
                              }}
                              icon={PackagePlus}
                            />
                            <IconButton
                              label="Ubah bahan"
                              onClick={() => {
                                setTerpilih(b);
                                setFormOpen(true);
                              }}
                              icon={Pencil}
                            />
                            <IconButton
                              label="Arsipkan"
                              onClick={() => arsipkan(b)}
                              icon={Archive}
                              bahaya
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="mt-4 space-y-3 lg:hidden">
              {bahan.map((b) => {
                const harga = hargaPerSatuanBesar(b.hargaMilli, b.satuan);
                return (
                  <li key={b.id} className="rounded-2xl border border-line p-3.5">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-canvas">
                        🌾
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">
                          {b.nama}
                        </p>
                        <p className="tabular text-xs text-muted">
                          {formatRupiah(harga.nilai)}/{harga.label} ·{" "}
                          {formatJumlahBahan(b.stok, b.satuan)}
                        </p>
                      </div>
                      <p className="tabular shrink-0 text-sm font-bold text-ink">
                        {formatRupiah(b.nilaiStok)}
                      </p>
                    </div>
                    <div className="mt-3 flex justify-end gap-1.5 border-t border-line pt-3">
                      <IconButton
                        label="Sesuaikan stok"
                        onClick={() => {
                          setTerpilih(b);
                          setStokOpen(true);
                        }}
                        icon={PackagePlus}
                      />
                      <IconButton
                        label="Ubah bahan"
                        onClick={() => {
                          setTerpilih(b);
                          setFormOpen(true);
                        }}
                        icon={Pencil}
                      />
                      <IconButton
                        label="Arsipkan"
                        onClick={() => arsipkan(b)}
                        icon={Archive}
                        bahaya
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            {bahan.length === 0 && (
              <Kosong
                judul="Belum ada bahan baku"
                pesan="Tambahkan bahan mentah seperti biji kopi, susu, atau gula untuk mulai menghitung HPP."
              />
            )}
          </>
        )}

        {/* --- Pembelian --- */}
        {tab === "pembelian" && (
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
                    {formatTanggalPendek(p.tanggal)} · {p.jumlahItem} bahan ·{" "}
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
                      ? "Lunas"
                      : `sisa ${formatRupiah(p.sisa)}`}
                  </p>
                </div>
              </li>
            ))}
            {pembelian.length === 0 && (
              <Kosong
                judul="Belum ada pembelian"
                pesan="Catat belanja bahan ke supplier lewat tombol Beli Bahan."
              />
            )}
          </ul>
        )}

        {/* --- Hutang supplier --- */}
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
                    onClick={() => bayar(p)}
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
                pesan="Semua pembelian bahan sudah lunas. 🎉"
              />
            )}
          </ul>
        )}
      </section>

      <BahanDialog open={formOpen} onOpenChange={setFormOpen} bahan={terpilih} />
      <StokBahanDialog
        open={stokOpen}
        onOpenChange={setStokOpen}
        bahan={terpilih}
      />
      <PembelianDialog
        open={beliOpen}
        onOpenChange={setBeliOpen}
        bahan={bahan}
      />
    </div>
  );
}

function Kosong({ judul, pesan }: { judul: string; pesan: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-canvas text-muted">
        <Wheat className="size-6" />
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
  onClick,
}: {
  label: string;
  nilai: string;
  catatan?: string;
  icon: typeof Boxes;
  tone: keyof typeof TONE;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "card flex items-center gap-3.5 p-4 text-left",
        onClick && "transition-colors hover:border-brand-200",
      )}
    >
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
    </Tag>
  );
}
