"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";

import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { SatuanBahan } from "@/lib/satuan";
import { simpanBahan } from "@/server/actions/bahan";
import type { BarisBahan } from "@/server/queries/bahan";

const SATUAN: { key: SatuanBahan; label: string; ket: string }[] = [
  { key: "g", label: "Gram", ket: "beras, kopi, gula" },
  { key: "ml", label: "Mililiter", ket: "susu, sirup, minyak" },
  { key: "pcs", label: "Pcs", ket: "cup, sedotan, kemasan" },
];

export function BahanDialog({
  open,
  onOpenChange,
  bahan,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bahan: BarisBahan | null;
}) {
  const edit = Boolean(bahan);

  const [nama, setNama] = useState("");
  const [satuan, setSatuan] = useState<SatuanBahan>("g");
  const [batasStok, setBatasStok] = useState(0);
  const [stokAwal, setStokAwal] = useState(0);
  const [hargaAwal, setHargaAwal] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNama(bahan?.nama ?? "");
    setSatuan(bahan?.satuan ?? "g");
    setBatasStok(bahan?.batasStok ?? 0);
    setStokAwal(0);
    setHargaAwal(0);
    setError(null);
  }, [open, bahan]);

  const satuanBesar = satuan === "g" ? "kg" : satuan === "ml" ? "liter" : "pcs";
  const faktor = satuan === "pcs" ? 1 : 1000;

  async function simpan() {
    setPending(true);
    setError(null);

    const hasil = await simpanBahan({
      id: bahan?.id ?? null,
      nama,
      satuan,
      batasStok,
      stokAwal: stokAwal * faktor,
      hargaAwal,
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
            <div>
              <Dialog.Title className="text-lg font-extrabold tracking-tight text-ink">
                {edit ? "Ubah Bahan Baku" : "Tambah Bahan Baku"}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-muted">
                {edit
                  ? "Stok dan harga berubah lewat pembelian atau penyesuaian."
                  : "Bahan mentah yang dipakai untuk membuat produk jualan."}
              </Dialog.Description>
            </div>
            <Dialog.Close className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-canvas">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div>
              <label className="text-sm font-semibold text-ink">
                Nama bahan
              </label>
              <input
                autoFocus
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Biji Kopi Arabika"
                className={inputKelas}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-ink">Satuan</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {SATUAN.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSatuan(s.key)}
                    disabled={edit}
                    className={cn(
                      "rounded-2xl border px-2 py-3 text-center transition-colors disabled:opacity-60",
                      satuan === s.key
                        ? "border-brand-300 bg-brand-50"
                        : "border-line bg-white hover:bg-canvas",
                    )}
                  >
                    <span
                      className={cn(
                        "block text-[13px] font-bold",
                        satuan === s.key ? "text-brand-600" : "text-ink-soft",
                      )}
                    >
                      {s.label}
                    </span>
                    <span className="block text-[10px] text-muted">{s.ket}</span>
                  </button>
                ))}
              </div>
            </div>

            {!edit && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-ink">
                    Stok awal
                  </label>
                  <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-canvas px-4 focus-within:border-brand-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100">
                    <input
                      type="number"
                      min={0}
                      value={stokAwal || ""}
                      placeholder="0"
                      onChange={(e) => setStokAwal(Number(e.target.value))}
                      className="tabular h-12 w-full bg-transparent text-right text-sm font-bold text-ink outline-none"
                    />
                    <span className="text-sm font-semibold text-muted">
                      {satuanBesar}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-ink">
                    Harga per {satuanBesar}
                  </label>
                  <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-canvas px-4 focus-within:border-brand-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100">
                    <span className="text-sm font-semibold text-muted">Rp</span>
                    <input
                      type="number"
                      min={0}
                      value={hargaAwal || ""}
                      placeholder="0"
                      onChange={(e) => setHargaAwal(Number(e.target.value))}
                      className="tabular h-12 w-full bg-transparent text-right text-sm font-bold text-ink outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {!edit && stokAwal > 0 && hargaAwal > 0 && (
              <p className="tabular rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Nilai stok awal {formatRupiah(stokAwal * hargaAwal)}
              </p>
            )}

            <div>
              <label className="text-sm font-semibold text-ink">
                Batas menipis{" "}
                <span className="font-normal text-muted">
                  (dalam {satuan === "pcs" ? "pcs" : satuan})
                </span>
              </label>
              <input
                type="number"
                min={0}
                value={batasStok || ""}
                placeholder="0"
                onChange={(e) => setBatasStok(Number(e.target.value))}
                className={cn(inputKelas, "tabular text-right")}
              />
            </div>

            {error && (
              <p className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">
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
              disabled={pending || nama.trim().length < 2}
              className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              {edit ? "Simpan Perubahan" : "Tambah Bahan"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const inputKelas =
  "mt-2 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm font-medium text-ink outline-none transition-shadow placeholder:font-normal placeholder:text-muted focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100";
