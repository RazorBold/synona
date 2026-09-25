"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";

import { normalisasiNomorHp } from "@/lib/wa";
import { simpanPelanggan } from "@/server/actions/pelanggan";
import type { BarisPelanggan } from "@/server/queries/pelanggan";
import { aman } from "@/lib/aksi";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pelanggan: BarisPelanggan | null;
};

export function PelangganDialog({ open, onOpenChange, pelanggan }: Props) {
  const edit = Boolean(pelanggan);

  const [nama, setNama] = useState("");
  const [phone, setPhone] = useState("");
  const [catatan, setCatatan] = useState("");
  const [diskon, setDiskon] = useState("0");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNama(pelanggan?.nama ?? "");
    setPhone(pelanggan?.phone ?? "");
    setCatatan(pelanggan?.catatan ?? "");
    setDiskon(
      pelanggan?.diskonBp ? String(pelanggan.diskonBp / 100).replace(".", ",") : "0",
    );
    setError(null);
  }, [open, pelanggan]);

  const nomorRapi = phone.trim() ? normalisasiNomorHp(phone) : "";

  async function simpan() {
    setPending(true);
    setError(null);

    const hasil = await aman(simpanPelanggan({
      id: pelanggan?.id ?? null,
      nama,
      phone: phone.trim() || null,
      catatan: catatan.trim() || null,
      diskonBp: Math.round(Number(diskon.replace(",", ".")) * 100) || 0,
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
                {edit ? "Ubah Pelanggan" : "Tambah Pelanggan"}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-muted">
                Nomor WhatsApp dipakai untuk kirim struk dan pengingat utang.
              </Dialog.Description>
            </div>
            <Dialog.Close className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-canvas">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div>
              <label className="text-sm font-semibold text-ink">
                Nama pelanggan
              </label>
              <input
                autoFocus
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Budi Anto"
                className={inputKelas}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-ink">
                Nomor WhatsApp{" "}
                <span className="font-normal text-muted">(opsional)</span>
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="08123456789"
                className={inputKelas}
              />
              {nomorRapi && (
                <p className="tabular mt-1.5 text-xs text-muted">
                  Disimpan sebagai <span className="font-semibold">{nomorRapi}</span>
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold text-ink">
                Diskon langganan{" "}
                <span className="font-normal text-muted">(opsional)</span>
              </label>
              <div className="relative">
                <input
                  value={diskon}
                  onChange={(e) => setDiskon(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className={inputKelas}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">
                  %
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted">
                Otomatis dipakai di kasir begitu nama ini dipilih. Kalau barangnya
                sedang promo, yang dipakai potongan yang paling besar.
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-ink">
                Catatan <span className="font-normal text-muted">(opsional)</span>
              </label>
              <input
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: langganan warung sebelah"
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
              disabled={pending || nama.trim().length < 2}
              className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              {edit ? "Simpan Perubahan" : "Tambah Pelanggan"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const inputKelas =
  "mt-2 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm font-medium text-ink outline-none transition-shadow placeholder:font-normal placeholder:text-muted focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100";
