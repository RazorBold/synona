"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { LebarKertas } from "@/lib/printer/escpos";

/**
 * - bluetooth: langsung dari browser (Chrome + HTTPS).
 * - rawbt: diteruskan ke aplikasi RawBT di Android — jalan juga di http://
 *   dan untuk printer Bluetooth Classic.
 * - browser: dialog cetak bawaan (printer USB/jaringan, atau simpan PDF).
 */
export type ModePrinter = "bluetooth" | "rawbt" | "browser";

type Pengaturan = {
  mode: ModePrinter;
  lebar: LebarKertas;
  otomatis: boolean;
  catatanKaki: string;
  perangkat: { id: string; nama: string } | null;
  ubah: (p: Partial<Omit<Pengaturan, "ubah">>) => void;
};

/**
 * Disimpan per perangkat (localStorage), bukan di server: printer adalah
 * milik HP/tablet kasir tertentu, bukan milik usaha.
 */
export const usePrinter = create<Pengaturan>()(
  persist(
    (set) => ({
      mode: "bluetooth",
      lebar: 58,
      otomatis: false,
      catatanKaki: "Terima kasih atas kunjungan Anda",
      perangkat: null,
      ubah: (p) => set(p),
    }),
    { name: "synona.printer" },
  ),
);
