import { notFound } from "next/navigation";

import { PesananClient } from "@/components/pesanan/pesanan-client";
import { businessDate } from "@/lib/date";
import { punyaJasa } from "@/lib/usaha";
import { getOutletAktif } from "@/server/queries/dashboard";
import { getDaftarAkunKas } from "@/server/queries/kas";
import { getDaftarLayanan } from "@/server/queries/layanan";
import { getDaftarPesanan, getPetugas, getStatistikPesanan } from "@/server/queries/pesanan";
import { getPelangganPos } from "@/server/queries/pos";

export const dynamic = "force-dynamic";

export default async function PesananPage() {
  const outlet = await getOutletAktif();
  if (!punyaJasa(outlet.jenisUsaha)) notFound();

  const hariIni = businessDate(new Date(), outlet.timezone);

  const [pesanan, layanan, pelanggan, petugas, akun, statistik] =
    await Promise.all([
      getDaftarPesanan(outlet.id),
      getDaftarLayanan(outlet.id),
      getPelangganPos(outlet.id),
      getPetugas(outlet.id),
      getDaftarAkunKas(outlet.id),
      getStatistikPesanan(outlet.id, hariIni),
    ]);

  return (
    <PesananClient
      pesanan={pesanan}
      layanan={layanan}
      pelanggan={pelanggan}
      petugas={petugas}
      akun={akun}
      statistik={statistik}
      hariIni={hariIni}
      namaToko={outlet.name}
    />
  );
}
