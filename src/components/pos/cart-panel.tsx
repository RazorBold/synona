"use client";

import { Minus, Plus, ShoppingBag, Tag, Trash2 } from "lucide-react";
import { useState } from "react";

import { GambarProduk } from "@/components/ui/gambar-produk";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  batasQty,
  bersihBaris,
  diskonBaris,
  hitungDiskon,
  hitungJumlahItem,
  hitungSubtotal,
  hitungTotal,
  kotorBaris,
  useCart,
  type ItemKeranjang,
} from "@/store/cart";

export function CartPanel({
  onBayar,
  className,
}: {
  onBayar: () => void;
  className?: string;
}) {
  const { items, setQty, hapus, kosongkan } = useCart();

  const subtotal = hitungSubtotal(items);
  const potongan = hitungDiskon(items);
  const total = hitungTotal(items);
  const jumlahItem = hitungJumlahItem(items);

  return (
    <section className={cn("card flex flex-col overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="card-title flex items-center gap-2 text-[17px]">
          Keranjang
          {jumlahItem > 0 && (
            <span className="tabular grid h-6 min-w-6 place-items-center rounded-full bg-brand-50 px-1.5 text-xs font-bold text-brand-600">
              {jumlahItem}
            </span>
          )}
        </h2>

        {items.length > 0 && (
          <button
            onClick={kosongkan}
            className="text-[13px] font-semibold text-muted transition-colors hover:text-danger"
          >
            Kosongkan
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-canvas text-muted">
            <ShoppingBag className="size-7" />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink">
            Keranjang masih kosong
          </p>
          <p className="mt-1 text-sm text-muted">
            Ketuk produk di sebelah kiri untuk menambahkannya.
          </p>
        </div>
      ) : (
        <ul className="thin-scroll flex-1 divide-y divide-line/70 overflow-y-auto px-5">
          {items.map((i) => (
            <li key={i.id} className="py-3">
              <div className="flex items-start gap-3">
                <GambarProduk
                  gambar={i.gambar}
                  emoji={i.emoji}
                  nama={i.nama}
                  className="size-10"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {i.nama}
                  </p>
                  <p className="tabular text-xs text-muted">
                    {formatRupiah(i.harga)} / {i.unit}
                  </p>
                </div>

                <button
                  onClick={() => hapus(i.id)}
                  aria-label={`Hapus ${i.nama}`}
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-red-50 hover:text-danger"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between pl-[52px]">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setQty(i.id, i.qty - 1)}
                    aria-label={`Kurangi ${i.nama}`}
                    className="grid size-8 place-items-center rounded-lg border border-line text-ink-soft transition-colors hover:bg-canvas"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="tabular w-8 text-center text-sm font-bold text-ink">
                    {i.qty}
                  </span>
                  <button
                    onClick={() => setQty(i.id, i.qty + 1)}
                    disabled={i.qty >= batasQty(i)}
                    aria-label={`Tambah ${i.nama}`}
                    className="grid size-8 place-items-center rounded-lg border border-line text-ink-soft transition-colors hover:bg-canvas disabled:opacity-40"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>

                <div className="text-right">
                  {diskonBaris(i) > 0 && (
                    <p className="tabular text-[11px] text-muted line-through">
                      {formatRupiah(kotorBaris(i))}
                    </p>
                  )}
                  <p className="tabular text-sm font-bold text-ink">
                    {formatRupiah(bersihBaris(i))}
                  </p>
                </div>
              </div>

              <DiskonBaris item={i} />
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-line bg-canvas/60 px-5 py-4">
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular font-semibold text-ink">
              {formatRupiah(subtotal)}
            </dd>
          </div>

          {potongan > 0 && (
            <div className="flex items-center justify-between">
              <dt className="text-muted">Diskon</dt>
              <dd className="tabular font-semibold text-emerald-600">
                − {formatRupiah(potongan)}
              </dd>
            </div>
          )}

          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <dt className="font-semibold text-ink">Total</dt>
            <dd className="tabular text-2xl font-extrabold tracking-tight text-ink">
              {formatRupiah(total)}
            </dd>
          </div>
        </dl>

        <button
          onClick={onBayar}
          disabled={items.length === 0}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none"
        >
          Bayar {items.length > 0 && `· ${formatRupiah(total)}`}
        </button>
      </div>
    </section>
  );
}

/**
 * Diskon untuk satu baris. Tersembunyi di balik tautan kecil supaya
 * keranjang tidak penuh kolom kosong — sebagian besar penjualan tanpa diskon.
 */
function DiskonBaris({ item }: { item: ItemKeranjang }) {
  const setDiskonItem = useCart((s) => s.setDiskonItem);
  const aktif = diskonBaris(item) > 0;
  const [buka, setBuka] = useState(aktif);

  if (!buka && !aktif) {
    return (
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="mt-1.5 ml-[52px] inline-flex items-center gap-1 text-[12px] font-semibold text-brand-500 hover:text-brand-600"
      >
        <Tag className="size-3" /> Beri diskon
      </button>
    );
  }

  return (
    <div className="mt-2 ml-[52px] flex items-center gap-2">
      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-muted">
        <Tag className="size-3" /> Diskon
      </span>
      <div className="flex items-center gap-1 rounded-lg border border-line bg-white px-2 focus-within:border-brand-200 focus-within:ring-2 focus-within:ring-brand-100">
        <span className="text-[12px] text-muted">Rp</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={kotorBaris(item)}
          autoFocus={!aktif}
          value={item.diskon || ""}
          placeholder="0"
          onChange={(e) => setDiskonItem(item.id, Number(e.target.value))}
          aria-label={`Diskon ${item.nama}`}
          className="tabular h-8 w-24 bg-transparent text-right text-[13px] font-semibold text-ink outline-none"
        />
      </div>
      {(item.diskon ?? 0) > kotorBaris(item) && (
        <span className="text-[11px] text-warning">maks. {formatRupiah(kotorBaris(item))}</span>
      )}
    </div>
  );
}
