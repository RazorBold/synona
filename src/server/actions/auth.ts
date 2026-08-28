"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { pengguna } from "@/db/schema";
import { RUTE_MASUK } from "@/lib/auth-const";
import {
  bolehCobaLogin,
  buatSalt,
  buatSesi,
  catatLoginGagal,
  cocokkanSandi,
  hapusSesi,
  hashSandi,
  periksaKekuatanSandi,
  resetLoginGagal,
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
