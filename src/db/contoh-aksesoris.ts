/**
 * Data contoh: "Aksesoris Kita" — toko aksesoris HP yang juga melayani jasa.
 *
 *   npm run contoh:aksesoris              (pratinjau, tidak mengubah apa pun)
 *   npm run contoh:aksesoris -- --ya      (jalankan sungguhan)
 *
 * Outletnya bertipe `campuran` supaya ketiga mode bisa dicoba dari satu
 * dataset: ganti Jenis Usaha di Pengaturan → Outlet & Staf ke Dagang (menu
 * jasa hilang), Jasa (menu barang hilang), atau kembali ke Campuran.
 *
 * Akun login di tabel `pengguna` TIDAK disentuh — mengganti data usaha tidak
 * boleh sekaligus mengunci pemiliknya keluar dari aplikasi.
 *
 * Membuka koneksinya sendiri (tidak memakai src/db/index.ts) karena file itu
 * ditandai "server-only".
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";

import * as schema from "./schema";

const DB_PATH = process.env.DATABASE_PATH ?? "./data/synona.db";

const argv = process.argv.slice(2);
const setuju = argv.includes("--ya");

/* PRNG deterministik supaya contohnya selalu menghasilkan angka yang sama. */
let seedState = 20260830;
function rand() {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));

const iso = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

const addDays = (isoDate: string, n: number) => {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + n);
  return iso(d);
};

const waktu = (tanggal: string, jam: number, menit: number) =>
  new Date(
    `${tanggal}T${String(jam).padStart(2, "0")}:${String(menit).padStart(2, "0")}:00`,
  ).getTime();

const HARI_INI = iso(new Date());
const HARI = 30;

/* ------------------------------------------------------- pratinjau */

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

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

const akunLogin = sqlite.prepare("SELECT COUNT(*) AS n FROM pengguna").get() as { n: number };
console.log(`\n  Total ${total} baris akan DIGANTI dengan data contoh.`);
console.log(`  ${akunLogin.n} akun login di tabel "pengguna" TIDAK disentuh.`);
console.log(`  Outlet contoh: "Aksesoris Kita" (campuran — dagang + jasa)\n`);

if (!setuju) {
  console.log("Ini baru pratinjau. Tambahkan --ya untuk benar-benar menjalankannya:");
  console.log("  npm run contoh:aksesoris -- --ya");
  sqlite.close();
  process.exit(0);
}

// Backup otomatis — penggantian ini tidak bisa dibatalkan.
const stempel = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const tujuan = path.resolve(`./data/backup/sebelum-contoh-aksesoris-${stempel}.db`);
fs.mkdirSync(path.dirname(tujuan), { recursive: true });
sqlite.exec(`VACUUM INTO '${tujuan.replace(/'/g, "''")}'`);
console.log(`✓ Backup dibuat: ${tujuan}\n`);

const db = drizzle(sqlite, { schema });
fs.mkdirSync("./data/uploads/produk", { recursive: true });

console.log("→ Mengosongkan tabel…");
for (const t of TABEL) {
  const ada = sqlite
    .prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name=?")
    .get(t) as { n: number };
  if (ada.n) sqlite.prepare(`DELETE FROM ${t}`).run();
}

/* ------------------------------------------------ pemilik & outlet */

const userId = nanoid();
db.insert(schema.users)
  .values({
    id: userId,
    email: "pemilik@aksesoriskita.local",
    name: "Bu Rina",
    phone: "6281234500011",
    plan: "tumbuh",
    planEndsAt: new Date(`${addDays(HARI_INI, 26)}T00:00:00`).getTime(),
  })
  .run();

const outletId = nanoid();
db.insert(schema.outlets)
  .values({
    id: outletId,
    ownerId: userId,
    name: "Aksesoris Kita",
    address: "Ruko Pasar Baru Blok C No. 7, Bandung",
    phone: "6281234500011",
    jenisUsaha: "campuran",
  })
  .run();

/* Tiga staf: pemilik di kasir, dua teknisi yang mengerjakan jasa. */
const stafSeed = [
  { nama: "Bu Rina", peran: "owner" as const, userId },
  { nama: "Dimas", peran: "kasir" as const, userId: nanoid() },
  { nama: "Yuli", peran: "kasir" as const, userId: nanoid() },
];

db.insert(schema.users)
  .values(
    stafSeed.slice(1).map((s) => ({
      id: s.userId,
      email: `${s.nama.toLowerCase()}@aksesoriskita.local`,
      name: s.nama,
      plan: "tumbuh" as const,
    })),
  )
  .run();

const staf = stafSeed.map((s) => ({ ...s, id: nanoid() }));
db.insert(schema.staff)
  .values(staf.map((s) => ({ id: s.id, outletId, userId: s.userId, role: s.peran })))
  .run();

