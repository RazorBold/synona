import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "@/db";
import {
  pembayaranLangganan,
  pengaturanPlatform,
  pengguna,
  users,
} from "@/db/schema";
import { JENIS_GAMBAR, MAKS_UKURAN_BYTE } from "@/lib/gambar";
import { statusLangganan } from "@/lib/paket";
import type { SesiAktif } from "@/server/auth";
import { getOutletAktif } from "@/server/queries/dashboard";
import { bolehLihatTrafik } from "@/server/trafik";

/**
 * Pengelola platform = akun yang boleh melihat trafik (SYNONA_ADMIN_TRAFIK).
 * Satu daftar untuk semua urusan platform, supaya tidak ada dua daftar env
 * yang bisa saling berbeda.
 */
export function adminPlatform(sesi: Pick<SesiAktif, "penggunaId">): boolean {
  return bolehLihatTrafik(sesi);
}

/* ------------------------------------------------------------ berkas */

const DIR_UNGGAHAN = path.resolve(process.env.UPLOAD_DIR_LANGGANAN ?? "./data/uploads/langganan");
export const POLA_BERKAS_LANGGANAN = /^[A-Za-z0-9_-]{1,32}\.(webp|jpe?g|png)$/;
const EKSTENSI: Record<string, string> = {
  "image/webp": ".webp",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

export async function simpanBerkasLangganan(file: File): Promise<string> {
  if (!JENIS_GAMBAR.includes(file.type)) throw new Error("Format gambar harus WebP, JPG, atau PNG");
  if (file.size > MAKS_UKURAN_BYTE) throw new Error("Ukuran gambar maksimal 2 MB");
  await fs.mkdir(DIR_UNGGAHAN, { recursive: true });
  const nama = `${nanoid()}${EKSTENSI[file.type]}`;
  await fs.writeFile(path.join(DIR_UNGGAHAN, nama), Buffer.from(await file.arrayBuffer()));
  return nama;
}

export async function bacaBerkasLangganan(nama: string): Promise<Buffer | null> {
  if (!POLA_BERKAS_LANGGANAN.test(nama)) return null;
  return fs.readFile(path.join(DIR_UNGGAHAN, nama)).catch(() => null);
}

/* ------------------------------------------------ pengaturan platform */

export function bacaPengaturan(kunci: string): string | null {
  return (
    db
      .select({ nilai: pengaturanPlatform.nilai })
      .from(pengaturanPlatform)
      .where(eq(pengaturanPlatform.kunci, kunci))
      .get()?.nilai ?? null
  );
}

export function tulisPengaturan(kunci: string, nilai: string | null) {
  db.insert(pengaturanPlatform)
    .values({ kunci, nilai, diubahPada: Date.now() })
    .onConflictDoUpdate({
      target: pengaturanPlatform.kunci,
      set: { nilai, diubahPada: Date.now() },
    })
    .run();
}

export type InfoQris = { gambar: string | null; namaPenerima: string | null };

export function infoQris(): InfoQris {
  return { gambar: bacaPengaturan("qris_gambar"), namaPenerima: bacaPengaturan("qris_nama") };
}

/* ------------------------------------------------------ milik sesi */

export type Tagihan = typeof pembayaranLangganan.$inferSelect;

/** Langganan usaha milik sesi + tagihan yang masih terbuka. */
export async function getLanggananSaya() {
  const outlet = await getOutletAktif();
  const status = statusLangganan(outlet);

  const riwayat = db
    .select()
    .from(pembayaranLangganan)
    .where(eq(pembayaranLangganan.userId, outlet.ownerId))
    .orderBy(desc(pembayaranLangganan.dibuatPada))
    .limit(12)
    .all();

  const terbuka =
    riwayat.find((r) => r.status === "menunggu" || r.status === "diperiksa") ?? null;
  // Penolakan terakhir ditampilkan hanya kalau belum ada tagihan yang lebih baru.
  const ditolak = riwayat[0]?.status === "ditolak" ? riwayat[0] : null;

  return { outlet, status, terbuka, ditolak, riwayat };
}

/* --------------------------------------------------------- pengelola */

export type BarisTagihanAdmin = Tagihan & {
  namaPemilik: string;
  telepon: string | null;
  namaUsaha: string | null;
  namaPengguna: string | null;
};

export function daftarTagihanAdmin(): { perluDiperiksa: BarisTagihanAdmin[]; terakhir: BarisTagihanAdmin[] } {
  const dasar = () =>
    db
      .select({
        t: pembayaranLangganan,
        namaPemilik: users.name,
        telepon: users.phone,
        namaUsaha: sql<string | null>`(SELECT o.name FROM outlets o WHERE o.owner_id = ${users.id} ORDER BY o.created_at LIMIT 1)`,
        namaPengguna: pengguna.namaPengguna,
      })
      .from(pembayaranLangganan)
      .innerJoin(users, eq(users.id, pembayaranLangganan.userId))
      .leftJoin(pengguna, eq(pengguna.userId, users.id));

  const rapikan = (r: {
    t: Tagihan;
    namaPemilik: string;
    telepon: string | null;
    namaUsaha: string | null;
    namaPengguna: string | null;
  }): BarisTagihanAdmin => ({
    ...r.t,
    namaPemilik: r.namaPemilik,
    telepon: r.telepon,
    namaUsaha: r.namaUsaha,
    namaPengguna: r.namaPengguna,
  });

  const perluDiperiksa = dasar()
    .where(inArray(pembayaranLangganan.status, ["diperiksa", "menunggu"]))
    // Yang sudah menekan "Saya sudah bayar" di atas.
    .orderBy(sql`${pembayaranLangganan.status} = 'menunggu'`, desc(pembayaranLangganan.dibuatPada))
    .all()
    .map(rapikan);

  const terakhir = dasar()
    .where(inArray(pembayaranLangganan.status, ["disetujui", "ditolak"]))
    .orderBy(desc(pembayaranLangganan.diputuskanPada))
    .limit(20)
    .all()
    .map(rapikan);

  return { perluDiperiksa, terakhir };
}

/** Corong pendaftar berbayar: daftar → checkout → bayar → aktif → perpanjang. */
export function corongLangganan() {
  const sekarang = Date.now();
  const r = db.get<{
    daftar: number;
    checkout: number;
    bayar: number;
    aktif: number;
    habis: number;
    perpanjang: number;
    pendapatan: number;
  }>(sql`
    SELECT
      (SELECT COUNT(*) FROM users WHERE wajib_bayar = 1) AS daftar,
      (SELECT COUNT(DISTINCT p.user_id) FROM pembayaran_langganan p
         JOIN users u ON u.id = p.user_id WHERE u.wajib_bayar = 1) AS checkout,
      (SELECT COUNT(DISTINCT p.user_id) FROM pembayaran_langganan p
         JOIN users u ON u.id = p.user_id
        WHERE u.wajib_bayar = 1 AND p.status IN ('diperiksa','disetujui')) AS bayar,
      (SELECT COUNT(*) FROM users WHERE wajib_bayar = 1 AND plan_ends_at > ${sekarang}) AS aktif,
      (SELECT COUNT(*) FROM users WHERE wajib_bayar = 1 AND plan_ends_at <= ${sekarang}) AS habis,
      (SELECT COUNT(*) FROM (SELECT user_id FROM pembayaran_langganan
        WHERE status = 'disetujui' GROUP BY user_id HAVING COUNT(*) >= 2)) AS perpanjang,
      (SELECT COALESCE(SUM(nominal), 0) FROM pembayaran_langganan WHERE status = 'disetujui') AS pendapatan
  `);
  return (
    r ?? { daftar: 0, checkout: 0, bayar: 0, aktif: 0, habis: 0, perpanjang: 0, pendapatan: 0 }
  );
}
