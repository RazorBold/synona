import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormMasuk } from "@/components/auth/form-masuk";
import { KartuAuth } from "@/components/auth/kartu-auth";
import { PENGGUNA_DEFAULT, SANDI_DEFAULT } from "@/lib/auth-const";
import { sesiSaatIni, sandiDemoMasihAktif } from "@/server/auth";

export const metadata: Metadata = { title: "Masuk — Synona" };

// Membaca cookie sesi pada tiap permintaan.
export const dynamic = "force-dynamic";

export default async function HalamanMasuk({
  searchParams,
}: {
  searchParams: Promise<{ lanjut?: string }>;
}) {
  const s = await sesiSaatIni();
  if (s) redirect("/");

  const { lanjut } = await searchParams;
  const demoAktif = await sandiDemoMasihAktif();

  return (
    <KartuAuth
      judul="Masuk ke Synona"
      keterangan="Data usaha hanya bisa dibuka setelah masuk."
    >
      <FormMasuk lanjut={lanjut ?? null} />

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
