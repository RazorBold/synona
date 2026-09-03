"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Archive, Loader2, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";

import { aman } from "@/lib/aksi";
import { cn } from "@/lib/utils";
import { arsipkanAkunKas, simpanAkunKas } from "@/server/actions/kas";
import type { JenisAkun } from "@/lib/kas";
import type { AkunKas } from "@/server/queries/kas";

const JENIS: { key: JenisAkun; label: string; ket: string }[] = [
  { key: "kas", label: "Kas Tunai", ket: "uang di laci" },
  { key: "bank", label: "Bank", ket: "BCA, BRI, Mandiri" },
  { key: "ewallet", label: "Dompet Digital", ket: "QRIS, OVO, Dana" },
];

const METODE: { key: "cash" | "qris" | "transfer"; label: string }[] = [
  { key: "cash", label: "Tunai" },
  { key: "qris", label: "QRIS" },
  { key: "transfer", label: "Transfer" },
];

export function AkunKasDialog({
  open,
  onOpenChange,
  akun,
  jumlahAkun,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  akun: AkunKas | null;
  jumlahAkun: number;
}) {
  const edit = Boolean(akun);

  const [nama, setNama] = useState("");
  const [jenis, setJenis] = useState<JenisAkun>("kas");
  const [namaBank, setNamaBank] = useState("");
  const [nomorRekening, setNomorRekening] = useState("");
  const [saldoAwal, setSaldoAwal] = useState(0);
  const [metodeDefault, setMetodeDefault] = useState<
    "cash" | "qris" | "transfer" | ""
  >("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNama(akun?.nama ?? "");
    setJenis(akun?.jenis ?? "kas");
    setNamaBank(akun?.namaBank ?? "");
    setNomorRekening(akun?.nomorRekening ?? "");
    setSaldoAwal(akun?.saldoAwal ?? 0);
    setMetodeDefault(akun?.metodeDefault ?? "");
    setError(null);
  }, [open, akun]);

  async function simpan() {
    setPending(true);
    setError(null);

    const hasil = await aman(
      simpanAkunKas({
        id: akun?.id ?? null,
        nama,
        jenis,
        namaBank: namaBank.trim() || null,
        nomorRekening: nomorRekening.trim() || null,
        saldoAwal,
        metodeDefault: metodeDefault || null,
      }),
    );

    setPending(false);
    if (!hasil.ok) return setError(hasil.error);
    onOpenChange(false);
  }

  async function arsipkan() {
    if (!akun) return;
    if (
      !confirm(
        `Arsipkan akun "${akun.nama}"? Mutasi lamanya tetap tersimpan di laporan.`,
      )
    )
      return;

    setPending(true);
    const hasil = await aman(arsipkanAkunKas(akun.id));
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
                {edit ? "Ubah Akun Kas" : "Tambah Akun Kas"}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-muted">
                Pisahkan uang laci dari tiap rekening supaya saldonya bisa
                dicocokkan satu per satu.
              </Dialog.Description>
            </div>
            <Dialog.Close className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-canvas">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div>
              <label className="text-sm font-semibold text-ink">Nama akun</label>
              <input
                autoFocus
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: BCA Operasional"
                className={inputKelas}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-ink">Jenis</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {JENIS.map((j) => (
                  <button
                    key={j.key}
                    onClick={() => setJenis(j.key)}
                    className={cn(
                      "rounded-2xl border px-2 py-3 text-center transition-colors",
                      jenis === j.key
                        ? "border-brand-300 bg-brand-50"
                        : "border-line bg-white hover:bg-canvas",
                    )}
                  >
                    <span className="block text-[13px] font-bold text-ink">
                      {j.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-tight text-muted">
                      {j.ket}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {jenis !== "kas" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-ink">
                    Nama bank / penyedia
                  </label>
                  <input
                    value={namaBank}
                    onChange={(e) => setNamaBank(e.target.value)}
                    placeholder="BCA"
                    className={inputKelas}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-ink">
                    Nomor rekening
                  </label>
                  <input
                    value={nomorRekening}
                    onChange={(e) => setNomorRekening(e.target.value)}
                    placeholder="1234567890"
                    className={inputKelas}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-ink">
                Saldo awal
              </label>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-canvas px-4 focus-within:border-brand-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100">
                <span className="text-sm font-semibold text-muted">Rp</span>
                <input
                  type="number"
                  min={0}
                  value={saldoAwal || ""}
                  placeholder="0"
                  onChange={(e) => setSaldoAwal(Number(e.target.value))}
                  className="tabular h-12 w-full bg-transparent text-right text-sm font-bold text-ink outline-none"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-muted">
                Uang yang sudah ada di akun ini sebelum dicatat di Synona.
                Mutasi tidak mengubah angka ini.
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-ink">
                Otomatis dipakai untuk
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => setMetodeDefault("")}
                  className={pilKelas(metodeDefault === "")}
                >
                  Tidak otomatis
                </button>
                {METODE.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMetodeDefault(m.key)}
                    className={pilKelas(metodeDefault === m.key)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-muted">
                Kasir yang tidak sempat memilih akun akan masuk ke sini. Satu
                cara bayar hanya boleh dipegang satu akun.
              </p>
            </div>

            {error && (
              <p className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-3 border-t border-line px-6 py-4">
            {edit && jumlahAkun > 1 && (
              <button
                onClick={arsipkan}
                disabled={pending}
                title="Arsipkan akun"
                className="grid size-12 shrink-0 place-items-center rounded-2xl border border-line text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-danger"
              >
                <Archive className="size-4" />
              </button>
            )}
            <Dialog.Close className="h-12 flex-1 rounded-2xl border border-line text-sm font-bold text-ink-soft transition-colors hover:bg-canvas">
              Batal
            </Dialog.Close>
            <button
              onClick={simpan}
              disabled={pending || nama.trim().length < 2}
              className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Simpan Akun
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function pilKelas(aktif: boolean) {
  return cn(
    "rounded-full px-4 py-2 text-[13px] font-semibold transition-colors",
    aktif
      ? "bg-gradient-to-r from-brand-500 to-brand-400 text-white shadow-pop"
      : "border border-line bg-white text-ink-soft hover:bg-canvas",
  );
}

const inputKelas =
  "mt-2 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm font-medium text-ink outline-none transition-shadow placeholder:font-normal placeholder:text-muted focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100";
