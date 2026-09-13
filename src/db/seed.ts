/**
 * Data demo yang mencerminkan mockup dashboard.
 *
 * Dijalankan lewat `npm run db:seed`. Membuka koneksinya sendiri (tidak
 * memakai src/db/index.ts) karena file itu ditandai "server-only".
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { nanoid } from "nanoid";

import * as schema from "./schema";

const DB_PATH = process.env.DATABASE_PATH ?? "./data/synona.db";
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

/* PRNG deterministik supaya seed selalu menghasilkan angka yang sama. */
let seedState = 20260813;
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

const HARI_INI = iso(new Date());

console.log("→ Mengosongkan tabel…");
fs.mkdirSync("./data/uploads/produk", { recursive: true });
for (const t of [
  "debt_payments",
  "debts",
  "stock_movements",
  "service_orders",
  "transaction_items",
  "transactions",
  "reminders",
  "reconciliations",
  "products",
  "services",
  "categories",
  "customers",
  "staff",
  "cash_transfers",
  "cash_accounts",
  "outlets",
  "users",
]) {
  sqlite.prepare(`DELETE FROM ${t}`).run();
}

/* ------------------------------------------------ pemilik & outlet */

const userId = nanoid();
db.insert(schema.users)
  .values({
    id: userId,
    email: "busari@synona.id",
    name: "Bu Sari",
    phone: "6281234567890",
    plan: "tumbuh",
    planEndsAt: new Date(`${addDays(HARI_INI, 23)}T00:00:00`).getTime(),
  })
  .run();

const outletId = nanoid();
db.insert(schema.outlets)
  .values({
    id: outletId,
    ownerId: userId,
    name: "Outlet Utama",
    address: "Jl. Merdeka No. 12, Bandung",
    phone: "6281234567890",
    // Data demo ini toko sembako, jadi onboarding tidak perlu muncul lagi.
    jenisUsaha: "dagang",
  })
  .run();

const staffId = nanoid();
db.insert(schema.staff)
  .values({ id: staffId, outletId, userId, role: "owner" })
  .run();

/* ----------------------------------------------------- kas & bank */

const akunKas = [
  { name: "Kas Laci", type: "kas" as const, metodeDefault: "cash" as const },
  { name: "BCA Operasional", type: "bank" as const, metodeDefault: "transfer" as const },
  { name: "QRIS", type: "ewallet" as const, metodeDefault: "qris" as const },
].map((a, i) => ({
  id: nanoid(),
  outletId,
  sortOrder: i,
  bankName: a.type === "bank" ? "BCA" : null,
  ...a,
}));
db.insert(schema.cashAccounts).values(akunKas).run();

const akunMetode: Record<string, string> = {
  cash: akunKas[0].id,
  transfer: akunKas[1].id,
  qris: akunKas[2].id,
};

/* -------------------------------------------------------- katalog */

const kategori = [
  { name: "Sembako", sortOrder: 1 },
  { name: "Minuman", sortOrder: 2 },
  { name: "Makanan Ringan", sortOrder: 3 },
  { name: "Kebutuhan Rumah", sortOrder: 4 },
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
  unit?: string;
};

