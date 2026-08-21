# PRD Teknis — Synona

**Versi:** 1.0
**Tanggal:** 20 Agustus 2026
**Pemilik:** Muhammad (solo founder)
**Status:** Draft implementasi MVP
**Dokumen induk:** [PRD.md](PRD.md) (produk & fitur) — dokumen ini hanya membahas **teknis**.

> Dokumen ini menetapkan stack, skema database, daftar library, dan urutan langkah pengerjaan agar aplikasi bisa langsung dibangun (oleh manusia maupun AI coding tool).

---

## 1. Ringkasan Keputusan Arsitektur

| Keputusan | Pilihan | Konsekuensi |
|---|---|---|
| Arsitektur | **Monolit Next.js** (fullstack satu repo, App Router) | Tidak ada backend terpisah; API = Server Actions + Route Handler. |
| Database | **SQLite 3** (file `data/synona.db`, mode WAL) | Nol biaya, nol infra, backup = copy file. **Wajib server dengan disk persisten.** |
| Akses DB | **Drizzle ORM + better-sqlite3** (driver sinkron) | Type-safe, migrasi versioned, portabel ke Postgres/Turso nanti. |
| Rendering | React Server Components (default) + Client Component seperlunya | Query DB langsung di server, payload JS kecil (target NFR "HP kelas bawah"). |
| Deploy | **VPS / Docker** (bukan Vercel serverless) | Lihat §11 — ini konsekuensi langsung dari pilihan SQLite. |

### 1.1 ADR-001 — SQLite sebagai database utama

**Konteks.** [PRD.md §4](PRD.md) semula merekomendasikan Supabase (Postgres). Keputusan diubah ke SQLite 3.

**Kenapa SQLite masuk akal untuk Synona:**
- Beban tulis Synona sangat rendah. Estimasi kasar: 200 tenant × 3 outlet × 300 transaksi/hari ≈ 180.000 write/hari ≈ **2 write/detik**. SQLite dengan WAL sanggup ribuan write/detik pada satu proses.
- Query dominan adalah agregasi kecil per-outlet per-hari — semuanya index-friendly.
- Biaya Rp 0 dan tanpa dependensi jaringan → latensi query ~mikrodetik, cocok dengan target "POS < 2 detik".
- Backup & restore sederhana: satu file.

**Batasan yang harus disadari (bukan blocker, tapi jangan ditabrak):**

| Batasan | Dampak | Mitigasi di desain ini |
|---|---|---|
| **Satu penulis pada satu waktu** | Write bersamaan bisa `SQLITE_BUSY`. | WAL + `busy_timeout=5000ms` + semua write dibungkus transaksi pendek. |
| **Filesystem harus persisten** | Tidak jalan di Vercel/Netlify serverless — DB hilang tiap invocation. | Deploy VPS/Docker dengan volume (§11). |
| **Tidak bisa horizontal scale multi-node** | Tidak bisa 2 instance app menulis ke file yang sama lewat network FS. | 1 instance saja. Kalau perlu scale → Turso/libSQL (§11.3). |
| **Tidak ada Row Level Security bawaan** | Isolasi tenant tidak dijamin database. | **Isolasi wajib di application layer** — lihat §6, aturan mutlak. |
| **Tipe longgar (type affinity)** | Bisa menyimpan data ngawur. | Validasi Zod di setiap Server Action (drizzle-kit tidak membuat `STRICT`/`CHECK` — lihat §4.1). |

**Kapan harus pindah.** Trigger migrasi ke Postgres/Turso: (a) butuh >1 instance app, (b) `SQLITE_BUSY` muncul di log produksi secara rutin, (c) ukuran DB > 20 GB, (d) butuh read replica lintas region. Karena memakai Drizzle, migrasi = ganti driver + dialek, bukan tulis ulang query.

---

## 2. Tech Stack

### 2.1 Inti

| Lapisan | Teknologi | Versi target | Alasan |
|---|---|---|---|
| Runtime | Node.js | 22 LTS / 24 | `better-sqlite3` butuh Node runtime (bukan Edge). |
| Framework | **Next.js (App Router)** | 15.x | Server Components + Server Actions = fullstack tanpa backend terpisah. |
| Bahasa | **TypeScript** (`strict: true`) | 5.x | Wajib — logika uang tidak boleh `any`. |
| Styling | **Tailwind CSS** | 4.x | Mockup dashboard padat utility; cepat & bundle kecil. |
| Database | **SQLite 3** | 3.45+ | Keputusan ADR-001. |
| Driver | **better-sqlite3** | 12.x | Sinkron, tercepat, native prepared statement. |
| ORM | **Drizzle ORM** + **drizzle-kit** | 0.44.x / 0.31.x | Type-safe, SQL-like, migrasi file-based, bundle kecil. |
| Auth | **Auth.js (NextAuth v5)** + Drizzle adapter | 5.x beta | Google OAuth + magic link, session tersimpan di SQLite. |
| Validasi | **Zod** | 4.x | Satu skema untuk form + Server Action + tipe TS. |

### 2.2 UI & Interaksi

| Kebutuhan | Library | Alasan |
|---|---|---|
| Primitif UI aksesibel | **Radix UI** (via shadcn/ui) | Dialog, Dropdown, Select, Popover — headless, a11y beres, copy-paste (bukan dependency berat). |
| Ikon | **lucide-react** | Persis gaya ikon di mockup, tree-shakeable. |
| Grafik | **Recharts** | Area chart 7 hari + donut pembayaran di dashboard. |
| Utility class | **clsx** + **tailwind-merge** (`cn()`) | Menggabung class kondisional tanpa konflik. |
| Varian komponen | **class-variance-authority** | Varian Button/Badge konsisten. |
| Form | **react-hook-form** + `@hookform/resolvers` | Form POS & produk, integrasi Zod. |
| Tanggal | **date-fns** + locale `id` | Format "Selasa, 13 Agustus 2026" & rentang laporan. |
| Toast | **sonner** | Feedback aksi (simpan transaksi, bayar utang). |
| State UI klien | **zustand** | Hanya untuk keranjang POS (state lintas komponen, persist localStorage). |

> **Sengaja TIDAK dipakai di MVP:** React Query / SWR (server state sudah ditangani RSC + `revalidatePath`), Redux, ORM lain, komponen table berat (TanStack Table baru perlu saat laporan kompleks).

