import { differenceInCalendarDays, format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { redirect } from "next/navigation";

import { AsistenChat } from "@/components/asisten/asisten-chat";
import { BannerSandiDefault } from "@/components/auth/banner-sandi-default";
import { BannerMasaPaket } from "@/components/layout/banner-masa-paket";
import { AppShell } from "@/components/layout/app-shell";
import { SetupJenisUsaha } from "@/components/onboarding/setup-jenis-usaha";
import { RUTE_GANTI_SANDI, RUTE_SESI_BERAKHIR } from "@/lib/auth-const";
import { statusLangganan } from "@/lib/paket";
import { akunSesi, sesiSaatIni } from "@/server/auth";
import { getOutletAktif, getOutletSaya } from "@/server/queries/dashboard";
import { daftarPertanyaan } from "@/server/queries/asisten";
import { getStatistikPengingat } from "@/server/queries/pengingat";
import { adminPlatform } from "@/server/langganan";

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

  // Pengelola platform tidak punya usaha untuk dikelola — area kerjanya
  // /admin (akun, langganan, trafik), bukan kasir dan stok.
  if (adminPlatform(sesi)) redirect("/admin");

  const outlet = await getOutletAktif();

  /**
   * Pendaftar baru langsung mendapat masa coba, jadi hampir tidak ada yang
   * mendarat di sini tanpa tanggal berakhir. Yang tersisa hanya akun dari
   * versi lama yang dibuat sebelum masa coba otomatis ada — ia diarahkan ke
   * halaman langganan untuk mengaktifkan akunnya.
   */
  const langganan = statusLangganan(outlet);
  if (langganan === "belum-aktif") redirect("/langganan");

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

  const [pengingat, daftarOutlet] = await Promise.all([
    getStatistikPengingat(outlet.id),
    getOutletSaya(),
  ]);

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
      outletId={outlet.id}
      daftarOutlet={daftarOutlet}
      jenisUsaha={outlet.jenisUsaha}
      paket={paket}
      berlakuSampai={berlakuSampai}
      jumlahNotifikasi={pengingat.menunggu}
      waBantuan={waBantuan}
    >
      {/* Penanda untuk `aman()`: pesan galat server action tersembunyi di
          build produksi, jadi klien perlu tahu sebab penolakannya. */}
      {langganan === "habis" && <span data-langganan-habis hidden />}
      <AsistenChat
        pertanyaan={daftarPertanyaan(outlet.jenisUsaha)}
        namaPemilik={akun.nama}
      />

      {akun.sandiMasihDefault && <BannerSandiDefault />}
      {sisaHariPaket !== null &&
        (langganan === "coba" || langganan === "habis" || sisaHariPaket <= 7) && (
          <BannerMasaPaket
            sisaHari={sisaHariPaket}
            status={langganan}
          />
        )}
      {children}
    </AppShell>
  );
}