const kasirId = staf[0].id;
const teknisi = staf.slice(1);

/* ------------------------------------------------------ kas & bank */

const akunSeed = [
  { name: "Kas Laci", type: "kas" as const, metodeDefault: "cash" as const, opening: 500_000, bank: null },
  { name: "BCA Toko", type: "bank" as const, metodeDefault: "transfer" as const, opening: 4_000_000, bank: "BCA" },
  { name: "QRIS BCA", type: "ewallet" as const, metodeDefault: "qris" as const, opening: 0, bank: "BCA" },
];

const akun = akunSeed.map((a, i) => ({
  id: nanoid(),
  outletId,
  name: a.name,
  type: a.type,
  bankName: a.bank,
  accountNumber: a.type === "bank" ? "1180xxxx77" : null,
  openingBalance: a.opening,
  metodeDefault: a.metodeDefault,
  sortOrder: i,
}));
db.insert(schema.cashAccounts).values(akun).run();

const akunMetode: Record<string, string> = {
  cash: akun[0].id,
  transfer: akun[1].id,
  qris: akun[2].id,
  other: akun[0].id,
};

/* ---------------------------------------------------------- katalog */

const kategori = [
  { name: "Casing & Pelindung", sortOrder: 1 },
  { name: "Charger & Kabel", sortOrder: 2 },
  { name: "Audio", sortOrder: 3 },
  { name: "Aksesori Fashion", sortOrder: 4 },
  { name: "Jasa Pasang & Servis", sortOrder: 5 },
].map((k) => ({ id: nanoid(), outletId, ...k }));
db.insert(schema.categories).values(kategori).run();

const katId = (nama: string) => kategori.find((k) => k.name === nama)!.id;

type ProdukSeed = {
  name: string;
  emoji: string;
  price: number;
  cost: number;
  stock: number;
  kategori: string;
  batas?: number;
};

const produkSeed: ProdukSeed[] = [
  { name: "Softcase Bening", emoji: "📱", price: 25_000, cost: 12_000, stock: 48, kategori: "Casing & Pelindung" },
  { name: "Hardcase Motif", emoji: "🎨", price: 45_000, cost: 22_000, stock: 26, kategori: "Casing & Pelindung" },
  { name: "Tempered Glass Bening", emoji: "🛡️", price: 20_000, cost: 7_000, stock: 92, kategori: "Casing & Pelindung" },
  { name: "Tempered Glass Privacy", emoji: "🔒", price: 45_000, cost: 20_000, stock: 31, kategori: "Casing & Pelindung" },
  { name: "Anti Gores Belakang", emoji: "✨", price: 30_000, cost: 11_000, stock: 40, kategori: "Casing & Pelindung" },
  { name: "Casing Anti Shock", emoji: "🧱", price: 65_000, cost: 34_000, stock: 4, kategori: "Casing & Pelindung", batas: 6 },

  { name: "Kabel Data Type-C 1m", emoji: "🔌", price: 25_000, cost: 11_000, stock: 60, kategori: "Charger & Kabel" },
  { name: "Kabel Data Lightning 1m", emoji: "🔌", price: 35_000, cost: 17_000, stock: 22, kategori: "Charger & Kabel" },
  { name: "Kepala Charger 20W", emoji: "⚡", price: 65_000, cost: 38_000, stock: 18, kategori: "Charger & Kabel" },
  { name: "Powerbank 10.000mAh", emoji: "🔋", price: 165_000, cost: 118_000, stock: 9, kategori: "Charger & Kabel" },
  { name: "Charger Mobil Dual USB", emoji: "🚗", price: 45_000, cost: 24_000, stock: 3, kategori: "Charger & Kabel", batas: 5 },

  { name: "Headset Kabel 3.5mm", emoji: "🎧", price: 35_000, cost: 16_000, stock: 34, kategori: "Audio" },
  { name: "TWS Bluetooth", emoji: "🎵", price: 145_000, cost: 95_000, stock: 12, kategori: "Audio" },
  { name: "Speaker Bluetooth Mini", emoji: "🔊", price: 125_000, cost: 82_000, stock: 6, kategori: "Audio" },

  { name: "Gelang Manik Nama", emoji: "📿", price: 35_000, cost: 12_000, stock: 44, kategori: "Aksesori Fashion" },
  { name: "Anting Tusuk Titanium", emoji: "💎", price: 28_000, cost: 9_000, stock: 55, kategori: "Aksesori Fashion" },
  { name: "Kalung Rantai Baja", emoji: "🔗", price: 55_000, cost: 24_000, stock: 20, kategori: "Aksesori Fashion" },
  { name: "Gantungan Kunci Akrilik", emoji: "🔑", price: 15_000, cost: 5_000, stock: 78, kategori: "Aksesori Fashion" },
  { name: "Strap HP Tali Panjang", emoji: "🪢", price: 40_000, cost: 18_000, stock: 0, kategori: "Aksesori Fashion", batas: 5 },
];

