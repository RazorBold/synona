"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";

import { formatWaktuSingkat } from "@/lib/date";
import { formatJumlahBahan } from "@/lib/satuan";
import { cn } from "@/lib/utils";
import { ambilRiwayatBahan, sesuaikanStokBahan } from "@/server/actions/persediaan";
import type { BarisBahan, PergerakanBahan } from "@/server/queries/persediaan";
import { aman } from "@/lib/aksi";

const MODE = [
  { key: "masuk", label: "Tambah", ket: "koreksi lebih" },
  { key: "keluar", label: "Rusak/Buang", ket: "susut" },
  { key: "opname", label: "Opname", ket: "hasil timbang" },
] as const;

const LABEL_TIPE: Record<PergerakanBahan["tipe"], string> = {
  purchase: "Pembelian",
  production: "Dipakai produksi",
  adjustment: "Penyesuaian",
  waste: "Rusak / terbuang",
};

export function StokBahanDialog({
  open,
  onOpenChange,
  bahan,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bahan: BarisBahan | null;
}) {
  const [mode, setMode] = useState<"masuk" | "keluar" | "opname">("masuk");
  const [jumlah, setJumlah] = useState(0);
  const [catatan, setCatatan] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riwayat, setRiwayat] = useState<PergerakanBahan[]>([]);

  useEffect(() => {
    if (!open || !bahan) return;
    setMode("masuk");
    setJumlah(0);
    setCatatan("");
    setError(null);
    setRiwayat([]);
    void ambilRiwayatBahan(bahan.id)
      .then(setRiwayat)
      .catch(() => setRiwayat([]));
  }, [open, bahan]);

  if (!bahan) return null;

  const stokBaru =
    mode === "opname"
      ? jumlah
      : mode === "masuk"
        ? bahan.stok + jumlah
        : bahan.stok - jumlah;
  const tidakSah = stokBaru < 0 || stokBaru === bahan.stok;

  async function simpan() {
    if (!bahan) return;
    setPending(true);
    setError(null);
    const hasil = await aman(sesuaikanStokBahan({
      materialId: bahan.id,
      mode,
      jumlah,
      catatan: catatan.trim() || null,
    }));
    setPending(false);
    if (!hasil.ok) return setError(hasil.error);
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[3px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100vw-2rem)] max-w-[500px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between border-b border-line px-6 py-5">
            <div>
              <Dialog.Title className="text-lg font-extrabold tracking-tight text-ink">
                {bahan.nama}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted">
                Stok sekarang{" "}
                <span className="tabular font-bold text-ink">
                  {formatJumlahBahan(bahan.stok, bahan.satuan)}
                </span>
              </Dialog.Description>
            </div>
            <Dialog.Close className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-canvas">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="thin-scroll flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-3 gap-2">
              {MODE.map((m) => (
                <button
                  key={m.key}
                  onClick={() => {
                    setMode(m.key);
                    setJumlah(m.key === "opname" ? bahan.stok : 0);
                  }}
                  className={cn(
                    "rounded-2xl border px-2 py-3 text-center transition-colors",
                    mode === m.key
                      ? "border-brand-300 bg-brand-50"
                      : "border-line bg-white hover:bg-canvas",
                  )}
                >
                  <span
                    className={cn(
                      "block text-[12px] font-bold leading-tight",
                      mode === m.key ? "text-brand-600" : "text-ink-soft",
                    )}
                  >
                    {m.label}
                  </span>
                  <span className="block text-[10px] text-muted">{m.ket}</span>
                </button>
              ))}
            </div>

            <div className="mt-5">
              <label className="text-sm font-semibold text-ink">
                Jumlah ({bahan.satuan})
              </label>
              <input
                autoFocus
                type="number"
                min={0}
                value={jumlah || ""}
                placeholder="0"
                onChange={(e) => setJumlah(Number(e.target.value))}
                className="tabular mt-2 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-right text-lg font-bold text-ink outline-none focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100"
              />
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
              <span className="text-sm font-medium text-muted">Stok menjadi</span>
              <span
                className={cn(
                  "tabular text-lg font-extrabold",
                  stokBaru < 0
                    ? "text-danger"
                    : stokBaru <= bahan.batasStok
                      ? "text-warning"
                      : "text-success",
                )}
              >
                {formatJumlahBahan(Math.max(0, stokBaru), bahan.satuan)}
              </span>
            </div>

            <div className="mt-4">
              <label className="text-sm font-semibold text-ink">
                Catatan <span className="font-normal text-muted">(opsional)</span>
              </label>
              <input
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: tumpah saat pindah wadah"
                className="mt-2 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm text-ink outline-none focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {error && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
            )}

            {riwayat.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-bold text-ink">Riwayat pergerakan</p>
                <ul className="mt-2 divide-y divide-line/70">
                  {riwayat.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 py-2.5">
                      <span
                        className={cn(
                          "tabular w-24 shrink-0 text-sm font-bold",
                          r.perubahan > 0 ? "text-success" : "text-danger",
                        )}
                      >
                        {r.perubahan > 0 ? "+" : ""}
                        {formatJumlahBahan(r.perubahan, bahan.satuan)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium text-ink">
                          {LABEL_TIPE[r.tipe]}
                        </span>
                        {r.catatan && (
                          <span className="block truncate text-xs text-muted">
                            {r.catatan}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-muted">
                        {formatWaktuSingkat(r.waktu)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex gap-3 border-t border-line px-6 py-4">
            <Dialog.Close className="h-12 flex-1 rounded-2xl border border-line text-sm font-bold text-ink-soft transition-colors hover:bg-canvas">
              Batal
            </Dialog.Close>
            <button
              onClick={simpan}
              disabled={pending || tidakSah}
              className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Simpan Perubahan
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
