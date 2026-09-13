import { notFound } from "next/navigation";

import { ProdukClient } from "@/components/produk/produk-client";
import { punyaBarang } from "@/lib/usaha";
import { getOutletAktif } from "@/server/queries/dashboard";
import { getDaftarBahan } from "@/server/queries/persediaan";
import { getKategoriPos } from "@/server/queries/pos";
import { getDaftarProduk, getStatistikProduk } from "@/server/queries/produk";

export const dynamic = "force-dynamic";

const STATUS_SAH = ["semua", "menipis", "habis"] as const;
type Status = (typeof STATUS_SAH)[number];

export default async function ProdukPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  // Kartu "stok menipis" di dashboard menaut ke ?filter=menipis. Nilai yang
  // tidak dikenal diabaikan, bukan bikin halaman kosong.
  const statusAwal: Status = STATUS_SAH.includes(filter as Status)
    ? (filter as Status)
    : "semua";

  const outlet = await getOutletAktif();

  // Usaha jasa murni tidak punya menu ini; membukanya lewat URL langsung

  // pun tidak boleh membuka layar yang tidak berarti apa-apa baginya.

  if (!punyaBarang(outlet.jenisUsaha)) notFound();

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
      statusAwal={statusAwal}
    />
  );
}
