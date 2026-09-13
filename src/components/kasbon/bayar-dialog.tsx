"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";

import { AvatarInisial } from "@/components/ui/avatar-inisial";
import { formatWaktuSingkat, labelJatuhTempo } from "@/lib/date";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import { ambilRiwayatCicilan, catatPembayaran } from "@/server/actions/kasbon";
import type { AkunKas } from "@/server/queries/kas";
import type { BarisUtangKasbon, Cicilan } from "@/server/queries/kasbon";
import { aman } from "@/lib/aksi";
import { metodeAkun } from "@/lib/kas";

const TONE_TEMPO = {
  danger: "text-danger",
  warning: "text-warning",
  muted: "text-muted",
} as const;

export function BayarDialog({
  open,
  onOpenChange,
  utang,
  akun,
  hariIni,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  utang: BarisUtangKasbon | null;
  akun: AkunKas[];
  hariIni: string;
}) {
  const [jumlah, setJumlah] = useState(0);
  const [akunKasId, setAkunKasId] = useState("");
  const [catatan, setCatatan] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cicilan, setCicilan] = useState<Cicilan[]>([]);

  useEffect(() => {
    if (!open || !utang) return;
    setJumlah(utang.sisa);
    setAkunKasId(akun[0]?.id ?? "");
    setCatatan("");
    setError(null);
    setCicilan([]);
    void ambilRiwayatCicilan(utang.id)
      .then(setCicilan)
      .catch(() => setCicilan([]));
  }, [open, utang, akun]);

  if (!utang) return null;

  const tempo = labelJatuhTempo(utang.jatuhTempo, hariIni);
  const sisaSetelah = Math.max(0, utang.sisa - jumlah);
  const lebih = jumlah > utang.sisa;

  const nominalCepat = [
    utang.sisa,
    ...[
      Math.round(utang.sisa / 2 / 1000) * 1000,
      20_000,
      50_000,
      100_000,
    ].filter((n) => n > 0 && n < utang.sisa),
  ].filter((n, i, arr) => arr.indexOf(n) === i);

  async function bayar() {
    if (!utang) return;
    setPending(true);
    setError(null);

    const hasil = await aman(catatPembayaran({
      debtId: utang.id,
      jumlah,
      metode: metodeAkun(akun.find((a) => a.id === akunKasId)?.jenis),
      akunKasId: akunKasId || null,
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
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100vw-2rem)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between border-b border-line px-6 py-5">
            <div className="flex min-w-0 items-center gap-3">
              <AvatarInisial nama={utang.nama} className="size-11" />
              <div className="min-w-0">
                <Dialog.Title className="truncate text-lg font-extrabold tracking-tight text-ink">
                  {utang.nama}
                </Dialog.Title>
                <Dialog.Description
                  className={cn("text-sm font-medium", TONE_TEMPO[tempo.tone])}
                >
                  {tempo.text}
                  {utang.invoiceNo && (
                    <span className="text-muted"> · {utang.invoiceNo}</span>
                  )}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-canvas">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="thin-scroll flex-1 overflow-y-auto px-6 py-5">
            <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 text-center">
              <p className="text-sm font-medium text-muted">Sisa utang</p>
              <p className="tabular mt-1 text-[32px] font-extrabold tracking-tight text-ink">
                {formatRupiah(utang.sisa)}
              </p>
              {utang.dibayar > 0 && (
                <p className="tabular mt-1 text-xs text-muted">
                  sudah dibayar {formatRupiah(utang.dibayar)} dari{" "}
                  {formatRupiah(utang.jumlah)}
                </p>
              )}
            </div>

            <div className="mt-5">
              <label className="text-sm font-semibold text-ink">
                Jumlah bayar
              </label>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-canvas px-4 focus-within:border-brand-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100">
                <span className="text-sm font-semibold text-muted">Rp</span>
                <input
                  autoFocus
                  type="number"
                  min={0}
                  value={jumlah || ""}
                  placeholder="0"
                  onChange={(e) => setJumlah(Number(e.target.value))}
                  className="tabular h-12 w-full bg-transparent text-right text-lg font-bold text-ink outline-none"
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {nominalCepat.map((n, i) => (
                  <button
                    key={n}
                    onClick={() => setJumlah(n)}
                    className="tabular rounded-xl border border-line bg-white px-3 py-2 text-[13px] font-semibold text-ink-soft transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600"
                  >
                    {i === 0 ? "Lunasi" : formatRupiah(n)}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={cn(
                "mt-4 flex items-center justify-between rounded-2xl px-4 py-3",
                lebih
                  ? "bg-red-50"
                  : sisaSetelah === 0
                    ? "bg-emerald-50"
                    : "bg-canvas",
              )}
            >
              <span
                className={cn(
                  "text-sm font-semibold",
                  lebih
                    ? "text-danger"
                    : sisaSetelah === 0
                      ? "text-emerald-700"
                      : "text-muted",
                )}
              >
                {lebih
                  ? "Melebihi sisa utang"
                  : sisaSetelah === 0
                    ? "Utang jadi lunas"
                    : "Sisa setelah bayar"}
              </span>
              <span
                className={cn(
                  "tabular text-lg font-extrabold",
                  lebih
                    ? "text-danger"
                    : sisaSetelah === 0
                      ? "text-emerald-700"
                      : "text-ink",
                )}
              >
                {formatRupiah(lebih ? jumlah - utang.sisa : sisaSetelah)}
              </span>
            </div>

            <div className="mt-4">
              <label className="text-sm font-semibold text-ink">
                Uangnya masuk ke
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {akun.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAkunKasId(a.id)}
                    className={cn(
                      "truncate rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition-colors",
                      akunKasId === a.id
                        ? "border-brand-300 bg-brand-50 text-brand-600"
                        : "border-line bg-white text-ink-soft hover:bg-canvas",
                    )}
                  >
                    {a.nama}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm font-semibold text-ink">
                Catatan <span className="font-normal text-muted">(opsional)</span>
              </label>
              <input
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: dibayar lewat anaknya"
                className="mt-2 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm text-ink outline-none placeholder:text-muted focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {error && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
            )}

            {cicilan.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-bold text-ink">Riwayat cicilan</p>
                <ul className="mt-2 divide-y divide-line/70">
                  {cicilan.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 py-2.5">
                      <span className="tabular shrink-0 text-sm font-bold text-success">
                        {formatRupiah(c.jumlah)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs text-muted">
                        {c.catatan ?? "Tanpa catatan"}
                      </span>
                      <span className="shrink-0 text-xs text-muted">
                        {formatWaktuSingkat(c.waktu)}
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
              onClick={bayar}
              disabled={pending || jumlah <= 0 || lebih}
              className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              {sisaSetelah === 0 && !lebih ? "Catat Pelunasan" : "Catat Cicilan"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
