import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormGantiSandi } from "@/components/auth/form-ganti-sandi";
import { KartuAuth } from "@/components/auth/kartu-auth";
import { RUTE_MASUK } from "@/lib/auth-const";
import { akunSesi, sesiSaatIni } from "@/server/auth";

export const metadata: Metadata = { title: "Ganti Sandi — Synona" };

export const dynamic = "force-dynamic";

export default async function HalamanGantiSandi() {
  const sesi = await sesiSaatIni();
  if (!sesi) redirect(RUTE_MASUK);

  const akun = await akunSesi(sesi);
  if (!akun) redirect(RUTE_MASUK);

  return (
    <KartuAuth
      judul="Ganti sandi"
      keterangan={
        akun.sandiMasihDefault
          ? "Akun ini masih memakai sandi demo bawaan. Ganti sekarang sebelum dipakai dengan data pelanggan sungguhan."
          : "Sandi baru berlaku untuk login berikutnya di perangkat ini."
      }
    >
      <FormGantiSandi />
    </KartuAuth>
  );
}
