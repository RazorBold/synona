import { LaporanClient } from "@/components/laporan/laporan-client";
import { businessDate, tambahHari } from "@/lib/date";
import { punyaJasa } from "@/lib/usaha";
import { getOutletAktif } from "@/server/queries/dashboard";
import {
  getArusKas,
  getKesehatanInventory,
  getKesehatanKeuangan,
  getProfitabilitasProduk,
} from "@/server/queries/kesehatan";
import { getSaldoAkun } from "@/server/queries/kas";
import { getPendapatanPetugas } from "@/server/queries/layanan";

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

  const [keuangan, inventory, arusKas, produk, saldoAkun, petugas] =
    await Promise.all([
    getKesehatanKeuangan(outlet.id, dari, hariIni),
    getKesehatanInventory(outlet.id, dari, hariIni),
    getArusKas(outlet.id, dari, hariIni),
    getProfitabilitasProduk(outlet.id, dari, hariIni),
    getSaldoAkun(outlet.id, dari, hariIni),
    punyaJasa(outlet.jenisUsaha)
      ? getPendapatanPetugas(outlet.id, dari, hariIni)
      : Promise.resolve([]),
  ]);

  return (
    <LaporanClient
      keuangan={keuangan}
      inventory={inventory}
      arusKas={arusKas}
      saldoAkun={saldoAkun}
      petugas={petugas}
      produk={produk}
      jenisUsaha={outlet.jenisUsaha}
      periode={periode}
      labelPeriode={labelPeriode}
    />
  );
}
