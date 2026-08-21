"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";

import { businessDate } from "@/lib/date";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import { simpanBeban } from "@/server/actions/beban";
import type { BarisBeban, KategoriBeban } from "@/server/queries/beban";

export const KATEGORI: { key: KategoriBeban; label: string; emoji: string }[] = [
  { key: "listrik", label: "Listrik & Air", emoji: "💡" },
  { key: "gaji", label: "Gaji", emoji: "👥" },
  { key: "sewa", label: "Sewa", emoji: "🏠" },
  { key: "internet", label: "Internet", emoji: "📶" },
  { key: "transport", label: "Transport", emoji: "🛵" },
  { key: "lainnya", label: "Lainnya", emoji: "📦" },
];

const METODE: { key: "cash" | "qris" | "transfer" | "other"; label: string }[] = [
  { key: "cash", label: "Tunai" },
  { key: "qris", label: "QRIS" },
  { key: "transfer", label: "Transfer" },
  { key: "other", label: "Lainnya" },
];

export function BebanDialog({
  open,
  onOpenChange,
  beban,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  beban: BarisBeban | null;
}) {
  const edit = Boolean(beban);

  const [kategori, setKategori] = useState<KategoriBeban>("listrik");
  const [nama, setNama] = useState("");
  const [jumlah, setJumlah] = useState(0);
  const [metode, setMetode] = useState<"cash" | "qris" | "transfer" | "other">(
    "cash",
  );
  const [berulang, setBerulang] = useState(false);
  const [tanggal, setTanggal] = useState(() => businessDate());
  const [catatan, setCatatan] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setKategori(beban?.kategori ?? "listrik");
    setNama(beban?.nama ?? "");
    setJumlah(beban?.jumlah ?? 0);
    setMetode(
      (beban?.metode as "cash" | "qris" | "transfer" | "other") ?? "cash",
    );
    setBerulang(Boolean(beban?.berulang));
    setTanggal(beban?.tanggal ?? businessDate());
    setCatatan(beban?.catatan ?? "");
    setError(null);
  }, [open, beban]);

  async function simpan() {
    setPending(true);
    setError(null);

    const hasil = await simpanBeban({
      id: beban?.id ?? null,
      kategori,
      nama,
      jumlah,
      metode,
      berulang,
      tanggal,
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
            <div>
              <Dialog.Title className="text-lg font-extrabold tracking-tight text-ink">
                {edit ? "Ubah Beban" : "Catat Beban"}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-muted">
                Biaya di luar modal barang — listrik, gaji, sewa, dan lainnya.
              </Dialog.Description>
            </div>
            <Dialog.Close className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-canvas">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div>
              <label className="text-sm font-semibold text-ink">Kategori</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {KATEGORI.map((k) => (
                  <button
                    key={k.key}
                    onClick={() => setKategori(k.key)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-center transition-colors",
                      kategori === k.key
                        ? "border-brand-300 bg-brand-50"
                        : "border-line bg-white hover:bg-canvas",
                    )}
                  >
                    <span className="text-lg">{k.emoji}</span>
                    <span
                      className={cn(
                        "text-[11px] font-bold leading-tight",
                        kategori === k.key ? "text-brand-600" : "text-ink-soft",
                      )}
                    >
                      {k.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-ink">
                Nama beban
              </label>
              <input
                autoFocus
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Token listrik Agustus"
                className={inputKelas}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-ink">Jumlah</label>
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-ink">Tanggal</label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className={inputKelas}
                />
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
                  {METODE.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => setBerulang(!berulang)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                berulang
                  ? "border-brand-300 bg-brand-50"
                  : "border-line bg-white hover:bg-canvas",
              )}
            >
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors",
                  berulang
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-line",
                )}
              >
                {berulang && <span className="text-[11px] font-bold">✓</span>}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">
                  Beban rutin tiap bulan
                </span>
                <span className="block text-xs text-muted">
                  Dipakai untuk menghitung titik impas (BEP)
                </span>
              </span>
            </button>

            <div>
              <label className="text-sm font-semibold text-ink">
                Catatan <span className="font-normal text-muted">(opsional)</span>
              </label>
              <input
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: dibayar di Indomaret"
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
              disabled={pending || nama.trim().length < 2 || jumlah <= 0}
              className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              {edit ? "Simpan Perubahan" : "Catat Beban"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const inputKelas =
  "mt-2 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm font-medium text-ink outline-none transition-shadow placeholder:font-normal placeholder:text-muted focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100";
