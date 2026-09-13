/**
 * Reset sandi dari server — jalan terakhir kalau sandi DAN kode pemulihan
 * sama-sama hilang.
 *
 *   npm run auth:reset            # akun "admin"
 *   npm run auth:reset -- kasir1  # akun lain
 *
 * Sandi barunya acak dan ditulis ke berkas mode 600, bukan dicetak ke layar:
 * keluaran terminal gampang tersimpan di riwayat shell atau log pm2.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { pengguna } from "./schema";

const scrypt = promisify(crypto.scrypt) as (
  sandi: string,
  salt: crypto.BinaryLike,
  panjang: number,
) => Promise<Buffer>;

const DB_PATH = process.env.DATABASE_PATH ?? "./data/synona.db";
const BERKAS = path.resolve("./.sandi-baru.txt");
const NAMA_PENGGUNA = (process.argv[2] ?? "admin").toLowerCase();

function sandiAcak(panjang = 24): string {
  const abjad = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const batas = Math.floor(256 / abjad.length) * abjad.length;
  let hasil = "";
  while (hasil.length < panjang) {
    for (const b of crypto.randomBytes(panjang * 2)) {
      if (b >= batas) continue;
      hasil += abjad[b % abjad.length];
      if (hasil.length === panjang) break;
    }
  }
  return hasil;
}

async function main() {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite);

  const akun = db
    .select({ id: pengguna.id, nama: pengguna.nama })
    .from(pengguna)
    .where(eq(pengguna.namaPengguna, NAMA_PENGGUNA))
    .get();

  if (!akun) {
    const semua = db.select({ n: pengguna.namaPengguna }).from(pengguna).all();
    console.error(`✗ Akun "${NAMA_PENGGUNA}" tidak ada.`);
    console.error(`  Akun yang terdaftar: ${semua.map((r) => r.n).join(", ") || "(kosong)"}`);
    sqlite.close();
    process.exit(1);
  }

  const sandi = sandiAcak();
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = (await scrypt(sandi.normalize("NFKC"), salt, 64)).toString("base64url");

  db.update(pengguna)
    .set({
      salt,
      hashSandi: hash,
      harusGantiSandi: 1,
      // Kode pemulihan lama ikut dibatalkan: kalau sampai perlu reset paksa,
      // kode itu harus dianggap sudah tidak dipegang pemiliknya.
      kodePemulihanHash: null,
      kodePemulihanSalt: null,
      kodePemulihanDibuatPada: null,
    })
    .where(eq(pengguna.id, akun.id))
    .run();

  sqlite.close();

  // Mode 600 sejak penulisan, bukan chmod setelahnya: di antara create dan
  // chmod, berkasnya sempat terbaca siapa pun di mesin ini.
  fs.writeFileSync(
    BERKAS,
    [
      "Sandi baru Synona — HAPUS berkas ini setelah sandinya diganti.",
      "",
      `Nama pengguna : ${NAMA_PENGGUNA}`,
      `Sandi         : ${sandi}`,
      "",
      "Login akan langsung meminta ganti sandi.",
      "Setelah itu buat kode pemulihan baru di halaman Ganti Sandi.",
      `Direset       : ${new Date().toISOString()}`,
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  fs.chmodSync(BERKAS, 0o600);

  console.log(`✓ Sandi "${NAMA_PENGGUNA}" direset.`);
  console.log(`✓ Sandi baru ditulis ke ${BERKAS} (mode 600)`);
  console.log("  Sandi TIDAK dicetak di sini — buka berkas itu di server.");
  console.log("  Kode pemulihan lama dibatalkan; buat yang baru setelah masuk.");
}

void main();
