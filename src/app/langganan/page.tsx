import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LanggananClient } from "@/components/langganan/langganan-client";
import { RUTE_GANTI_SANDI, RUTE_SESI_BERAKHIR } from "@/lib/auth-const";
import { akunSesi, sesiSaatIni } from "@/server/auth";
import { adminPlatform, getLanggananSaya, infoQris } from "@/server/langganan";

export const metadata: Metadata = { title: "Langganan — Synona" };
export const dynamic = "force-dynamic";

/**
 * Checkout langganan. Sengaja di luar grup (app): pendaftar yang belum
 * membayar dialihkan ke sini oleh layout aplikasi, jadi halaman ini tidak
 * boleh ikut layout itu — kalau ikut, pengalihannya berputar tanpa ujung.
 */
export default async function HalamanLangganan() {
  const sesi = await sesiSaatIni();
  if (!sesi) redirect(RUTE_SESI_BERAKHIR);
  const akun = await akunSesi(sesi);
  if (!akun) redirect(RUTE_SESI_BERAKHIR);
  if (akun.harusGantiSandi) redirect(RUTE_GANTI_SANDI);
  if (adminPlatform(sesi)) redirect("/admin");

  const { outlet, status, terbuka, ditolak, riwayat } = await getLanggananSaya();
  const qris = infoQris();

  return (
    <LanggananClient
      namaUsaha={outlet.name}
      namaAkun={akun.nama}
      pemilik={akun.peran === "pemilik"}
      status={status}
      paketSekarang={outlet.plan}
      berakhir={outlet.planEndsAt}
      terbuka={terbuka}
      ditolak={ditolak}
      riwayat={riwayat.filter((r) => r.status === "disetujui").slice(0, 5)}
      qris={{
        url: qris.gambar ? `/api/langganan/${qris.gambar}` : null,
        namaPenerima: qris.namaPenerima,
      }}
    />
  );
}
