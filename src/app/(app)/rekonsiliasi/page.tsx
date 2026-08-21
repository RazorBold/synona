import { RekonsiliasiClient } from "@/components/rekonsiliasi/rekonsiliasi-client";
import { businessDate } from "@/lib/date";
import { getOutletAktif } from "@/server/queries/dashboard";
import {
  getRekonsiliasiTanggal,
  getRingkasanKas,
  getRiwayatRekonsiliasi,
} from "@/server/queries/rekonsiliasi";

export const dynamic = "force-dynamic";

export default async function RekonsiliasiPage({
  searchParams,
}: {
  searchParams: Promise<{ tanggal?: string }>;
}) {
  const { tanggal: t } = await searchParams;
  const outlet = await getOutletAktif();
  const tanggal =
    t && /^\d{4}-\d{2}-\d{2}$/.test(t)
      ? t
      : businessDate(new Date(), outlet.timezone);

  const [sistem, tersimpan, riwayat] = await Promise.all([
    getRingkasanKas(outlet.id, tanggal),
    getRekonsiliasiTanggal(outlet.id, tanggal),
    getRiwayatRekonsiliasi(outlet.id),
  ]);

  return (
    <RekonsiliasiClient
      key={tanggal}
      sistem={sistem}
      tersimpan={tersimpan}
      riwayat={riwayat}
      tanggal={tanggal}
    />
  );
}
