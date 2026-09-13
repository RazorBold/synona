import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BarChart3, ShieldCheck, Smartphone } from "lucide-react";

import { BingkaiAuth } from "@/components/auth/bingkai-auth";
import { FormMasuk } from "@/components/auth/form-masuk";
import gambar from "@/images/auth-masuk.webp";
import { PENGGUNA_DEFAULT, RUTE_DAFTAR, SANDI_DEFAULT } from "@/lib/auth-const";
import {
  belumAdaAkunSamaSekali,
  perluPilihJenisUsaha,
} from "@/server/actions/auth";
import { akunSesi, sandiDemoMasihAktif, sesiSaatIni } from "@/server/auth";

export const metadata: Metadata = { title: "Masuk — Synona" };

// Membaca cookie sesi pada tiap permintaan.
export const dynamic = "force-dynamic";

const NILAI_JUAL = [
  {
    ikon: BarChart3,
    judul: "Laporan otomatis",
    isi: "Lihat perkembangan usahamu kapan saja.",
  },
  {
    ikon: ShieldCheck,
    judul: "Aman & terenkripsi",
    isi: "Sandi disimpan ter-hash, bukan teks asli.",
  },
  {
    ikon: Smartphone,
    judul: "Bisa di berbagai perangkat",
    isi: "Akses di HP, tablet, dan komputer.",
  },
];

export default async function HalamanMasuk({
  searchParams,
}: {
  searchParams: Promise<{ lanjut?: string }>;
}) {
  /**
   * Hanya pantulkan ke dashboard kalau akunnya benar-benar masih ada.
   * Memantulkan hanya berdasarkan token yang sah adalah separuh dari
   * redirect tak berujung yang mengunci pengguna (lihat /sesi-berakhir).
   */
  const s = await sesiSaatIni();
  if (s && (await akunSesi(s))) redirect("/");

  const { lanjut } = await searchParams;
  const [demoAktif, perluJenisUsaha, belumAdaAkun] = await Promise.all([
    sandiDemoMasihAktif(),
    perluPilihJenisUsaha(),
    belumAdaAkunSamaSekali(),
  ]);

  // Belum ada akun sama sekali untuk dicoba masuk dengannya — formulir masuk
  // hanya akan menolak apa pun yang diketik. Langsung ke pendaftaran.
  if (belumAdaAkun) redirect(RUTE_DAFTAR);

  return (
    <BingkaiAuth
      lencana="Kelola usaha, lebih mudah"
      judulPanel="Semua data usaha dalam"
      judulPanelAksen="satu tempat"
      isiPanel="Catat, pantau, dan kembangkan usahamu dengan Synona. Lebih rapi, lebih tenang, setiap hari."
      nilaiJual={NILAI_JUAL}
      tulisanTangan={["Lebih dari sekadar", "pencatatan"]}
      gambar={gambar}
      judul={
        <>
          Masuk ke <span className="text-brand-500">Synona</span>
        </>
      }
      keterangan={
        perluJenisUsaha
          ? "Satu pertanyaan dulu, lalu masuk seperti biasa."
          : "Lanjutkan dan kelola usaha Anda dengan lebih mudah."
      }
      tautanAtas={{
        tanya: "Belum punya akun?",
        label: "Daftar sekarang",
        href: RUTE_DAFTAR,
      }}
    >
      <FormMasuk lanjut={lanjut ?? null} perluJenisUsaha={perluJenisUsaha} />

      {demoAktif && (
        <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-xs text-ink-soft">
          Akun demo masih aktif:{" "}
          <span className="font-semibold">{PENGGUNA_DEFAULT}</span> /{" "}
          <span className="font-semibold">{SANDI_DEFAULT}</span>. Ganti sandinya
          setelah masuk sebelum dipakai dengan data sungguhan.
        </p>
      )}
    </BingkaiAuth>
  );
}
