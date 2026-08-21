import { BahanClient } from "@/components/bahan/bahan-client";
import { businessDate } from "@/lib/date";
import {
  getDaftarBahan,
  getDaftarPembelian,
  getStatistikBahan,
} from "@/server/queries/bahan";
import { getOutletAktif } from "@/server/queries/dashboard";

export const dynamic = "force-dynamic";

export default async function BahanPage() {
  const outlet = await getOutletAktif();

  const [bahan, pembelian, statistik] = await Promise.all([
    getDaftarBahan(outlet.id),
    getDaftarPembelian(outlet.id),
    getStatistikBahan(outlet.id),
  ]);

  return (
    <BahanClient
      bahan={bahan}
      pembelian={pembelian}
      statistik={statistik}
      hariIni={businessDate(new Date(), outlet.timezone)}
    />
  );
}
