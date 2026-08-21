"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ShoppingCart, X } from "lucide-react";
import { useEffect, useState } from "react";

import { CartPanel } from "@/components/pos/cart-panel";
import { PaymentDialog } from "@/components/pos/payment-dialog";
import { ProductGrid } from "@/components/pos/product-grid";
import { formatRupiah } from "@/lib/money";
import type { ProdukPos } from "@/server/queries/pos";
import { hitungJumlahItem, hitungSubtotal, useCart } from "@/store/cart";

type Props = {
  produk: ProdukPos[];
  kategori: { id: string; nama: string }[];
  pelanggan: { id: string; nama: string; phone: string | null }[];
  namaToko: string;
};

export function PosClient({ produk, kategori, pelanggan, namaToko }: Props) {
  const [bayarOpen, setBayarOpen] = useState(false);
  const [keranjangOpen, setKeranjangOpen] = useState(false);

  const items = useCart((s) => s.items);
  const diskon = useCart((s) => s.diskon);

  // Keranjang tersimpan dibaca setelah mount (lihat skipHydration di store).
  useEffect(() => {
    void useCart.persist.rehydrate();
  }, []);

  const subtotal = hitungSubtotal(items);
  const total = subtotal - Math.min(diskon, subtotal);
  const jumlah = hitungJumlahItem(items);

  function bukaPembayaran() {
    setKeranjangOpen(false);
    setBayarOpen(true);
  }

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_384px]">
        <ProductGrid produk={produk} kategori={kategori} />

        <CartPanel
          onBayar={bukaPembayaran}
          className="sticky top-[92px] hidden max-h-[calc(100dvh-116px)] xl:flex"
        />
      </div>

      {/* Bilah keranjang untuk layar kecil */}
      {jumlah > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur-md xl:hidden">
          <button
            onClick={() => setKeranjangOpen(true)}
            className="flex h-12 w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 px-4 text-white shadow-pop"
          >
            <span className="relative">
              <ShoppingCart className="size-5" />
              <span className="tabular absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-white text-[10px] font-bold text-brand-600">
                {jumlah}
              </span>
            </span>
            <span className="text-sm font-bold">Lihat Keranjang</span>
            <span className="tabular ml-auto text-sm font-extrabold">
              {formatRupiah(total)}
            </span>
          </button>
        </div>
      )}

      {/* Keranjang sebagai sheet di layar kecil */}
      <Dialog.Root open={keranjangOpen} onOpenChange={setKeranjangOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[3px] xl:hidden" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-3xl bg-white focus:outline-none xl:hidden">
            <Dialog.Title className="sr-only">Keranjang</Dialog.Title>
            <Dialog.Close className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-canvas">
              <X className="size-4" />
            </Dialog.Close>
            {/* Beri ruang di kanan header panel agar tidak tertimpa tombol tutup. */}
            <CartPanel
              onBayar={bukaPembayaran}
              className="max-h-[88dvh] rounded-none border-0 shadow-none [&>div:first-child]:pr-14"
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <PaymentDialog
        open={bayarOpen}
        onOpenChange={setBayarOpen}
        pelanggan={pelanggan}
        namaToko={namaToko}
      />
    </>
  );
}