const produk = produkSeed.map((p) => ({
  id: nanoid(),
  outletId,
  categoryId: katId(p.kategori),
  name: p.name,
  emoji: p.emoji,
  price: p.price,
  cost: p.cost,
  stock: p.stock,
  lacakStok: 1,
  lowStockThreshold: p.batas ?? 8,
  unit: "pcs",
  hppMode: "manual" as const,
}));
db.insert(schema.products).values(produk).run();

db.insert(schema.stockMovements)
  .values(
    produk
      .filter((p) => p.stock > 0)
      .map((p) => ({
        id: nanoid(),
        outletId,
        productId: p.id,
        type: "adjustment" as const,
        qtyChange: p.stock,
        stockAfter: p.stock,
        note: "Stok awal",
        createdAt: waktu(addDays(HARI_INI, -HARI), 8, 0),
      })),
  )
  .run();

/* ---------------------------------------------------------- layanan */

const layananSeed = [
  { name: "Pasang Anti Gores", emoji: "🛡️", price: 15_000, cost: 2_000, unit: "pcs" as const, ubah: 0, jam: 1 },
  { name: "Pasang Skin Belakang", emoji: "✨", price: 35_000, cost: 8_000, unit: "pcs" as const, ubah: 0, jam: 1 },
  { name: "Bersih Port & Speaker", emoji: "🧽", price: 25_000, cost: 3_000, unit: "pcs" as const, ubah: 0, jam: 1 },
  { name: "Tindik Telinga", emoji: "💎", price: 40_000, cost: 12_000, unit: "pcs" as const, ubah: 0, jam: 1 },
  { name: "Ukir Nama di Gelang", emoji: "🔤", price: 20_000, cost: 3_000, unit: "pcs" as const, ubah: 0, jam: 2 },
  { name: "Servis Ganti LCD", emoji: "🔧", price: 350_000, cost: 220_000, unit: "pcs" as const, ubah: 1, jam: 48 },
  { name: "Servis Ganti Baterai", emoji: "🔋", price: 180_000, cost: 110_000, unit: "pcs" as const, ubah: 1, jam: 24 },
];

const layanan = layananSeed.map((l) => ({
  id: nanoid(),
  outletId,
  categoryId: katId("Jasa Pasang & Servis"),
  name: l.name,
  emoji: l.emoji,
  price: l.price,
  cost: l.cost,
  unit: l.unit,
  hargaBisaDiubah: l.ubah,
  estimasiJam: l.jam,
}));
db.insert(schema.services).values(layanan).run();

/* ------------------------------------------------------- persediaan */

const bahanSeed = [
  { name: "Cairan Pembersih IPA", jenis: "baku" as const, unit: "ml" as const, stock: 2_400, milli: 120, batas: 500 },
  { name: "Kain Microfiber", jenis: "baku" as const, unit: "pcs" as const, stock: 60, milli: 3_500_000, batas: 15 },
  { name: "Lem Perekat LCD", jenis: "baku" as const, unit: "ml" as const, stock: 180, milli: 2_500, batas: 60 },
  { name: "Anting Steril Sekali Pakai", jenis: "baku" as const, unit: "pcs" as const, stock: 90, milli: 9_000_000, batas: 20 },
  { name: "Plastik Kemasan Kecil", jenis: "packaging" as const, unit: "pcs" as const, stock: 350, milli: 250_000, batas: 100 },
  { name: "Cairan Poles Siap Pakai", jenis: "baku" as const, unit: "ml" as const, stock: 600, milli: 400, batas: 150 },
];

const bahan = bahanSeed.map((b) => ({
  id: nanoid(),
  outletId,
  name: b.name,
  jenis: b.jenis,
  unit: b.unit,
  stock: b.stock,
  costPerUnitMilli: b.milli,
  lowStockThreshold: b.batas,
}));
db.insert(schema.materials).values(bahan).run();

db.insert(schema.materialMovements)
  .values(
    bahan.map((b) => ({
      id: nanoid(),
      outletId,
      materialId: b.id,
      type: "purchase" as const,
      qtyChange: b.stock,
      stockAfter: b.stock,
      costPerUnitMilli: b.costPerUnitMilli,
      note: "Stok awal",
      createdAt: waktu(addDays(HARI_INI, -HARI), 8, 30),
    })),
  )
  .run();

/* -------------------------------------------------------- pelanggan */

