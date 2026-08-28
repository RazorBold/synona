"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";

import { businessDate, tambahHari } from "@/lib/date";
import { formatRupiah } from "@/lib/money";
import { tambahUtang } from "@/server/actions/kasbon";
import { aman } from "@/lib/aksi";

/** Mencatat kasbon manual — utang yang tidak berasal dari transaksi POS. */
export function UtangDialog({
  open,
  onOpenChange,
  pelanggan,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pelanggan: { id: string; nama: string }[];
}) {
  const [customerId, setCustomerId] = useState("");
  const [jumlah, setJumlah] = useState(0);
  const [jatuhTempo, setJatuhTempo] = useState(() =>
    tambahHari(businessDate(), 7),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCustomerId("");
    setJumlah(0);
    setJatuhTempo(tambahHari(businessDate(), 7));
    setError(null);
  }, [open]);

  async function simpan() {
    setPending(true);
    setError(null);

    const hasil = await aman(tambahUtang({
      customerId,
      jumlah,
      jatuhTempo: jatuhTempo || null,
    }));

    setPending(false);
    if (!hasil.ok) return setError(hasil.error);
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[3px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100vw-2rem)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between border-b border-line px-6 py-5">
            <div>
              <Dialog.Title className="text-lg font-extrabold tracking-tight text-ink">
                Catat Utang
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-muted">
                Untuk kasbon di luar POS, misalnya utang lama yang belum
                tercatat.
              </Dialog.Description>
            </div>
            <Dialog.Close className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-canvas">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div>
              <label className="text-sm font-semibold text-ink">Pelanggan</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className={inputKelas}
              >
                <option value="">— Pilih pelanggan —</option>
                {pelanggan.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-ink">
                Jumlah utang
              </label>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-canvas px-4 focus-within:border-brand-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100">
                <span className="text-sm font-semibold text-muted">Rp</span>
                <input
                  type="number"
                  min={0}
                  value={jumlah || ""}
                  placeholder="0"
                  onChange={(e) => setJumlah(Number(e.target.value))}
                  className="tabular h-12 w-full bg-transparent text-right text-lg font-bold text-ink outline-none"
                />
              </div>
              {jumlah > 0 && (
                <p className="tabular mt-1.5 text-xs text-muted">
                  {formatRupiah(jumlah)}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold text-ink">
                Jatuh tempo
              </label>
              <input
                type="date"
                value={jatuhTempo}
                onChange={(e) => setJatuhTempo(e.target.value)}
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
              disabled={pending || !customerId || jumlah <= 0}
              className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Simpan Utang
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const inputKelas =
  "mt-2 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm font-medium text-ink outline-none transition-shadow focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100";
