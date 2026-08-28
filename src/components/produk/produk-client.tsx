"use client";

import {
  Archive,
  Boxes,
  PackagePlus,
  PackageX,
  ChefHat,
  Pencil,
  Plus,
  Search,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

import { ProdukDialog } from "@/components/produk/produk-dialog";
import { ResepDialog } from "@/components/produk/resep-dialog";
import { Chip } from "@/components/ui/chip";
import { GambarProduk } from "@/components/ui/gambar-produk";
import { IconButton } from "@/components/ui/icon-button";
import { StokDialog } from "@/components/produk/stok-dialog";
import type { BarisBahan } from "@/server/queries/bahan";
import { formatRupiah, persen } from "@/lib/money";
import { cn } from "@/lib/utils";
import { arsipkanProduk } from "@/server/actions/produk";
import type { BarisProduk } from "@/server/queries/produk";
import { aman } from "@/lib/aksi";

type Statistik = {
  jumlah: number;
  nilaiModal: number;
  nilaiJual: number;
  menipis: number;
  habis: number;
};

type Status = "semua" | "menipis" | "habis";

export function ProdukClient({
  produk,
  kategori,
  statistik,
  bahan,
  statusAwal = "semua",
}: {
  produk: BarisProduk[];
  kategori: { id: string; nama: string }[];
  statistik: Statistik;
  bahan: BarisBahan[];
  /** Dari ?filter= di URL — dashboard menaut ke sini dengan filter siap pakai. */
  statusAwal?: Status;
}) {
  const [cari, setCari] = useState("");
  const [kategoriId, setKategoriId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(statusAwal);

  const [formOpen, setFormOpen] = useState(false);
  const [stokOpen, setStokOpen] = useState(false);
  const [resepOpen, setResepOpen] = useState(false);
  const [terpilih, setTerpilih] = useState<BarisProduk | null>(null);

  const hasil = useMemo(() => {
    const kunci = cari.trim().toLowerCase();
    return produk.filter((p) => {
      if (kategoriId && p.kategoriId !== kategoriId) return false;
      if (status === "menipis" && !(p.stok > 0 && p.stok <= p.batasStok))
        return false;
      if (status === "habis" && p.stok > 0) return false;
      if (
        kunci &&
        !p.nama.toLowerCase().includes(kunci) &&
        !(p.sku ?? "").toLowerCase().includes(kunci)
      )
        return false;
      return true;
    });
  }, [produk, cari, kategoriId, status]);

  function bukaTambah() {
    setTerpilih(null);
    setFormOpen(true);
  }

  function bukaEdit(p: BarisProduk) {
    setTerpilih(p);
    setFormOpen(true);
  }

  function bukaStok(p: BarisProduk) {
    setTerpilih(p);
    setStokOpen(true);
  }

  function bukaResep(p: BarisProduk) {
    setTerpilih(p);
    setResepOpen(true);
  }

  async function arsipkan(p: BarisProduk) {
    if (!confirm(`Arsipkan "${p.nama}"? Produk disembunyikan dari POS, riwayat penjualannya tetap tersimpan.`))
      return;
    await aman(arsipkanProduk(p.id));
  }

  return (
    <div className="relative z-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">
            Produk &amp; Stok
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            Kelola daftar barang, harga jual, modal, dan pergerakan stok.
          </p>
        </div>

        <button
          onClick={bukaTambah}
          className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 px-5 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95"
        >
          <Plus className="size-4" strokeWidth={2.6} />
          Tambah Produk
        </button>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        <Statistik
          label="Produk Aktif"
          nilai={String(statistik.jumlah)}
          icon={Boxes}
          tone="brand"
        />
        <Statistik
          label="Nilai Stok (modal)"
          nilai={formatRupiah(statistik.nilaiModal)}
          catatan={`Potensi jual ${formatRupiah(statistik.nilaiJual)}`}
          icon={Wallet}
          tone="success"
        />
        <Statistik
          label="Stok Menipis"
          nilai={String(statistik.menipis)}
          icon={TriangleAlert}
          tone="warning"
          onClick={() => setStatus("menipis")}
        />
        <Statistik
          label="Stok Habis"
          nilai={String(statistik.habis)}
          icon={PackageX}
          tone="danger"
          onClick={() => setStatus("habis")}
        />
      </div>

      <section className="card min-w-0 p-5">
        {/* Penyaring */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative lg:w-[320px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              type="search"
              placeholder="Cari nama produk atau SKU..."
              className="h-12 w-full rounded-2xl border border-line bg-canvas pl-11 pr-4 text-sm text-ink outline-none placeholder:text-muted focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100"
            />
          </div>

          <div className="thin-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:ml-auto">
            {(
              [
                ["semua", "Semua"],
                ["menipis", "Menipis"],
                ["habis", "Habis"],
              ] as [Status, string][]
            ).map(([key, label]) => (
              <Chip
                key={key}
                aktif={status === key}
                onClick={() => setStatus(key)}
              >
                {label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="thin-scroll -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          <Chip aktif={kategoriId === null} onClick={() => setKategoriId(null)}>
            Semua kategori
          </Chip>
          {kategori.map((k) => (
            <Chip
              key={k.id}
              aktif={kategoriId === k.id}
              onClick={() => setKategoriId(k.id)}
            >
              {k.nama}
            </Chip>
          ))}
        </div>

        {/* Tabel (layar lebar) */}
        <div className="mt-4 hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="pb-3 pl-2 pr-3">Produk</th>
                <th className="pb-3 pr-3">Kategori</th>
                <th className="pb-3 pr-3 text-right">Harga</th>
                <th className="pb-3 pr-3 text-right">Modal</th>
                <th className="pb-3 pr-3 text-right">Untung</th>
                <th className="pb-3 pr-3 text-right">Stok</th>
                <th className="pb-3 pr-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {hasil.map((p) => (
                <tr
                  key={p.id}
                  className="group border-b border-line/70 transition-colors hover:bg-canvas/70"
                >
                  <td className="py-3 pl-2 pr-3">
                    <div className="flex items-center gap-3">
                      <GambarProduk
                        gambar={p.gambar}
                        emoji={p.emoji}
                        nama={p.nama}
                        className="size-10"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {p.nama}
                        </p>
                        <p className="text-xs text-muted">
                          {p.sku ?? "Tanpa SKU"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-ink-soft">
                      {p.kategori ?? "—"}
                    </span>
                  </td>
                  <td className="tabular py-3 pr-3 text-right text-sm font-bold text-ink">
                    {formatRupiah(p.harga)}
                  </td>
                  <td className="tabular py-3 pr-3 text-right text-sm text-muted">
                    {formatRupiah(p.modal)}
                  </td>
                  <td className="tabular py-3 pr-3 text-right text-sm font-semibold text-success">
                    {formatRupiah(p.harga - p.modal)}
                    <span className="ml-1 text-xs font-medium text-muted">
                      {persen(p.harga - p.modal, p.harga)}%
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <BadgeStok stok={p.stok} batas={p.batasStok} unit={p.unit} />
                  </td>
                  <td className="py-3 pr-2">
                    <div className="flex items-center justify-end gap-1.5">
                      <IconButton
                        label="Atur resep & HPP"
                        onClick={() => bukaResep(p)}
                        icon={ChefHat}
                      />
                      <IconButton
                        label="Ubah stok"
                        onClick={() => bukaStok(p)}
                        icon={PackagePlus}
                      />
                      <IconButton
                        label="Ubah produk"
                        onClick={() => bukaEdit(p)}
                        icon={Pencil}
                      />
                      <IconButton
                        label="Arsipkan"
                        onClick={() => arsipkan(p)}
                        icon={Archive}
                        bahaya
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Kartu (layar kecil) */}
        <ul className="mt-4 space-y-3 lg:hidden">
          {hasil.map((p) => (
            <li key={p.id} className="rounded-2xl border border-line p-3.5">
              <div className="flex items-start gap-3">
                <GambarProduk
                  gambar={p.gambar}
                  emoji={p.emoji}
                  nama={p.nama}
                  className="size-11"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {p.nama}
                  </p>
                  <p className="text-xs text-muted">
                    {p.kategori ?? "Tanpa kategori"} · {p.sku ?? "Tanpa SKU"}
                  </p>
                </div>
                <BadgeStok stok={p.stok} batas={p.batasStok} unit={p.unit} />
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <div>
                  <p className="tabular text-sm font-bold text-ink">
                    {formatRupiah(p.harga)}
                  </p>
                  <p className="tabular text-xs text-muted">
                    modal {formatRupiah(p.modal)} · untung{" "}
                    {formatRupiah(p.harga - p.modal)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <IconButton
                    label="Atur resep & HPP"
                    onClick={() => bukaResep(p)}
                    icon={ChefHat}
                  />
                  <IconButton
                    label="Ubah stok"
                    onClick={() => bukaStok(p)}
                    icon={PackagePlus}
                  />
                  <IconButton
                    label="Ubah produk"
                    onClick={() => bukaEdit(p)}
                    icon={Pencil}
                  />
                  <IconButton
                    label="Arsipkan"
                    onClick={() => arsipkan(p)}
                    icon={Archive}
                    bahaya
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>

        {hasil.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-canvas text-muted">
              <PackageX className="size-6" />
            </span>
            <p className="mt-3 text-sm font-semibold text-ink">
              Tidak ada produk yang cocok
            </p>
            <p className="mt-1 text-sm text-muted">
              Ubah kata kunci, kategori, atau status penyaring.
            </p>
          </div>
        )}

        {hasil.length > 0 && (
          <p className="mt-4 text-xs text-muted">
            Menampilkan {hasil.length} dari {produk.length} produk aktif.
          </p>
        )}
      </section>

      <ProdukDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        kategori={kategori}
        produk={terpilih}
      />
      <StokDialog
        open={stokOpen}
        onOpenChange={setStokOpen}
        produk={terpilih}
      />
      <ResepDialog
        open={resepOpen}
        onOpenChange={setResepOpen}
        produk={terpilih}
        bahan={bahan}
      />
    </div>
  );
}

const TONE = {
  brand: "from-brand-400 to-brand-600",
  success: "from-emerald-400 to-emerald-600",
  warning: "from-amber-400 to-orange-500",
  danger: "from-rose-400 to-red-500",
} as const;

function Statistik({
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

function BadgeStok({
  stok,
  batas,
  unit,
}: {
  stok: number;
  batas: number;
  unit: string;
}) {
  const habis = stok <= 0;
  const menipis = !habis && stok <= batas;

  return (
    <span
      className={cn(
        "tabular inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold",
        habis
          ? "bg-red-50 text-danger"
          : menipis
            ? "bg-amber-50 text-warning"
            : "bg-emerald-50 text-emerald-600",
      )}
    >
      {habis ? "Habis" : `${stok} ${unit}`}
    </span>
  );
}
