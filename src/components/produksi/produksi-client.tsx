"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  ChefHat,
  Factory,
  Layers,
  Loader2,
  TriangleAlert,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { GambarProduk } from "@/components/ui/gambar-produk";
import { formatTanggalPendek, formatWaktuSingkat } from "@/lib/date";
import { formatRupiah } from "@/lib/money";
import { formatJumlahBahan } from "@/lib/satuan";
import { cn } from "@/lib/utils";
import { ambilKebutuhanBahan, catatProduksi } from "@/server/actions/produksi";
import type {
  BarisProduksi,
  KebutuhanBahan,
  ProdukProduksi,
} from "@/server/queries/produksi";

export function ProduksiClient({
  produk,
  riwayat,
  statistik,
}: {
  produk: ProdukProduksi[];
  riwayat: BarisProduksi[];
  statistik: { batch: number; unit: number; biaya: number };
}) {
  const [open, setOpen] = useState(false);
  const [terpilih, setTerpilih] = useState<ProdukProduksi | null>(null);

  return (
    <div className="relative z-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">
            Produksi / Olah
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            Bahan baku berkurang sesuai resep, produk jadi bertambah, HPP
            terbentuk.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 xl:grid-cols-3">
        <Kartu
          label="Batch Bulan Ini"
          nilai={String(statistik.batch)}
          icon={Factory}
          tone="brand"
        />
        <Kartu
          label="Unit Diproduksi"
          nilai={String(statistik.unit)}
          icon={Layers}
          tone="success"
        />
        <Kartu
          label="Biaya Produksi"
          nilai={formatRupiah(statistik.biaya)}
          icon={Wallet}
          tone="warning"
        />
      </div>

      <section className="card min-w-0 p-5">
        <h2 className="card-title text-[17px]">Siap Diproduksi</h2>
        <p className="mt-1 text-sm text-muted">
          Hanya produk yang sudah punya resep yang bisa diproduksi.
        </p>

        {produk.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-canvas text-muted">
              <ChefHat className="size-6" />
            </span>
            <p className="mt-3 text-sm font-semibold text-ink">
              Belum ada produk berresep
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted">
              Buka menu Produk &amp; Stok, lalu atur resep lewat tombol koki di
              baris produk.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {produk.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setTerpilih(p);
                  setOpen(true);
                }}
                disabled={p.maksBisaDibuat <= 0}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border border-line p-3.5 text-left transition-all",
                  p.maksBisaDibuat <= 0
                    ? "cursor-not-allowed opacity-60"
                    : "hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card",
                )}
              >
                <GambarProduk
                  gambar={p.gambar}
                  emoji={p.emoji}
                  nama={p.nama}
                  className="size-12"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{p.nama}</p>
                  <p className="tabular text-xs text-muted">
                    HPP {formatRupiah(p.hpp)} · stok {p.stok} {p.unit}
                  </p>
                  <p
                    className={cn(
                      "tabular text-xs font-semibold",
                      p.maksBisaDibuat <= 0 ? "text-danger" : "text-success",
                    )}
                  >
                    {p.maksBisaDibuat <= 0
                      ? "Bahan tidak cukup"
                      : `Bisa dibuat ${p.maksBisaDibuat} ${p.unit}`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="card min-w-0 p-5">
        <h2 className="card-title text-[17px]">Riwayat Produksi</h2>
        {riwayat.length === 0 ? (
          <p className="mt-3 rounded-xl bg-canvas px-4 py-6 text-center text-sm text-muted">
            Belum ada produksi tercatat.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line/70">
            {riwayat.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-canvas">
                  🍳
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {r.produk} <span className="text-muted">x{r.qty}</span>
                  </p>
                  <p className="truncate text-xs text-muted">
                    {formatTanggalPendek(r.tanggal)} ·{" "}
                    {formatWaktuSingkat(r.waktu)} · HPP{" "}
                    {formatRupiah(r.hppPerUnit)}/unit
                    {r.catatan && ` · ${r.catatan}`}
                  </p>
                </div>
                <p className="tabular shrink-0 text-sm font-bold text-ink">
                  {formatRupiah(r.totalBiaya)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ProduksiDialog open={open} onOpenChange={setOpen} produk={terpilih} />
    </div>
  );
}

function ProduksiDialog({
  open,
  onOpenChange,
  produk,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  produk: ProdukProduksi | null;
}) {
  const [qty, setQty] = useState(1);
  const [catatan, setCatatan] = useState("");
  const [bahan, setBahan] = useState<KebutuhanBahan[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !produk) return;
    setQty(1);
    setCatatan("");
    setError(null);
    setBahan([]);
    void ambilKebutuhanBahan(produk.id).then(setBahan);
  }, [open, produk]);

  if (!produk) return null;

  const kurang = bahan.some((b) => b.qtyPerUnit * qty > b.stok);

  async function simpan() {
    if (!produk) return;
    setPending(true);
    setError(null);
    const hasil = await catatProduksi({
      productId: produk.id,
      qty,
      catatan: catatan.trim() || null,
    });
    setPending(false);
    if (!hasil.ok) return setError(hasil.error);
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[3px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100vw-2rem)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between border-b border-line px-6 py-5">
            <div className="flex min-w-0 items-center gap-3">
              <GambarProduk
                gambar={produk.gambar}
                emoji={produk.emoji}
                nama={produk.nama}
                className="size-11 rounded-2xl"
              />
              <div className="min-w-0">
                <Dialog.Title className="truncate text-lg font-extrabold tracking-tight text-ink">
                  Produksi {produk.nama}
                </Dialog.Title>
                <Dialog.Description className="tabular text-sm text-muted">
                  Stok sekarang {produk.stok} {produk.unit} · bisa dibuat{" "}
                  {produk.maksBisaDibuat}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-canvas">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="thin-scroll flex-1 overflow-y-auto px-6 py-5">
            <label className="text-sm font-semibold text-ink">
              Jumlah diproduksi
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-canvas px-4 focus-within:border-brand-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100">
              <input
                autoFocus
                type="number"
                min={1}
                value={qty || ""}
                onChange={(e) => setQty(Number(e.target.value))}
                className="tabular h-12 w-full bg-transparent text-right text-lg font-bold text-ink outline-none"
              />
              <span className="text-sm font-semibold text-muted">
                {produk.unit}
              </span>
            </div>

            <div className="mt-4">
              <p className="text-sm font-semibold text-ink">Bahan terpakai</p>
              <ul className="mt-2 divide-y divide-line/70">
                {bahan.map((b) => {
                  const butuh = b.qtyPerUnit * qty;
                  const cukup = butuh <= b.stok;
                  return (
                    <li
                      key={b.materialId}
                      className="flex items-center gap-3 py-2.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                        {b.nama}
                      </span>
                      <span
                        className={cn(
                          "tabular shrink-0 text-[13px] font-bold",
                          cukup ? "text-ink" : "text-danger",
                        )}
                      >
                        {formatJumlahBahan(butuh, b.satuan)}
                      </span>
                      <span className="tabular w-28 shrink-0 text-right text-xs text-muted">
                        sisa {formatJumlahBahan(b.stok - butuh, b.satuan)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
              <span className="text-sm font-medium text-muted">
                Nilai produksi
              </span>
              <span className="tabular text-lg font-extrabold text-ink">
                {formatRupiah(produk.hpp * qty)}
              </span>
            </div>

            <div className="mt-4">
              <label className="text-sm font-semibold text-ink">
                Catatan <span className="font-normal text-muted">(opsional)</span>
              </label>
              <input
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: batch pagi"
                className="mt-2 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm text-ink outline-none focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {error && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-3 border-t border-line px-6 py-4">
            <Dialog.Close className="h-12 flex-1 rounded-2xl border border-line text-sm font-bold text-ink-soft transition-colors hover:bg-canvas">
              Batal
            </Dialog.Close>
            <button
              onClick={simpan}
              disabled={pending || qty <= 0 || kurang}
              className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              {kurang ? "Bahan tidak cukup" : "Catat Produksi"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const TONE = {
  brand: "from-brand-400 to-brand-600",
  success: "from-emerald-400 to-emerald-600",
  warning: "from-amber-400 to-orange-500",
} as const;

function Kartu({
  label,
  nilai,
  icon: Icon,
  tone,
}: {
  label: string;
  nilai: string;
  icon: typeof Factory;
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
      </span>
    </div>
  );
}
