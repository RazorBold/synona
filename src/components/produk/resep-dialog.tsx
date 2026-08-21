"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Plus, Trash2, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";

import { formatRupiah, persen } from "@/lib/money";
import { cn } from "@/lib/utils";
import { ambilResep, simpanResep } from "@/server/actions/resep";
import type { BarisBahan } from "@/server/queries/bahan";
import type { BarisProduk } from "@/server/queries/produk";

type Baris = { materialId: string; qty: number };

export function ResepDialog({
  open,
  onOpenChange,
  produk,
  bahan,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  produk: BarisProduk | null;
  bahan: BarisBahan[];
}) {
  const [mode, setMode] = useState<"manual" | "resep">("resep");
  const [item, setItem] = useState<Baris[]>([]);
  const [labor, setLabor] = useState(0);
  const [overhead, setOverhead] = useState(0);
  const [muat, setMuat] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !produk) return;
    setMuat(true);
    setError(null);
    void ambilResep(produk.id).then((r) => {
      // Produk yang belum punya resep dianggap sedang disiapkan untuk HPP
      // otomatis — kalau tidak, pemilik mengisi resep lalu heran HPP-nya
      // tidak berubah karena mode masih "manual".
      setMode(r?.item.length ? r.mode : "resep");
      setLabor(r?.laborCost ?? 0);
      setOverhead(r?.overheadCost ?? 0);
      setItem(
        r?.item.length
          ? r.item.map((i) => ({ materialId: i.materialId, qty: i.qty }))
          : bahan[0]
            ? [{ materialId: bahan[0].id, qty: 0 }]
            : [],
      );
      setMuat(false);
    });
  }, [open, produk, bahan]);

  if (!produk) return null;

  const biayaBahan = item.reduce((a, i) => {
    const m = bahan.find((b) => b.id === i.materialId);
    return a + (m ? (i.qty * m.hargaMilli) / 1000 : 0);
  }, 0);

  const hpp = Math.round(biayaBahan) + labor + overhead;
  const untung = produk.harga - hpp;

  async function simpan() {
    if (!produk) return;
    setPending(true);
    setError(null);

    const hasil = await simpanResep({
      productId: produk.id,
      mode,
      laborCost: labor,
      overheadCost: overhead,
      item: item.filter((i) => i.qty > 0),
    });

    setPending(false);
    if (!hasil.ok) return setError(hasil.error);
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[3px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100vw-2rem)] max-w-[600px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between border-b border-line px-6 py-5">
            <div>
              <Dialog.Title className="text-lg font-extrabold tracking-tight text-ink">
                Resep · {produk.nama}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-muted">
                Bahan yang dipakai untuk membuat 1 {produk.unit}. Inilah
                jembatan stok bahan ke biaya.
              </Dialog.Description>
            </div>
            <Dialog.Close className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-canvas">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["resep", "HPP dari resep", "dihitung otomatis"],
                  ["manual", "Modal manual", "diketik sendiri"],
                ] as const
              ).map(([key, judul, ket]) => (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={cn(
                    "rounded-2xl border px-3 py-3 text-left transition-colors",
                    mode === key
                      ? "border-brand-300 bg-brand-50"
                      : "border-line bg-white hover:bg-canvas",
                  )}
                >
                  <span
                    className={cn(
                      "block text-[13px] font-bold",
                      mode === key ? "text-brand-600" : "text-ink-soft",
                    )}
                  >
                    {judul}
                  </span>
                  <span className="block text-[11px] text-muted">{ket}</span>
                </button>
              ))}
            </div>

            {muat ? (
              <div className="flex items-center justify-center py-12 text-muted">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : bahan.length === 0 ? (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Belum ada bahan baku. Tambahkan dulu di menu Bahan Baku.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-ink">
                    Bahan yang dipakai
                  </label>

                  {item.map((b, i) => {
                    const m = bahan.find((x) => x.id === b.materialId);
                    const biaya = m ? Math.round((b.qty * m.hargaMilli) / 1000) : 0;

                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-2xl border border-line bg-canvas/60 p-2.5"
                      >
                        <select
                          value={b.materialId}
                          onChange={(e) =>
                            setItem((s) =>
                              s.map((x, idx) =>
                                idx === i
                                  ? { ...x, materialId: e.target.value }
                                  : x,
                              ),
                            )
                          }
                          className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink outline-none focus:border-brand-200"
                        >
                          {bahan.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.nama}
                            </option>
                          ))}
                        </select>

                        <div className="flex w-28 shrink-0 items-center gap-1 rounded-xl border border-line bg-white px-2">
                          <input
                            type="number"
                            min={0}
                            value={b.qty || ""}
                            placeholder="0"
                            onChange={(e) =>
                              setItem((s) =>
                                s.map((x, idx) =>
                                  idx === i
                                    ? { ...x, qty: Number(e.target.value) }
                                    : x,
                                ),
                              )
                            }
                            className="tabular h-10 w-full bg-transparent text-right text-sm font-bold text-ink outline-none"
                          />
                          <span className="text-[11px] font-semibold text-muted">
                            {m?.satuan}
                          </span>
                        </div>

                        <span className="tabular w-24 shrink-0 text-right text-sm font-semibold text-ink">
                          {formatRupiah(biaya)}
                        </span>

                        <button
                          onClick={() =>
                            setItem((s) => s.filter((_, idx) => idx !== i))
                          }
                          aria-label="Hapus bahan"
                          className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-red-50 hover:text-danger"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    );
                  })}

                  <button
                    onClick={() =>
                      setItem((s) => [
                        ...s,
                        { materialId: bahan[0].id, qty: 0 },
                      ])
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-brand-300 hover:text-brand-600"
                  >
                    <Plus className="size-4" />
                    Tambah bahan
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-ink">
                      Biaya tenaga
                    </label>
                    <InputRupiah nilai={labor} onChange={setLabor} />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-ink">
                      Overhead
                    </label>
                    <InputRupiah nilai={overhead} onChange={setOverhead} />
                  </div>
                </div>

                {/* Rantai hitung HPP */}
                <div className="rounded-2xl border border-line bg-canvas/70 p-4">
                  <Baris2 label="Biaya bahan" nilai={Math.round(biayaBahan)} />
                  <Baris2 label="Biaya tenaga" nilai={labor} />
                  <Baris2 label="Overhead" nilai={overhead} />
                  <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
                    <span className="text-sm font-bold text-ink">
                      HPP per {produk.unit}
                    </span>
                    <span className="tabular text-xl font-extrabold text-ink">
                      {formatRupiah(hpp)}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "mt-3 flex items-center justify-between rounded-xl px-3 py-2",
                      untung < 0 ? "bg-red-50" : "bg-emerald-50",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[13px] font-semibold",
                        untung < 0 ? "text-danger" : "text-emerald-700",
                      )}
                    >
                      Jual {formatRupiah(produk.harga)} → laba kotor
                    </span>
                    <span
                      className={cn(
                        "tabular text-sm font-extrabold",
                        untung < 0 ? "text-danger" : "text-emerald-700",
                      )}
                    >
                      {formatRupiah(untung)}
                      {produk.harga > 0 && (
                        <span className="ml-1 text-[11px] opacity-70">
                          ({persen(untung, produk.harga)}%)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </>
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
              disabled={pending || muat}
              className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Simpan Resep
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Baris2({ label, nilai }: { label: string; nilai: number }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="tabular text-[13px] font-semibold text-ink">
        {formatRupiah(nilai)}
      </span>
    </div>
  );
}

function InputRupiah({
  nilai,
  onChange,
}: {
  nilai: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-canvas px-4 focus-within:border-brand-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100">
      <span className="text-sm font-semibold text-muted">Rp</span>
      <input
        type="number"
        min={0}
        value={nilai || ""}
        placeholder="0"
        onChange={(e) => onChange(Number(e.target.value))}
        className="tabular h-12 w-full bg-transparent text-right text-sm font-bold text-ink outline-none"
      />
    </div>
  );
}