### 2.3 PWA, Kualitas, Tooling

| Kebutuhan | Library / Tool |
|---|---|
| PWA (service worker, offline shell) | **@serwist/next** (penerus `next-pwa`, aktif dimaintain) |
| ID unik | **nanoid** (21 char, URL-safe) — lebih pendek dari UUID, hemat index SQLite |
| Unit test (logika uang) | **Vitest** |
| E2E (alur POS & kasbon) | **Playwright** |
| Lint & format | ESLint (`next/core-web-vitals`) + Prettier + `prettier-plugin-tailwindcss` |
| Git hook | Husky + lint-staged |
| Env type-safe | `@t3-oss/env-nextjs` |

---

## 3. Struktur Folder

```
synona/
├── data/
│   ├── synona.db              # file SQLite (JANGAN commit)
│   └── backups/               # hasil backup harian
├── drizzle/                   # file migrasi hasil generate (WAJIB commit)
├── public/
│   ├── icons/                 # ikon PWA 192/512
│   └── manifest.webmanifest
├── src/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (app)/             # route terproteksi, pakai AppShell
│   │   │   ├── layout.tsx     # Sidebar + Topbar
│   │   │   ├── page.tsx       # Dashboard
│   │   │   ├── kasir/  produk/  pelanggan/  kasbon/
│   │   │   ├── laporan/  rekonsiliasi/  outlet/  pengingat/
│   │   ├── api/auth/[...nextauth]/route.ts
│   │   ├── layout.tsx
│   │   └── globals.css        # token warna & tema
│   ├── components/
│   │   ├── ui/                # primitif: button, card, badge, avatar…
│   │   ├── layout/            # sidebar, topbar, bottom-nav
│   │   └── dashboard/         # kartu KPI, chart, panel utang, aksi cepat
│   ├── db/
│   │   ├── index.ts           # koneksi singleton + PRAGMA
│   │   ├── schema.ts          # definisi tabel Drizzle
│   │   ├── migrate.ts         # runner migrasi saat boot
│   │   └── seed.ts            # data demo (isi mockup)
│   ├── server/
│   │   ├── auth.ts            # config Auth.js
│   │   ├── session.ts         # getCurrentUser / requireOutlet
│   │   ├── queries/           # READ (dipakai Server Component)
│   │   └── actions/           # WRITE ("use server", Server Actions)
│   ├── lib/
│   │   ├── money.ts           # formatRupiah, hitung untung
│   │   ├── wa.ts             # buildWaLink + template pesan
│   │   ├── date.ts  utils.ts (cn)
│   └── types/
├── drizzle.config.ts
└── .env.local
```

**Aturan lapisan (tidak boleh dilanggar):**
`components/` → tidak pernah impor `db/`. Hanya `server/queries` & `server/actions` yang menyentuh database. Ini yang membuat migrasi DB nanti hanya menyentuh satu folder.

---

## 4. Skema Database (SQLite)

### 4.1 Konvensi

| Aspek | Aturan | Alasan |
|---|---|---|
| Primary key | `TEXT` berisi `nanoid()` | Aman untuk sinkronisasi offline (ID dibuat di klien tanpa bentrok). |
| **Uang** | `INTEGER` **rupiah utuh** (bukan float!) | Rupiah tidak punya sen. Float = bug pembulatan pada laporan untung. |
| Waktu | `INTEGER` unix epoch **milidetik** (UTC) | Bandingkan & urutkan murah; render zona `Asia/Jakarta` di UI. |
| Tanggal bisnis | `TEXT` `YYYY-MM-DD` (waktu lokal outlet) | "Hari ini" harus mengikuti hari kalender pemilik, bukan UTC. |
| Boolean | `INTEGER` 0/1 | Tidak ada tipe boolean di SQLite. |
| Enum | `TEXT` + enum Drizzle + Zod | Lihat catatan di bawah. |
| Hapus data | **Soft delete** (`is_active`) untuk produk/pelanggan | Transaksi historis tidak boleh yatim. |

> **Catatan penting soal `STRICT` & `CHECK`.** `drizzle-kit` **tidak** menghasilkan tabel `STRICT` maupun `CHECK` constraint — enum Drizzle hanya menjadi tipe TypeScript, tidak menjadi aturan database. Artinya SQLite tetap menerima nilai di luar enum jika ditulis lewat SQL mentah. Konsekuensinya: **validasi Zod di setiap Server Action bersifat wajib, bukan opsional** (§6). Bila kelak ingin penjagaan di level database, tambahkan `CHECK` dan `STRICT` secara manual pada file migrasi di `drizzle/` (file SQL boleh disunting sebelum dijalankan).

### 4.2 PRAGMA wajib saat koneksi

```ts
db.pragma("journal_mode = WAL");      // pembaca tidak memblokir penulis
db.pragma("foreign_keys = ON");       // SQLite mematikannya secara default!
db.pragma("busy_timeout = 5000");     // antre 5 detik, jangan langsung error
db.pragma("synchronous = NORMAL");    // aman + cepat saat WAL
db.pragma("cache_size = -64000");     // 64 MB page cache
```

### 4.3 Tabel

Ringkasan kolom (di luar `id`, `created_at`, `updated_at` yang ada di semua tabel). Notasi `CHECK(a|b)` di bawah berarti *nilai yang sah*; penegakannya lewat Drizzle + Zod sesuai catatan §4.1.

**`users`** — pemilik/pengguna
`email` UNIQUE · `name` · `phone` · `image` · `plan` CHECK(`mulai`|`tumbuh`|`juara`) DEFAULT `mulai` · `trial_ends_at`

**`accounts` / `sessions` / `verification_tokens`** — dibuat mengikuti skema Auth.js Drizzle adapter (jangan diubah).

**`outlets`**
`owner_id` → users ON DELETE CASCADE · `name` · `address` · `phone` · `timezone` DEFAULT `Asia/Jakarta` · `is_active`
Index: `(owner_id)`

**`staff`**
`outlet_id` → outlets · `user_id` → users · `role` CHECK(`owner`|`kasir`) · `is_active`
UNIQUE `(outlet_id, user_id)` — **tabel ini adalah sumber kebenaran otorisasi** (§6).

