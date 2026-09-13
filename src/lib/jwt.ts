/**
 * Sesi dibawa sebagai JWT, ditandatangani HS256 dengan `jose`.
 *
 * Sengaja TIDAK memakai `node:crypto` atau `@/db`: berkas ini diimpor oleh
 * `src/middleware.ts` yang berjalan di Edge Runtime. `jsonwebtoken` tidak bisa
 * dipakai di sana — itu alasan `jose` dipilih, bukan sekadar selera.
 */
import { SignJWT, jwtVerify } from "jose";

import { UMUR_SESI_MS } from "./auth-const";

export const PESAN_SECRET_HILANG =
  "SYNONA_JWT_SECRET tidak diset. Buat berkas .env di root proyek berisi " +
  "SYNONA_JWT_SECRET=<32 byte acak>, lalu jalankan ulang. Aplikasi sengaja " +
  "menolak jalan tanpa secret: nilai default yang diam-diam terpakai di " +
  "produksi jauh lebih berbahaya daripada aplikasi yang gagal start.";

/**
 * Dibaca saat dipakai, bukan di level modul — supaya pesan galatnya muncul
 * sebagai galat aplikasi yang jelas, bukan kegagalan impor yang sulit dilacak.
 */
function rahasia(): Uint8Array {
  const nilai = process.env.SYNONA_JWT_SECRET;
  if (!nilai) throw new Error(PESAN_SECRET_HILANG);
  return new TextEncoder().encode(nilai);
}

export function adaSecret(): boolean {
  return Boolean(process.env.SYNONA_JWT_SECRET);
}

export type IsiToken = {
  penggunaId: string;
  namaPengguna: string;
  peran: "pemilik" | "kasir";
};

export async function buatToken(isi: IsiToken): Promise<string> {
  return new SignJWT({ nama_pengguna: isi.namaPengguna, peran: isi.peran })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(isi.penggunaId)
    .setIssuedAt()
    .setExpirationTime(new Date(Date.now() + UMUR_SESI_MS))
    .sign(rahasia());
}

/**
 * Mengembalikan null kalau token tidak ada / rusak / kedaluwarsa / tanda
 * tangannya salah. Secret dibaca di luar try supaya secret yang hilang tetap
 * melempar — kalau ikut tertelan, aplikasi akan diam-diam mengalihkan semua
 * orang ke /masuk alih-alih menunjukkan salah konfigurasi.
 */
export async function bacaToken(token: string | undefined): Promise<IsiToken | null> {
  if (!token) return null;
  const kunci = rahasia();

  try {
    const { payload } = await jwtVerify(token, kunci, { algorithms: ["HS256"] });

    const penggunaId = payload.sub;
    const namaPengguna = payload.nama_pengguna;
    const peran = payload.peran;

    if (
      typeof penggunaId !== "string" ||
      typeof namaPengguna !== "string" ||
      (peran !== "pemilik" && peran !== "kasir")
    ) {
      return null;
    }

    return { penggunaId, namaPengguna, peran };
  } catch {
    return null;
  }
}
