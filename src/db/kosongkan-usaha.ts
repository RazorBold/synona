/**
 * Mengosongkan data usaha demo dan menyiapkan satu outlet kosong.
 *
 *   npm run data:kosongkan -- "Warung Bu Ani" "Bu Ani"
 *   npm run data:kosongkan -- "Warung Bu Ani" "Bu Ani" --ya
 *
 * Tanpa `--ya` hanya menampilkan apa yang AKAN dihapus, tidak mengubah apa pun.
 *
 * Akun login di tabel `pengguna` TIDAK disentuh — mengosongkan data usaha
 * tidak boleh sekaligus mengunci pemiliknya keluar dari aplikasi.
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";

const DB_PATH = process.env.DATABASE_PATH ?? "./data/synona.db";

/** Urutan penting: anak sebelum induk, supaya foreign key tidak menolak. */
const TABEL = [
  "debt_payments",
  "debts",
  "stock_movements",
  "service_orders",
  "transaction_items",
  "transactions",
  "reminders",
  "reconciliations",
  "payable_payments",
  "purchase_items",
  "purchases",
  "productions",
  "recipe_items",
  "material_movements",
  "materials",
  "expenses",
  "products",
  "services",
  "categories",
  "customers",
  "staff",
  "cash_transfers",
  "cash_accounts",
  "outlets",
  "users",
];

const argv = process.argv.slice(2);
const setuju = argv.includes("--ya");
const posisi = argv.filter((a) => !a.startsWith("--"));
const NAMA_OUTLET = posisi[0] ?? "Outlet Saya";
const NAMA_PEMILIK = posisi[1] ?? "Pemilik";

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

console.log(`Database: ${DB_PATH}\n`);
let total = 0;
for (const t of TABEL) {
  const ada = sqlite
    .prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name=?")
    .get(t) as { n: number };
  if (!ada.n) continue;
  const { n } = sqlite.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number };
  if (n > 0) console.log(`  ${t.padEnd(20)} ${n} baris`);
  total += n;
}

const akun = sqlite.prepare("SELECT COUNT(*) AS n FROM pengguna").get() as { n: number };
console.log(`\n  Total ${total} baris akan DIHAPUS.`);
console.log(`  ${akun.n} akun login di tabel "pengguna" TIDAK disentuh.`);
console.log(`  Outlet baru: "${NAMA_OUTLET}" (pemilik: ${NAMA_PEMILIK})\n`);

if (!setuju) {
  console.log("Ini baru pratinjau. Tambahkan --ya untuk benar-benar menjalankannya:");
  console.log(`  npm run data:kosongkan -- "${NAMA_OUTLET}" "${NAMA_PEMILIK}" --ya`);
  sqlite.close();
  process.exit(0);
}

// Backup otomatis — penghapusan ini tidak bisa dibatalkan.
const stempel = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const tujuan = path.resolve(`./data/backup/sebelum-kosongkan-${stempel}.db`);
fs.mkdirSync(path.dirname(tujuan), { recursive: true });
sqlite.exec(`VACUUM INTO '${tujuan.replace(/'/g, "''")}'`);
console.log(`✓ Backup dibuat: ${tujuan}`);

const userId = nanoid();
const outletId = nanoid();
const sekarang = Date.now();

sqlite.transaction(() => {
  for (const t of TABEL) {
    const ada = sqlite
      .prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name=?")
      .get(t) as { n: number };
    if (ada.n) sqlite.prepare(`DELETE FROM ${t}`).run();
  }

  sqlite
    .prepare(
      `INSERT INTO users (id, email, name, plan, created_at, updated_at)
       VALUES (?, ?, ?, 'mulai', ?, ?)`,
    )
    .run(userId, `pemilik@${outletId.slice(0, 6).toLowerCase()}.local`, NAMA_PEMILIK, sekarang, sekarang);

  sqlite
    .prepare(
      `INSERT INTO outlets (id, owner_id, name, timezone, is_active, created_at, updated_at)
       VALUES (?, ?, ?, 'Asia/Jakarta', 1, ?, ?)`,
    )
    .run(outletId, userId, NAMA_OUTLET, sekarang, sekarang);

  // Kas, bank, dan QRIS bawaan — sama seperti outlet yang dibuat dari
  // aplikasi (src/server/kas.ts). Tanpa ini arus kas mulai tanpa akun.
  const akun = sqlite.prepare(
    `INSERT INTO cash_accounts (id, outlet_id, name, type, metode_default,
                                sort_order, opening_balance, is_active,
                                created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`,
  );
  [
    ["Kas Laci", "kas", "cash"],
    ["Rekening Bank", "bank", "transfer"],
    ["QRIS", "ewallet", "qris"],
  ].forEach(([nama, jenis, metode], i) =>
    akun.run(nanoid(), outletId, nama, jenis, metode, i, sekarang, sekarang),
  );
})();

sqlite.close();

console.log(`✓ Data demo dihapus.`);
console.log(`✓ Outlet "${NAMA_OUTLET}" siap dipakai.`);
console.log(
  `\nLangkah berikutnya: masuk ke aplikasi. Anda akan diminta memilih jenis`,
);
console.log(`usaha (dagang / jasa / campuran) sebelum menu ditampilkan.`);
