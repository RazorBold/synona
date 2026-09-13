import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, ShieldCheck, Wifi } from "lucide-react";

import { BingkaiAuth } from "@/components/auth/bingkai-auth";
import { FormLupaSandi } from "@/components/auth/form-lupa-sandi";
import gambar from "@/images/auth-masuk.webp";
import { RUTE_MASUK } from "@/lib/auth-const";

export const metadata: Metadata = { title: "Lupa Sandi — Synona" };

export const dynamic = "force-dynamic";

const NILAI_JUAL = [
  {
    ikon: KeyRound,
    judul: "Kode pemulihan sekali pakai",
    isi: "Kode yang Anda catat saat membuatnya, langsung hangus setelah dipakai.",
  },
  {
    ikon: ShieldCheck,
    judul: "Tidak ada yang bisa menebak",
    isi: "Percobaan yang gagal berulang kali akan diblokir sementara.",
  },
  {
    ikon: Wifi,
    judul: "Tanpa email atau SMS",
    isi: "Pemulihan berjalan penuh di server Anda sendiri.",
  },
];

export default function HalamanLupaSandi() {
  return (
    <BingkaiAuth
      lencana="Pulihkan akses"
      judulPanel="Kembali masuk"
      judulPanelAksen="dengan aman"
      isiPanel="Sandi tidak bisa dilihat siapa pun, termasuk Synona. Karena itu pemulihannya memakai kode yang hanya Anda pegang."
      nilaiJual={NILAI_JUAL}
      tulisanTangan={["Tenang, datanya", "tetap utuh"]}
      gambar={gambar}
      judul="Lupa sandi"
      keterangan="Masukkan kode pemulihan yang Anda catat saat membuatnya, lalu tentukan sandi baru."
      tautanAtas={{
        tanya: "Sudah ingat sandinya?",
        label: "Masuk",
        href: RUTE_MASUK,
      }}
    >
      <FormLupaSandi />

      <p className="mt-5 rounded-xl bg-canvas px-4 py-3 text-xs leading-relaxed text-ink-soft">
        <span className="font-semibold">Tidak punya kode pemulihan?</span> Kode
        hanya bisa dibuat dari dalam aplikasi. Kalau Anda sudah tidak bisa masuk
        sama sekali, sandi harus direset dari server dengan perintah{" "}
        <code className="rounded bg-white px-1 py-0.5 font-semibold">
          npm run auth:reset
        </code>
        . Minta bantuan orang yang mengelola server Anda.
      </p>

      <Link
        href={RUTE_MASUK}
        className="mt-4 block text-center text-sm font-semibold text-brand-500 hover:text-brand-600"
      >
        Kembali ke halaman masuk
      </Link>
    </BingkaiAuth>
  );
}
