"use client";

import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { GambarProduk } from "@/components/ui/gambar-produk";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import { hitungJumlahItem, hitungSubtotal, batasQty, useCart } from "@/store/cart";

export function CartPanel({
  onBayar,
  className,
}: {
  onBayar: () => void;
  className?: string;
}) {
  const { items, diskon, setQty, hapus, setDiskon, kosongkan } = useCart();

  const subtotal = hitungSubtotal(items);
  const potongan = Math.min(diskon, subtotal);
  const total = subtotal - potongan;
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

                <p className="tabular text-sm font-bold text-ink">
                  {formatRupiah(i.harga * i.qty)}
                </p>
              </div>
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

          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Diskon</dt>
            <dd className="flex items-center gap-1.5">
              <span className="text-sm text-muted">Rp</span>
              <input
                type="number"
                min={0}
                value={diskon || ""}
                placeholder="0"
                onChange={(e) => setDiskon(Number(e.target.value))}
                className="tabular h-9 w-28 rounded-xl border border-line bg-white px-3 text-right text-sm font-semibold text-ink outline-none focus:border-brand-200 focus:ring-4 focus:ring-brand-100"
              />
            </dd>
          </div>

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
