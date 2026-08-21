import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

import { AppShell } from "@/components/layout/app-shell";
import { getOutletAktif } from "@/server/queries/dashboard";

// Semua halaman di grup ini membaca SQLite pada tiap permintaan.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const outlet = await getOutletAktif();

  const paket = outlet.plan.charAt(0).toUpperCase() + outlet.plan.slice(1);
  const berlakuSampai = outlet.planEndsAt
    ? format(new Date(outlet.planEndsAt), "d MMM yyyy", { locale: localeId })
    : "—";

  return (
    <AppShell
      namaPemilik={outlet.ownerName}
      namaOutlet={outlet.name}
      paket={paket}
      berlakuSampai={berlakuSampai}
      jumlahNotifikasi={3}
    >
      {children}
    </AppShell>
  );
}
