/**
 * Membuat akun pengelola platform — akun milik penjual SaaS Synona sendiri,
 * bukan milik usaha mana pun. Dipakai untuk membuka Trafik Pengunjung.
 *
 *   npm run platform:admin              # akun "pengelola"
 *   npm run platform:admin -- nama_lain
 *
 * Kenapa bukan akun `pengguna` polos tanpa `user_id`: akun seperti itu
 * diperlakukan sebagai akun warisan oleh getOutletAktif() dan jatuh ke outlet
 * PERTAMA di database — data usaha orang lain. Jadi akun ini diberi outlet
 * kosongnya sendiri ("Synona — Pengelola") lewat jalur users → staff yang
 * sama dengan pendaftaran biasa.
 *
 * Akses ke /trafik tetap ditentukan oleh SYNONA_ADMIN_TRAFIK di .env; skrip
 * ini hanya membuat akunnya. Sandi acak ditambahkan ke .sandi-baru.txt
 * (mode 600), tidak dicetak ke layar — sama seperti `npm run auth:reset`.
 *
 * Idempoten: kalau nama penggunanya sudah ada, tidak ada yang diubah.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { outlets, pengguna, staff, users } from "./schema";

const scrypt = promisify(crypto.scrypt) as (
  sandi: string,
  salt: crypto.BinaryLike,
  panjang: number,
) => Promise<Buffer>;

const DB_PATH = process.env.DATABASE_PATH ?? "./data/synona.db";
const BERKAS = path.resolve("./.sandi-baru.txt");
const NAMA_PENGGUNA = (process.argv[2] ?? "pengelola").toLowerCase();

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
  if (!/^[a-z0-9_.]{3,32}$/.test(NAMA_PENGGUNA)) {
    console.error("✗ Nama pengguna hanya boleh huruf kecil, angka, titik, garis bawah (3–32).");
    process.exit(1);
  }

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite);

  const ada = db
    .select({ id: pengguna.id })
    .from(pengguna)
    .where(eq(pengguna.namaPengguna, NAMA_PENGGUNA))
    .get();
  if (ada) {
    console.log(`• Akun "${NAMA_PENGGUNA}" sudah ada — tidak ada yang diubah.`);
    console.log("  Lupa sandinya? npm run auth:reset -- " + NAMA_PENGGUNA);
    sqlite.close();
    return;
  }

  const sandi = sandiAcak();
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = (await scrypt(sandi.normalize("NFKC"), salt, 64)).toString("base64url");

  db.transaction((tx) => {
    const userId = nanoid();
    tx.insert(users)
      .values({
        id: userId,
        email: `${NAMA_PENGGUNA}@synona.local`,
        name: "Pengelola Synona",
        plan: "juara",
      })
      .run();

    const outletId = nanoid();
    tx.insert(outlets)
      .values({
        id: outletId,
        ownerId: userId,
        name: "Synona — Pengelola",
        // Jenis wajib terisi, kalau tidak layout menahan di layar "pilih
        // jenis usaha". Jasa = menu usaha paling sedikit.
        jenisUsaha: "jasa",
      })
      .run();

    tx.insert(staff).values({ id: nanoid(), outletId, userId, role: "owner" }).run();

    tx.insert(pengguna)
      .values({
        id: nanoid(),
        nama: "Pengelola Synona",
        namaPengguna: NAMA_PENGGUNA,
        hashSandi: hash,
        salt,
        peran: "pemilik",
        userId,
        harusGantiSandi: 1,
      })
      .run();
  });

  sqlite.close();

  // Ditambahkan ke akhir, bukan ditimpa: berkas ini mungkin masih memuat
  // sandi hasil `npm run auth:reset` yang belum sempat diganti pemiliknya.
  const sudahAdaBerkas = fs.existsSync(BERKAS);
  fs.appendFileSync(
    BERKAS,
    [
      ...(sudahAdaBerkas ? ["", "----------------------------------------", ""] : []),
      "Akun pengelola Synona — HAPUS berkas ini setelah sandinya diganti.",
      "",
      `Nama pengguna : ${NAMA_PENGGUNA}`,
      `Sandi         : ${sandi}`,
      "",
      "Login akan langsung meminta ganti sandi.",
      `Pastikan .env berisi: SYNONA_ADMIN_TRAFIK=${NAMA_PENGGUNA}`,
      `Dibuat        : ${new Date().toISOString()}`,
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  fs.chmodSync(BERKAS, 0o600);

  console.log(`✓ Akun "${NAMA_PENGGUNA}" dibuat dengan outlet sendiri (kosong).`);
  console.log(
    `✓ Sandi ${sudahAdaBerkas ? "ditambahkan ke akhir" : "ditulis ke"} ${BERKAS} (mode 600) — tidak dicetak di sini.`,
  );
  console.log(`  Tambahkan ke .env: SYNONA_ADMIN_TRAFIK=${NAMA_PENGGUNA}`);
}

void main();
