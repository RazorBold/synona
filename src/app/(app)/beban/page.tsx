import { BebanClient } from "@/components/beban/beban-client";
import { businessDate, tambahHari } from "@/lib/date";
import { getOutletAktif } from "@/server/queries/dashboard";
import { getDaftarBeban, getStatistikBeban } from "@/server/queries/beban";

export const dynamic = "force-dynamic";

const PERIODE_SAH = ["bulan", "7hari", "hari"];

export default async function BebanPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const { periode: p } = await searchParams;
  const periode = PERIODE_SAH.includes(p ?? "") ? p! : "bulan";

  const outlet = await getOutletAktif();
  const hariIni = businessDate(new Date(), outlet.timezone);

  const dari =
    periode === "hari"
      ? hariIni
      : periode === "7hari"
        ? tambahHari(hariIni, -6)
        : `${hariIni.slice(0, 7)}-01`;

  const labelPeriode =
    periode === "hari"
      ? "Hari Ini"
      : periode === "7hari"
        ? "7 Hari"
        : "Bulan Ini";

  const [beban, statistik] = await Promise.all([
    getDaftarBeban(outlet.id, dari, hariIni),
    getStatistikBeban(outlet.id, dari, hariIni),
  ]);

  return (
    <BebanClient
      beban={beban}
      statistik={statistik}
      periode={periode}
      labelPeriode={labelPeriode}
    />
  );
}
