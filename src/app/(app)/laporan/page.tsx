import { LaporanClient } from "@/components/laporan/laporan-client";
import { businessDate, tambahHari } from "@/lib/date";
import { getOutletAktif } from "@/server/queries/dashboard";
import {
  getArusKas,
  getKesehatanInventory,
  getKesehatanKeuangan,
  getProfitabilitasProduk,
} from "@/server/queries/kesehatan";

export const dynamic = "force-dynamic";

const PERIODE_SAH = ["bulan", "30hari", "7hari"];

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const { periode: p } = await searchParams;
  const periode = PERIODE_SAH.includes(p ?? "") ? p! : "bulan";

  const outlet = await getOutletAktif();
  const hariIni = businessDate(new Date(), outlet.timezone);

  const dari =
    periode === "7hari"
      ? tambahHari(hariIni, -6)
      : periode === "30hari"
        ? tambahHari(hariIni, -29)
        : `${hariIni.slice(0, 7)}-01`;

  const labelPeriode =
    periode === "7hari" ? "7 Hari" : periode === "30hari" ? "30 Hari" : "Bulan Ini";

  const [keuangan, inventory, arusKas, produk] = await Promise.all([
    getKesehatanKeuangan(outlet.id, dari, hariIni),
    getKesehatanInventory(outlet.id, dari, hariIni),
    getArusKas(outlet.id, dari, hariIni),
    getProfitabilitasProduk(outlet.id, dari, hariIni),
  ]);

  return (
    <LaporanClient
      keuangan={keuangan}
      inventory={inventory}
      arusKas={arusKas}
      produk={produk}
      periode={periode}
      labelPeriode={labelPeriode}
    />
  );
}
