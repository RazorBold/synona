import "server-only";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";

import { db } from "@/db";
import { jejakPengunjung, pengguna } from "@/db/schema";
import { businessDate } from "@/lib/date";
import { NAMA_COOKIE_PENGUNJUNG } from "@/lib/trafik";
import type { SesiAktif } from "@/server/auth";

/**
 * Siapa yang boleh melihat trafik halaman depan.
 *
 * Trafik adalah data PLATFORM — berapa calon pelanggan yang datang ke
 * Synona — bukan data usaha. Pemilik warung yang mendaftar tidak boleh
 * melihatnya, jadi aksesnya tidak diturunkan dari peran "pemilik" melainkan
 * dari daftar nama pengguna eksplisit di env:
 *
 *   SYNONA_ADMIN_TRAFIK=admin,syaiful
 *
 * Kosong / tidak diset = tidak ada yang bisa melihat. Menutup secara default
 * lebih aman daripada membukanya ke semua pemilik.
 */
export function daftarAdminTrafik(): string[] {
  return (process.env.SYNONA_ADMIN_TRAFIK ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function bolehLihatTrafik(sesi: Pick<SesiAktif, "penggunaId">): boolean {
  const izin = daftarAdminTrafik();
  if (izin.length === 0) return false;

  // Nama pengguna dibaca ulang dari DB, bukan dari token: token berumur 30
  // hari dan nama di dalamnya tidak ikut berubah kalau akunnya diganti.
  const row = db
    .select({ namaPengguna: pengguna.namaPengguna, aktif: pengguna.aktif })
    .from(pengguna)
    .where(eq(pengguna.id, sesi.penggunaId))
    .get();

  return Boolean(row && row.aktif === 1 && izin.includes(row.namaPengguna));
}

export type JejakBaru = {
  pengunjung: string;
  kunjungan: string;
  jenis: "lihat" | "klik" | "baca" | "daftar" | "masuk";
  halaman: string;
  target?: string | null;
  rujukan?: string | null;
  utmSource?: string | null;
  utmCampaign?: string | null;
  perangkat?: "hp" | "tablet" | "desktop" | null;
};

export function catatJejak(j: JejakBaru): void {
  const sekarang = new Date();
  db.insert(jejakPengunjung)
    .values({
      id: nanoid(),
      pengunjung: j.pengunjung,
      kunjungan: j.kunjungan,
      jenis: j.jenis,
      halaman: j.halaman,
      target: j.target ?? null,
      rujukan: j.rujukan ?? null,
      utmSource: j.utmSource ?? null,
      utmCampaign: j.utmCampaign ?? null,
      perangkat: j.perangkat ?? null,
      tanggal: businessDate(sekarang),
      dibuatPada: sekarang.getTime(),
    })
    .run();
}

/**
 * Menandai pendaftaran yang berhasil. Dipanggil dari server action `daftar()`
 * — sengaja di server, bukan dari pelacak di peramban, supaya angka
 * "berhasil daftar" tidak bisa digelembungkan dengan mengirim jejak palsu.
 *
 * Kalau pengunjungnya punya cookie pelacak, pendaftaran ini tersambung ke
 * kunjungannya di halaman depan; kalau tidak (cookie diblokir), tetap
 * dihitung sebagai pendaftaran tanpa asal.
 *
 * Tidak pernah melempar: kegagalan mencatat statistik tidak boleh
 * menggagalkan pendaftaran orang.
 */
export async function catatPendaftaran(): Promise<void> {
  try {
    const pengunjung = await pengunjungDariCookie();
    catatJejak({
      pengunjung: pengunjung ?? `tanpa-cookie-${nanoid(10)}`,
      kunjungan: nanoid(),
      jenis: "daftar",
      halaman: "/register",
    });
  } catch (e) {
    console.error("[trafik] gagal mencatat pendaftaran:", e);
  }
}

/**
 * Menandai peramban ini milik PELANGGAN LAMA: orang yang punya akun dan
 * berhasil login. Dipanggil dari server action `masuk()`.
 *
 * Laporan /trafik memakai tanda ini untuk memisahkan seluruh jejak
 * pengunjung tersebut — termasuk kunjungan beranda dan klik "Masuk" SEBELUM
 * ia login — dari corong calon pelanggan. Tanpa ini, pelanggan yang cuma
 * mampir untuk login terhitung sebagai "tertarik".
 *
 * Tanpa cookie pelacak tidak ada yang bisa ditandai, jadi tidak dicatat.
 * Tidak pernah melempar: statistik tidak boleh menggagalkan login.
 */
export async function catatMasuk(): Promise<void> {
  try {
    const pengunjung = await pengunjungDariCookie();
    if (!pengunjung) return;
    catatJejak({ pengunjung, kunjungan: nanoid(), jenis: "masuk", halaman: "/masuk" });
  } catch (e) {
    console.error("[trafik] gagal mencatat login:", e);
  }
}

async function pengunjungDariCookie(): Promise<string | null> {
  const jar = await cookies();
  const nilai = jar.get(NAMA_COOKIE_PENGUNJUNG)?.value;
  return nilai && /^[A-Za-z0-9_-]{8,64}$/.test(nilai) ? nilai : null;
}