// 4 produk pertama tampil di kartu "Stok Menipis" (stok terkecil lebih dulu).
const produkSeed: ProdukSeed[] = [
  { name: "Tepung Terigu 1kg", emoji: "🌾", price: 13000, cost: 10500, stock: 2, kategori: "Sembako" },
  { name: "Gula Pasir 1kg", emoji: "🍚", price: 16000, cost: 13500, stock: 3, kategori: "Sembako" },
  { name: "Minyak Goreng 2L", emoji: "🛢️", price: 36000, cost: 31000, stock: 4, kategori: "Sembako" },
  { name: "Telur Ayam", emoji: "🥚", price: 28000, cost: 24000, stock: 6, kategori: "Sembako", unit: "kg" },
  { name: "Beras Pandan Wangi 5kg", emoji: "🌾", price: 72000, cost: 64000, stock: 3, kategori: "Sembako" },
  { name: "Susu Kental Manis", emoji: "🥛", price: 12500, cost: 10000, stock: 4, kategori: "Sembako" },
  { name: "Kopi Sachet", emoji: "☕", price: 2500, cost: 1800, stock: 5, kategori: "Minuman" },
  { name: "Teh Celup Kotak", emoji: "🍵", price: 9000, cost: 6800, stock: 2, kategori: "Minuman" },
  { name: "Air Mineral 600ml", emoji: "💧", price: 4000, cost: 2800, stock: 5, kategori: "Minuman" },
  { name: "Sirup Marjan", emoji: "🍹", price: 24000, cost: 19500, stock: 3, kategori: "Minuman" },
  { name: "Keripik Singkong", emoji: "🥔", price: 8000, cost: 5500, stock: 4, kategori: "Makanan Ringan" },
  { name: "Biskuit Kaleng", emoji: "🍪", price: 45000, cost: 37000, stock: 2, kategori: "Makanan Ringan" },
  { name: "Roti Tawar", emoji: "🍞", price: 15000, cost: 11500, stock: 5, kategori: "Makanan Ringan" },
  { name: "Sabun Mandi", emoji: "🧼", price: 6500, cost: 4800, stock: 4, kategori: "Kebutuhan Rumah" },
  { name: "Deterjen 800g", emoji: "🧴", price: 22000, cost: 18000, stock: 3, kategori: "Kebutuhan Rumah" },
  { name: "Tisu Gulung", emoji: "🧻", price: 11000, cost: 8000, stock: 5, kategori: "Kebutuhan Rumah" },
  // stok aman
  { name: "Mie Instan Goreng", emoji: "🍜", price: 3500, cost: 2600, stock: 120, kategori: "Sembako" },
  { name: "Garam Dapur", emoji: "🧂", price: 4000, cost: 2700, stock: 60, kategori: "Sembako" },
  { name: "Kecap Manis 600ml", emoji: "🥫", price: 27000, cost: 22000, stock: 34, kategori: "Sembako" },
  { name: "Saos Sambal", emoji: "🌶️", price: 14000, cost: 10500, stock: 41, kategori: "Sembako" },
  { name: "Teh Botol", emoji: "🧃", price: 5000, cost: 3600, stock: 88, kategori: "Minuman" },
  { name: "Kopi Susu Kaleng", emoji: "🥤", price: 9500, cost: 7000, stock: 52, kategori: "Minuman" },
  { name: "Wafer Cokelat", emoji: "🍫", price: 6000, cost: 4200, stock: 73, kategori: "Makanan Ringan" },
  { name: "Kerupuk Udang", emoji: "🍤", price: 10000, cost: 7200, stock: 45, kategori: "Makanan Ringan" },
  { name: "Pasta Gigi", emoji: "🪥", price: 13500, cost: 10200, stock: 38, kategori: "Kebutuhan Rumah" },
  { name: "Sampo Sachet", emoji: "🧴", price: 1500, cost: 1000, stock: 150, kategori: "Kebutuhan Rumah" },
];

const productImages: Record<string, string> = {
  "Tepung Terigu 1kg": "tepung_terigu.webp",
  "Gula Pasir 1kg": "gula_pasir.webp",
  "Minyak Goreng 2L": "minyak_goreng.webp",
  "Telur Ayam": "telur_ayam.webp",
  "Beras Pandan Wangi 5kg": "beras_5kg.webp",
  "Susu Kental Manis": "susu_kental.webp",
  "Kopi Sachet": "kopi_sachet.png",
  "Teh Celup Kotak": "teh_celup.png",
  "Air Mineral 600ml": "air_mineral.png",
  "Sirup Marjan": "sirup_marjan.png",
  "Keripik Singkong": "keripik_singkong.png",
  "Biskuit Kaleng": "biskuit_kaleng.png",
  "Roti Tawar": "roti_tawar.png",
  "Sabun Mandi": "sabun_mandi.png",
  "Deterjen 800g": "deterjen_800g.png",
  "Tisu Gulung": "tisu_gulung.png",
  "Mie Instan Goreng": "mie_instan.png",
  "Garam Dapur": "garam_dapur.png",
  "Kecap Manis 600ml": "kecap_manis.png",
  "Saos Sambal": "saos_sambal.png",
  "Teh Botol": "teh_botol.png",
  "Kopi Susu Kaleng": "kopi_susu_kaleng.png",
  "Wafer Cokelat": "wafer_cokelat.png",
  "Kerupuk Udang": "kerupuk_udang.png",
  "Pasta Gigi": "pasta_gigi.png",
  "Sampo Sachet": "sampo_sachet.png",
};

