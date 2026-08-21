import { ProdukClient } from "@/components/produk/produk-client";
import { getOutletAktif } from "@/server/queries/dashboard";
import { getDaftarBahan } from "@/server/queries/bahan";
import { getKategoriPos } from "@/server/queries/pos";
import { getDaftarProduk, getStatistikProduk } from "@/server/queries/produk";

export const dynamic = "force-dynamic";

export default async function ProdukPage() {
  const outlet = await getOutletAktif();

  const [produk, kategori, statistik, bahan] = await Promise.all([
    getDaftarProduk(outlet.id),
    getKategoriPos(outlet.id),
    getStatistikProduk(outlet.id),
    getDaftarBahan(outlet.id),
  ]);

  return (
    <ProdukClient
      produk={produk}
      kategori={kategori}
      statistik={statistik}
      bahan={bahan}
    />
  );
}
