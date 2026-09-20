import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { RUTE_GANTI_SANDI, RUTE_SESI_BERAKHIR } from "@/lib/auth-const";
import { jumlahPerluDiperiksa } from "@/server/admin";
import { akunSesi, sesiSaatIni } from "@/server/auth";
import { adminPlatform } from "@/server/langganan";

export const metadata: Metadata = { title: "Pengelola — Synona" };
export const dynamic = "force-dynamic";

/**
 * Area pengelola platform (/admin/*). Pemilik usaha biasa mendapat 404 —
 * bukan "tidak berhak" — supaya keberadaan area ini pun tidak terlihat.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sesi = await sesiSaatIni();
  if (!sesi) redirect(RUTE_SESI_BERAKHIR);
  const akun = await akunSesi(sesi);
  if (!akun) redirect(RUTE_SESI_BERAKHIR);
  if (akun.harusGantiSandi) redirect(RUTE_GANTI_SANDI);
  if (!adminPlatform(sesi)) notFound();

  return (
    <AdminShell nama={akun.nama} perluDiperiksa={jumlahPerluDiperiksa()}>
      {children}
    </AdminShell>
  );
}