const produk = produkSeed.map((p, i) => ({
  id: nanoid(),
  outletId,
  categoryId: katId(p.kategori),
  name: p.name,
  emoji: p.emoji,
  sku: `SYN-${String(i + 1).padStart(3, "0")}`,
  price: p.price,
  cost: p.cost,
  stock: p.stock,
  unit: p.unit ?? "pcs",
  lowStockThreshold: 8,
  imageUrl: productImages[p.name] ?? null,
}));
db.insert(schema.products).values(produk).run();

// Buku besar stok harus bisa menjelaskan stok yang ada sekarang, jadi setiap
// produk dibukakan dengan satu catatan "Stok awal".
db.insert(schema.stockMovements)
  .values(
    produk
      .filter((p) => p.stock > 0)
      .map((p) => ({
        id: nanoid(),
        outletId,
        productId: p.id,
        type: "purchase" as const,
        qtyChange: p.stock,
        stockAfter: p.stock,
        note: "Stok awal",
        createdAt: new Date(`${addDays(HARI_INI, -7)}T08:00:00`).getTime(),
      })),
  )
  .run();

/* ------------------------------------------------------ pelanggan */

const pelangganSeed = [
  { name: "Budi Anto", phone: "6281234500001" },
  { name: "Siti Rahayu", phone: "6281234500002" },
  { name: "Dewi Puspita", phone: "6281234500003" },
  { name: "Hendra Saputra", phone: "6281234500004" },
  { name: "Rina Marlina", phone: "6281234500005" },
  { name: "Agus Setiawan", phone: "6281234500006" },
  { name: "Nur Aisyah", phone: "6281234500007" },
  { name: "Joko Purnomo", phone: "6281234500008" },
  { name: "Lestari Wulan", phone: "6281234500009" },
  { name: "Bambang Irawan", phone: "6281234500010" },
  { name: "Maya Sari", phone: "6281234500011" },
  { name: "Rudi Hartono", phone: "6281234500012" },
  { name: "Fitri Handayani", phone: "6281234500013" },
  { name: "Tono Sugianto", phone: "6281234500014" },
];
// Tanggal daftar disebar sampai 5 bulan ke belakang supaya statistik
// "pelanggan baru 30 hari" tidak menghitung semua orang.
const pelanggan = pelangganSeed.map((c, i) => ({
  id: nanoid(),
  outletId,
  ...c,
  createdAt: new Date(`${addDays(HARI_INI, -(150 - i * 11))}T09:00:00`).getTime(),
  updatedAt: Date.now(),
}));
db.insert(schema.customers).values(pelanggan).run();

/* ------------------------------------------------------ transaksi */

// Bentuk grafik 7 hari (naik-turun mengikuti mockup), hari terakhir = hari ini.
const targetHarian = [
  850_000, 1_450_000, 1_100_000, 1_350_000, 1_500_000, 1_060_000, 1_250_000,
];
const jumlahTxHarian = [31, 44, 35, 41, 45, 38, 42];