const pelangganSeed = [
  ["Andi Prasetyo", "6281234500101"],
  ["Sinta Dewi", "6281234500102"],
  ["Rizky Ramadhan", "6281234500103"],
  ["Melati Kusuma", "6281234500104"],
  ["Bagas Nugroho", "6281234500105"],
  ["Fitri Handayani", "6281234500106"],
  ["Doni Saputra", "6281234500107"],
  ["Nabila Zahra", "6281234500108"],
  ["Gilang Permana", "6281234500109"],
  ["Ayu Lestari", "6281234500110"],
  ["Toko Ponsel Jaya", "6281234500111"],
  ["Konter Berkah", "6281234500112"],
];

const pelanggan = pelangganSeed.map(([nama, hp]) => ({
  id: nanoid(),
  outletId,
  name: nama,
  phone: hp,
  note: nama.startsWith("Toko") || nama.startsWith("Konter") ? "Reseller, ambil grosir" : null,
}));
db.insert(schema.customers).values(pelanggan).run();

console.log("→ Membuat riwayat 30 hari…");

/* ------------------------------------------- penjualan barang (POS) */

const bobotMetode = [
  { metode: "cash" as const, bobot: 52 },
  { metode: "qris" as const, bobot: 30 },
  { metode: "transfer" as const, bobot: 12 },
  { metode: "debt" as const, bobot: 6 },
];
function metodeAcak() {
  const n = rand() * 100;
  let acc = 0;
  for (const m of bobotMetode) {
    acc += m.bobot;
    if (n <= acc) return m.metode;
  }
  return "cash" as const;
}

const txRows: (typeof schema.transactions.$inferInsert)[] = [];
const itemRows: (typeof schema.transactionItems.$inferInsert)[] = [];
const debtRows: (typeof schema.debts.$inferInsert)[] = [];
const orderRows: (typeof schema.serviceOrders.$inferInsert)[] = [];
const bayarRows: (typeof schema.debtPayments.$inferInsert)[] = [];
const gerakStok: (typeof schema.stockMovements.$inferInsert)[] = [];

/** Nomor urut per hari, dipakai bersama oleh invoice dan nomor pesanan. */
const urutInvoice = new Map<string, number>();
const urutOrder = new Map<string, number>();

function nomorInvoice(tanggal: string) {
  const n = (urutInvoice.get(tanggal) ?? 0) + 1;
  urutInvoice.set(tanggal, n);
  return `INV-${tanggal.replace(/-/g, "")}-${String(n).padStart(4, "0")}`;
}
function nomorOrder(tanggal: string) {
  const n = (urutOrder.get(tanggal) ?? 0) + 1;
  urutOrder.set(tanggal, n);
  return `JSA-${tanggal.replace(/-/g, "")}-${String(n).padStart(4, "0")}`;
}

/**
 * Stok berjalan dipakai supaya angka stok akhir cocok dengan jumlah penjualan
 * dan pembelian — kalau tidak, laporan "kenapa stok segini" tidak bisa
 * ditelusuri dari buku besar stoknya sendiri.
 */
const stokBerjalan = new Map(produk.map((p) => [p.id, p.stock]));
const stokAwal = new Map(produk.map((p) => [p.id, p.stock]));

/**
 * Belanja ke supplier dibuat dari keadaan stok, bukan dari daftar tetap:
 * tiap pekan barang yang sudah menipis dipesan ulang secukupnya. Dengan
 * begitu stok akhir contoh ini selalu masuk akal berapa pun angka acak
 * penjualannya — tidak ada toko yang kehabisan seluruh dagangannya dan
 * tetap buka.
 */
const SUPPLIER = [
  "PT Aksesoris Nusantara",
  "Grosir Gadget Bandung",
  "CV Sinar Elektronik",
  "Toko Manik Ciwidey",
];
const HARI_BELANJA = [28, 21, 14, 7, 3];

const belanjaRows: (typeof schema.purchases.$inferInsert)[] = [];
const belanjaItemRows: (typeof schema.purchaseItems.$inferInsert)[] = [];
const bayarSupplierRows: (typeof schema.payablePayments.$inferInsert)[] = [];
let nomorBelanja = 0;