**`categories`**
`outlet_id` · `name` · `sort_order`

**`products`**
`outlet_id` · `category_id` NULL ON DELETE SET NULL · `name` · `sku` NULL · `emoji` NULL · `price` INT · `cost` INT · `stock` INT DEFAULT 0 · `low_stock_threshold` INT DEFAULT 5 · `unit` DEFAULT `pcs` · `image_url` NULL (nama berkas foto, bukan URL penuh) · `is_active`
Index: `(outlet_id, is_active)`, `(outlet_id, name)` · UNIQUE parsial `(outlet_id, sku) WHERE sku IS NOT NULL`
CHECK: `price >= 0`, `cost >= 0`

**`customers`**
`outlet_id` · `name` · `phone` (normalisasi `62…`) · `note` · `is_active`
Index: `(outlet_id, name)`

**`transactions`**
`outlet_id` · `staff_id` · `customer_id` NULL · `invoice_no` · `subtotal` · `discount` DEFAULT 0 · `total` · `payment_method` CHECK(`cash`|`qris`|`transfer`|`debt`|`other`) · `paid_amount` · `change_amount` · `status` CHECK(`paid`|`debt`|`void`) · `occurred_at` INT · `business_date` TEXT · `note`
Index: **`(outlet_id, business_date)`** ← index terpenting; hampir semua query dashboard memakainya. Juga `(outlet_id, occurred_at DESC)`, `(customer_id)`
UNIQUE `(outlet_id, invoice_no)`

**`transaction_items`**
`transaction_id` → transactions ON DELETE CASCADE · `product_id` NULL ON DELETE SET NULL · `name_snapshot` · `price_snapshot` · `cost_snapshot` · `qty` · `line_total`
Index: `(transaction_id)`, `(product_id)`
> Snapshot harga & modal **wajib** — laporan untung bulan lalu harus tetap benar walau harga produk diubah hari ini.

**`debts`** (kasbon)
`outlet_id` · `customer_id` · `transaction_id` NULL · `amount` · `paid` DEFAULT 0 · `remaining` · `due_date` TEXT NULL · `status` CHECK(`open`|`partial`|`paid`)
Index: `(outlet_id, status)`, `(outlet_id, due_date)`, `(customer_id)`

**`debt_payments`**
`debt_id` → debts ON DELETE CASCADE · `amount` · `method` · `paid_at` · `note` · `recorded_by`

**`stock_movements`** — buku besar stok (tambahan dari PRD produk)
`outlet_id` · `product_id` · `type` CHECK(`sale`|`purchase`|`adjustment`|`void`) · `qty_change` (boleh negatif) · `stock_after` · `ref_id` · `note` · `created_at`
> Kenapa perlu: kolom `products.stock` saja tidak bisa menjawab "kenapa stok gula beda 3?". Tabel ini yang membuat audit stok mungkin, dan murah karena hanya append.

**`reconciliations`**
`outlet_id` · `business_date` · `cash_system` · `cash_physical` · `cash_diff` · `qris_system` · `qris_settled` · `qris_diff` · `note` · `approved_by` · `approved_at`
UNIQUE `(outlet_id, business_date)` — satu tutup buku per hari.

**`reminders`**
`outlet_id` · `type` CHECK(`debt_due`|`low_stock`|`daily_report`) · `ref_id` · `title` · `body` · `scheduled_at` · `sent_at` NULL · `status`

### 4.4 Rumus keuangan (satu sumber kebenaran: `lib/money.ts`)

```
laba_kotor(transaksi) = Σ (price_snapshot − cost_snapshot) × qty − discount
omzet_hari_ini       = Σ total       WHERE business_date = ? AND status != 'void'
laba_hari_ini        = Σ laba_kotor  WHERE business_date = ? AND status != 'void'
piutang_berjalan     = Σ remaining   WHERE status IN ('open','partial')
selisih_qris         = qris_settled − qris_system      -- wajar jika ≈ −0,3% (MDR)
```

Semua perhitungan **integer**. Persentase (MDR, tren vs kemarin) dihitung saat render, tidak pernah disimpan sebagai float ke DB.

---

## 5. Pola Akses Data

**Baca** → Server Component memanggil `server/queries/*` secara langsung (tanpa fetch HTTP):

```ts
// src/app/(app)/page.tsx
const outlet = await requireOutlet();
const ringkasan = await getRingkasanHariIni(outlet.id);
```

**Tulis** → Server Action dengan pola tetap: `auth → validasi Zod → cek kepemilikan → transaksi DB → revalidate`.

```ts
"use server";
export async function simpanTransaksi(input: unknown) {
  const user = await requireUser();
  const data = TransaksiSchema.parse(input);
  await assertOutletAccess(user.id, data.outletId);

  const hasil = db.transaction(() => {         // sinkron & atomik
    // 1. insert transactions
    // 2. insert transaction_items (snapshot harga & modal)
    // 3. update products.stock + insert stock_movements
    // 4. jika metode 'debt' → insert debts
  })();

  revalidatePath("/"); revalidatePath("/kasir");
  return { ok: true, id: hasil.id };
}
```

**Aturan mutlak:** setiap transaksi POS harus **satu** `db.transaction()`. Stok berkurang tanpa transaksi tersimpan (atau sebaliknya) adalah bug data yang tidak bisa diperbaiki otomatis.

**Route Handler** (`app/api/...`) hanya dipakai untuk: callback Auth.js, endpoint backup/cron, dan sinkronisasi antrean offline (F-14). Selain itu pakai Server Action.

---

## 6. Keamanan & Isolasi Tenant

SQLite **tidak punya** Row Level Security seperti Supabase. Pengganti wajibnya:

1. **Tidak ada query yang menerima `outletId` dari klien tanpa verifikasi.** Setiap Server Action memanggil `assertOutletAccess(userId, outletId)` yang mengecek tabel `staff`.
2. **Setiap query berisi filter `outlet_id`.** Tanpa pengecualian.
3. Helper terpusat `requireUser()` dan `requireOutlet()` di `server/session.ts` — dilarang membaca session mentah di halaman.
4. Validasi Zod di semua boundary (Server Action & Route Handler).
5. `plan` gating dicek **di server** (batas jumlah outlet), bukan sekadar menyembunyikan menu.
6. Rate limit sederhana in-memory pada aksi login & kirim magic link.
7. File `data/*.db` ada di `.gitignore` dan **tidak boleh** berada di dalam `public/`.

