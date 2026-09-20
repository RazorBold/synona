import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LayoutGrid, ShieldCheck, TrendingUp } from "lucide-react";

import { BingkaiAuth } from "@/components/auth/bingkai-auth";
import { FormDaftar } from "@/components/auth/form-daftar";
import { Pelacak } from "@/components/trafik/pelacak";
import gambar from "@/images/auth-daftar.webp";
import { RUTE_MASUK } from "@/lib/auth-const";
import { akunSesi, sesiSaatIni } from "@/server/auth";

export const metadata: Metadata = { title: "Daftar — Synona" };

// Membaca cookie sesi pada tiap permintaan.
export const dynamic = "force-dynamic";

const NILAI_JUAL = [
  {
    ikon: LayoutGrid,
    judul: "Semua dalam satu tempat",
    isi: "Produk, penjualan, pelanggan, dan laporan jadi satu.",
  },
  {
    ikon: ShieldCheck,
    judul: "Data tetap milik Anda",
    isi: "Tersimpan di server Anda sendiri.",
  },
  {
    ikon: TrendingUp,
    judul: "Siap mendukung pertumbuhan",
    isi: "Dari satu warung sampai beberapa cabang.",
  },
];

export default async function HalamanDaftar() {
  /**
   * Pendaftaran terbuka untuk siapa pun yang belum masuk: tiap pendaftar
   * mendapat outlet sendiri, dan `getOutletAktif()` memilih outlet dari sesi
   * sehingga usaha yang satu tidak melihat data usaha yang lain.
   *
   * Yang sudah punya sesi dipantulkan ke dashboard — mendaftarkan usaha kedua
   * sambil masih masuk sebagai orang lain hanya akan menukar sesinya diam-diam.
   * Keluar dulu, baru daftar lagi.
   */
  const s = await sesiSaatIni();
  if (s && (await akunSesi(s))) redirect("/");

  return (
    <BingkaiAuth
      lencana="Kelola usaha, lebih mudah"
      judulPanel="Mulai perjalanan bisnismu"
      judulPanelAksen="bersama Synona"
      isiPanel="Satu akun untuk mengelola seluruh data usaha, transaksi, dan laporan — lebih efisien, lebih aman, lebih berkembang."
      nilaiJual={NILAI_JUAL}
      tulisanTangan={["Langkah kecil hari ini", "untuk masa depan yang lebih besar"]}
      gambar={gambar}
      judul="Daftarkan akun Anda"
      keterangan="Isi data berikut untuk mulai menggunakan Synona dan kelola usaha Anda dengan lebih mudah."
      tautanAtas={{
        tanya: "Sudah punya akun?",
        label: "Masuk",
        href: RUTE_MASUK,
        jejak: "daftar:masuk",
      }}
    >
      <Pelacak halaman="/register" />
      <FormDaftar />
    </BingkaiAuth>
  );
}
