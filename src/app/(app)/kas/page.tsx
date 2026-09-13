import { KasClient } from "@/components/kas/kas-client";
import { businessDate, tambahHari } from "@/lib/date";
import { getOutletAktif } from "@/server/queries/dashboard";
import { getDaftarAkunKas, getMutasiKas, getSaldoAkun } from "@/server/queries/kas";

export const dynamic = "force-dynamic";

const PERIODE_SAH = ["bulan", "30hari", "7hari"];

export default async function KasPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; akun?: string }>;
}) {
  const { periode: p, akun: akunTerpilih } = await searchParams;
  const periode = PERIODE_SAH.includes(p ?? "") ? p! : "bulan";

  const outlet = await getOutletAktif();
  const hariIni = businessDate(new Date(), outlet.timezone);

  const dari =
    periode === "7hari"
      ? tambahHari(hariIni, -6)
      : periode === "30hari"
        ? tambahHari(hariIni, -29)
        : `${hariIni.slice(0, 7)}-01`;

  const [akun, saldo, mutasi] = await Promise.all([
    getDaftarAkunKas(outlet.id),
    getSaldoAkun(outlet.id, dari, hariIni),
    getMutasiKas(outlet.id, dari, hariIni, { akunId: akunTerpilih ?? null }),
  ]);

  return (
    <KasClient
      akun={akun}
      saldo={saldo}
      mutasi={mutasi}
      periode={periode}
      akunTerpilih={akunTerpilih ?? null}
      hariIni={hariIni}
    />
  );
}
