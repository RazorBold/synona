import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, Lock, ShieldCheck } from "lucide-react";

import { BingkaiAuth } from "@/components/auth/bingkai-auth";
import { FormGantiSandi } from "@/components/auth/form-ganti-sandi";
import { PanelKodePemulihan } from "@/components/auth/panel-kode-pemulihan";
import gambar from "@/images/auth-masuk.webp";
import { RUTE_SESI_BERAKHIR } from "@/lib/auth-const";
import { akunSesi, sesiSaatIni } from "@/server/auth";

export const metadata: Metadata = { title: "Ganti Sandi — Synona" };

export const dynamic = "force-dynamic";

const NILAI_JUAL = [
  {
    ikon: Lock,
    judul: "Disimpan ter-hash",
    isi: "Sandi tidak pernah tersimpan dalam bentuk aslinya.",
  },
  {
    ikon: KeyRound,
    judul: "Siapkan kode pemulihan",
    isi: "Satu-satunya jalan pulih sendiri kalau sandi lupa.",
  },
  {
    ikon: ShieldCheck,
    judul: "Ganti kapan saja",
    isi: "Terutama setelah sandi sempat diketahui orang lain.",
  },
];

export default async function HalamanGantiSandi() {
  const sesi = await sesiSaatIni();
  if (!sesi) redirect(RUTE_SESI_BERAKHIR);

  const akun = await akunSesi(sesi);
  if (!akun) redirect(RUTE_SESI_BERAKHIR);

  return (
    <BingkaiAuth
      lencana="Keamanan akun"
      judulPanel="Jaga akses"
      judulPanelAksen="tetap di tangan Anda"
      isiPanel="Sandi yang kuat dan kode pemulihan yang tercatat membuat usaha Anda tetap bisa dibuka — hanya oleh Anda."
      nilaiJual={NILAI_JUAL}
      tulisanTangan={["Aman itu kebiasaan,", "bukan kebetulan"]}
      gambar={gambar}
      judul="Ganti sandi"
      keterangan={
        akun.sandiMasihDefault
          ? "Akun ini masih memakai sandi demo bawaan. Ganti sekarang sebelum dipakai dengan data pelanggan sungguhan."
          : "Sandi baru berlaku untuk login berikutnya di perangkat ini."
      }
      tautanAtas={{ tanya: "Sudah selesai?", label: "Ke dashboard", href: "/" }}
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
    </BingkaiAuth>
  );
}