Checklist rutin: cari `from(` tanpa `.where(eq(...outletId))` — itu kandidat kebocoran data antar-tenant.

---

## 7. Daftar Library & Perintah Install

```bash
# 1. Scaffold
npx create-next-app@latest synona --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# 2. Database
npm i drizzle-orm better-sqlite3 nanoid
npm i -D drizzle-kit @types/better-sqlite3

# 3. Auth & validasi
npm i next-auth@beta @auth/drizzle-adapter zod @t3-oss/env-nextjs

# 4. UI
npm i lucide-react clsx tailwind-merge class-variance-authority
npm i @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select \
      @radix-ui/react-popover @radix-ui/react-tabs @radix-ui/react-avatar @radix-ui/react-slot
npm i recharts date-fns sonner zustand
npm i react-hook-form @hookform/resolvers

# 5. PWA
npm i @serwist/next && npm i -D serwist

# 6. Kualitas
npm i -D vitest @vitejs/plugin-react @playwright/test
npm i -D prettier prettier-plugin-tailwindcss husky lint-staged
```

**Catatan `better-sqlite3`:** modul native. Tersedia prebuilt untuk Node LTS; bila gagal build di Windows, pasang build tools (`npm i -g windows-build-tools` atau Visual Studio Build Tools + Python 3). Di Docker gunakan base image `node:22-bookworm` (bukan Alpine) atau pasang `build-base python3`.

---

## 8. Langkah Implementasi (Berurutan)

Tiap langkah punya definisi selesai (DoD) yang bisa diuji.

| # | Langkah | Isi | DoD |
|---|---|---|---|
| **0** | Setup proyek | create-next-app, Prettier, `cn()`, token warna Tailwind, `.gitignore` (`data/`, `.env*`) | `npm run dev` jalan, halaman kosong tampil |
| **1** | Fondasi DB | `db/index.ts` (+ PRAGMA), `db/schema.ts`, `drizzle.config.ts`, `drizzle-kit generate && migrate` | File `data/synona.db` terbentuk dengan semua tabel |
| **2** | Seed demo | `db/seed.ts` — 1 user "Bu Sari", 1 outlet, ~20 produk, 8 pelanggan, transaksi 7 hari terakhir, 4 kasbon | `npm run db:seed` mengisi data yang persis mencerminkan mockup |
| **3** | **App shell + Dashboard** | Sidebar, Topbar, layout, kartu KPI, chart, panel utang, stok menipis, donut pembayaran, aksi cepat | Tampilan sesuai mockup di desktop & mobile |
| **4** | Query dashboard nyata | `server/queries/dashboard.ts` menggantikan data statis | Angka dashboard = hasil query DB seed |
| **5** | Auth | Auth.js + Google/magic link, middleware proteksi, onboarding outlet pertama | Route `(app)` menolak anonim; data terikat user |
| **6** | Produk & stok (F-02/F-03) | CRUD produk, kategori, penyesuaian stok + `stock_movements` | Ubah stok tercatat di buku besar stok |
| **7** | POS (F-01) | Grid produk, keranjang (zustand), bayar tunai/QRIS/utang, kembalian | Transaksi tersimpan atomik, stok berkurang |
| **8** | Kasbon (F-05) | Daftar piutang, detail pelanggan, catat cicilan | `remaining` & status akurat setelah cicilan |
| **9** | WhatsApp (F-06) | `lib/wa.ts` + tombol kirim struk & ingatkan | Link `wa.me` terbuka dengan pesan ter-encode benar |
| **10** | Laporan (F-04) | Harian/bulanan, filter rentang, ekspor CSV | Angka cocok dengan rumus §4.4 |
| **11** | Rekonsiliasi (F-07) | Form tutup buku, sorot selisih di luar ambang | Satu record per outlet per hari |
| **12** | PWA (F-09) | Serwist, manifest, ikon, offline shell | Lolos audit Lighthouse PWA, installable |
| **13** | Multi-outlet & peran (F-10/F-11) | Switcher outlet di topbar, gating `plan` | Kasir tidak bisa membuka `/laporan` |
| **14** | Uji & rilis | Vitest untuk `money.ts`, Playwright alur POS & kasbon, backup harian, Docker | Test hijau, backup terbukti bisa di-restore |

Langkah 0–4 adalah cakupan sprint pertama dan sudah mencakup permintaan dashboard.

### 8.1 Status implementasi (20 Agustus 2026)

| Langkah | Status | Bukti |
|---|---|---|
| 0 Setup proyek | ✅ Selesai | `npm run dev` jalan; Tailwind 4 + token §12 aktif |
| 1 Fondasi DB | ✅ Selesai | 13 tabel di `data/synona.db`, migrasi di `drizzle/0000_*.sql` |
| 2 Seed demo | ✅ Selesai | 26 produk, 14 pelanggan, ~280 transaksi 7 hari, 12 kasbon |
| 3 App shell + Dashboard | ✅ Selesai | Sidebar, topbar, 4 KPI, grafik, panel utang, stok, donut, aksi cepat, banner tips |
| 4 Query dashboard nyata | ✅ Selesai | `src/server/queries/dashboard.ts` — tidak ada angka statis di UI |
| 5 Auth | ⏳ Belum | POS memakai `getOutletAktif()` sementara; lihat catatan di bawah |
| 6 Produk & stok (F-02/F-03) | ✅ Selesai | CRUD produk, arsip, dan penyesuaian stok (masuk/keluar/opname) dengan jejak di `stock_movements` |
| 7 POS (F-01) | ✅ Selesai | Grid produk + keranjang persisten + tunai/QRIS/transfer/utang, tersimpan atomik |
| — Pelanggan (pendukung F-05) | ✅ Selesai | CRUD pelanggan, ringkasan belanja & piutang per orang, dialog riwayat, chat WhatsApp |
| 8 Kasbon (F-05) | ✅ Selesai | Daftar utang, cicilan & pelunasan, kasbon manual, riwayat cicilan |
| 9 WhatsApp (F-06) | ✅ Selesai | Tombol Ingatkan di kasbon & dashboard, kirim struk di POS, chat di Pelanggan |
| 10–14 | ⏳ Belum | Laporan, rekonsiliasi, PWA, multi-outlet |