for (let d = HARI; d >= 0; d--) {
  const tanggal = addDays(HARI_INI, -d);
  const akhirPekan = [0, 6].includes(new Date(`${tanggal}T00:00:00`).getDay());
  const jumlahTx = akhirPekan ? between(9, 16) : between(5, 11);

  // Barang datang duluan, baru dijual — urutannya harus begitu supaya
  // stock_movements tidak pernah menunjukkan stok minus di tengah hari.
  if (HARI_BELANJA.includes(d)) {
    const perluIsi = produk.filter(
      (p) => (stokBerjalan.get(p.id) ?? 0) < (stokAwal.get(p.id) ?? 0) * 0.55,
    );

    if (perluIsi.length > 0) {
      const purchaseId = nanoid();
      const occurredAt = waktu(tanggal, 9, 30);
      const supplier = SUPPLIER[nomorBelanja % SUPPLIER.length];
      nomorBelanja += 1;
      let totalBelanja = 0;

      for (const p of perluIsi) {
        const sekarang = stokBerjalan.get(p.id) ?? 0;
        const target = Math.max(stokAwal.get(p.id) ?? 0, 10);
        const qty = Math.max(5, target - sekarang);
        const lineTotal = p.cost * qty;
        totalBelanja += lineTotal;

        belanjaItemRows.push({
          id: nanoid(),
          purchaseId,
          productId: p.id,
          nameSnapshot: p.name,
          qty,
          unitCostMilli: p.cost * 1000,
          lineTotal,
        });

        const sesudah = sekarang + qty;
        stokBerjalan.set(p.id, sesudah);
        gerakStok.push({
          id: nanoid(),
          outletId,
          productId: p.id,
          type: "purchase",
          qtyChange: qty,
          stockAfter: sesudah,
          refId: purchaseId,
          note: `Beli dari ${supplier}`,
          createdAt: occurredAt,
        });
      }

      // Nota terakhir sengaja belum lunas supaya menu Pembelian punya
      // contoh hutang supplier yang bisa dicoba pelunasannya.
      const bayarPersen = d === 3 ? 0 : d === 14 ? 0.5 : 1;
      const dibayar = Math.round(totalBelanja * bayarPersen);
      const sisa = totalBelanja - dibayar;

      belanjaRows.push({
        id: purchaseId,
        outletId,
        supplierName: supplier,
        total: totalBelanja,
        paidAmount: dibayar,
        remaining: sisa,
        method: "transfer",
        cashAccountId: dibayar > 0 ? akunMetode.transfer : null,
        status: sisa === 0 ? "paid" : dibayar > 0 ? "partial" : "debt",
        dueDate: sisa > 0 ? addDays(tanggal, 14) : null,
        occurredAt,
        businessDate: tanggal,
        createdAt: occurredAt,
        updatedAt: occurredAt,
      });
    }
  }

  for (let t = 0; t < jumlahTx; t++) {
    const txId = nanoid();
    const jumlahItem = between(1, 3);
    let subtotal = 0;
    const items: (typeof schema.transactionItems.$inferInsert)[] = [];

    for (let i = 0; i < jumlahItem; i++) {
      const p = pick(produk);
      const stok = stokBerjalan.get(p.id) ?? 0;
      if (stok <= 0) continue;

      const qty = Math.min(stok, between(1, p.price > 100_000 ? 1 : 3));
      const lineTotal = p.price * qty;

      items.push({
        id: nanoid(),
        transactionId: txId,
        productId: p.id,
        nameSnapshot: p.name,
        priceSnapshot: p.price,
        costSnapshot: p.cost,
        qty,
        lineTotal,
      });
      subtotal += lineTotal;

      const sisa = stok - qty;
      stokBerjalan.set(p.id, sisa);
      gerakStok.push({
        id: nanoid(),
        outletId,
        productId: p.id,
        type: "sale",
        qtyChange: -qty,
        stockAfter: sisa,
        refId: txId,
        createdAt: waktu(tanggal, 9 + Math.floor((t / jumlahTx) * 10), between(0, 59)),
      });
    }
    if (items.length === 0) continue;

    const metode = metodeAcak();
    const isUtang = metode === "debt";
    const pembeli = isUtang || rand() < 0.3 ? pick(pelanggan) : null;
    // Utang hanya masuk akal kalau ada nama yang bisa ditagih.
    if (isUtang && !pembeli) continue;

    const occurredAt = waktu(tanggal, 9 + Math.floor((t / jumlahTx) * 10), between(0, 59));
    const invoiceNo = nomorInvoice(tanggal);

    txRows.push({
      id: txId,
      outletId,
      staffId: kasirId,
      customerId: pembeli?.id ?? null,
      invoiceNo,
      subtotal,
      discount: 0,
      total: subtotal,
      paymentMethod: metode,
      cashAccountId: isUtang ? null : akunMetode[metode],
      paidAmount: isUtang ? 0 : subtotal,
      changeAmount: 0,
      status: isUtang ? "debt" : "paid",
      occurredAt,
      businessDate: tanggal,
    });
    itemRows.push(...items);

    if (isUtang) {
      debtRows.push({
        id: nanoid(),
        outletId,
        customerId: pembeli!.id,
        transactionId: txId,
        amount: subtotal,
        paid: 0,
        remaining: subtotal,
        dueDate: addDays(tanggal, 14),
        status: "open",
        createdAt: occurredAt,
        updatedAt: occurredAt,
      });
    }
  }
}

/* --------------------------------------------------- pesanan jasa */

/**
 * Status pesanan ditentukan umurnya: yang lama pasti sudah diambil, yang
 * baru masih antre. Tanpa aturan ini papan antrean akan berisi pekerjaan
 * berumur tiga minggu yang katanya "sedang dikerjakan".
 */
