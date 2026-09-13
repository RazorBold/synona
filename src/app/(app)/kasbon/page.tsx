import { KasbonClient } from "@/components/kasbon/kasbon-client";
import { businessDate } from "@/lib/date";
import { getOutletAktif } from "@/server/queries/dashboard";
import { getDaftarAkunKas } from "@/server/queries/kas";
import { getDaftarUtang, getStatistikUtang } from "@/server/queries/kasbon";
import { getPelangganPos } from "@/server/queries/pos";

export const dynamic = "force-dynamic";

export default async function KasbonPage() {
  const outlet = await getOutletAktif();
  const hariIni = businessDate(new Date(), outlet.timezone);

  const [utang, statistik, pelanggan, akun] = await Promise.all([
    getDaftarUtang(outlet.id),
    getStatistikUtang(outlet.id, hariIni),
    getPelangganPos(outlet.id),
    getDaftarAkunKas(outlet.id),
  ]);

  return (
    <KasbonClient
      utang={utang}
      statistik={statistik}
      pelanggan={pelanggan.map((p) => ({ id: p.id, nama: p.nama }))}
      akun={akun}
      hariIni={hariIni}
      namaToko={outlet.name}
    />
  );
}