**Hasil ukur build produksi:** First Load JS dashboard **108 kB**, POS **140 kB**, Produk & Stok **132 kB** — semuanya di bawah anggaran 150 kB (§9). Angka dashboard tercapai setelah Recharts dipisah lewat `next/dynamic` di `src/components/dashboard/charts-lazy.tsx`; tanpa pemisahan itu 224 kB.

**Catatan POS (langkah 7):**
- Server Action `simpanTransaksi` mengambil ulang harga & modal dari database — nilai dari klien tidak dipercaya. Satu `db.transaction` mencakup transaksi, item, pengurangan stok, `stock_movements`, dan pembuatan kasbon.
- Nomor invoice diambil dari `MAX(substr(invoice_no,-4))` per outlet per hari, bukan `COUNT(*)`, supaya transaksi yang di-void tidak membuat nomor terpakai ulang (kolom itu punya unique index).
- Keranjang disimpan di `localStorage` lewat zustand `persist` dengan `skipHydration: true`, agar render pertama di klien identik dengan hasil render server.
- **Belum ada di POS:** void/retur transaksi, diskon per item, cetak struk termal, dan verifikasi staf (menunggu langkah 5).

**Catatan Produk & Stok (langkah 6):**
- Stok **tidak bisa** diubah lewat form produk. Satu-satunya pintu adalah `sesuaikanStok()` dengan tiga mode: *masuk* (barang datang), *keluar* (rusak/terpakai), dan *opname* (stok diset ke hasil hitung fisik). Setiap perubahan menulis satu baris `stock_movements`, sehingga pertanyaan "kenapa stok berubah?" selalu bisa dijawab.
- Produk **diarsipkan** (`is_active = 0`), tidak pernah dihapus — item transaksi lama menyimpan `product_id` dan snapshot nama.
- Seed kini menuliskan satu catatan "Stok awal" per produk supaya buku besar stok konsisten dengan stok yang tampil; sebelumnya riwayat kosong padahal stok ada isinya.
- **Belum ada:** kelola kategori (masih dari seed), impor/ekspor CSV, varian produk, dan multi-satuan.

**Catatan foto produk:**
- Disimpan sebagai berkas di `data/uploads/produk/<nanoid>.webp`, bukan BLOB di SQLite. Alasannya: menulis blob besar menggemukkan WAL dan memperberat penulis tunggal SQLite, sementara POS punya target < 2 detik per transaksi. Konsekuensinya backup jadi dua bagian (§10).
- Kolom `products.image_url` menyimpan **nama berkas saja**, bukan URL penuh, supaya pindah domain/server tidak memutus gambar.
- Foto diperkecil ke sisi terpanjang 720px dan dikompres ke WebP **di HP** sebelum diunggah (`src/lib/gambar.ts`) — foto kamera 3–5 MB tidak pernah dikirim utuh. Batas `serverActions.bodySizeLimit` dinaikkan ke 4 MB sebagai jaring pengaman.
- Disajikan lewat Route Handler `/api/gambar/[nama]` dengan penjagaan pola nama (anti path traversal) dan `Cache-Control: immutable` — aman karena setiap unggahan menghasilkan nama baru.
- Emoji tetap ada sebagai ikon cadangan ketika produk belum difoto.

**Catatan Pelanggan:**
- Daftar pelanggan memakai **satu query** dengan dua subquery agregat (belanja & piutang) — bukan query per baris, supaya tidak N+1 saat pelanggan bertambah banyak.
- Nomor WhatsApp dinormalisasi ke format `62…` saat disimpan, dan **nomor ganda ditolak** — nomor kembar membuat pengingat utang terkirim ke orang yang salah.
- Pelanggan **tidak bisa diarsipkan selama masih punya utang belum lunas**; penjagaannya di server, bukan sekadar disembunyikan di UI.
- Seed diperbaiki agar ±34% transaksi terkait ke pelanggan dan tanggal daftar pelanggan tersebar sampai 5 bulan ke belakang. Sebelumnya semua kolom belanja tampil Rp 0 dan statistik "baru 30 hari" menghitung seluruh pelanggan.
- Komponen kecil yang dipakai berulang (`Chip`, `IconButton`, `AvatarInisial`, `GambarProduk`) dipindah ke `src/components/ui/` agar halaman Produk dan Pelanggan tidak menyalin kode yang sama.

**Catatan Kasbon (langkah 8 & 9):**
- `catatPembayaran()` **menghitung ulang sisa utang dari database**, tidak memakai nilai sisa yang dikirim klien — dua kasir bisa saja membuka utang yang sama, dan angka di layar salah satunya sudah basi. Pembayaran melebihi sisa ditolak di server (dan tombolnya dinonaktifkan di UI).
- Cicilan masuk ke `debt_payments`, lalu `debts.paid/remaining/status` diperbarui dalam **satu** transaksi. Status berubah otomatis `open` → `partial` → `paid`.
- Daftar memuat utang belum lunas + yang baru lunas 60 hari terakhir; utang lunas lama tidak ikut supaya daftar tidak membengkak seiring waktu.
- Nada pesan WhatsApp mengikuti keadaan: **halus** untuk yang belum jatuh tempo, **tegas** untuk yang sudah lewat tempo (`pesanPengingatUtang({ tegas })`).
- Kasbon manual disediakan untuk utang lama yang belum pernah masuk POS.
- **Belum ada:** hapus/koreksi cicilan yang salah catat, dan pengingat terjadwal otomatis (F-15, butuh WhatsApp API).

### 16.7 Catatan implementasi C–E

**Bahan baku (C).** Harga memakai **rata-rata bergerak**: stok lama dan baru dicampur, jadi HPP tidak melonjak hanya karena sekali beli mahal. Terverifikasi: 2 kg @ Rp 150rb + 2 kg @ Rp 200rb → Rp 175rb/kg. Pembelian yang belum lunas otomatis jadi hutang supplier dengan jatuh tempo, pola pelunasannya sama dengan kasbon pelanggan.

