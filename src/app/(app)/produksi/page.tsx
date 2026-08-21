import { ProduksiClient } from "@/components/produksi/produksi-client";
import { businessDate } from "@/lib/date";
import { getOutletAktif } from "@/server/queries/dashboard";
import {
  getProdukProduksi,
  getRiwayatProduksi,
  getStatistikProduksi,
} from "@/server/queries/produksi";

export const dynamic = "force-dynamic";

export default async function ProduksiPage() {
  const outlet = await getOutletAktif();
  const bulan = businessDate(new Date(), outlet.timezone).slice(0, 7);

  const [produk, riwayat, statistik] = await Promise.all([
    getProdukProduksi(outlet.id),
    getRiwayatProduksi(outlet.id),
    getStatistikProduksi(outlet.id, bulan),
  ]);

  return (
    <ProduksiClient produk={produk} riwayat={riwayat} statistik={statistik} />
  );
}
