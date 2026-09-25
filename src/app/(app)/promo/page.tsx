import type { Metadata } from "next";

import { PromoClient } from "@/components/promo/promo-client";
import { businessDate } from "@/lib/date";
import { getOutletAktif } from "@/server/queries/dashboard";
import { getDaftarPromo, getPilihanPromo } from "@/server/queries/promo";

export const metadata: Metadata = { title: "Promo & Diskon — Synona" };
export const dynamic = "force-dynamic";

export default async function PromoPage() {
  const outlet = await getOutletAktif();
  const hariIni = businessDate(new Date(), outlet.timezone);

  const [promo, pilihan] = await Promise.all([
    getDaftarPromo(outlet.id),
    getPilihanPromo(outlet.id),
  ]);

  return <PromoClient promo={promo} pilihan={pilihan} hariIni={hariIni} />;
}
