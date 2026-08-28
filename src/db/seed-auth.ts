/**
 * Seed akun demo `admin` / `admin`.
 *
 * Idempoten: aman dijalankan berkali-kali, tidak menggandakan akun dan tidak
 * menimpa sandi yang sudah diganti pemilik.
 *
 * Dijalankan lewat `npm run auth:init`. Membuka koneksinya sendiri (tidak
 * memakai src/db/index.ts) karena file itu ditandai "server-only".
 *
 * Sandi demo ini SENGAJA lemah dan bukan rahasia — selama masih dipakai,
 * aplikasi menampilkan banner peringatan yang menautkan ke /ganti-sandi.
 * Ganti sebelum dipakai dengan data pelanggan sungguhan.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { promisify } from "node:util";

import { pengguna } from "./schema";

const scrypt = promisify(crypto.scrypt) as (
  sandi: string,
  salt: crypto.BinaryLike,
  panjang: number,
) => Promise<Buffer>;

const DB_PATH = process.env.DATABASE_PATH ?? "./data/synona.db";
const NAMA_PENGGUNA = "admin";
const SANDI = "admin";

async function main() {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite);

  const sudahAda = db
    .select({ id: pengguna.id })
    .from(pengguna)
    .where(eq(pengguna.namaPengguna, NAMA_PENGGUNA))
    .get();

  if (sudahAda) {
    console.log(`✓ Akun "${NAMA_PENGGUNA}" sudah ada — tidak diubah.`);
    sqlite.close();
    return;
  }

  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = (await scrypt(SANDI.normalize("NFKC"), salt, 64)).toString("base64url");

  db.insert(pengguna)
    .values({
      nama: process.env.AUTH_INIT_NAMA ?? "Admin",
      namaPengguna: NAMA_PENGGUNA,
      hashSandi: hash,
      salt,
      peran: "pemilik",
      // Akun demo dipakai berulang; jangan paksa ganti sandi saat login.
      // Peringatannya lewat banner, bukan lewat pintu yang mengunci.
      harusGantiSandi: 0,
      dibuatPada: Date.now(),
    })
    .run();

  sqlite.close();

  console.log(`✓ Akun demo dibuat: ${NAMA_PENGGUNA} / ${SANDI}`);
  console.log("  Ganti sandinya di /ganti-sandi sebelum dipakai sungguhan.");
}

void main();
