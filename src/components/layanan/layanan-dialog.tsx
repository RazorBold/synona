"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";

import { aman } from "@/lib/aksi";
import { formatRupiah } from "@/lib/money";
import { PilihKategori } from "@/components/ui/pilih-kategori";
import { PilihSatuan } from "@/components/ui/pilih-satuan";
import {
  SATUAN_ESTIMASI,
  SATUAN_LAYANAN_BAWAAN,
  type SatuanEstimasi,
} from "@/lib/usaha";
import { cn } from "@/lib/utils";
import { simpanLayanan } from "@/server/actions/layanan";
import type { BarisLayanan } from "@/server/queries/layanan";

export function LayananDialog({
  open,
  onOpenChange,
  layanan,
  kategori,
  satuanTerpakai = [],
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  layanan: BarisLayanan | null;
  kategori: { id: string; nama: string }[];
  satuanTerpakai?: string[];
}) {
  const edit = Boolean(layanan);

  const [nama, setNama] = useState("");
  const [emoji, setEmoji] = useState("");
  const [kategoriId, setKategoriId] = useState("");
  const [harga, setHarga] = useState(0);
  const [modal, setModal] = useState(0);
  const [satuan, setSatuan] = useState<string>("pcs");
  const [hargaBisaDiubah, setHargaBisaDiubah] = useState(false);
  const [estimasiNilai, setEstimasiNilai] = useState(0);
  const [estimasiSatuan, setEstimasiSatuan] = useState<SatuanEstimasi>("jam");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNama(layanan?.nama ?? "");
    setEmoji(layanan?.emoji ?? "");
    setKategoriId(layanan?.kategoriId ?? "");
    setHarga(layanan?.harga ?? 0);
    setModal(layanan?.modal ?? 0);
    setSatuan(layanan?.satuan ?? "pcs");
    setHargaBisaDiubah(layanan?.hargaBisaDiubah === 1);
    setEstimasiNilai(layanan?.estimasiNilai ?? 0);
    setEstimasiSatuan(layanan?.estimasiSatuan ?? "jam");
    setError(null);
  }, [open, layanan]);

  const margin = harga - modal;

  async function simpan() {
    setPending(true);
    setError(null);

    const hasil = await aman(
      simpanLayanan({
        id: layanan?.id ?? null,
        nama,
        emoji: emoji.trim() || null,
        kategoriId: kategoriId || null,
        harga,
        modal,
        satuan,
        hargaBisaDiubah,
        estimasiNilai,
        estimasiSatuan,
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
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100vw-2rem)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between border-b border-line px-6 py-5">
            <div>
              <Dialog.Title className="text-lg font-extrabold tracking-tight text-ink">
                {edit ? "Ubah Layanan" : "Tambah Layanan"}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-muted">
                Layanan tidak punya stok — yang dijual pekerjaannya.
              </Dialog.Description>
            </div>
            <Dialog.Close className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-canvas">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="flex gap-3">
              <div className="w-20 shrink-0">
                <label className="text-sm font-semibold text-ink">Ikon</label>
                <input
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  placeholder="🧺"
                  className={`${inputKelas} text-center text-xl`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <label className="text-sm font-semibold text-ink">
                  Nama layanan
                </label>
                <input
                  autoFocus
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Cuci Kering Setrika"
                  className={inputKelas}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-ink">Satuan</label>
              <PilihSatuan
                nilai={satuan}
                onUbah={setSatuan}
                bawaan={SATUAN_LAYANAN_BAWAAN}
                terpakai={satuanTerpakai}
                kelas={inputKelas}
              />
              <p className="mt-1.5 text-xs text-muted">
                Harga di bawah dihitung per satuan ini — per kg, per lembar, per paket.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-ink">
                  Harga per satuan
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-canvas px-4 focus-within:border-brand-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100">
                  <span className="text-sm font-semibold text-muted">Rp</span>
                  <input
                    type="number"
                    min={0}
                    value={harga || ""}
                    placeholder="0"
                    onChange={(e) => setHarga(Number(e.target.value))}
                    className="tabular h-12 w-full bg-transparent text-right text-sm font-bold text-ink outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-ink">
                  Biaya bahan{" "}
                  <span className="font-normal text-muted">(opsional)</span>
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-canvas px-4 focus-within:border-brand-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100">
                  <span className="text-sm font-semibold text-muted">Rp</span>
                  <input
                    type="number"
                    min={0}
                    value={modal || ""}
                    placeholder="0"
                    onChange={(e) => setModal(Number(e.target.value))}
                    className="tabular h-12 w-full bg-transparent text-right text-sm font-bold text-ink outline-none"
                  />
                </div>
              </div>
            </div>

            {harga > 0 && (
              <div
                className={cn(
                  "flex items-center justify-between rounded-2xl px-4 py-3",
                  margin < 0 ? "bg-red-50" : "bg-emerald-50",
                )}
              >
                <span
                  className={cn(
                    "text-sm font-bold",
                    margin < 0 ? "text-danger" : "text-emerald-700",
                  )}
                >
                  Untung per satuan
                </span>
                <span
                  className={cn(
                    "tabular text-lg font-extrabold",
                    margin < 0 ? "text-danger" : "text-emerald-700",
                  )}
                >
                  {formatRupiah(margin)}
                </span>
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-ink">
                Kategori{" "}
                <span className="font-normal text-muted">(opsional)</span>
              </label>
              <PilihKategori
                nilai={kategoriId}
                onUbah={setKategoriId}
                kategori={kategori}
                kelas={inputKelas}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-ink">
                Perkiraan lama kerja{" "}
                <span className="font-normal text-muted">(opsional)</span>
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={estimasiNilai || ""}
                  placeholder="0"
                  onChange={(e) => setEstimasiNilai(Number(e.target.value))}
                  className="tabular h-12 w-28 rounded-2xl border border-line bg-canvas px-4 text-right text-sm font-bold text-ink outline-none focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100"
                />
                <div className="grid flex-1 grid-cols-4 gap-1.5">
                  {SATUAN_ESTIMASI.map((e) => (
                    <button
                      key={e.nilai}
                      type="button"
                      onClick={() => setEstimasiSatuan(e.nilai)}
                      className={cn(
                        "rounded-xl border text-[13px] font-semibold transition-colors",
                        estimasiSatuan === e.nilai
                          ? "border-brand-300 bg-brand-50 text-brand-600"
                          : "border-line bg-white text-ink-soft hover:bg-canvas",
                      )}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setHargaBisaDiubah(!hargaBisaDiubah)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                hargaBisaDiubah
                  ? "border-brand-300 bg-brand-50"
                  : "border-line bg-white hover:bg-canvas",
              )}
            >
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors",
                  hargaBisaDiubah
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-line",
                )}
              >
                {hargaBisaDiubah && (
                  <svg viewBox="0 0 12 12" className="size-3 fill-none stroke-current stroke-[2.5]">
                    <path d="M2 6.5 4.5 9 10 3.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">
                  Harga bisa diubah saat menerima pesanan
                </span>
                <span className="block text-xs text-muted">
                  Untuk pekerjaan yang harganya baru ketahuan setelah dilihat —
                  servis, perbaikan, jahit model bebas.
                </span>
              </span>
            </button>

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
              Simpan Layanan
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const inputKelas =
  "mt-2 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm font-medium text-ink outline-none transition-shadow placeholder:font-normal placeholder:text-muted focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100";
