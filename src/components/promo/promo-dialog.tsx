"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, Loader2, Search, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { aman } from "@/lib/aksi";
import { tambahHari } from "@/lib/date";
import { cn } from "@/lib/utils";
import { simpanPromo } from "@/server/actions/promo";
import type { BarisPromo } from "@/server/queries/promo";

const kotak =
  "mt-1.5 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm text-ink outline-none focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100";

const TIPE = [
  { key: "semua" as const, judul: "Semua barang", isi: "Seluruh produk ikut diskon" },
  { key: "produk" as const, judul: "Produk tertentu", isi: "Pilih barangnya sendiri" },
  { key: "kategori" as const, judul: "Per kategori", isi: "Satu atau beberapa kategori" },
];

export function PromoDialog({
  open,
  onOpenChange,
  promo,
  pilihan,
  hariIni,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  promo: BarisPromo | null;
  pilihan: { produk: { id: string; nama: string }[]; kategori: { id: string; nama: string }[] };
  hariIni: string;
}) {
  const router = useRouter();
  const edit = Boolean(promo);

  const [nama, setNama] = useState("");
  const [tipe, setTipe] = useState<"semua" | "produk" | "kategori">("semua");
  const [diskon, setDiskon] = useState("10");
  const [mulai, setMulai] = useState(hariIni);
  const [pakaiSelesai, setPakaiSelesai] = useState(true);
  const [selesai, setSelesai] = useState(hariIni);
  const [sasaran, setSasaran] = useState<string[]>([]);
  const [cari, setCari] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNama(promo?.nama ?? "");
    setTipe(promo?.tipe ?? "semua");
    setDiskon(promo ? String(promo.diskonBp / 100).replace(".", ",") : "10");
    setMulai(promo?.mulai ?? hariIni);
    setPakaiSelesai(promo ? promo.selesai !== null : true);
    setSelesai(promo?.selesai ?? tambahHari(hariIni, 6));
    setSasaran(promo?.sasaranIds ? promo.sasaranIds.split(",") : []);
    setCari("");
    setError(null);
  }, [open, promo, hariIni]);

  const daftar = tipe === "kategori" ? pilihan.kategori : pilihan.produk;
  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return q ? daftar.filter((d) => d.nama.toLowerCase().includes(q)) : daftar;
  }, [daftar, cari]);

  function togglePilih(id: string) {
    setSasaran((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function simpan() {
    setPending(true);
    setError(null);
    const hasil = await aman(
      simpanPromo({
        id: promo?.id ?? null,
        nama,
        tipe,
        diskonBp: Math.round(Number(diskon.replace(",", ".")) * 100) || 0,
        mulai,
        selesai: pakaiSelesai ? selesai : null,
        aktif: promo ? promo.aktif === 1 : true,
        sasaran: tipe === "semua" ? [] : sasaran,
      }),
    );
    setPending(false);
    if (!hasil.ok) return setError(hasil.error);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[3px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100vw-2rem)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between border-b border-line px-6 py-5">
            <div>
              <Dialog.Title className="text-lg font-extrabold tracking-tight text-ink">
                {edit ? "Ubah Promo" : "Buat Promo"}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-muted">
                Diskon berlaku otomatis di kasir selama masa promo.
              </Dialog.Description>
            </div>
            <Dialog.Close className="grid size-9 place-items-center rounded-xl text-muted hover:bg-canvas">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="thin-scroll flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div>
              <label className="text-sm font-semibold text-ink">Nama promo</label>
              <input
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Diskon Akhir Pekan"
                className={kotak}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-ink">Berlaku untuk</label>
              <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
                {TIPE.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      setTipe(t.key);
                      setSasaran([]);
                    }}
                    className={cn(
                      "rounded-2xl border p-3 text-left transition-colors",
                      tipe === t.key ? "border-brand-300 bg-brand-50" : "border-line hover:bg-canvas",
                    )}
                  >
                    <span className="block text-sm font-bold text-ink">{t.judul}</span>
                    <span className="mt-0.5 block text-xs text-muted">{t.isi}</span>
                  </button>
                ))}
              </div>
            </div>

            {tipe !== "semua" && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-ink">
                    Pilih {tipe === "produk" ? "produk" : "kategori"}
                  </label>
                  <span className="text-xs text-muted">{sasaran.length} dipilih</span>
                </div>
                {tipe === "produk" && (
                  <div className="relative mt-1.5">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                    <input
                      value={cari}
                      onChange={(e) => setCari(e.target.value)}
                      placeholder="Cari produk…"
                      className="h-10 w-full rounded-xl border border-line bg-canvas pl-10 pr-3 text-sm outline-none focus:border-brand-200 focus:bg-white"
                    />
                  </div>
                )}
                <ul className="thin-scroll mt-2 max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-line p-2">
                  {tampil.map((d) => {
                    const dipilih = sasaran.includes(d.id);
                    return (
                      <li key={d.id}>
                        <button
                          type="button"
                          onClick={() => togglePilih(d.id)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                            dipilih ? "bg-brand-50 font-semibold text-brand-600" : "hover:bg-canvas",
                          )}
                        >
                          <span
                            className={cn(
                              "grid size-5 shrink-0 place-items-center rounded-md border",
                              dipilih ? "border-brand-500 bg-brand-500 text-white" : "border-line",
                            )}
                          >
                            {dipilih && <Check className="size-3.5" strokeWidth={3} />}
                          </span>
                          <span className="min-w-0 truncate">{d.nama}</span>
                        </button>
                      </li>
                    );
                  })}
                  {tampil.length === 0 && (
                    <li className="px-3 py-6 text-center text-sm text-muted">
                      Tidak ada yang cocok.
                    </li>
                  )}
                </ul>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-ink">Diskon (%)</label>
                <input
                  value={diskon}
                  onChange={(e) => setDiskon(e.target.value)}
                  inputMode="decimal"
                  placeholder="10"
                  className={`tabular ${kotak}`}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-ink">Mulai</label>
                <input
                  type="date"
                  value={mulai}
                  onChange={(e) => setMulai(e.target.value)}
                  className={kotak}
                />
              </div>
            </div>

            <div>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={pakaiSelesai}
                  onChange={(e) => setPakaiSelesai(e.target.checked)}
                  className="size-4 accent-brand-500"
                />
                Ada tanggal selesai
              </label>
              {pakaiSelesai ? (
                <input
                  type="date"
                  value={selesai}
                  min={mulai}
                  onChange={(e) => setSelesai(e.target.value)}
                  className={kotak}
                />
              ) : (
                <p className="mt-1.5 text-xs text-muted">
                  Promo berjalan terus sampai dimatikan.
                </p>
              )}
            </div>

            {error && (
              <p className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-3 border-t border-line px-6 py-4">
            <Dialog.Close className="h-12 flex-1 rounded-2xl border border-line text-sm font-bold text-ink-soft hover:bg-canvas">
              Batal
            </Dialog.Close>
            <button
              onClick={simpan}
              disabled={pending || nama.trim().length < 2}
              className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-sm font-bold text-white shadow-pop disabled:from-line disabled:to-line disabled:text-muted"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              {edit ? "Simpan Perubahan" : "Buat Promo"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