function statusMenurutUmur(umurHari: number) {
  if (umurHari > 4) return "diambil" as const;
  if (umurHari >= 3) return rand() < 0.75 ? ("diambil" as const) : ("selesai" as const);
  if (umurHari === 2) return "selesai" as const;
  if (umurHari === 1) return rand() < 0.6 ? ("dikerjakan" as const) : ("selesai" as const);
  return rand() < 0.55 ? ("masuk" as const) : ("dikerjakan" as const);
}

const CIRI = [
  "iPhone 12 hitam, casing biru",
  "Samsung A14 putih",
  "Redmi Note 11, ada retak pojok",
  "Oppo A57 hijau, tanpa casing",
  "Vivo Y21, layar pecah kanan atas",
  "Infinix Hot 12, baterai kembung",
  "Realme C25 hitam",
  "Gelang manik, ukir nama 'Nabila'",
];

for (let d = HARI; d >= 0; d--) {
  const tanggal = addDays(HARI_INI, -d);
  // Hari-hari terakhir sengaja lebih ramai supaya papan antrean punya isi:
  // papan yang kosong tidak menunjukkan apa pun tentang cara kerjanya.
  const jumlah = d <= 3 ? between(2, 4) : between(0, 3);

  for (let o = 0; o < jumlah; o++) {
    const txId = nanoid();
    const orderId = nanoid();
    const pembeli = pick(pelanggan);
    const petugas = pick(teknisi);
    const occurredAt = waktu(tanggal, 10 + between(0, 7), between(0, 59));

    const jumlahBaris = rand() < 0.7 ? 1 : 2;
    let subtotal = 0;
    const items: (typeof schema.transactionItems.$inferInsert)[] = [];

    for (let i = 0; i < jumlahBaris; i++) {
      const l = pick(layanan);
      const qtyMilli = 1000; // semua layanan di toko ini ditagih per unit
      // Servis berharga bebas: harga akhir menyesuaikan kerusakan.
      const harga =
        l.hargaBisaDiubah === 1 ? l.price + between(-3, 6) * 10_000 : l.price;
      const lineTotal = Math.round((harga * qtyMilli) / 1000);
      const lineCost = Math.round((l.cost * qtyMilli) / 1000);

      items.push({
        id: nanoid(),
        transactionId: txId,
        serviceId: l.id,
        nameSnapshot: l.name,
        // Baris jasa: qty selalu 1 dan price_snapshot berisi total baris
        // (lihat catatan di src/db/schema.ts) supaya laba tetap tepat.
        priceSnapshot: lineTotal,
        costSnapshot: lineCost,
        qty: 1,
        qtyMilli,
        unit: l.unit,
        petugasStaffId: petugas.id,
        lineTotal,
      });
      subtotal += lineTotal;
    }

    // Dua pekerjaan lama sengaja ditinggal berstatus "dikerjakan" supaya
    // ada contoh nyata pesanan yang LEWAT janji — itu yang dihitung kartu
    // "Lewat Janji" dan Radar Q4.
    const telat = (d === 6 || d === 7) && o === 0;
    const status = telat ? ("dikerjakan" as const) : statusMenurutUmur(d);
    const mahal = subtotal >= 150_000;
    // Pekerjaan mahal biasanya pakai DP; yang murah dibayar lunas di depan.
    const lunasDiDepan = !mahal || status === "diambil";
    const dp = lunasDiDepan ? subtotal : Math.round(subtotal * 0.4);
    const sisa = subtotal - dp;
    const metode = pick(["cash", "cash", "qris", "transfer"] as const);

    txRows.push({
      id: txId,
      outletId,
      staffId: kasirId,
      customerId: pembeli.id,
      invoiceNo: nomorInvoice(tanggal),
      subtotal,
      discount: 0,
      total: subtotal,
      paymentMethod: sisa === 0 ? metode : "debt",
      cashAccountId: sisa === 0 ? akunMetode[metode] : null,
      paidAmount: sisa === 0 ? subtotal : 0,
      changeAmount: 0,
      status: sisa === 0 ? "paid" : "debt",
      occurredAt,
      businessDate: tanggal,
    });
    itemRows.push(...items);

    if (sisa > 0) {
      const debtId = nanoid();
      debtRows.push({
        id: debtId,
        outletId,
        customerId: pembeli.id,
        transactionId: txId,
        amount: subtotal,
        paid: dp,
        remaining: sisa,
        dueDate: addDays(tanggal, 3),
        status: dp > 0 ? "partial" : "open",
        createdAt: occurredAt,
        updatedAt: occurredAt,
      });
      if (dp > 0) {
        bayarRows.push({
          id: nanoid(),
          debtId,
          amount: dp,
          method: metode,
          cashAccountId: akunMetode[metode],
          paidAt: occurredAt,
          note: "Uang muka",
          recordedBy: userId,
        });
      }
    }

    orderRows.push({
      id: orderId,
      outletId,
      transactionId: txId,
      orderNo: nomorOrder(tanggal),
      status,
      janjiSelesai: addDays(tanggal, subtotal >= 150_000 ? 2 : 1),
      selesaiPada:
        status === "selesai" || status === "diambil"
          ? occurredAt + 20 * 3_600_000
          : null,
      diambilPada: status === "diambil" ? occurredAt + 30 * 3_600_000 : null,
      tandaBarang: pick(CIRI),
      note: null,
      occurredAt,
      businessDate: tanggal,
    });
  }
}

