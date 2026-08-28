import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FormGantiSandi } from "@/components/auth/form-ganti-sandi";
import { KartuAuth } from "@/components/auth/kartu-auth";
import { PanelKodePemulihan } from "@/components/auth/panel-kode-pemulihan";
import { RUTE_SESI_BERAKHIR } from "@/lib/auth-const";
import { akunSesi, sesiSaatIni } from "@/server/auth";

export const metadata: Metadata = { title: "Ganti Sandi — Synona" };

export const dynamic = "force-dynamic";

export default async function HalamanGantiSandi() {
  const sesi = await sesiSaatIni();
  if (!sesi) redirect(RUTE_SESI_BERAKHIR);

  const akun = await akunSesi(sesi);
  if (!akun) redirect(RUTE_SESI_BERAKHIR);

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

      <PanelKodePemulihan
        punyaKode={akun.punyaKodePemulihan}
        dibuatPada={
          akun.kodePemulihanDibuatPada
            ? format(new Date(akun.kodePemulihanDibuatPada), "d MMM yyyy", {
                locale: localeId,
              })
            : null
        }
      />

      <Link
        href="/"
        className="mt-4 block text-center text-sm font-semibold text-brand-500 hover:text-brand-600"
      >
        Kembali ke dashboard
      </Link>
    </KartuAuth>
  );
}
