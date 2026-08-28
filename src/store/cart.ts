"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ItemKeranjang = {
  id: string;
  nama: string;
  emoji: string | null;
  gambar: string | null;
  harga: number;
  qty: number;
  stok: number;
  /** 0 = tidak dilacak stoknya, jadi tidak ada batas qty. */
  lacakStok: number;
  unit: string;
};

/** Batas qty untuk satu item; produk tanpa lacak stok tidak dibatasi. */
export const batasQty = (i: { stok: number; lacakStok: number }) =>
  i.lacakStok === 1 ? i.stok : Number.MAX_SAFE_INTEGER;

type CartState = {
  items: ItemKeranjang[];
  diskon: number;
  tambah: (p: Omit<ItemKeranjang, "qty">) => void;
  setQty: (id: string, qty: number) => void;
  hapus: (id: string) => void;
  setDiskon: (nilai: number) => void;
  kosongkan: () => void;
};

/**
 * Keranjang disimpan di localStorage supaya kasir tidak kehilangan transaksi
 * yang sedang berjalan saat halaman ter-refresh atau HP-nya sempat mati layar.
 */
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      diskon: 0,

      tambah: (p) =>
        set((s) => {
          const ada = s.items.find((i) => i.id === p.id);
          if (!ada) return { items: [...s.items, { ...p, qty: 1 }] };
          // Jangan pernah melebihi stok yang tersedia.
          if (ada.qty >= batasQty(p)) return s;
          return {
            items: s.items.map((i) =>
              i.id === p.id ? { ...i, qty: i.qty + 1 } : i,
            ),
          };
        }),

      setQty: (id, qty) =>
        set((s) => ({
          items: s.items.flatMap((i) => {
            if (i.id !== id) return [i];
            const next = Math.min(Math.max(0, qty), batasQty(i));
            return next === 0 ? [] : [{ ...i, qty: next }];
          }),
        })),

      hapus: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      setDiskon: (nilai) => set({ diskon: Math.max(0, Math.round(nilai || 0)) }),

      kosongkan: () => set({ items: [], diskon: 0 }),
    }),
    // skipHydration: isi localStorage baru dibaca setelah komponen mount,
    // supaya render pertama di klien sama persis dengan hasil render server.
    { name: "synona-keranjang", skipHydration: true },
  ),
);

export const hitungSubtotal = (items: ItemKeranjang[]) =>
  items.reduce((a, i) => a + i.harga * i.qty, 0);

export const hitungJumlahItem = (items: ItemKeranjang[]) =>
  items.reduce((a, i) => a + i.qty, 0);
