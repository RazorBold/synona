"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Plus, Trash2, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";

import { businessDate, tambahHari } from "@/lib/date";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import { simpanPembelian } from "@/server/actions/bahan";
import type { BarisBahan } from "@/server/queries/bahan";

type Baris = { materialId: string; jumlah: number; total: number };

export function PembelianDialog({
  open,
  onOpenChange,
  bahan,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bahan: BarisBahan[];
}) {
  const [supplier, setSupplier] = useState("");
  const [baris, setBaris] = useState<Baris[]>([]);
  const [dibayar, setDibayar] = useState(0);
  const [metode, setMetode] = useState<"cash" | "qris" | "transfer" | "other">(
    "cash",
  );
  const [jatuhTempo, setJatuhTempo] = useState(() =>
    tambahHari(businessDate(), 14),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSupplier("");
    setBaris(bahan[0] ? [{ materialId: bahan[0].id, jumlah: 0, total: 0 }] : []);
    setDibayar(0);
    setMetode("cash");
    setError(null);
  }, [open, bahan]);

  const total = baris.reduce((a, b) => a + b.total, 0);
  const sisa = Math.max(0, total - dibayar);

  function ubah(i: number, patch: Partial<Baris>) {
    setBaris((s) => s.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }

  async function simpan() {
    setPending(true);
    setError(null);

    const hasil = await simpanPembelian({
      supplier: supplier.trim() || null,
      item: baris
        .filter((b) => b.jumlah > 0)
        .map((b) => {
          const m = bahan.find((x) => x.id === b.materialId)!;
          const faktor = m.satuan === "pcs" ? 1 : 1000;
          return {
            materialId: b.materialId,
            qty: b.jumlah * faktor,
            total: b.total,
          };
        }),
      dibayar,
      metode,
      jatuhTempo: sisa > 0 ? jatuhTempo : null,
      catatan: null,
    });

    setPending(false);
    if (!hasil.ok) return setError(hasil.error);
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[3px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100vw-2rem)] max-w-[620px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between border-b border-line px-6 py-5">
            <div>
              <Dialog.Title className="text-lg font-extrabold tracking-tight text-ink">
                Beli Bahan Baku
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-muted">
                Stok bertambah dan harga rata-rata diperbarui otomatis.
              </Dialog.Description>
            </div>
            <Dialog.Close className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-canvas">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div>
              <label className="text-sm font-semibold text-ink">
                Supplier{" "}
                <span className="font-normal text-muted">(opsional)</span>
              </label>
              <input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Contoh: Toko Sembako Jaya"
                className={inputKelas}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink">
                Bahan dibeli
              </label>

              {baris.map((b, i) => {
                const m = bahan.find((x) => x.id === b.materialId);
                const satuanBesar =
                  m?.satuan === "g" ? "kg" : m?.satuan === "ml" ? "liter" : "pcs";

                return (
                  <div
                    key={i}
                    className="rounded-2xl border border-line bg-canvas/60 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <select
                        value={b.materialId}
                        onChange={(e) => ubah(i, { materialId: e.target.value })}
                        className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink outline-none focus:border-brand-200 focus:ring-4 focus:ring-brand-100"
                      >
                        {bahan.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.nama}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() =>
                          setBaris((s) => s.filter((_, idx) => idx !== i))
                        }
                        aria-label="Hapus baris"
                        className="grid size-9 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-red-50 hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3">
                        <input
                          type="number"
                          min={0}
                          value={b.jumlah || ""}
                          placeholder="0"
                          onChange={(e) =>
                            ubah(i, { jumlah: Number(e.target.value) })
                          }
                          className="tabular h-11 w-full bg-transparent text-right text-sm font-bold text-ink outline-none"
                        />
                        <span className="text-xs font-semibold text-muted">
                          {satuanBesar}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3">
                        <span className="text-xs font-semibold text-muted">
                          Rp
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={b.total || ""}
                          placeholder="total"
                          onChange={(e) =>
                            ubah(i, { total: Number(e.target.value) })
                          }
                          className="tabular h-11 w-full bg-transparent text-right text-sm font-bold text-ink outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() =>
                  setBaris((s) => [
                    ...s,
                    { materialId: bahan[0]?.id ?? "", jumlah: 0, total: 0 },
                  ])
                }
                disabled={bahan.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-3 text-sm font-semibold text-ink-soft transition-colors hover:border-brand-300 hover:text-brand-600 disabled:opacity-50"
              >
                <Plus className="size-4" />
                Tambah bahan
              </button>
            </div>

            <div className="rounded-2xl bg-gradient-to-r from-brand-50 to-violet-50 px-5 py-4 text-center">
              <p className="text-sm font-medium text-muted">Total belanja</p>
              <p className="tabular mt-1 text-[28px] font-extrabold tracking-tight text-ink">
                {formatRupiah(total)}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-ink">
                  Dibayar sekarang
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-canvas px-4 focus-within:border-brand-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100">
                  <span className="text-sm font-semibold text-muted">Rp</span>
                  <input
                    type="number"
                    min={0}
                    value={dibayar || ""}
                    placeholder="0"
                    onChange={(e) => setDibayar(Number(e.target.value))}
                    className="tabular h-12 w-full bg-transparent text-right text-sm font-bold text-ink outline-none"
                  />
                </div>
                <button
                  onClick={() => setDibayar(total)}
                  className="mt-2 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-brand-200 hover:text-brand-600"
                >
                  Bayar lunas
                </button>
              </div>

              <div>
                <label className="text-sm font-semibold text-ink">
                  Dibayar lewat
                </label>
                <select
                  value={metode}
                  onChange={(e) =>
                    setMetode(
                      e.target.value as "cash" | "qris" | "transfer" | "other",
                    )
                  }
                  className={inputKelas}
                >
                  <option value="cash">Tunai</option>
                  <option value="qris">QRIS</option>
                  <option value="transfer">Transfer</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
            </div>

            {sisa > 0 && (
              <div className="space-y-3 rounded-2xl bg-amber-50 px-4 py-3">
                <p className="tabular flex items-center justify-between text-sm font-semibold text-amber-700">
                  <span>Jadi hutang ke supplier</span>
                  <span className="text-base font-extrabold">
                    {formatRupiah(sisa)}
                  </span>
                </p>
                <div>
                  <label className="text-xs font-semibold text-amber-700">
                    Jatuh tempo
                  </label>
                  <input
                    type="date"
                    value={jatuhTempo}
                    onChange={(e) => setJatuhTempo(e.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm font-medium text-ink outline-none"
                  />
                </div>
              </div>
            )}

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
              disabled={pending || total <= 0}
              className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Simpan Pembelian
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const inputKelas =
  "mt-2 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm font-medium text-ink outline-none transition-shadow placeholder:font-normal placeholder:text-muted focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100";
