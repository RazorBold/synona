import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormMasuk } from "@/components/auth/form-masuk";
import { KartuAuth } from "@/components/auth/kartu-auth";
import Link from "next/link";

import { PENGGUNA_DEFAULT, RUTE_LUPA_SANDI, SANDI_DEFAULT } from "@/lib/auth-const";
import { perluPilihJenisUsaha } from "@/server/actions/auth";
import { akunSesi, sandiDemoMasihAktif, sesiSaatIni } from "@/server/auth";

export const metadata: Metadata = { title: "Masuk — Synona" };

// Membaca cookie sesi pada tiap permintaan.
export const dynamic = "force-dynamic";

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
  const [demoAktif, perluJenisUsaha] = await Promise.all([
    sandiDemoMasihAktif(),
    perluPilihJenisUsaha(),
  ]);

  return (
    <KartuAuth
      judul={perluJenisUsaha ? "Siapkan Synona" : "Masuk ke Synona"}
      keterangan={
        perluJenisUsaha
          ? "Satu pertanyaan dulu, lalu masuk seperti biasa."
          : "Data usaha hanya bisa dibuka setelah masuk."
      }
    >
      <FormMasuk lanjut={lanjut ?? null} perluJenisUsaha={perluJenisUsaha} />

      <Link
        href={RUTE_LUPA_SANDI}
        className="mt-4 block text-center text-sm font-semibold text-brand-500 hover:text-brand-600"
      >
        Lupa sandi?
      </Link>

      {demoAktif && (
        <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-xs text-ink-soft">
          Akun demo masih aktif:{" "}
          <span className="font-semibold">{PENGGUNA_DEFAULT}</span> /{" "}
          <span className="font-semibold">{SANDI_DEFAULT}</span>. Ganti sandinya
          setelah masuk sebelum dipakai dengan data sungguhan.
        </p>
      )}
    </KartuAuth>
  );
}
