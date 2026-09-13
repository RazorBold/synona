"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";

import { aman } from "@/lib/aksi";
import { KATEGORI_PEMASUKAN, type KategoriPemasukan } from "@/lib/kas";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import { simpanPemasukanLain } from "@/server/actions/kas";
import type { AkunKas } from "@/server/queries/kas";

/**
 * Uang masuk yang bukan dari penjualan. Menambah saldo akun yang dipilih,
 * tapi tidak pernah dihitung sebagai omzet atau untung.
 */
export function PemasukanDialog({
  open,
  onOpenChange,
  akun,
  hariIni,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  akun: AkunKas[];
  hariIni: string;
}) {
  const [kategori, setKategori] = useState<KategoriPemasukan>("modal");
  const [nama, setNama] = useState("");
  const [jumlah, setJumlah] = useState(0);
  const [akunId, setAkunId] = useState("");
  const [tanggal, setTanggal] = useState(hariIni);
  const [catatan, setCatatan] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setKategori("modal");
    setNama("");
    setJumlah(0);
    setAkunId(akun[0]?.id ?? "");
    setTanggal(hariIni);
    setCatatan("");
    setError(null);
  }, [open, akun, hariIni]);

  // Keterangan otomatis mengikuti kategori sampai pemilik mengetik sendiri.
  const label = KATEGORI_PEMASUKAN.find((k) => k.nilai === kategori)?.label ?? "";
  const keterangan = nama.trim() || label;

  async function simpan() {
    setPending(true);
    setError(null);
    const hasil = await aman(
      simpanPemasukanLain({
        kategori,
        nama: keterangan,
        jumlah,
        akunId,
        tanggal,
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
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100vw-2rem)] max-w-[500px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between border-b border-line px-6 py-5">
            <div>
              <Dialog.Title className="text-lg font-extrabold tracking-tight text-ink">
                Catat Pemasukan Lain
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-muted">
                Uang masuk selain penjualan. Menambah saldo kas, tapi tidak
                dihitung sebagai omzet atau untung.
              </Dialog.Description>
            </div>
            <Dialog.Close className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-canvas">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div>
              <label className="text-sm font-semibold text-ink">Jenis pemasukan</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {KATEGORI_PEMASUKAN.map((k) => (
                  <button
                    key={k.nilai}
                    type="button"
                    onClick={() => setKategori(k.nilai)}
                    className={cn(
                      "rounded-2xl border px-3 py-2.5 text-left transition-colors",
                      kategori === k.nilai
                        ? "border-brand-300 bg-brand-50"
                        : "border-line bg-white hover:bg-canvas",
                    )}
                  >
                    <span className="block text-[13px] font-bold text-ink">{k.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-tight text-muted">
                      {k.ket}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-ink">
                Keterangan <span className="font-normal text-muted">(opsional)</span>
              </label>
              <input
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder={`mis. ${label} dari Pak Budi`}
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
                  autoFocus
                  value={jumlah || ""}
                  placeholder="0"
                  onChange={(e) => setJumlah(Number(e.target.value))}
                  className="tabular h-12 w-full bg-transparent text-right text-sm font-bold text-ink outline-none"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-ink">Masuk ke akun</label>
                <select
                  value={akunId}
                  onChange={(e) => setAkunId(e.target.value)}
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
                <label className="text-sm font-semibold text-ink">Tanggal</label>
                <input
                  type="date"
                  value={tanggal}
                  max={hariIni}
                  onChange={(e) => setTanggal(e.target.value)}
                  className={inputKelas}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-ink">
                Catatan <span className="font-normal text-muted">(opsional)</span>
              </label>
              <input
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="mis. jatuh tempo pinjaman Desember"
                className={inputKelas}
              />
            </div>

            {jumlah > 0 && (
              <p className="tabular rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Saldo {akun.find((a) => a.id === akunId)?.nama ?? "akun"} bertambah{" "}
                {formatRupiah(jumlah)}.
              </p>
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
              disabled={pending || jumlah <= 0 || !akunId}
              className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Simpan Pemasukan
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const inputKelas =
  "mt-2 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm font-medium text-ink outline-none transition-shadow placeholder:font-normal placeholder:text-muted focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100";