db.insert(schema.transactions).values(txRows).run();
for (let i = 0; i < itemRows.length; i += 300) {
  db.insert(schema.transactionItems).values(itemRows.slice(i, i + 300)).run();
}
for (let i = 0; i < gerakStok.length; i += 300) {
  db.insert(schema.stockMovements).values(gerakStok.slice(i, i + 300)).run();
}
if (debtRows.length) db.insert(schema.debts).values(debtRows).run();
if (bayarRows.length) db.insert(schema.debtPayments).values(bayarRows).run();
if (orderRows.length) db.insert(schema.serviceOrders).values(orderRows).run();

// Stok akhir produk disamakan dengan hasil penjualan di atas.
for (const [id, sisa] of stokBerjalan) {
  sqlite.prepare("UPDATE products SET stock = ? WHERE id = ?").run(sisa, id);
}

/* ----------------------------------------------- pembelian ke supplier */

console.log("→ Pembelian, beban, dan kas…");

// Satu nota lama dicicil supaya menu Pembelian punya contoh pelunasan.
const notaDicicil = belanjaRows.find((b) => b.status === "partial");
if (notaDicicil) {
  const saatBayar = waktu(addDays(HARI_INI, -6), 14, 0);
  const cicilan = 400_000;
  bayarSupplierRows.push({
    id: nanoid(),
    purchaseId: notaDicicil.id!,
    amount: cicilan,
    method: "transfer",
    cashAccountId: akunMetode.transfer,
    paidAt: saatBayar,
    note: "Cicilan pertama",
    recordedBy: userId,
  });
  notaDicicil.paidAmount = (notaDicicil.paidAmount ?? 0) + cicilan;
  notaDicicil.remaining = notaDicicil.total - notaDicicil.paidAmount;
}

db.insert(schema.purchases).values(belanjaRows).run();
db.insert(schema.purchaseItems).values(belanjaItemRows).run();
if (bayarSupplierRows.length) {
  db.insert(schema.payablePayments).values(bayarSupplierRows).run();
}

/* --------------------------------------------------- beban & tagihan */

type BebanSeed = {
  hari: number;
  kategori: "listrik" | "gaji" | "sewa" | "internet" | "transport" | "lainnya";
  nama: string;
  jumlah: number;
  berulang: boolean;
  metode: "cash" | "transfer";
};

const bebanSeed: BebanSeed[] = [
  { hari: -30, kategori: "sewa", nama: "Sewa kios bulan ini", jumlah: 2_500_000, berulang: true, metode: "transfer" },
  { hari: -30, kategori: "gaji", nama: "Gaji Dimas", jumlah: 2_200_000, berulang: true, metode: "transfer" },
  { hari: -30, kategori: "gaji", nama: "Gaji Yuli", jumlah: 2_000_000, berulang: true, metode: "transfer" },
  { hari: -27, kategori: "internet", nama: "Wifi toko", jumlah: 350_000, berulang: true, metode: "transfer" },
  { hari: -25, kategori: "listrik", nama: "Token listrik", jumlah: 300_000, berulang: true, metode: "cash" },
  { hari: -18, kategori: "lainnya", nama: "Plastik & kertas nota", jumlah: 120_000, berulang: false, metode: "cash" },
  { hari: -12, kategori: "transport", nama: "Ongkir ambil barang", jumlah: 85_000, berulang: false, metode: "cash" },
  { hari: -10, kategori: "listrik", nama: "Token listrik", jumlah: 250_000, berulang: true, metode: "cash" },
  { hari: -7, kategori: "lainnya", nama: "Servis kipas & lampu", jumlah: 175_000, berulang: false, metode: "cash" },
  { hari: -3, kategori: "lainnya", nama: "Cetak banner promo", jumlah: 220_000, berulang: false, metode: "cash" },
];