**Resep & HPP (D).** Hasil hitung HPP ditulis ke kolom `products.cost` — bukan disimpan di tempat kedua. Dengan begitu POS, snapshot penjualan, dan laporan laba tetap membaca satu sumber yang sama, dan tidak ada dua jalur perhitungan yang bisa berbeda hasilnya. Setiap pembelian bahan memicu `perbaruiHppTerkaitBahan()` sehingga HPP produk ikut menyesuaikan sendiri.

> Bug yang tertangkap saat uji: resep tersimpan tapi `hpp_mode` masih `manual`, jadi HPP tidak pernah dipakai. Sekarang produk yang belum punya resep otomatis dibuka dalam mode "HPP dari resep".

**Produksi (E).** Kecukupan **semua** bahan diperiksa lebih dulu, baru stok dikurangi — kalau dicampur, bahan pertama bisa terlanjur berkurang saat bahan kedua ternyata kurang. Satu produksi menulis: baris `productions`, pengurangan tiap bahan + `material_movements`, penambahan stok produk + `stock_movements`, dan snapshot HPP. Semua dalam satu transaksi.

### 16.8 Catatan implementasi F–H

**Analisa kesehatan (F).** Tiga panel sesuai flowchart — keuangan, inventory, profitabilitas per produk — masing-masing diberi status *sehat / waspada / bahaya* **beserta alasannya**, bukan sekadar lampu warna. Arus kas dirakit dari tabel kejadian sesuai ADR-002, jadi tidak ada pembukuan ganda yang bisa selisih.

> Koreksi saat uji: status sempat berbunyi "omzet di atas titik impas" padahal BEP tidak bisa dihitung (beban rutin belum ditandai). Kalimatnya kini berubah jadi ajakan menandai beban rutin — lebih baik mengaku belum tahu daripada memberi rasa aman palsu.

**Radar (G).** Enam pertanyaan dijawab satu angka + status + **satu aksi yang bisa langsung diklik**, dan barisan "Aksi hari ini" merangkumnya. Tiap aksi menautkan ke halaman pencatatan yang relevan, sehingga alurnya berputar kembali ke Tahap 1 seperti di flowchart.

**Rekonsiliasi (H).** Angka "versi sistem" **dihitung ulang di server**, tidak diambil dari klien — kalau tidak, selisih kas bisa dimanipulasi dari browser. Kas sistem = penjualan tunai + cicilan kasbon tunai − beli bahan tunai − bayar hutang tunai − beban tunai. QRIS dipisah dengan perkiraan MDR 0,3% sebagai batas selisih wajar.

Terverifikasi lewat data: kas sistem Rp 933.000 = 733.000 + 450.000 − 250.000, dan selisih −25.000 tersimpan lengkap dengan catatannya.

### 16.9 Catatan implementasi Outlet & Staf dan Pengingat

**Outlet & Staf.** Batas paket dari [PRD.md §11](PRD.md) ditegakkan **di server** (`src/lib/paket.ts` + `simpanOutlet`/`simpanStaf`), bukan sekadar menyembunyikan tombol — Server Action bisa dipanggil langsung tanpa lewat UI. Terverifikasi: paket Tumbuh menolak outlet ke-4 dengan pesan "Paket Tumbuh hanya boleh 3 outlet".

Staf **dinonaktifkan**, tidak dihapus, karena `transactions.staff_id` menunjuk ke barisnya. Pemilik juga tidak bisa menonaktifkan dirinya sendiri. Baris `users` untuk kasir dibuat tanpa kata sandi — tinggal ditautkan ke Auth.js lewat email pada langkah 5.

**Pengingat.** Pengingat **diturunkan dari data**, bukan diketik manual: begitu kasbon lunas atau stok terisi, pengingatnya hilang sendiri saat disegarkan. Yang masih `pending` dibuang lalu disusun ulang; yang sudah `sent`/`dismissed` disimpan sebagai jejak. Sumbernya empat: kasbon jatuh tempo, produk menipis, bahan menipis, dan dua pengingat harian (tutup buku + beban rutin bulan berjalan belum dicatat).

Pengingat kasbon punya tombol **Ingatkan** yang membuka WhatsApp dengan pesan tegas siap kirim, sekaligus menandai pengingatnya terkirim — inilah penutup lingkaran flowchart: aksi dari Radar berubah jadi pencatatan baru.

---

## 9. Kualitas & Pengujian

**Wajib unit test** (Vitest) — ini uang orang:
- `hitungLabaTransaksi()` termasuk kasus diskon, qty 0, dan void.
- `hitungKembalian()`.
- `alokasiPembayaranUtang()` — cicilan sebagian, lebih bayar, pelunasan.
- `buildWaLink()` — normalisasi `08xx` → `62xx`, encoding emoji.
- `normalisasiNomorHp()`.

**E2E** (Playwright): satu alur POS lengkap sampai stok berkurang, dan satu alur kasbon sampai lunas.

**Anggaran performa:** dashboard JS < 150 KB gzip; LCP < 2,5 s pada Moto G4 / 3G lambat; setiap query dashboard < 50 ms.

---

## 10. Backup & Pemulihan

Satu file berarti backup sederhana — tapi **jangan pernah** `cp` file DB saat aplikasi jalan (WAL bisa membuat salinan korup). Gunakan API backup online SQLite:

```ts
// scripts/backup.ts — jalankan via cron harian
db.backup(`data/backups/synona-${new Date().toISOString().slice(0,10)}.db`);
```

- Cron harian 02:00 WIB, simpan 14 salinan, sinkronkan ke object storage murah (Cloudflare R2 / Backblaze B2).
- **Foto produk tidak ikut di `db.backup()`.** Sejak fitur foto ada, `data/uploads/` harus ikut dicadangkan (`tar` atau `rsync` terpisah, boleh lebih jarang karena berkasnya immutable). Backup database saja akan memulihkan bisnisnya, tetapi produk kehilangan foto.
- `PRAGMA integrity_check` mingguan.
- **Uji restore minimal sebulan sekali.** Backup yang belum pernah di-restore bukan backup.

---

## 11. Deployment

### 11.1 Yang tidak boleh
**Jangan deploy ke Vercel/Netlify serverless.** Filesystem-nya ephemeral dan tidak dibagi antar-invocation: file SQLite akan hilang atau bercabang diam-diam. Ini bukan soal konfigurasi — ini sifat platformnya.

### 11.2 Yang direkomendasikan (MVP)
VPS murah (Hetzner/Contabo/IDCloudHost, ~Rp 60–100rb/bln) + Docker:

