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
import Link from "next/link";
import { useState } from "react";

import { BahanDialog } from "@/components/persediaan/bahan-dialog";
import { StokBahanDialog } from "@/components/persediaan/stok-bahan-dialog";
import { Chip } from "@/components/ui/chip";
import { IconButton } from "@/components/ui/icon-button";
import { formatRupiah } from "@/lib/money";
import { formatJumlahBahan, hargaPerSatuanBesar } from "@/lib/satuan";
import { cn } from "@/lib/utils";
import { arsipkanBahan } from "@/server/actions/persediaan";
import { LABEL_JENIS_BAHAN, type JenisBahan } from "@/lib/persediaan";
import type { BarisBahan } from "@/server/queries/persediaan";
import { aman } from "@/lib/aksi";

type Statistik = {
  jumlah: number;
  nilai: number;
  menipis: number;
  habis: number;
  hutangSupplier: number;
  jumlahHutang: number;
  perJenis: { jenis: string; jumlah: number; nilai: number }[];
};

type Tab = "semua" | JenisBahan;

const TAB: { id: Tab; label: string }[] = [
  { id: "semua", label: "Semua" },
  { id: "baku", label: "Bahan Baku" },
  { id: "setengah_jadi", label: "Setengah Jadi" },
  { id: "jadi", label: "Barang Jadi" },
];

const IKON_JENIS: Record<JenisBahan, string> = {
  baku: "🌾",
  setengah_jadi: "🥣",
  jadi: "📦",
};

export function PersediaanClient({
  bahan,
  statistik,
}: {
  bahan: BarisBahan[];
  statistik: Statistik;
}) {
  const [tab, setTab] = useState<Tab>("semua");
  const [formOpen, setFormOpen] = useState(false);
  const [stokOpen, setStokOpen] = useState(false);
  const [terpilih, setTerpilih] = useState<BarisBahan | null>(null);

  const tampil = tab === "semua" ? bahan : bahan.filter((b) => b.jenis === tab);

  async function arsipkan(b: BarisBahan) {
    if (!confirm(`Arsipkan bahan "${b.nama}"?`)) return;
    const hasil = await aman(arsipkanBahan(b.id));
    if (!hasil.ok) alert(hasil.error);
  }

  return (
    <div className="relative z-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">
            Persediaan
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            Bahan baku, olahan setengah jadi, dan barang jadi di gudang.
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
            Tambah Item
          </button>
          <Link
            href="/pembelian"
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 px-5 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95"
          >
            <ShoppingBasket className="size-4" />
            Beli Stok
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        <Kartu label="Item Persediaan" nilai={String(statistik.jumlah)} icon={Boxes} tone="brand" />
        <Kartu
          label="Nilai Persediaan"
          nilai={formatRupiah(statistik.nilai)}
          icon={Wallet}
          tone="success"
        />
        <Kartu
          label="Stok Menipis"
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
          href="/pembelian"
        />
      </div>

      <section className="card min-w-0 p-5">
        <div className="thin-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {TAB.map((t) => {
            const n =
              t.id === "semua"
                ? statistik.jumlah
                : (statistik.perJenis.find((x) => x.jenis === t.id)?.jumlah ?? 0);
            return (
              <Chip key={t.id} aktif={tab === t.id} onClick={() => setTab(t.id)}>
                {t.label} ({n})
              </Chip>
            );
          })}
        </div>

        <div className="mt-4 hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="pb-3 pl-2 pr-3">Item</th>
                    <th className="pb-3 pr-3">Jenis</th>
                    <th className="pb-3 pr-3 text-right">Harga Rata-rata</th>
                    <th className="pb-3 pr-3 text-right">Stok</th>
                    <th className="pb-3 pr-3 text-right">Nilai Stok</th>
                    <th className="pb-3 pr-3 text-right">Dipakai</th>
                    <th className="pb-3 pr-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {tampil.map((b) => {
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
                              {IKON_JENIS[b.jenis]}
                            </span>
                            <p className="truncate text-sm font-semibold text-ink">
                              {b.nama}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <span className="inline-flex rounded-full bg-canvas px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
                            {LABEL_JENIS_BAHAN[b.jenis]}
                          </span>
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
              {tampil.map((b) => {
                const harga = hargaPerSatuanBesar(b.hargaMilli, b.satuan);
                return (
                  <li key={b.id} className="rounded-2xl border border-line p-3.5">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-canvas">
                        {IKON_JENIS[b.jenis]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">
                          {b.nama}
                        </p>
                        <p className="tabular text-xs text-muted">
                          {LABEL_JENIS_BAHAN[b.jenis]} ·{" "}
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

        {tampil.length === 0 && (
          <Kosong
            judul="Belum ada item di sini"
            pesan="Tambahkan bahan mentah, olahan setengah jadi, atau barang jadi yang dibeli utuh dari supplier."
          />
        )}

      </section>

      <BahanDialog open={formOpen} onOpenChange={setFormOpen} bahan={terpilih} />
      <StokBahanDialog
        open={stokOpen}
        onOpenChange={setStokOpen}
        bahan={terpilih}
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
  href,
}: {
  label: string;
  nilai: string;
  catatan?: string;
  icon: typeof Boxes;
  tone: keyof typeof TONE;
  href?: string;
}) {
  const kelas = cn(
    "card flex items-center gap-3.5 p-4 text-left",
    href && "transition-colors hover:border-brand-200",
  );
  const isi = (
    <>
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
    </>
  );

  return href ? (
    <Link href={href} className={kelas}>
      {isi}
    </Link>
  ) : (
    <div className={kelas}>{isi}</div>
  );
}
