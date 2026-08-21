import { PelangganClient } from "@/components/pelanggan/pelanggan-client";
import { businessDate } from "@/lib/date";
import { getOutletAktif } from "@/server/queries/dashboard";
import {
  getDaftarPelanggan,
  getStatistikPelanggan,
} from "@/server/queries/pelanggan";

export const dynamic = "force-dynamic";

export default async function PelangganPage() {
  const outlet = await getOutletAktif();

  const [pelanggan, statistik] = await Promise.all([
    getDaftarPelanggan(outlet.id),
    getStatistikPelanggan(outlet.id),
  ]);

  return (
    <PelangganClient
      pelanggan={pelanggan}
      statistik={statistik}
      hariIni={businessDate(new Date(), outlet.timezone)}
      namaToko={outlet.name}
    />
  );
}
