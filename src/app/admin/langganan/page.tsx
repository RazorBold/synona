import { notFound } from "next/navigation";

import { AdminLanggananClient } from "@/components/langganan/admin-langganan-client";
import { wajibSesi } from "@/server/auth";
import {
  adminPlatform,
  corongLangganan,
  daftarTagihanAdmin,
  infoQris,
} from "@/server/langganan";

export const dynamic = "force-dynamic";

/** Verifikasi pembayaran langganan — hanya pengelola platform. */
export default async function AdminLanggananPage() {
  const sesi = await wajibSesi();
  // 404, bukan "tidak berhak": pemilik usaha tidak perlu tahu halaman ini ada.
  if (!adminPlatform(sesi)) notFound();

  const { perluDiperiksa, terakhir } = daftarTagihanAdmin();
  const qris = infoQris();

  return (
    <AdminLanggananClient
      corong={corongLangganan()}
      perluDiperiksa={perluDiperiksa}
      terakhir={terakhir}
      qris={{
        url: qris.gambar ? `/api/langganan/${qris.gambar}` : null,
        namaPenerima: qris.namaPenerima,
      }}
    />
  );
}