```dockerfile
FROM node:22-bookworm-slim AS base
# better-sqlite3 butuh toolchain saat build
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV DATABASE_PATH=/data/synona.db
ENV UPLOAD_DIR=/data/uploads/produk
VOLUME /data                 # volume persisten — WAJIB (DB + foto produk)
EXPOSE 3000
CMD ["sh","-c","npm run db:migrate && npm start"]
```

- `output: "standalone"` di `next.config.ts`.
- Caddy/Nginx di depan untuk TLS otomatis.
- **Satu replica saja** (`replicas: 1`) — dua proses menulis ke file yang sama = korupsi.
- Migrasi dijalankan saat boot, sebelum server menerima traffic.

### 11.3 Jalur keluar (bila perlu scale)
Ganti driver Drizzle `better-sqlite3` → `@libsql/client` (Turso). Skema dan sebagian besar query tetap sama; DB jadi terkelola & replikatif, dan Vercel kembali jadi opsi. Kalau butuh Postgres penuh, dialek Drizzle diganti dan hanya folder `server/queries` + `server/actions` yang tersentuh — inilah alasan aturan lapisan di §3.

### 11.4 Variabel lingkungan

```env
DATABASE_PATH=./data/synona.db
UPLOAD_DIR=./data/uploads/produk
AUTH_SECRET=            # openssl rand -base64 32
AUTH_URL=http://localhost:3000
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
EMAIL_SERVER=           # SMTP untuk magic link (Resend free tier)
EMAIL_FROM=
```

---

## 12. Design System (dari mockup dashboard)

Token ini yang dipakai pada implementasi dashboard, ditulis sebagai CSS variable di `globals.css`.

| Token | Nilai | Pemakaian |
|---|---|---|
| `--brand` | `#6D5DF6` (indigo/ungu) | Nav aktif, tombol utama, garis penjualan |
| `--brand-2` | `#8B7CF8` | Gradien logo & sidebar |
| `--success` | `#22C55E` | Laba, garis laba kotor, tren naik |
| `--info` | `#3B82F6` | Transaksi, QRIS |
| `--warning` | `#F59E0B` | Utang, jatuh tempo |
| `--danger` | `#EF4444` | Lewat tempo, stok kritis |
| `--bg` | `#F7F8FC` | Latar konten |
| `--surface` | `#FFFFFF` | Kartu |
| `--border` | `#EDEFF5` | Garis kartu |
| `--text` | `#1E2235` / muted `#8A90A6` | Teks |

- **Radius:** kartu `1rem`, tombol/ikon `0.75rem`, pill `999px`.
- **Bayangan:** `0 1px 2px rgba(16,24,40,.04), 0 8px 24px -12px rgba(16,24,40,.10)` — halus, bukan drop shadow tebal.
- **Tipografi:** Plus Jakarta Sans (fallback Inter/system). Angka KPI `text-2xl font-extrabold tracking-tight`, label `text-sm text-muted`.
- **Grid dashboard:** 12 kolom, gap 20 px. KPI 4×3 kolom → 2 kolom di tablet → 1 di HP. Baris 2: chart 8 kolom + panel utang 4 kolom. Baris 3: stok 4 + pembayaran 4 + aksi cepat 4.
- **Sidebar:** lebar 260 px, latar putih dengan ornamen gradien ungu di bawah, item aktif = pill gradien ungu penuh.
- **Format angka:** `Rp 1.250.000` (pemisah titik, tanpa desimal) via `Intl.NumberFormat("id-ID")`.
- **Ornamen latar:** `public/bg.png` (PNG transparan berisi pusaran ungu di kanan atas & gelombang di kiri bawah) dipasang sebagai lapisan `fixed` di belakang konten pada `AppShell`. Ukurannya ±555 KB — bila kelak menjadi beban di koneksi lemah, konversikan ke WebP/AVIF atau gambar ulang sebagai SVG.

---

## 13. Risiko Teknis

| Risiko | Dampak | Mitigasi |
|---|---|---|
| `SQLITE_BUSY` saat POS ramai | Transaksi gagal di depan pelanggan | WAL + `busy_timeout` + transaksi pendek; monitor log; siapkan jalur Turso |
| Salah deploy ke serverless | **Kehilangan data total** | Ditulis di §11.1; guard di CI menolak build tanpa `DATABASE_PATH` volume |
| Build `better-sqlite3` gagal | Rilis tertunda | Kunci versi Node di `.nvmrc` & Dockerfile; base image Debian |
| Uang disimpan sebagai float | Laporan untung meleset | Tipe `INTEGER` + `CHECK` + unit test; review khusus `lib/money.ts` |
| Kebocoran data antar-tenant | Fatal untuk kepercayaan | Aturan §6 + audit query `where outlet_id` |
| Backup tak pernah diuji | Backup palsu | Restore drill bulanan |

---

*Dokumen ini melengkapi PRD.md (produk). Bila ada konflik soal teknologi, dokumen ini yang berlaku.*

---

## 16. Perombakan Alur — Synona BOS (v2)

**Sumber:** `synona-alur-flowchart.pdf`. Bagian ini **mengganti** cakupan §6–§8 untuk hal-hal yang bertabrakan; skema §4 tetap berlaku dan diperluas di sini.

### 16.1 Perubahan cara pandang

Sebelumnya aplikasi berpusat pada **transaksi penjualan**. Sekarang berpusat pada **kejadian yang dicatat owner**, lalu sistem yang mengubahnya jadi nilai stok, HPP, laba, dan status kesehatan usaha.

Empat jenis pencatatan (Tahap 1):

| Kejadian | Efek ke stok | Efek ke uang |
|---|---|---|
| **Beli bahan baku** | Stok bahan baku bertambah | Kas keluar atau hutang ke supplier |
| **Produksi / olah** | Bahan baku berkurang sesuai resep, produk jadi bertambah | Tidak ada — nilai berpindah jadi HPP |
| **Penjualan** | Produk jadi berkurang | Kas masuk atau piutang pelanggan |
| **Beban & tagihan** | — | Kas keluar (listrik, gaji, sewa) atau pelunasan hutang/piutang |

