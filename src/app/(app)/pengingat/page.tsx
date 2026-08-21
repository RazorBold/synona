import { PengingatClient } from "@/components/pengingat/pengingat-client";
import { getOutletAktif } from "@/server/queries/dashboard";
import {
  getDaftarPengingat,
  getStatistikPengingat,
} from "@/server/queries/pengingat";

export const dynamic = "force-dynamic";

export default async function PengingatPage() {
  const outlet = await getOutletAktif();

  const [pengingat, statistik] = await Promise.all([
    getDaftarPengingat(outlet.id),
    getStatistikPengingat(outlet.id),
  ]);

  return (
    <PengingatClient
      pengingat={pengingat}
      statistik={statistik}
      namaToko={outlet.name}
    />
  );
}
