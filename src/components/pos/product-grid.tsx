"use client";

import { PackageX, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { GambarProduk } from "@/components/ui/gambar-produk";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ProdukPos } from "@/server/queries/pos";
import { useCart } from "@/store/cart";

type Props = {
  produk: ProdukPos[];
  kategori: { id: string; nama: string }[];
};

export function ProductGrid({ produk, kategori }: Props) {
  const [cari, setCari] = useState("");
  const [kategoriAktif, setKategoriAktif] = useState<string | null>(null);
  const tambah = useCart((s) => s.tambah);
  const items = useCart((s) => s.items);

  const qtyDiKeranjang = useMemo(
    () => new Map(items.map((i) => [i.id, i.qty])),
    [items],
  );

  const hasil = useMemo(() => {
    const kunci = cari.trim().toLowerCase();
    return produk.filter((p) => {
      const cocokKategori = !kategoriAktif || p.kategoriId === kategoriAktif;
      const cocokCari = !kunci || p.nama.toLowerCase().includes(kunci);
      return cocokKategori && cocokCari;
    });
  }, [produk, cari, kategoriAktif]);

  return (
    // min-w-0 wajib: sebagai grid item, lebar section akan mengikuti konten
    // terlebar (baris kategori) dan menembus layar tanpa properti ini.
    <section className="card flex min-w-0 flex-col p-5">
      {/* Pencarian + kategori */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          type="search"
          placeholder="Cari nama produk..."
          className="h-12 w-full rounded-2xl border border-line bg-canvas pl-11 pr-4 text-sm text-ink outline-none transition-shadow placeholder:text-muted focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100"
        />
      </div>

      <div className="thin-scroll -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        <Chip
          aktif={kategoriAktif === null}
          onClick={() => setKategoriAktif(null)}
        >
          Semua
        </Chip>
        {kategori.map((k) => (
          <Chip
            key={k.id}
            aktif={kategoriAktif === k.id}
            onClick={() => setKategoriAktif(k.id)}
          >
            {k.nama}
          </Chip>
        ))}
      </div>

      {/* Grid produk */}
      {hasil.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-canvas text-muted">
            <PackageX className="size-6" />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink">
            Produk tidak ditemukan
          </p>
          <p className="mt-1 text-sm text-muted">
            Coba kata kunci lain atau ganti kategori.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {hasil.map((p) => {
            const diKeranjang = qtyDiKeranjang.get(p.id) ?? 0;
            // Produk tanpa lacak stok tidak pernah habis dan tidak pernah penuh.
            const dilacak = p.lacakStok === 1;
            const habis = dilacak && p.stok <= 0;
            const penuh = dilacak && diKeranjang >= p.stok;

            return (
              <button
                key={p.id}
                type="button"
                disabled={habis || penuh}
                onClick={() =>
                  tambah({
                    id: p.id,
                    nama: p.nama,
                    emoji: p.emoji,
                    gambar: p.gambar,
                    harga: p.harga,
                    stok: p.stok,
                    lacakStok: p.lacakStok,
                    unit: p.unit,
                  })
                }
                className={cn(
                  "group relative rounded-2xl border border-line bg-white p-2.5 text-left transition-all",
                  habis || penuh
                    ? "cursor-not-allowed opacity-55"
                    : "hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card active:translate-y-0",
                )}
              >
                <div className="relative aspect-[4/3]">
                  <GambarProduk
                    gambar={p.gambar}
                    emoji={p.emoji}
                    nama={p.nama}
                    className="size-full"
                    ukuranEmoji="text-[32px]"
                  />

                  {diKeranjang > 0 && (
                    <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-400 text-[11px] font-bold text-white shadow-pop">
                      {diKeranjang}
                    </span>
                  )}

                  {habis && (
                    <span className="absolute inset-x-2 bottom-2 rounded-lg bg-danger/90 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-white">
                      Habis
                    </span>
                  )}
                </div>

                <p className="mt-2 line-clamp-2 min-h-[34px] text-[13px] font-semibold leading-tight text-ink">
                  {p.nama}
                </p>

                <div className="mt-1 flex items-baseline justify-between gap-1">
                  <span className="tabular text-sm font-bold text-brand-600">
                    {formatRupiah(p.harga)}
                  </span>
                  {dilacak ? (
                    <span
                      className={cn(
                        "tabular shrink-0 text-[11px] font-medium",
                        p.stok <= p.batasStok ? "text-danger" : "text-muted",
                      )}
                    >
                      Sisa {p.stok}
                    </span>
                  ) : (
                    /* "Sisa 0" pada produk masak-saat-pesan cuma bikin panik. */
                    <span className="shrink-0 text-[11px] font-medium text-muted">
                      Selalu ada
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Chip({
  aktif,
  onClick,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors",
        aktif
          ? "bg-gradient-to-r from-brand-500 to-brand-400 text-white shadow-pop"
          : "border border-line bg-white text-ink-soft hover:bg-canvas",
      )}
    >
      {children}
    </button>
  );
}
