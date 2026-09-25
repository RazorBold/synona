"use client";

import { useState } from "react";

import type { JenisUsaha } from "@/lib/usaha";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

type Props = {
  namaPemilik: string;
  peran: string;
  namaOutlet: string;
  outletId: string;
  daftarOutlet: { id: string; nama: string }[];
  jenisUsaha: JenisUsaha;
  paket: string;
  berlakuSampai: string;
  jumlahNotifikasi: number;
  waBantuan: string | null;
  children: React.ReactNode;
};

export function AppShell({
  namaPemilik,
  peran,
  namaOutlet,
  outletId,
  daftarOutlet,
  jenisUsaha,
  paket,
  berlakuSampai,
  jumlahNotifikasi,
  waBantuan,
  children,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      {/* Ornamen latar dari desain (public/bg.png). Fixed agar tidak ikut
          bergulir dan tidak melar mengikuti tinggi halaman. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat"
      />

      <Sidebar
        namaPemilik={namaPemilik}
        peran={peran}
        jenisUsaha={jenisUsaha}
        paket={paket}
        berlakuSampai={berlakuSampai}
        waBantuan={waBantuan}
        open={open}
        onClose={() => setOpen(false)}
      />

      <div className="lg:pl-[264px]">
        <Topbar
          namaOutlet={namaOutlet}
          outletId={outletId}
          daftarOutlet={daftarOutlet}
          jumlahNotifikasi={jumlahNotifikasi}
          onMenu={() => setOpen(true)}
        />
        <main className="relative px-4 pb-12 pt-5 sm:px-5 sm:pt-6">{children}</main>
      </div>
    </div>
  );
}
