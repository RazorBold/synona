"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Camera, ImageOff, Loader2, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { kompresGambar, urlGambar } from "@/lib/gambar";
import { formatRupiah, persen } from "@/lib/money";
import { PilihKategori } from "@/components/ui/pilih-kategori";
import { PilihSatuan } from "@/components/ui/pilih-satuan";
import { cn } from "@/lib/utils";
import { simpanProduk } from "@/server/actions/produk";
import type { BarisProduk } from "@/server/queries/produk";
import { aman } from "@/lib/aksi";

const EMOJI = [
  "📦", "🍚", "🛢️", "🥚", "🌾", "🥛", "☕", "🍵", "💧", "🍹",
  "🥔", "🍪", "🍞", "🧼", "🧴", "🧻", "🍜", "🧂", "🥫", "🌶️",
  "🧃", "🥤", "🍫", "🍤", "🪥", "🍬", "🍗", "🥩", "🧀", "🍎",
];

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kategori: { id: string; nama: string }[];
  /** Satuan yang sudah dipakai produk lain di outlet ini. */
  satuanTerpakai?: string[];
  produk: BarisProduk | null;
};

export function ProdukDialog({
  open,
  onOpenChange,
  kategori,
  produk,
  satuanTerpakai = [],
}: Props) {
  const edit = Boolean(produk);
  const inputFile = useRef<HTMLInputElement>(null);

  const [emoji, setEmoji] = useState("📦");
  const [nama, setNama] = useState("");
  const [sku, setSku] = useState("");
  const [kategoriId, setKategoriId] = useState("");
  const [harga, setHarga] = useState(0);
  const [modal, setModal] = useState(0);
  const [unit, setUnit] = useState("pcs");
  const [batasStok, setBatasStok] = useState(5);
  const [lacakStok, setLacakStok] = useState(true);
  const [stokAwal, setStokAwal] = useState(0);

  const [fotoLama, setFotoLama] = useState<string | null>(null);
  const [fotoBaru, setFotoBaru] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [hapusFoto, setHapusFoto] = useState(false);
  const [memproses, setMemproses] = useState(false);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Isi ulang form setiap dialog dibuka agar tidak membawa sisa data lama.
  useEffect(() => {
    if (!open) return;
    setEmoji(produk?.emoji ?? "📦");
    setNama(produk?.nama ?? "");
    setSku(produk?.sku ?? "");
    setKategoriId(produk?.kategoriId ?? "");
    setHarga(produk?.harga ?? 0);
    setModal(produk?.modal ?? 0);
    setUnit(produk?.unit ?? "pcs");
    setBatasStok(produk?.batasStok ?? 5);
    setLacakStok((produk?.lacakStok ?? 1) === 1);
    setStokAwal(0);
    setFotoLama(produk?.gambar ?? null);
    setFotoBaru(null);
    setPratinjau(null);
    setHapusFoto(false);
    setError(null);
  }, [open, produk]);

  // Object URL wajib dilepas, kalau tidak blob-nya menggantung di memori.
  useEffect(() => {
    return () => {
      if (pratinjau) URL.revokeObjectURL(pratinjau);
    };
  }, [pratinjau]);

  const untung = harga - modal;
  const fotoTampil = pratinjau ?? (hapusFoto ? null : urlGambar(fotoLama));

  async function pilihFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // supaya memilih berkas yang sama lagi tetap memicu
    if (!file) return;

    setError(null);
    setMemproses(true);
    try {
      const kecil = await kompresGambar(file);
      if (pratinjau) URL.revokeObjectURL(pratinjau);
      setFotoBaru(kecil);
      setPratinjau(URL.createObjectURL(kecil));
      setHapusFoto(false);
    } catch {
      setError("Foto tidak bisa dibaca. Coba pilih berkas lain.");
    } finally {
      setMemproses(false);
    }
  }

  function buangFoto() {
    if (pratinjau) URL.revokeObjectURL(pratinjau);
    setPratinjau(null);
    setFotoBaru(null);
    setHapusFoto(true);
  }

  async function simpan() {
    setPending(true);
    setError(null);

    const fd = new FormData();
    if (produk?.id) fd.set("id", produk.id);
    fd.set("nama", nama);
    fd.set("emoji", emoji);
    fd.set("sku", sku);
    fd.set("kategoriId", kategoriId);
    fd.set("harga", String(harga));
    fd.set("modal", String(modal));
    fd.set("stokAwal", String(stokAwal));
    fd.set("batasStok", String(batasStok));
    fd.set("lacakStok", lacakStok ? "1" : "0");
    fd.set("unit", unit);
    if (fotoBaru) fd.set("gambar", fotoBaru);
    if (hapusFoto && !fotoBaru) fd.set("hapusGambar", "1");

    const hasil = await aman(simpanProduk(fd));

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
                {edit ? "Ubah Produk" : "Tambah Produk"}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-muted">
                {edit
                  ? "Stok diubah lewat tombol Stok, bukan dari sini."
                  : "Isi harga jual dan modal supaya laba terhitung otomatis."}
              </Dialog.Description>
            </div>
            <Dialog.Close className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-canvas">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {/* Foto produk */}
            <div>
              <Label>Foto produk</Label>
              <div className="mt-2 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => inputFile.current?.click()}
                  className="group relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-dashed border-line bg-canvas transition-colors hover:border-brand-300"
                >
                  {memproses ? (
                    <Loader2 className="size-6 animate-spin text-brand-500" />
                  ) : fotoTampil ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fotoTampil}
                      alt="Pratinjau foto produk"
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="flex flex-col items-center gap-1 text-muted">
                      <Camera className="size-6" />
                      <span className="text-[11px] font-semibold">
                        Ambil foto
                      </span>
                    </span>
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => inputFile.current?.click()}
                      className="rounded-xl border border-line bg-white px-3.5 py-2 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-canvas"
                    >
                      {fotoTampil ? "Ganti Foto" : "Unggah Foto"}
                    </button>
                    {fotoTampil && (
                      <button
                        type="button"
                        onClick={buangFoto}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-[13px] font-semibold text-ink-soft transition-colors hover:border-red-200 hover:bg-red-50 hover:text-danger"
                      >
                        <ImageOff className="size-4" />
                        Hapus
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    Foto otomatis diperkecil ke 720px sebelum dikirim, jadi
                    hemat kuota. Kalau kosong, ikon di bawah yang dipakai.
                  </p>
                </div>
              </div>

              <input
                ref={inputFile}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={pilihFoto}
                className="hidden"
              />
            </div>

            <div>
              <Label>
                Ikon cadangan{" "}
                <span className="font-normal text-muted">(tanpa foto)</span>
              </Label>
              <div className="thin-scroll mt-2 flex max-h-[92px] flex-wrap gap-1.5 overflow-y-auto">
                {EMOJI.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={cn(
                      "grid size-9 place-items-center rounded-xl border text-lg transition-colors",
                      emoji === e
                        ? "border-brand-300 bg-brand-50"
                        : "border-line bg-white hover:bg-canvas",
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Nama produk</Label>
              <input
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Gula Pasir 1kg"
                className={inputKelas}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Kategori</Label>
                <PilihKategori
                  nilai={kategoriId}
                  onUbah={setKategoriId}
                  kategori={kategori}
                  kelas={inputKelas}
                />
              </div>
              <div>
                <Label>
                  SKU <span className="font-normal text-muted">(opsional)</span>
                </Label>
                <input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="SYN-001"
                  className={inputKelas}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Harga jual</Label>
                <InputRupiah nilai={harga} onChange={setHarga} />
              </div>
              <div>
                <Label>Modal / HPP</Label>
                <InputRupiah nilai={modal} onChange={setModal} />
              </div>
            </div>

            <div
              className={cn(
                "flex items-center justify-between rounded-2xl px-4 py-3",
                untung < 0 ? "bg-red-50" : "bg-emerald-50",
              )}
            >
              <span
                className={cn(
                  "text-sm font-semibold",
                  untung < 0 ? "text-danger" : "text-emerald-700",
                )}
              >
                Untung per {unit}
              </span>
              <span
                className={cn(
                  "tabular text-base font-extrabold",
                  untung < 0 ? "text-danger" : "text-emerald-700",
                )}
              >
                {formatRupiah(untung)}
                {harga > 0 && (
                  <span className="ml-1.5 text-xs font-semibold opacity-70">
                    ({persen(untung, harga)}%)
                  </span>
                )}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Satuan</Label>
                <PilihSatuan
                  nilai={unit}
                  onUbah={setUnit}
                  bawaan={SATUAN_PRODUK_BAWAAN}
                  terpakai={satuanTerpakai}
                  kelas={inputKelas}
                />
              </div>
              {lacakStok && (
                <div>
                  <Label>Batas menipis</Label>
                  <input
                    type="number"
                    min={0}
                    value={batasStok}
                    onChange={(e) => setBatasStok(Number(e.target.value))}
                    className={cn(inputKelas, "tabular text-right")}
                  />
                </div>
              )}
              {!edit && lacakStok && (
                <div>
                  <Label>Stok awal</Label>
                  <input
                    type="number"
                    min={0}
                    value={stokAwal}
                    onChange={(e) => setStokAwal(Number(e.target.value))}
                    className={cn(inputKelas, "tabular text-right")}
                  />
                </div>
              )}
            </div>

            {/* Untuk menu masak-saat-pesan: tidak ada angka stok yang masuk akal. */}
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-canvas px-4 py-3">
              <input
                type="checkbox"
                checked={!lacakStok}
                onChange={(e) => setLacakStok(!e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-brand-500"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">
                  Jangan lacak stok produk ini
                </span>
                <span className="block text-xs text-muted">
                  Untuk menu yang dibuat saat dipesan (nasi goreng, kopi susu) atau
                  jasa. Produk ini tidak akan pernah dianggap habis di kasir.
                </span>
              </span>
            </label>

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
              disabled={pending || memproses || nama.trim().length < 2}
              className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              {edit ? "Simpan Perubahan" : "Tambah Produk"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const SATUAN_PRODUK_BAWAAN = [
  "pcs", "kg", "gram", "liter", "botol", "bungkus", "dus", "pack", "sachet",
  "kaleng", "lembar", "meter", "set", "porsi", "cup",
].map((nilai) => ({ nilai, label: nilai }));

const inputKelas =
  "mt-2 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm font-medium text-ink outline-none transition-shadow placeholder:font-normal placeholder:text-muted focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100";

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-semibold text-ink">{children}</label>;
}

function InputRupiah({
  nilai,
  onChange,
}: {
  nilai: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-canvas px-4 focus-within:border-brand-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100">
      <span className="text-sm font-semibold text-muted">Rp</span>
      <input
        type="number"
        min={0}
        value={nilai || ""}
        placeholder="0"
        onChange={(e) => onChange(Number(e.target.value))}
        className="tabular h-12 w-full bg-transparent text-right text-sm font-bold text-ink outline-none"
      />
    </div>
  );
}
