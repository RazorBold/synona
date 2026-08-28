"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { pengguna } from "@/db/schema";
import { RUTE_GANTI_SANDI, RUTE_MASUK } from "@/lib/auth-const";
import {
  bolehCobaLogin,
  buatSalt,
  buatSesi,
  catatLoginGagal,
  cocokkanSandi,
  hapusSesi,
  hashSandi,
  periksaKekuatanSandi,
  normalisasiKodePemulihan,
  resetLoginGagal,
  simpanKodePemulihan,
  sisaMenitBlokir,
  wajibSesi,
} from "@/server/auth";

export type HasilAksi = { ok: true } | { ok: false; error: string };

const MasukInput = z.object({
  namaPengguna: z.string().trim().min(1, "Nama pengguna wajib diisi").max(64),
  sandi: z.string().min(1, "Sandi wajib diisi").max(200),
  lanjut: z.string().max(300).nullable().default(null),
});

/**
 * Hanya menerima path relatif satu garis miring. Tanpa ini `?lanjut=` bisa
 * dipakai sebagai open redirect: "//situs-lain.com" dan "https://..." keduanya
 * diterima browser sebagai tujuan absolut.
 */
function tujuanAman(lanjut: string | null): string {
  if (!lanjut) return "/";
  if (!lanjut.startsWith("/") || lanjut.startsWith("//")) return "/";
  return lanjut;
}

/**
 * Pesan gagal sengaja seragam ("Nama pengguna atau sandi salah") supaya tidak
 * bisa dipakai menebak nama pengguna mana yang ada di database.
 */
