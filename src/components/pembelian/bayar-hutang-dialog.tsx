"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";

import { aman } from "@/lib/aksi";
import { formatRupiah } from "@/lib/money";
import { bayarHutangSupplier } from "@/server/actions/pembelian";
import type { AkunKas } from "@/server/queries/kas";
import type { BarisPembelian } from "@/server/queries/pembelian";

export function BayarHutangDialog({
  open,
  onOpenChange,
  pembelian,
  akun,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pembelian: BarisPembelian | null;
  akun: AkunKas[];
}) {
  const [jumlah, setJumlah] = useState(0);
  const [akunKasId, setAkunKasId] = useState("");
  const [catatan, setCatatan] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !pembelian) return;
    setJumlah(pembelian.sisa);
    setAkunKasId(akun[0]?.id ?? "");
    setCatatan("");
    setError(null);
  }, [open, pembelian, akun]);

  if (!pembelian) return null;

  const jenisAkun = akun.find((a) => a.id === akunKasId)?.jenis;

  async function simpan() {
    if (!pembelian) return;
    setPending(true);
    setError(null);

    const hasil = await aman(
      bayarHutangSupplier({
        purchaseId: pembelian.id,
        jumlah,
        akunKasId: akunKasId || null,
        metode:
          jenisAkun === "bank" ? "transfer" : jenisAkun === "ewallet" ? "qris" : "cash",
        catatan: catatan.trim() || null,
      }),
    );

    setPending(false);
    if (!hasil.ok) return setError(hasil.error);
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[3px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100vw-2rem)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between border-b border-line px-6 py-5">
            <div>
              <Dialog.Title className="text-lg font-extrabold tracking-tight text-ink">
                Bayar Hutang Supplier
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-muted">
                {pembelian.supplier ?? "Tanpa supplier"} · sisa{" "}
                {formatRupiah(pembelian.sisa)}
              </Dialog.Description>
            </div>
            <Dialog.Close className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-canvas">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div>
              <label className="text-sm font-semibold text-ink">
                Jumlah bayar
              </label>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-canvas px-4 focus-within:border-brand-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100">
                <span className="text-sm font-semibold text-muted">Rp</span>
                <input
                  type="number"
                  min={0}
                  max={pembelian.sisa}
                  value={jumlah || ""}
                  onChange={(e) => setJumlah(Number(e.target.value))}
                  className="tabular h-12 w-full bg-transparent text-right text-sm font-bold text-ink outline-none"
                />
              </div>
              <button
                onClick={() => setJumlah(pembelian.sisa)}
                className="mt-2 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-brand-200 hover:text-brand-600"
              >
                Lunasi semua
              </button>
            </div>

            <div>
              <label className="text-sm font-semibold text-ink">
                Uangnya diambil dari
              </label>
              <select
                value={akunKasId}
                onChange={(e) => setAkunKasId(e.target.value)}
                className={inputKelas}
              >
                {akun.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nama}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-ink">
                Catatan <span className="font-normal text-muted">(opsional)</span>
              </label>
              <input
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: dibayar ke sopir"
                className={inputKelas}
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
              disabled={pending || jumlah <= 0}
              className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Simpan Pembayaran
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const inputKelas =
  "mt-2 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm font-medium text-ink outline-none transition-shadow placeholder:font-normal placeholder:text-muted focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100";
