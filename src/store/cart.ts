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
  /**
   * Potongan rupiah untuk seluruh baris ini (bukan per unit). Opsional
   * karena keranjang yang tersimpan sebelum fitur ini ada tidak punya
   * kolomnya — selalu baca lewat `diskonBaris()`.
   */
  diskon?: number;
};

/** Batas qty untuk satu item; produk tanpa lacak stok tidak dibatasi. */
export const batasQty = (i: { stok: number; lacakStok: number }) =>
  i.lacakStok === 1 ? i.stok : Number.MAX_SAFE_INTEGER;

/** Nilai kotor satu baris sebelum diskon. */
export const kotorBaris = (i: ItemKeranjang) => i.harga * i.qty;

/**
 * Diskon yang benar-benar berlaku: tidak pernah minus dan tidak pernah
 * melebihi nilai barisnya. Server menjepit dengan aturan yang sama, jadi
 * angka di layar kasir selalu cocok dengan yang tersimpan.
 */
export const diskonBaris = (i: ItemKeranjang) =>
  Math.min(Math.max(0, Math.round(i.diskon ?? 0)), kotorBaris(i));

export const bersihBaris = (i: ItemKeranjang) => kotorBaris(i) - diskonBaris(i);

type CartState = {
  items: ItemKeranjang[];
  tambah: (p: Omit<ItemKeranjang, "qty" | "diskon">) => void;
  setQty: (id: string, qty: number) => void;
  setDiskonItem: (id: string, nilai: number) => void;
  hapus: (id: string) => void;
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

      tambah: (p) =>
        set((s) => {
          const ada = s.items.find((i) => i.id === p.id);
          if (!ada) return { items: [...s.items, { ...p, qty: 1, diskon: 0 }] };
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

      setDiskonItem: (id, nilai) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, diskon: Math.max(0, Math.round(nilai || 0)) } : i,
          ),
        })),

      hapus: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      kosongkan: () => set({ items: [] }),
    }),
    // skipHydration: isi localStorage baru dibaca setelah komponen mount,
    // supaya render pertama di klien sama persis dengan hasil render server.
    { name: "synona-keranjang", skipHydration: true },
  ),
);

/** Jumlah kotor semua baris, sebelum diskon. */
export const hitungSubtotal = (items: ItemKeranjang[]) =>
  items.reduce((a, i) => a + kotorBaris(i), 0);

export const hitungDiskon = (items: ItemKeranjang[]) =>
  items.reduce((a, i) => a + diskonBaris(i), 0);

/** Yang dibayar pelanggan. */
export const hitungTotal = (items: ItemKeranjang[]) =>
  items.reduce((a, i) => a + bersihBaris(i), 0);

export const hitungJumlahItem = (items: ItemKeranjang[]) =>
  items.reduce((a, i) => a + i.qty, 0);
