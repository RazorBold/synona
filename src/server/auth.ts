import "server-only";

import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import crypto from "node:crypto";
import { promisify } from "node:util";

import { db } from "@/db";
import { pengguna } from "@/db/schema";
import {
  NAMA_COOKIE_SESI,
  PENGGUNA_DEFAULT,
  SANDI_DEFAULT,
  UMUR_SESI_MS,
} from "@/lib/auth-const";
import { bacaToken, buatToken, type IsiToken } from "@/lib/jwt";

const scrypt = promisify(crypto.scrypt) as (
  sandi: string,
  salt: crypto.BinaryLike,
  panjang: number,
) => Promise<Buffer>;

const PANJANG_HASH = 64;

/* ------------------------------------------------------------- sandi */

export function buatSalt(): string {
  return crypto.randomBytes(16).toString("base64url");
}

export async function hashSandi(sandi: string, salt: string): Promise<string> {
  const buf = await scrypt(sandi.normalize("NFKC"), salt, PANJANG_HASH);
  return buf.toString("base64url");
}

/**
 * Perbandingan waktu-tetap. `timingSafeEqual` melempar kalau panjangnya beda,
 * jadi panjangnya dicek dulu — hash scrypt selalu sepanjang PANJANG_HASH,
 * sehingga cek itu tidak membocorkan apa pun tentang sandinya.
 */
export async function cocokkanSandi(
  sandi: string,
  salt: string,
  hashTersimpan: string,
): Promise<boolean> {
  const hitung = Buffer.from(await hashSandi(sandi, salt), "base64url");
  const tersimpan = Buffer.from(hashTersimpan, "base64url");
  if (hitung.length !== tersimpan.length) return false;
  return crypto.timingSafeEqual(hitung, tersimpan);
}

/** Minimal 8 karakter — cukup untuk aplikasi satu-pemilik di LAN. */
export function periksaKekuatanSandi(sandi: string): string | null {
  if (sandi.length < 8) return "Sandi baru minimal 8 karakter";
  if (sandi.length > 200) return "Sandi terlalu panjang";
  return null;
}

/* -------------------------------------------------------------- sesi */

export type SesiAktif = IsiToken;

/**
 * Cookie `secure` hanya kalau permintaannya memang lewat HTTPS. Deployment
 * saat ini masih HTTP di LAN; menghardcode `secure: true` akan membuat browser
 * membuang cookie-nya dan login gagal total tanpa pesan error.
 */
async function pakaiHttps(): Promise<boolean> {
  const h = await headers();
  return (h.get("x-forwarded-proto") ?? "").split(",")[0].trim() === "https";
}

export async function buatSesi(isi: IsiToken): Promise<void> {
  const token = await buatToken(isi);
  const jar = await cookies();

  jar.set(NAMA_COOKIE_SESI, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(UMUR_SESI_MS / 1000),
    secure: await pakaiHttps(),
  });
}

export async function hapusSesi(): Promise<void> {
  const jar = await cookies();
  jar.delete(NAMA_COOKIE_SESI);
}

/**
 * Sesi saat ini, atau null. Tidak melempar — dipakai di tempat yang memang
 * boleh dilihat tanpa login (halaman /masuk) untuk mengalihkan yang sudah
 * masuk.
 */
export async function sesiSaatIni(): Promise<SesiAktif | null> {
  const jar = await cookies();
  return bacaToken(jar.get(NAMA_COOKIE_SESI)?.value);
}

/**
 * Penjaga yang dipanggil di awal SETIAP server action dan setiap query yang
 * mengembalikan data sensitif.
 *
 * Middleware saja tidak cukup: server action dipanggil lewat POST ke URL
 * halaman mana pun dengan header `Next-Action`, jadi satu-satunya tempat yang
 * benar-benar menjamin adalah di dalam action itu sendiri.
 */
export async function wajibSesi(): Promise<SesiAktif> {
  const s = await sesiSaatIni();
  if (!s) throw new Error("TIDAK_TERAUTENTIKASI");
  return s;
}

/* ------------------------------------------------------ akun & sandi */

export type AkunSesi = {
  penggunaId: string;
  nama: string;
  namaPengguna: string;
  peran: "pemilik" | "kasir";
  harusGantiSandi: boolean;
  sandiMasihDefault: boolean;
  punyaKodePemulihan: boolean;
  kodePemulihanDibuatPada: number | null;
};

/**
 * Baris pengguna untuk sesi yang sedang berjalan, plus penanda apakah sandinya
 * masih sandi demo bawaan.
 *
 * `sandiMasihDefault` sengaja dihitung dengan mencocokkan hash terhadap
 * SANDI_DEFAULT, bukan disimpan sebagai kolom tersendiri: kolom seperti itu
 * bisa basi (mis. sandi diubah lewat SQL langsung) dan bannernya jadi bohong.
 */
