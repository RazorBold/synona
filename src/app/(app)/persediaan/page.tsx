import { notFound } from "next/navigation";

import { PersediaanClient } from "@/components/persediaan/persediaan-client";
import { punyaBarang } from "@/lib/usaha";
import { getOutletAktif } from "@/server/queries/dashboard";
import { getDaftarBahan, getStatistikBahan } from "@/server/queries/persediaan";

export const dynamic = "force-dynamic";

export default async function PersediaanPage() {
  const outlet = await getOutletAktif();
  // Usaha jasa murni tidak punya menu ini; membukanya lewat URL langsung
  // pun tidak boleh membuka layar yang tidak berarti apa-apa baginya.
  if (!punyaBarang(outlet.jenisUsaha)) notFound();

  const [bahan, statistik] = await Promise.all([
    getDaftarBahan(outlet.id),
    getStatistikBahan(outlet.id),
  ]);

  return <PersediaanClient bahan={bahan} statistik={statistik} />;
}
