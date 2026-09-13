import { notFound } from "next/navigation";

import { LayananClient } from "@/components/layanan/layanan-client";
import { businessDate } from "@/lib/date";
import { punyaJasa } from "@/lib/usaha";
import { getOutletAktif } from "@/server/queries/dashboard";
import { getDaftarLayanan, getStatistikLayanan } from "@/server/queries/layanan";
import { getKategoriPos } from "@/server/queries/pos";

export const dynamic = "force-dynamic";

export default async function LayananPage() {
  const outlet = await getOutletAktif();
  // Outlet dagang murni tidak punya menu ini; membukanya lewat URL langsung
  // pun tidak boleh membuka layar yang tidak berarti apa-apa baginya.
  if (!punyaJasa(outlet.jenisUsaha)) notFound();

  const hariIni = businessDate(new Date(), outlet.timezone);

  const [layanan, kategori, statistik] = await Promise.all([
    getDaftarLayanan(outlet.id),
    getKategoriPos(outlet.id),
    getStatistikLayanan(outlet.id, `${hariIni.slice(0, 7)}-01`),
  ]);

  return (
    <LayananClient
      layanan={layanan}
      kategori={kategori}
      statistik={statistik}
    />
  );
}