const bobotMetode: { metode: "cash" | "qris" | "transfer" | "other"; bobot: number }[] = [
  { metode: "cash", bobot: 52 },
  { metode: "qris", bobot: 34 },
  { metode: "transfer", bobot: 10 },
  { metode: "other", bobot: 4 },
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

const produkLaris = produk.filter((p) => p.stock > 20);

const txRows: (typeof schema.transactions.$inferInsert)[] = [];
const itemRows: (typeof schema.transactionItems.$inferInsert)[] = [];

for (let d = 6; d >= 0; d--) {
  const tanggal = addDays(HARI_INI, -d);
  const idx = 6 - d;
  const target = targetHarian[idx];
  const jumlahTx = jumlahTxHarian[idx];

  let omzetHari = 0;
  // Nomor invoice diulang dari 1 tiap hari — harus sama dengan pola yang
  // dipakai simpanTransaksi(), kalau tidak nomornya bisa bentrok.
  let noUrut = 0;
  for (let t = 0; t < jumlahTx; t++) {
    const sisaTx = jumlahTx - t;
    const targetTx = Math.max(5_000, Math.round((target - omzetHari) / sisaTx));

    const txId = nanoid();
    const items: (typeof schema.transactionItems.$inferInsert)[] = [];
    let subtotal = 0;

    // Isi keranjang sampai mendekati target nilai transaksi.
    let guard = 0;
    while (subtotal < targetTx * 0.75 && guard++ < 6) {
      const p = pick(produkLaris);
      const qty = between(1, 4);
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
    }

    const metode = metodeAcak();
    const jam = 8 + Math.floor((t / jumlahTx) * 12);
    const menit = between(0, 59);
    const occurredAt = new Date(
      `${tanggal}T${String(jam).padStart(2, "0")}:${String(menit).padStart(2, "0")}:00`,
    ).getTime();

    // Sekitar sepertiga pembeli adalah langganan yang namanya dicatat.
    const pembeli = rand() < 0.34 ? pick(pelanggan) : null;

    noUrut += 1;
    txRows.push({
      id: txId,
      outletId,
      staffId,
      customerId: pembeli?.id ?? null,
      invoiceNo: `INV-${tanggal.replace(/-/g, "")}-${String(noUrut).padStart(4, "0")}`,
      subtotal,
      discount: 0,
      total: subtotal,
      paymentMethod: metode,
      cashAccountId: akunMetode[metode] ?? akunKas[0].id,
      paidAmount: subtotal,
      changeAmount: 0,
      status: "paid",
      occurredAt,
      businessDate: tanggal,
    });
    itemRows.push(...items);
    omzetHari += subtotal;
  }
}

db.insert(schema.transactions).values(txRows).run();
for (let i = 0; i < itemRows.length; i += 400) {
  db.insert(schema.transactionItems).values(itemRows.slice(i, i + 400)).run();
}

/* --------------------------------------------------------- kasbon */

const kasbonSeed: { nama: string; sisa: number; jatuhTempo: number }[] = [
  { nama: "Budi Anto", sisa: 450_000, jatuhTempo: -3 },
  { nama: "Siti Rahayu", sisa: 320_000, jatuhTempo: -1 },
  { nama: "Dewi Puspita", sisa: 280_000, jatuhTempo: 0 },
  { nama: "Hendra Saputra", sisa: 150_000, jatuhTempo: 2 },
  { nama: "Rina Marlina", sisa: 200_000, jatuhTempo: 3 },
  { nama: "Agus Setiawan", sisa: 180_000, jatuhTempo: 4 },
  { nama: "Nur Aisyah", sisa: 160_000, jatuhTempo: 5 },
  { nama: "Joko Purnomo", sisa: 150_000, jatuhTempo: 6 },
  { nama: "Lestari Wulan", sisa: 130_000, jatuhTempo: 7 },
  { nama: "Bambang Irawan", sisa: 120_000, jatuhTempo: 8 },
  { nama: "Maya Sari", sisa: 110_000, jatuhTempo: 10 },
  { nama: "Rudi Hartono", sisa: 100_000, jatuhTempo: 12 },
];

db.insert(schema.debts)
  .values(
    kasbonSeed.map((k, i) => {
      const c = pelanggan.find((p) => p.name === k.nama)!;
      // Utang dicatat menyebar 12 hari ke belakang agar tren piutang
      // di dashboard menanjak wajar, bukan melompat dari nol.
      const dicatat = new Date(
        `${addDays(HARI_INI, -(12 - i))}T10:00:00`,
      ).getTime();
      return {
        id: nanoid(),
        outletId,
        customerId: c.id,
        amount: k.sisa,
        paid: 0,
        remaining: k.sisa,
        dueDate: addDays(HARI_INI, k.jatuhTempo),
        status: "open" as const,
        createdAt: dicatat,
        updatedAt: dicatat,
      };
    }),
  )
  .run();

/* ------------------------------------------------------ pengingat */

db.insert(schema.reminders)
  .values([
    {
      id: nanoid(),
      outletId,
      type: "debt_due",
      title: "3 kasbon jatuh tempo",
      body: "Budi Anto, Siti Rahayu, dan Dewi Puspita perlu diingatkan.",
      scheduledAt: Date.now(),
    },
    {
      id: nanoid(),
      outletId,
      type: "low_stock",
      title: "16 produk stok menipis",
      body: "Segera lakukan pembelian ulang.",
      scheduledAt: Date.now(),
    },
    {
      id: nanoid(),
      outletId,
      type: "daily_report",
      title: "Laporan harian siap",
      body: "Ringkasan penjualan kemarin sudah tersedia.",
      scheduledAt: Date.now(),
    },
  ])
  .run();

const totalOmzet = txRows.reduce((a, t) => a + t.total, 0);
console.log(`✓ Seed selesai
  outlet      : Outlet Utama (${outletId})
  produk      : ${produk.length}
  pelanggan   : ${pelanggan.length}
  transaksi   : ${txRows.length} (omzet 7 hari ${totalOmzet.toLocaleString("id-ID")})
  kasbon      : ${kasbonSeed.length}`);

sqlite.close();