export async function akunSesi(sesi: SesiAktif): Promise<AkunSesi | null> {
  const row = db
    .select()
    .from(pengguna)
    .where(eq(pengguna.id, sesi.penggunaId))
    .get();

  if (!row) return null;

  /**
   * Akun yang dinonaktifkan diperlakukan sama seperti akun yang sudah tidak
   * ada: pemanggilnya (layout aplikasi) melempar ke /sesi-berakhir yang
   * membuang cookie-nya. Tanpa cek ini, staf yang baru dinonaktifkan tetap
   * bisa memakai sesi lamanya sampai token 30 harinya kedaluwarsa — dan
   * token JWT tidak bisa dicabut satu per satu.
   */
  if (row.aktif === 0) return null;

  return {
    penggunaId: row.id,
    nama: row.nama,
    namaPengguna: row.namaPengguna,
    peran: row.peran,
    harusGantiSandi: row.harusGantiSandi === 1,
    sandiMasihDefault: await cocokkanSandi(SANDI_DEFAULT, row.salt, row.hashSandi),
    punyaKodePemulihan: Boolean(row.kodePemulihanHash && row.kodePemulihanSalt),
    kodePemulihanDibuatPada: row.kodePemulihanDibuatPada,
  };
}

/* -------------------------------------------------- kode pemulihan */

/**
 * Alfabet tanpa karakter yang mudah tertukar saat disalin dari kertas
 * (0/O, 1/I/L). Kode ini memang dimaksudkan untuk ditulis tangan.
 */
const ABJAD_KODE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const PANJANG_KELOMPOK = 4;
const JUMLAH_KELOMPOK = 4;

/**
 * Kode 16 karakter dari alfabet 31 huruf ≈ 79 bit — setara sandi kuat, karena
 * memang bisa dipakai mengambil alih akun. Formatnya SYN-XXXX-XXXX-XXXX-XXXX.
 */
export function buatKodePemulihanAcak(): string {
  const total = PANJANG_KELOMPOK * JUMLAH_KELOMPOK;
  const kelompok: string[] = [];
  let huruf = "";

  // Tolak nilai di atas batas kelipatan supaya distribusinya tetap seragam.
  const batas = Math.floor(256 / ABJAD_KODE.length) * ABJAD_KODE.length;
  while (huruf.length < total) {
    for (const b of crypto.randomBytes(total * 2)) {
      if (b >= batas) continue;
      huruf += ABJAD_KODE[b % ABJAD_KODE.length];
      if (huruf.length === total) break;
    }
  }

  for (let i = 0; i < total; i += PANJANG_KELOMPOK) {
    kelompok.push(huruf.slice(i, i + PANJANG_KELOMPOK));
  }
  return `SYN-${kelompok.join("-")}`;
}

/**
 * Menyeragamkan kode yang diketik ulang pengguna: huruf kecil, spasi, tanda
 * hubung yang hilang, dan awalan SYN- yang lupa diketik semuanya diterima.
 */
export function normalisasiKodePemulihan(kode: string): string {
  const bersih = kode.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^SYN/, "");
  const kelompok = bersih.match(/.{1,4}/g) ?? [];
  return `SYN-${kelompok.join("-")}`;
}

export async function simpanKodePemulihan(penggunaId: string): Promise<string> {
  const kode = buatKodePemulihanAcak();
  const salt = buatSalt();

  db.update(pengguna)
    .set({
      kodePemulihanSalt: salt,
      kodePemulihanHash: await hashSandi(kode, salt),
      kodePemulihanDibuatPada: Date.now(),
    })
    .where(eq(pengguna.id, penggunaId))
    .run();

  return kode;
}

/* -------------------------------------------------- rate limit login */

const BATAS_PERCOBAAN = 10;
const JENDELA_MS = 15 * 60 * 1000;

type Jejak = { jumlah: number; mulai: number };

/**
 * In-memory dan per-proses — cukup karena pm2 menjalankan Synona sebagai satu
 * proses fork (cluster dilarang: SQLite satu penulis). Restart mengosongkan
 * hitungannya, dan itu diterima untuk aplikasi satu-pemilik di LAN.
 */
const globalForRate = globalThis as unknown as {
  __synonaRateLogin?: Map<string, Jejak>;
};
const jejakLogin = (globalForRate.__synonaRateLogin ??= new Map());

export function bolehCobaLogin(kunci: string): boolean {
  const j = jejakLogin.get(kunci);
  if (!j) return true;
  if (Date.now() - j.mulai > JENDELA_MS) {
    jejakLogin.delete(kunci);
    return true;
  }
  return j.jumlah < BATAS_PERCOBAAN;
}

export function catatLoginGagal(kunci: string): void {
  const sekarang = Date.now();
  const j = jejakLogin.get(kunci);
  if (!j || sekarang - j.mulai > JENDELA_MS) {
    jejakLogin.set(kunci, { jumlah: 1, mulai: sekarang });
    return;
  }
  j.jumlah += 1;
}

export function resetLoginGagal(kunci: string): void {
  jejakLogin.delete(kunci);
}

export function sisaMenitBlokir(kunci: string): number {
  const j = jejakLogin.get(kunci);
  if (!j) return 0;
  return Math.max(1, Math.ceil((JENDELA_MS - (Date.now() - j.mulai)) / 60000));
}

/**
 * Apakah akun demo masih memakai sandi bawaan. Dipakai halaman /masuk — yang
 * belum punya sesi — untuk memutuskan apakah hint kredensial demo layak
 * ditampilkan. Begitu sandinya diganti, hint-nya hilang sendiri.
 */
export async function sandiDemoMasihAktif(): Promise<boolean> {
  const row = db
    .select({ salt: pengguna.salt, hashSandi: pengguna.hashSandi })
    .from(pengguna)
    .where(eq(pengguna.namaPengguna, PENGGUNA_DEFAULT))
    .get();

  if (!row) return false;
  return cocokkanSandi(SANDI_DEFAULT, row.salt, row.hashSandi);
}
