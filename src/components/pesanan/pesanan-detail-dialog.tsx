"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowRight,
  Ban,
  HandCoins,
  Loader2,
  MessageCircle,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { aman } from "@/lib/aksi";
import { formatTanggalPendek } from "@/lib/date";
import { metodeAkun } from "@/lib/kas";
import { formatRupiah } from "@/lib/money";
import { ALUR_PESANAN, formatJumlahLayanan } from "@/lib/usaha";
import { buildWaLink, pesanSiapDiambil } from "@/lib/wa";
import { cn } from "@/lib/utils";
import { catatPembayaran } from "@/server/actions/kasbon";
import {
  ambilItemPesanan,
  batalkanPesanan,
  ubahStatusPesanan,
} from "@/server/actions/pesanan";
import type { AkunKas } from "@/server/queries/kas";
import type { BarisPesanan, ItemPesanan } from "@/server/queries/pesanan";

export function PesananDetailDialog({
  open,
  onOpenChange,
  pesanan,
  akun,
  hariIni,
  namaToko,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pesanan: BarisPesanan | null;
  akun: AkunKas[];
  hariIni: string;
  namaToko: string;
}) {
  const [item, setItem] = useState<ItemPesanan[]>([]);
  const [bayar, setBayar] = useState(0);
  const [akunKasId, setAkunKasId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !pesanan) return;
    setBayar(pesanan.sisa);
    setAkunKasId(akun[0]?.id ?? "");
    setError(null);
    setItem([]);
    void ambilItemPesanan(pesanan.transactionId)
      .then(setItem)
      .catch(() => setItem([]));
  }, [open, pesanan, akun]);

  if (!pesanan) return null;

  const alur = ALUR_PESANAN.find((a) => a.key === pesanan.status);
  const bisaLanjut = alur?.lanjut !== null && alur?.lanjut !== undefined;

  async function jalankan(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setPending(true);
    setError(null);
    const hasil = await fn();
    setPending(false);
    if (!hasil.ok) return setError(hasil.error ?? "Gagal");
    onOpenChange(false);
  }

  async function majukan() {
    if (!pesanan || !alur?.lanjut) return;
    await jalankan(() =>
      aman(ubahStatusPesanan({ id: pesanan.id, status: alur.lanjut! })),
    );
  }

  async function terimaPelunasan() {
    if (!pesanan?.debtId) return;
    await jalankan(() =>
      aman(
        catatPembayaran({
          debtId: pesanan.debtId,
          jumlah: bayar,
          akunKasId: akunKasId || null,
          metode: metodeAkun(akun.find((a) => a.id === akunKasId)?.jenis),
          catatan: `Pelunasan ${pesanan.nomor}`,
        }),
      ),
    );
  }

  async function batalkan() {
    if (!pesanan) return;
    if (
      !confirm(
        `Batalkan pesanan ${pesanan.nomor}? Nilainya dikeluarkan dari omzet, dan sisa tagihannya ditutup.`,
      )
    )
      return;
    await jalankan(() => aman(batalkanPesanan(pesanan.id)));
  }

  function kabari() {
    if (!pesanan?.telepon || !pesanan.pelanggan) return;
    const teks = pesanSiapDiambil({
      nama: pesanan.pelanggan,
      toko: namaToko,
      nomor: pesanan.nomor,
      sisa: pesanan.sisa,
    });
    window.open(buildWaLink(pesanan.telepon, teks), "_blank", "noopener");
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[3px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100vw-2rem)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between border-b border-line px-6 py-5">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-lg font-extrabold tracking-tight text-ink">
                {pesanan.pelanggan ?? "Tanpa nama"}
              </Dialog.Title>
              <Dialog.Description className="tabular mt-0.5 text-sm text-muted">
                {pesanan.nomor} · masuk {formatTanggalPendek(pesanan.tanggal)}
              </Dialog.Description>
            </div>
            <Dialog.Close className="grid size-9 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-canvas">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {/* Jejak status */}
            <ol className="flex items-center gap-1.5">
              {ALUR_PESANAN.filter((a) => a.key !== "batal").map((a, i) => {
                const urutan = ALUR_PESANAN.findIndex(
                  (x) => x.key === pesanan.status,
                );
                const lewat = i <= urutan;
                return (
                  <li key={a.key} className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block h-1.5 rounded-full transition-colors",
                        pesanan.status === "batal"
                          ? "bg-red-200"
                          : lewat
                            ? "bg-brand-500"
                            : "bg-line",
                      )}
                    />
                    <span
                      className={cn(
                        "mt-1.5 block truncate text-[11px] font-semibold",
                        lewat && pesanan.status !== "batal"
                          ? "text-ink"
                          : "text-muted",
                      )}
                    >
                      {a.label}
                    </span>
                  </li>
                );
              })}
            </ol>

            {pesanan.status === "batal" && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-danger">
                Pesanan ini dibatalkan.
              </p>
            )}

            {pesanan.tandaBarang && (
              <p className="rounded-2xl bg-canvas px-4 py-3 text-sm">
                <span className="font-semibold text-ink">Ciri barang: </span>
                <span className="text-ink-soft">{pesanan.tandaBarang}</span>
              </p>
            )}

            <ul className="divide-y divide-line/70 rounded-2xl border border-line px-4">
              {item.map((it, i) => (
                <li key={i} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {it.nama}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {formatJumlahLayanan(it.qtyMilli, it.satuan)}
                      {it.petugas && ` · ${it.petugas}`}
                    </p>
                  </div>
                  <p className="tabular shrink-0 text-sm font-bold text-ink">
                    {formatRupiah(it.total)}
                  </p>
                </li>
              ))}
              {item.length === 0 && (
                <li className="py-4 text-center text-sm text-muted">
                  Memuat rincian…
                </li>
              )}
            </ul>

            <div className="space-y-1.5 rounded-2xl bg-canvas px-4 py-3">
              <p className="tabular flex justify-between text-sm">
                <span className="text-muted">Total</span>
                <span className="font-bold text-ink">
                  {formatRupiah(pesanan.total)}
                </span>
              </p>
              <p className="tabular flex justify-between text-sm">
                <span className="text-muted">Sudah dibayar</span>
                <span className="font-semibold text-success">
                  {formatRupiah(pesanan.dibayar)}
                </span>
              </p>
              <p className="tabular flex justify-between border-t border-line pt-1.5 text-sm">
                <span className="font-bold text-ink">Sisa</span>
                <span
                  className={cn(
                    "text-base font-extrabold",
                    pesanan.sisa > 0 ? "text-warning" : "text-success",
                  )}
                >
                  {formatRupiah(pesanan.sisa)}
                </span>
              </p>
            </div>

            {pesanan.sisa > 0 && pesanan.debtId && pesanan.status !== "batal" && (
              <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <p className="text-sm font-bold text-amber-700">
                  Terima pelunasan
                </p>
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3">
                  <span className="text-sm font-semibold text-muted">Rp</span>
                  <input
                    type="number"
                    min={0}
                    max={pesanan.sisa}
                    value={bayar || ""}
                    onChange={(e) => setBayar(Number(e.target.value))}
                    className="tabular h-11 w-full bg-transparent text-right text-sm font-bold text-ink outline-none"
                  />
                </div>
                <select
                  value={akunKasId}
                  onChange={(e) => setAkunKasId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm font-medium text-ink outline-none"
                >
                  {akun.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nama}
                    </option>
                  ))}
                </select>
                <button
                  onClick={terimaPelunasan}
                  disabled={pending || bayar <= 0}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-bold text-white transition-opacity hover:opacity-95 disabled:opacity-50"
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <HandCoins className="size-4" />
                  )}
                  Catat Pembayaran
                </button>
              </div>
            )}

            {pesanan.status === "selesai" && pesanan.telepon && (
              <button
                onClick={kabari}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white text-sm font-bold text-ink-soft transition-colors hover:bg-canvas"
              >
                <MessageCircle className="size-4" />
                Kabari lewat WhatsApp
              </button>
            )}

            {error && (
              <p className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-3 border-t border-line px-6 py-4">
            {pesanan.status !== "diambil" && pesanan.status !== "batal" && (
              <button
                onClick={batalkan}
                disabled={pending}
                title="Batalkan pesanan"
                className="grid size-12 shrink-0 place-items-center rounded-2xl border border-line text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-danger"
              >
                <Ban className="size-4" />
              </button>
            )}
            <Dialog.Close className="h-12 flex-1 rounded-2xl border border-line text-sm font-bold text-ink-soft transition-colors hover:bg-canvas">
              Tutup
            </Dialog.Close>
            {bisaLanjut && pesanan.status !== "batal" && (
              <button
                onClick={majukan}
                disabled={pending}
                className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    {alur?.labelLanjut}
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