export async function masuk(input: unknown): Promise<HasilAksi> {
  const parsed = MasukInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { sandi, lanjut } = parsed.data;
  const namaPengguna = parsed.data.namaPengguna.toLowerCase();

  if (!bolehCobaLogin(namaPengguna)) {
    return {
      ok: false,
      error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${sisaMenitBlokir(namaPengguna)} menit.`,
    };
  }

  const akun = db
    .select()
    .from(pengguna)
    .where(eq(pengguna.namaPengguna, namaPengguna))
    .get();

  if (!akun || !(await cocokkanSandi(sandi, akun.salt, akun.hashSandi))) {
    catatLoginGagal(namaPengguna);
    return { ok: false, error: "Nama pengguna atau sandi salah" };
  }

  resetLoginGagal(namaPengguna);
  await buatSesi({
    penggunaId: akun.id,
    namaPengguna: akun.namaPengguna,
    peran: akun.peran,
  });

  redirect(tujuanAman(lanjut));
}

export async function keluar(): Promise<never> {
  await hapusSesi();
  redirect(RUTE_MASUK);
}

const GantiSandiInput = z.object({
  sandiLama: z.string().min(1, "Sandi lama wajib diisi").max(200),
  sandiBaru: z.string().min(1, "Sandi baru wajib diisi").max(200),
  ulangiSandi: z.string().min(1, "Ulangi sandi baru").max(200),
});

export async function gantiSandi(input: unknown): Promise<HasilAksi> {
  const s = await wajibSesi();

  const parsed = GantiSandiInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const { sandiLama, sandiBaru, ulangiSandi } = parsed.data;

  if (sandiBaru !== ulangiSandi) {
    return { ok: false, error: "Sandi baru dan ulangannya tidak sama" };
  }
  const lemah = periksaKekuatanSandi(sandiBaru);
  if (lemah) return { ok: false, error: lemah };

  const akun = db.select().from(pengguna).where(eq(pengguna.id, s.penggunaId)).get();
  if (!akun) return { ok: false, error: "Akun tidak ditemukan" };

  if (!(await cocokkanSandi(sandiLama, akun.salt, akun.hashSandi))) {
    return { ok: false, error: "Sandi lama salah" };
  }
  if (await cocokkanSandi(sandiBaru, akun.salt, akun.hashSandi)) {
    return { ok: false, error: "Sandi baru harus berbeda dari sandi lama" };
  }

  const salt = buatSalt();
  db.update(pengguna)
    .set({
      salt,
      hashSandi: await hashSandi(sandiBaru, salt),
      harusGantiSandi: 0,
    })
    .where(eq(pengguna.id, akun.id))
    .run();

  /**
   * Sesi lama TIDAK bisa dicabut: JWT tetap sah sampai `exp`-nya lewat, dan
   * tidak ada daftar sesi di DB untuk dihapus. Mencabut akses semua perangkat
   * berarti mengganti SYNONA_JWT_SECRET — lihat README.md. Yang bisa
   * dilakukan di sini hanya menyegarkan token perangkat ini sendiri.
   */
  await buatSesi({
    penggunaId: akun.id,
    namaPengguna: akun.namaPengguna,
    peran: akun.peran,
  });

  redirect("/");
}

/* ------------------------------------------------- pemulihan sandi */

/**
 * Membuat kode pemulihan baru dan mengembalikannya SEKALI.
 *
 * Setelah ini hanya hash-nya yang tersimpan; kalau pemilik tidak mencatatnya,
 * satu-satunya jalan adalah membuat kode baru lagi (selama masih bisa masuk)
 * atau `npm run auth:reset` di server.
 */
export async function buatKodePemulihanBaru(): Promise<
  { ok: true; kode: string } | { ok: false; error: string }
> {
  const s = await wajibSesi();
  const kode = await simpanKodePemulihan(s.penggunaId);
  return { ok: true, kode };
}

const PulihInput = z.object({
  namaPengguna: z.string().trim().min(1, "Nama pengguna wajib diisi").max(64),
  kode: z.string().trim().min(1, "Kode pemulihan wajib diisi").max(64),
  sandiBaru: z.string().min(1, "Sandi baru wajib diisi").max(200),
  ulangiSandi: z.string().min(1, "Ulangi sandi baru").max(200),
});

/**
 * Memulihkan akses dengan kode pemulihan, tanpa perlu sandi lama.
 *
 * Kodenya sekali pakai: begitu terpakai, kolomnya dikosongkan supaya kode yang
 * sama tidak bisa diputar ulang oleh orang lain yang sempat melihatnya.
 */
export async function pulihkanSandi(input: unknown): Promise<HasilAksi> {
  const parsed = PulihInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { sandiBaru, ulangiSandi } = parsed.data;
  const namaPengguna = parsed.data.namaPengguna.toLowerCase();
  const kunciBatas = `pulih:${namaPengguna}`;

  if (!bolehCobaLogin(kunciBatas)) {
    return {
      ok: false,
      error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${sisaMenitBlokir(kunciBatas)} menit.`,
    };
  }

  if (sandiBaru !== ulangiSandi) {
    return { ok: false, error: "Sandi baru dan ulangannya tidak sama" };
  }
  const lemah = periksaKekuatanSandi(sandiBaru);
  if (lemah) return { ok: false, error: lemah };

  const akun = db
    .select()
    .from(pengguna)
    .where(eq(pengguna.namaPengguna, namaPengguna))
    .get();

  /**
   * Satu pesan seragam untuk semua kegagalan — nama pengguna tidak ada, belum
   * punya kode, atau kodenya salah. Membedakannya akan memberi tahu penebak
   * nama pengguna mana yang nyata.
   */
  const GAGAL = {
    ok: false as const,
    error: "Nama pengguna atau kode pemulihan salah",
  };

  if (!akun?.kodePemulihanHash || !akun.kodePemulihanSalt) {
    catatLoginGagal(kunciBatas);
    return GAGAL;
  }

  const kode = normalisasiKodePemulihan(parsed.data.kode);
  if (!(await cocokkanSandi(kode, akun.kodePemulihanSalt, akun.kodePemulihanHash))) {
    catatLoginGagal(kunciBatas);
    return GAGAL;
  }

  const salt = buatSalt();
  db.update(pengguna)
    .set({
      salt,
      hashSandi: await hashSandi(sandiBaru, salt),
      harusGantiSandi: 0,
      // Sekali pakai.
      kodePemulihanHash: null,
      kodePemulihanSalt: null,
      kodePemulihanDibuatPada: null,
    })
    .where(eq(pengguna.id, akun.id))
    .run();

  resetLoginGagal(kunciBatas);
  resetLoginGagal(namaPengguna);

  await buatSesi({
    penggunaId: akun.id,
    namaPengguna: akun.namaPengguna,
    peran: akun.peran,
  });

  // Ke halaman ganti sandi: kodenya sudah terpakai, dan di sana pemilik
  // langsung diminta membuat kode pemulihan yang baru.
  redirect(RUTE_GANTI_SANDI);
}