db.insert(schema.expenses)
  .values(
    bebanSeed.map((b) => {
      const tanggal = addDays(HARI_INI, b.hari);
      const occurredAt = waktu(tanggal, 16, 0);
      return {
        id: nanoid(),
        outletId,
        category: b.kategori,
        name: b.nama,
        amount: b.jumlah,
        method: b.metode,
        cashAccountId: akunMetode[b.metode],
        berulang: b.berulang ? 1 : 0,
        occurredAt,
        businessDate: tanggal,
        recordedBy: userId,
        createdAt: occurredAt,
        updatedAt: occurredAt,
      };
    }),
  )
  .run();

/* -------------------------------------------------- setoran ke bank */

// Tiap Sabtu uang laci disetor ke bank — supaya contoh mutasi antar akun
// ada isinya dan saldo laci tidak menumpuk tidak wajar.
const transferRows: (typeof schema.cashTransfers.$inferInsert)[] = [];
for (let d = HARI; d >= 0; d--) {
  const tanggal = addDays(HARI_INI, -d);
  if (new Date(`${tanggal}T00:00:00`).getDay() !== 6) continue;
  const occurredAt = waktu(tanggal, 17, 30);
  transferRows.push({
    id: nanoid(),
    outletId,
    fromAccountId: akun[0].id,
    toAccountId: akun[1].id,
    amount: between(15, 35) * 100_000,
    note: "Setoran hasil jualan pekan ini",
    occurredAt,
    businessDate: tanggal,
    recordedBy: userId,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  });
}
if (transferRows.length) db.insert(schema.cashTransfers).values(transferRows).run();

/* ------------------------------------------------------ rekonsiliasi */

const rekonRows: (typeof schema.reconciliations.$inferInsert)[] = [];
for (let d = 6; d >= 1; d--) {
  const tanggal = addDays(HARI_INI, -d);
  const kasSistem = sqlite
    .prepare(
      `SELECT COALESCE(SUM(total), 0) AS n FROM transactions
        WHERE outlet_id = ? AND business_date = ? AND status = 'paid'
          AND payment_method = 'cash'`,
    )
    .get(outletId, tanggal) as { n: number };
  const qrisSistem = sqlite
    .prepare(
      `SELECT COALESCE(SUM(total), 0) AS n FROM transactions
        WHERE outlet_id = ? AND business_date = ? AND status = 'paid'
          AND payment_method = 'qris'`,
    )
    .get(outletId, tanggal) as { n: number };

  // Selisih kecil sengaja disisakan: rekonsiliasi yang selalu pas nol tidak
  // mengajarkan apa-apa tentang buat apa menu ini ada.
  const selisih = d === 3 ? -25_000 : d === 5 ? 10_000 : 0;
  const fisik = kasSistem.n + selisih;
  const settled = Math.round(qrisSistem.n * 0.997);

  rekonRows.push({
    id: nanoid(),
    outletId,
    businessDate: tanggal,
    cashSystem: kasSistem.n,
    cashPhysical: fisik,
    cashDiff: fisik - kasSistem.n,
    qrisSystem: qrisSistem.n,
    qrisSettled: settled,
    qrisDiff: settled - qrisSistem.n,
    note: selisih !== 0 ? "Selisih dicatat, dicek besok" : null,
    approvedBy: userId,
    approvedAt: waktu(tanggal, 21, 0),
  });
}
if (rekonRows.length) db.insert(schema.reconciliations).values(rekonRows).run();

/* ---------------------------------------------------------- ringkasan */

const hitung = (t: string) =>
  (sqlite.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;

const omzet = (
  sqlite
    .prepare(
      `SELECT COALESCE(SUM(total), 0) AS n FROM transactions
        WHERE outlet_id = ? AND status != 'void'`,
    )
    .get(outletId) as { n: number }
).n;

console.log(`\n✓ Data contoh "Aksesoris Kita" siap.\n`);
console.log(`  Jenis usaha  : campuran (dagang + jasa)`);
console.log(`  Produk       : ${hitung("products")}`);
console.log(`  Layanan      : ${hitung("services")}`);
console.log(`  Persediaan   : ${hitung("materials")}`);
console.log(`  Pelanggan    : ${hitung("customers")}`);
console.log(`  Transaksi    : ${hitung("transactions")} (${HARI} hari terakhir)`);
console.log(`  Pesanan jasa : ${hitung("service_orders")}`);
console.log(`  Pembelian    : ${hitung("purchases")}`);
console.log(`  Beban        : ${hitung("expenses")}`);
console.log(`  Akun kas     : ${hitung("cash_accounts")}`);
console.log(`  Omzet total  : Rp ${omzet.toLocaleString("id-ID")}`);

sqlite.close();
console.log(`\nMasuk ke aplikasi memakai akun login yang sudah ada.`);
console.log(`Ganti mode di Pengaturan → Outlet & Staf → Jenis Usaha:`);
console.log(`  Dagang   → menu jasa disembunyikan`);
console.log(`  Jasa     → menu barang disembunyikan`);
console.log(`  Campuran → semua menu tampil (bawaan contoh ini)`);
