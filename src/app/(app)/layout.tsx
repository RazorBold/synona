import { differenceInCalendarDays, format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { redirect } from "next/navigation";

import { BannerSandiDefault } from "@/components/auth/banner-sandi-default";
import { BannerMasaPaket } from "@/components/layout/banner-masa-paket";
import { AppShell } from "@/components/layout/app-shell";
import { SetupJenisUsaha } from "@/components/onboarding/setup-jenis-usaha";
import { RUTE_GANTI_SANDI, RUTE_SESI_BERAKHIR } from "@/lib/auth-const";
import { akunSesi, sesiSaatIni } from "@/server/auth";
import { getOutletAktif } from "@/server/queries/dashboard";
import { getStatistikPengingat } from "@/server/queries/pengingat";

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

  /**
   * Jenis usaha normalnya sudah dipilih di halaman masuk. Yang tersisa di
   * sini adalah sesi yang masih hidup saat outletnya diganti dari CLI
   * (`npm run data:kosongkan`) — orangnya tidak pernah lewat halaman masuk
   * lagi. Layarnya dirender di tempat, bukan dialihkan: tidak ada rute lain
   * yang perlu dibuat, dan tidak ada kemungkinan pantulan tak berujung.
   */
  if (!outlet.jenisUsaha) {
    return <SetupJenisUsaha namaOutlet={outlet.name} namaPemilik={akun.nama} />;
  }

  const pengingat = await getStatistikPengingat(outlet.id);

  /**
   * Nomor bantuan dari env, bukan ditanam di kode. Kalau belum diisi, kartu
   * bantuannya disembunyikan — lebih baik tidak ada daripada menautkan ke
   * nomor contoh yang tidak dijawab siapa pun.
   */
  const waBantuan = process.env.SYNONA_WA_BANTUAN?.trim() || null;

  const paket = outlet.plan.charAt(0).toUpperCase() + outlet.plan.slice(1);
  // Peringatan muncul mulai 7 hari sebelum berakhir, dan tetap muncul setelah lewat.
  const sisaHariPaket =
    outlet.planEndsAt === null
      ? null
      : differenceInCalendarDays(new Date(outlet.planEndsAt), new Date());
  const berlakuSampai = outlet.planEndsAt
    ? format(new Date(outlet.planEndsAt), "d MMM yyyy", { locale: localeId })
    : "—";

  return (
    <AppShell
      namaPemilik={akun.nama}
      peran={akun.peran === "pemilik" ? "Pemilik" : "Kasir"}
      namaOutlet={outlet.name}
      jenisUsaha={outlet.jenisUsaha}
      paket={paket}
      berlakuSampai={berlakuSampai}
      jumlahNotifikasi={pengingat.menunggu}
      waBantuan={waBantuan}
    >
      {akun.sandiMasihDefault && <BannerSandiDefault />}
      {sisaHariPaket !== null && sisaHariPaket <= 7 && (
        <BannerMasaPaket sisaHari={sisaHariPaket} />
      )}
      {children}
    </AppShell>
  );
}
