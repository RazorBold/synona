"use client";

import { useState } from "react";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

type Props = {
  namaPemilik: string;
  namaOutlet: string;
  paket: string;
  berlakuSampai: string;
  jumlahNotifikasi: number;
  children: React.ReactNode;
};

export function AppShell({
  namaPemilik,
  namaOutlet,
  paket,
  berlakuSampai,
  jumlahNotifikasi,
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
        paket={paket}
        berlakuSampai={berlakuSampai}
        open={open}
        onClose={() => setOpen(false)}
      />

      <div className="lg:pl-[264px]">
        <Topbar
          namaOutlet={namaOutlet}
          jumlahNotifikasi={jumlahNotifikasi}
          onMenu={() => setOpen(true)}
        />
        <main className="relative px-4 pb-12 pt-5 sm:px-5 sm:pt-6">{children}</main>
      </div>
    </div>
  );
}
