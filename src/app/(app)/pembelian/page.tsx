import { notFound } from "next/navigation";

import { PembelianClient } from "@/components/pembelian/pembelian-client";
import { businessDate } from "@/lib/date";
import { punyaBarang } from "@/lib/usaha";
import { getOutletAktif } from "@/server/queries/dashboard";
import { getDaftarAkunKas } from "@/server/queries/kas";
import {
  getDaftarPembelian,
  getProdukUntukBelanja,
  getStatistikPembelian,
} from "@/server/queries/pembelian";
import { getDaftarBahan } from "@/server/queries/persediaan";

export const dynamic = "force-dynamic";

export default async function PembelianPage() {
  const outlet = await getOutletAktif();
  // Usaha jasa murni tidak punya menu ini; membukanya lewat URL langsung
  // pun tidak boleh membuka layar yang tidak berarti apa-apa baginya.
  if (!punyaBarang(outlet.jenisUsaha)) notFound();
  const hariIni = businessDate(new Date(), outlet.timezone);

  const [pembelian, bahan, produk, akun, statistik] = await Promise.all([
    getDaftarPembelian(outlet.id),
    getDaftarBahan(outlet.id),
    getProdukUntukBelanja(outlet.id),
    getDaftarAkunKas(outlet.id),
    getStatistikPembelian(outlet.id, `${hariIni.slice(0, 7)}-01`),
  ]);

  return (
    <PembelianClient
      pembelian={pembelian}
      bahan={bahan}
      produk={produk}
      akun={akun}
      statistik={statistik}
      hariIni={hariIni}
    />
  );
}
