import { notFound } from "next/navigation";

import { TrafikClient } from "@/components/trafik/trafik-client";
import { wajibSesi } from "@/server/auth";
import { getLaporanTrafik, type Segmen } from "@/server/queries/trafik";
import { bolehLihatTrafik } from "@/server/trafik";

export const dynamic = "force-dynamic";

const PERIODE = [7, 30, 90];

export default async function TrafikPage({
  searchParams,
}: {
  searchParams: Promise<{ hari?: string; segmen?: string }>;
}) {
  // Data platform, bukan data usaha: pemilik usaha lain mendapat 404 —
  // bukan "tidak berhak" — supaya keberadaan halaman ini pun tidak terlihat.
  const sesi = await wajibSesi();
  if (!bolehLihatTrafik(sesi)) notFound();

  const { hari: hariParam, segmen: segmenParam } = await searchParams;
  const hari = PERIODE.includes(Number(hariParam)) ? Number(hariParam) : 30;
  // Bawaannya calon pelanggan: itu pertanyaan utamanya — berapa orang baru
  // yang berminat bergabung.
  const segmen: Segmen = segmenParam === "lama" ? "lama" : "calon";

  const laporan = await getLaporanTrafik(hari, segmen);

  return <TrafikClient laporan={laporan} hari={hari} />;
}