Tiga mesin hitung (Tahap 2): **Inventory**, **HPP**, **Keuangan**. Analisa kesehatan (Tahap 3) dan Radar 6 Pertanyaan (Tahap 4) dibangun di atasnya.

### 16.2 ADR-002 — Ledger sebagai *view*, bukan tabel ke-13

Flowchart menyebut "semua masuk ke BUKU (Ledger) — sumber kebenaran tunggal". Godaannya adalah membuat satu tabel `cash_entries` yang menampung semua pergerakan uang.

**Keputusan: tidak.** Buku kas dibuat sebagai **query gabungan (view)** atas tabel kejadian yang sudah ada — `transactions`, `debt_payments`, `expenses`, `purchases`, `payable_payments`.

**Alasannya:**
- Satu kejadian = satu baris di satu tabel. Kalau ada tabel ledger terpisah, setiap penulisan harus menulis dua tempat, dan **satu bug saja membuat buku kas tidak cocok dengan penjualan** — kelas bug yang paling mahal untuk aplikasi keuangan.
- 276 transaksi yang sudah ada tidak perlu di-backfill. Buku kas langsung utuh sejak hari pertama.
- Sifat *append-only* tetap terjaga karena baris kejadian tidak pernah dihapus (pembatalan memakai status `void`, bukan DELETE).

Konsekuensi: laporan arus kas berupa `UNION ALL` beberapa sumber. Untuk skala UMKM ini murah; kalau kelak berat, tinggal dibuatkan tabel ringkasan harian.

### 16.3 ADR-003 — Presisi harga bahan baku

Biji kopi Rp 150.000/kg = **Rp 150 per gram**; tapi bahan seperti perasa bisa Rp 0,15 per ml. Menyimpannya sebagai integer rupiah akan membulatkan jadi 0.

**Keputusan:** harga satuan bahan baku disimpan sebagai `cost_per_unit_milli` — **integer rupiah × 1.000 per satuan terkecil**. Pembulatan ke rupiah utuh hanya dilakukan **sekali**, saat HPP per produk dihitung. Nilai uang lain tetap integer rupiah sesuai §4.1.

### 16.4 Tabel baru

**`materials`** — bahan baku
`outlet_id` · `name` · `unit` (`g`|`ml`|`pcs`) · `stock` INT (satuan terkecil) · `cost_per_unit_milli` INT (rata-rata bergerak) · `low_stock_threshold` · `is_active`

**`material_movements`** — buku besar bahan baku (append-only)
`outlet_id` · `material_id` · `type` (`purchase`|`production`|`adjustment`|`waste`) · `qty_change` · `stock_after` · `cost_per_unit_milli` (harga saat itu) · `ref_id` · `note` · `created_at`

**`recipe_items`** — resep / BOM, jembatan inventory ↔ keuangan
`product_id` · `material_id` · `qty` (satuan terkecil) · UNIQUE `(product_id, material_id)`

**`productions`** — hasil olah
`outlet_id` · `product_id` · `qty` · `hpp_per_unit` (snapshot) · `total_cost` · `staff_id` · `note` · `occurred_at` · `business_date`

**`purchases`** / **`purchase_items`** — pembelian bahan baku
`supplier_name` · `total` · `paid_amount` · `remaining` · `status` (`paid`|`partial`|`debt`) · `due_date` · `occurred_at` · `business_date`
item: `material_id` · `qty` · `unit_cost_milli` · `line_total`

**`payable_payments`** — pelunasan hutang ke supplier
`purchase_id` · `amount` · `method` · `paid_at` · `note`

**`expenses`** — beban & tagihan
`outlet_id` · `category` (`listrik`|`gaji`|`sewa`|`internet`|`transport`|`lainnya`) · `name` · `amount` · `method` · `occurred_at` · `business_date` · `note` · `recorded_by`

**Kolom baru di `products`:**
`hpp_mode` (`manual`|`resep`, default `manual`) · `labor_cost` · `overhead_cost`

> `hpp_mode` menjaga kompatibilitas: produk lama tetap memakai `cost` yang diketik manual. Begitu resep diisi dan mode diubah ke `resep`, HPP dihitung otomatis = Σ(qty × harga bahan) + tenaga + overhead.

### 16.5 Rumus tambahan

```
hpp_produk       = ROUND(Σ(qty_bahan × cost_per_unit_milli) / 1000) + labor_cost + overhead_cost
laba_kotor       = omzet − Σ(cost_snapshot × qty)          (sudah ada)
laba_bersih      = laba_kotor − Σ(beban periode)           (BARU)
beban_harian     = beban_tidak_rutin_hari_itu + (beban_rutin_bulan / jumlah_hari_bulan)
arus_kas_masuk   = penjualan tunai/QRIS/transfer + cicilan piutang
arus_kas_keluar  = pembelian dibayar + beban + pelunasan hutang supplier
BEP_harian       = beban_tetap_bulanan / 30 / margin_kotor_rata2
perputaran_stok  = HPP terjual periode / nilai stok rata-rata
hari_stok_sisa   = stok_sekarang / rata2_pemakaian_harian
stok_mati        = produk/bahan tanpa pergerakan > 30 hari
```

### 16.6 Urutan pengerjaan (menggantikan §8 langkah 10+)

| # | Langkah | Status |
|---|---|---|
| A | Skema baru + migrasi (8 tabel, 3 kolom) | ✅ Selesai |
| B | **Beban & Tagihan** + laba bersih di dashboard | ✅ Selesai |
| C | Bahan Baku + Pembelian (kas keluar / hutang supplier) | ✅ Selesai |
| D | Resep (BOM) + HPP otomatis per produk | ✅ Selesai |
| E | Produksi / olah (bahan baku → produk jadi) | ✅ Selesai |
| F | Analisa kesehatan (margin, arus kas, BEP, perputaran, stok mati) | ✅ Selesai |
| G | Radar 6 Pertanyaan → Aksi (dashboard) | ✅ Selesai |
| H | Laporan & rekonsiliasi | ✅ Selesai |
| I | Outlet & Staf (gating paket) + Pengingat | ✅ Selesai |

Urutannya sengaja: **B lebih dulu** karena beban adalah satu-satunya yang membuat kata "untung" jadi jujur, dan biayanya paling murah. C–E membangun jembatan inventory ↔ keuangan. F–G baru bisa dihitung setelah semuanya ada.

