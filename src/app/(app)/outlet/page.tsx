import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

import { OutletClient } from "@/components/outlet/outlet-client";
import { businessDate } from "@/lib/date";
import { getOutletAktif } from "@/server/queries/dashboard";
import {
  getDaftarOutlet,
  getDaftarStaf,
  getPemilik,
} from "@/server/queries/outlet";

export const dynamic = "force-dynamic";

export default async function OutletPage() {
  const aktif = await getOutletAktif();
  const bulan = businessDate(new Date(), aktif.timezone).slice(0, 7);

  const [outlet, staf, pemilik] = await Promise.all([
    getDaftarOutlet(aktif.ownerId, bulan),
    getDaftarStaf(aktif.ownerId, bulan),
    getPemilik(aktif.ownerId),
  ]);

  if (!pemilik) throw new Error("Pemilik tidak ditemukan");

  return (
    <OutletClient
      outlet={outlet}
      staf={staf}
      jenisUsaha={aktif.jenisUsaha}
      pemilik={{
        id: pemilik.id,
        nama: pemilik.nama,
        email: pemilik.email,
        telepon: pemilik.telepon,
        paket: pemilik.paket,
      }}
      berlakuSampai={
        pemilik.berlakuSampai
          ? format(new Date(pemilik.berlakuSampai), "d MMMM yyyy", {
              locale: localeId,
            })
          : "—"
      }
    />
  );
}
