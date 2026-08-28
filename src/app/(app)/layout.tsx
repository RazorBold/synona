import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { redirect } from "next/navigation";

import { BannerSandiDefault } from "@/components/auth/banner-sandi-default";
import { AppShell } from "@/components/layout/app-shell";
import { RUTE_GANTI_SANDI, RUTE_SESI_BERAKHIR } from "@/lib/auth-const";
import { akunSesi, sesiSaatIni } from "@/server/auth";
import { getOutletAktif } from "@/server/queries/dashboard";

// Semua halaman di grup ini membaca SQLite pada tiap permintaan.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Penjaga kedua setelah middleware: middleware memverifikasi tanda tangan
  // token, di sini akunnya dipastikan masih benar-benar ada di database.
  const sesi = await sesiSaatIni();
  if (!sesi) redirect(RUTE_SESI_BERAKHIR);

  // Token sah tapi akunnya sudah tidak ada. Cookie-nya HARUS dibuang dulu —
  // kalau tidak, /masuk akan memantulkan balik ke sini tanpa henti.
  const akun = await akunSesi(sesi);
  if (!akun) redirect(RUTE_SESI_BERAKHIR);
  if (akun.harusGantiSandi) redirect(RUTE_GANTI_SANDI);

  const outlet = await getOutletAktif();

  const paket = outlet.plan.charAt(0).toUpperCase() + outlet.plan.slice(1);
  const berlakuSampai = outlet.planEndsAt
    ? format(new Date(outlet.planEndsAt), "d MMM yyyy", { locale: localeId })
    : "—";

  return (
    <AppShell
      namaPemilik={akun.nama}
      peran={akun.peran === "pemilik" ? "Pemilik" : "Kasir"}
      namaOutlet={outlet.name}
      paket={paket}
      berlakuSampai={berlakuSampai}
      jumlahNotifikasi={3}
    >
      {akun.sandiMasihDefault && <BannerSandiDefault />}
      {children}
    </AppShell>
  );
}
