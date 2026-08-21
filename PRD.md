# PRD — Synona (Web App / PWA)

**Versi:** 1.0
**Tanggal:** 13 Agustus 2026
**Pemilik:** Muhammad (founder, bisnis personal)
**Status:** Draft untuk pengembangan MVP
**Skala:** Bisnis personal / bootstrap — dibangun sendiri, modal < Rp 5 juta, mulai dari layanan free tier.

> Dokumen ini menerjemahkan BRD Synona menjadi spesifikasi produk yang dapat langsung dibangun sebagai **web app responsif (PWA)**. Ditulis agar bisa dipakai sendiri maupun diberikan ke AI coding tool.

---

## 1. Ringkasan Produk

Synona adalah aplikasi web (PWA) manajemen usaha untuk **UMKM F&B & retail kecil yang sedang berkembang** (1–3 outlet). Fokus pada tiga ciri khas:

1. **Sesederhana mungkin** — menjawab satu pertanyaan utama pemilik: *"Untung hari ini berapa?"*.
2. **Kasbon/utang pelanggan yang rapi** — mencatat & mengingatkan utang pelanggan.
3. **Terhubung WhatsApp via wa.me** — kirim struk & pengingat lewat WhatsApp pemilik sendiri, **tanpa WhatsApp Business API** (gratis).

Model bisnis: langganan **flat** & murah (Rp 29rb / 49rb / 79rb per bulan, bukan per-outlet).

### Prinsip Desain
- Bisa dipakai tanpa pelatihan; bahasa sehari-hari (bukan istilah akuntansi).
- Ringan & cepat di HP Android kelas bawah dengan koneksi lemah.
- Mobile-first, tetapi tetap nyaman di desktop untuk dashboard pemilik.
- Progressive disclosure: fitur lanjutan disembunyikan sampai dibutuhkan.

---

## 2. Tujuan & Non-Tujuan

### Tujuan (Goals)
- G1: Pemilik dapat mencatat transaksi penjualan dalam < 15 detik.
- G2: Pemilik tahu untung harian & bulanan secara otomatis.
- G3: Stok berkurang otomatis saat penjualan + peringatan stok menipis.
- G4: Utang pelanggan tercatat rapi & bisa diingatkan lewat WhatsApp (wa.me).
- G5: Rekonsiliasi harian: kas tercatat vs kas fisik vs settlement QRIS.
- G6: Berjalan sebagai PWA (installable, ada mode offline dasar untuk POS).

### Non-Tujuan (Non-Goals) — di luar MVP
- Integrasi akuntansi penuh (jurnal, neraca) & e-faktur pajak.
- WhatsApp Business API / bot otomatis terjadwal (opsional premium, fase lanjut).
- Marketplace/ordering online konsumen & integrasi ojek/pengantaran.
- Payroll & HR karyawan.
- Aplikasi native iOS/Android (cukup PWA di MVP).

---

## 3. Target Pengguna (Persona)

| Persona | Deskripsi | Kebutuhan Utama |
|---|---|---|
| **Bu Sari — Pemilik** | Usaha kecil F&B/retail, 1–3 outlet, tidak paham akuntansi. | Tahu untung & utang tanpa ribet. |
| **Budi — Kasir/Staf** | Melayani antrean, butuh kecepatan input. | POS cepat & anti-salah. |
| **Pak Andi — Multi-outlet** | Punya 2–3 cabang, jarang di lokasi. | Pantau semua cabang dari satu layar. |

---

## 4. Rekomendasi Tech Stack (Hemat, Free-Tier)

Stack disarankan untuk solo founder + modal minim. Boleh diganti sesuai preferensi; requirement di bawah bersifat stack-agnostic.

| Lapisan | Rekomendasi | Alasan |
|---|---|---|
| Frontend | **Next.js (React) + TypeScript + Tailwind CSS** | Cepat dibangun, PWA mudah, komunitas besar. |
| PWA | `next-pwa` / service worker + Web App Manifest | Installable + offline cache. |
| Backend/DB/Auth | **Supabase** (Postgres + Auth + Storage) | Free tier besar, Auth Google bawaan, Row Level Security. |
| Hosting FE | **Vercel** (free) | Deploy otomatis dari Git. |
| Notifikasi | **Web Push (VAPID)** atau **Firebase Cloud Messaging** | Gratis; untuk stok/laporan/jatuh tempo. |
| Grafik | Recharts / Chart.js | Ringan untuk dashboard. |
| State | React Query (server state) + Zustand (UI state) | Sederhana. |

**Autentikasi:** Login **Google** dan/atau email magic-link (tanpa OTP SMS berbayar).

---

## 5. Model Data (Entitas Inti)

Skema Postgres (Supabase). Semua tabel punya `id (uuid, pk)`, `created_at`, `updated_at`. Gunakan Row Level Security agar tiap pemilik hanya melihat datanya.

### `users` (profil pemilik)
- `id`, `email`, `name`, `phone`, `plan` (`mulai` | `tumbuh` | `juara`), `trial_ends_at`

### `outlets`
- `id`, `owner_id → users`, `name`, `address`, `is_active`

### `staff` (multi-user & peran)
- `id`, `outlet_id → outlets`, `user_id → users`, `role` (`owner` | `kasir`), `is_active`

### `categories`
- `id`, `outlet_id`, `name`, `sort_order`

### `products`
- `id`, `outlet_id`, `category_id`, `name`, `sku` (opsional), `price` (harga jual), `cost` (modal/HPP), `stock` (int), `low_stock_threshold` (int, default 5), `is_active`
- *Catatan:* varian sederhana disimpan sebagai produk terpisah pada MVP.

### `customers`
- `id`, `outlet_id`, `name`, `phone` (format internasional: `62xxx`), `note`

### `transactions` (penjualan)
- `id`, `outlet_id`, `staff_id`, `customer_id` (nullable), `subtotal`, `discount`, `total`, `payment_method` (`cash` | `qris` | `debt`), `paid_amount`, `change_amount`, `status` (`paid` | `debt` | `void`), `occurred_at`

### `transaction_items`
- `id`, `transaction_id → transactions`, `product_id`, `name_snapshot`, `price_snapshot`, `cost_snapshot`, `qty`, `line_total`
- *Snapshot* harga & modal disimpan agar laporan historis akurat walau harga berubah.

### `debts` (kasbon)
- `id`, `outlet_id`, `customer_id`, `transaction_id` (nullable), `amount`, `due_date` (nullable), `status` (`open` | `partial` | `paid`), `remaining`

### `debt_payments`
- `id`, `debt_id → debts`, `amount`, `paid_at`, `note`

### `reconciliations` (tutup buku harian)
- `id`, `outlet_id`, `date`, `cash_system`, `cash_physical`, `cash_diff`, `qris_system`, `qris_settled`, `qris_diff`, `note`, `approved_by`, `approved_at`

**Perhitungan kunci**
- Untung transaksi = `Σ (price_snapshot − cost_snapshot) × qty − discount`.
- Untung hari ini = jumlah untung semua transaksi `status != void` pada tanggal berjalan.
- Total piutang berjalan = `Σ debts.remaining` (status `open`/`partial`).

---

## 6. Fitur & Prioritas (MoSCoW)

★ = fitur ciri khas.

| Kode | Fitur | Prioritas |
|---|---|---|
| F-01 | POS: transaksi penjualan (tunai & QRIS) | **MUST** |
| F-02 | Manajemen produk, kategori, harga, modal | **MUST** |
| F-03 | Stok otomatis + peringatan stok menipis | **MUST** |
| F-04 | ★ Ringkasan "Untung Hari Ini" & laporan sederhana | **MUST** |
| F-05 | ★ Kasbon/utang pelanggan: catat, rekap, ingatkan | **MUST** |
| F-06 | ★ Kirim struk & pengingat via WhatsApp (wa.me) | **MUST** |
| F-07 | Rekonsiliasi harian (kas & settlement QRIS) | **MUST** |
| F-08 | Autentikasi (Google / magic-link) + onboarding | **MUST** |
| F-09 | PWA: installable + cache aset (offline dasar) | **MUST** |
| F-10 | Multi-user & peran (owner, kasir) | SHOULD |
| F-11 | Multi-outlet dalam satu dashboard | SHOULD |
| F-12 | Notifikasi push (stok, laporan, jatuh tempo) | SHOULD |
| F-13 | Program loyalti poin pelanggan | COULD |
| F-14 | Mode offline POS penuh + sinkronisasi antrean | COULD |
| F-15 | Otomasi pengingat terjadwal via WhatsApp API (premium) | COULD |
| F-16 | Integrasi akuntansi & e-faktur pajak | WON'T (fase 2) |

---

## 7. Struktur Halaman & Route

| Route | Halaman | Akses |
|---|---|---|
| `/login` | Login (Google / magic-link) | Publik |
| `/onboarding` | Setup awal: nama usaha, outlet pertama | Login |
| `/` | **Dashboard** — "Untung Hari Ini" + ringkasan | owner |
| `/kasir` | **POS** — grid produk + keranjang + bayar | owner, kasir |
| `/produk` | Daftar & kelola produk/kategori/stok | owner |
| `/kasbon` | Daftar pelanggan berutang + total piutang | owner, kasir |
| `/kasbon/[customerId]` | Detail utang pelanggan + tombol Ingatkan (wa.me) | owner, kasir |
| `/laporan` | Laporan penjualan & untung (harian/bulanan) | owner |
| `/rekonsiliasi` | Tutup buku harian (kas & QRIS) | owner |
| `/pengaturan` | Outlet, staf, paket langganan, profil | owner |

**Navigasi mobile:** bottom-nav 5 ikon — Kasir, Kasbon, Beranda (untung), Laporan, Menu.

---

## 8. Alur Utama (User Flows)

### 8.1 Transaksi Penjualan (F-01)
1. Kasir buka `/kasir` → cari/ketuk produk → masuk keranjang (total terhitung otomatis).
2. Tekan **Bayar** → pilih metode: Tunai / QRIS / Utang.
3. **Tunai:** input uang diterima → tampilkan kembalian. **QRIS:** tampilkan QR (statis/dinamis) → tandai lunas. **Utang:** pilih/tambah pelanggan → simpan sebagai kasbon.
4. Simpan → stok berkurang, transaksi masuk laporan, opsi **Kirim Struk (wa.me)**.

### 8.2 Kasbon & Pengingat (F-05, F-06)
1. Transaksi dengan metode **Utang** membuat record `debts` (status `open`).
2. Di `/kasbon`, pemilik lihat daftar pelanggan + total piutang berjalan.
3. Buka detail pelanggan → riwayat utang & pembayaran → tombol **Ingatkan via WhatsApp**.
4. Sistem menyusun pesan pengingat → buka `wa.me/<no>?text=<pesan>` di tab baru (WhatsApp pemilik). Merchant tekan kirim.
5. Catat pembayaran (penuh/cicil) → `debt_payments` → `remaining` & status ter-update.

### 8.3 Untung Hari Ini (F-04)
- Dashboard menampilkan angka **Untung Hari Ini** besar & jelas, plus omzet, jumlah transaksi, dan total piutang berjalan. Grafik 7 hari terakhir.

### 8.4 Rekonsiliasi Harian (F-07)
1. Akhir hari, buka `/rekonsiliasi` → sistem tampilkan total tunai & QRIS versi sistem.
2. Pemilik input kas fisik hasil hitung → sistem hitung selisih kas.
3. Input/ambil settlement QRIS → sistem hitung selisih QRIS (wajar bila ≈ MDR 0,3%).
4. Selisih di luar ambang disorot → pemilik setujui/beri catatan → tutup buku tersimpan.

---

## 9. Spesifikasi Integrasi wa.me (Ciri Khas)

**Tanpa WhatsApp Business API.** Sistem hanya menyusun teks lalu membuka WhatsApp pemilik dengan pesan terisi.

**Format tautan:**
```
https://wa.me/<nomor>?text=<pesan_url_encoded>
```
- `<nomor>`: kode negara tanpa `+` atau `0` (contoh `6281234567890`).
- `<pesan>`: wajib `encodeURIComponent(...)`.

**Contoh fungsi:**
```ts
function buildWaLink(phone: string, message: string): string {
  const num = phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}
// window.open(buildWaLink(cust.phone, msg), "_blank")
```

**Template pesan (placeholder diisi sistem):**
- **Struk:** `Halo kak {nama} 🙏 Terima kasih sudah belanja di {toko}. Rincian: {item}. Total: {total} ({metode}).`
- **Pengingat halus:** `Halo kak {nama} 🙏 Sekadar mengingatkan, kasbon di {toko} saat ini {sisa}. Kalau sudah sempat boleh diselesaikan ya. Terima kasih 😊`
- **Pengingat tegas:** `Halo kak {nama}, kasbon di {toko} sebesar {sisa} sudah melewati {jatuh_tempo}. Mohon diselesaikan ya. Jika sudah bayar abaikan pesan ini 🙏`

**Konsekuensi (harus disadari):** pengiriman semi-manual (pemilik menekan kirim); tidak ada bot inbound. Cocok untuk skala UMKM kecil, biaya nol.

---

## 10. Pembayaran QRIS

- MVP: dukung **QRIS statis** milik pemilik (unggah gambar QR / tempel di outlet) + catat manual "lunas". Cukup untuk mulai tanpa integrasi PJP.
- Lanjutan (paket Juara): integrasi PJP untuk **QRIS dinamis** & status otomatis + tarik data settlement untuk rekonsiliasi.
- **MDR ±0,3%** per transaksi dipotong dari settlement (bukan biaya tetap) — tampilkan sebagai selisih wajar di rekonsiliasi.

---

## 11. Paket & Feature Gating

| Paket | Harga/bln (flat) | Batas & Fitur |
|---|---|---|
| **Mulai** | Rp 29.000 | 1 outlet · POS · kasbon · untung harian · struk & pengingat wa.me |
| **Tumbuh** | Rp 49.000 | s/d 3 outlet · multi-user/kasir · laporan lintas outlet · notifikasi push |
| **Juara** | Rp 79.000 | outlet tak terbatas · QRIS dinamis & rekonsiliasi otomatis · membership · otomasi pengingat (API) · prioritas dukungan |

- **Masa coba gratis 14–30 hari** (bukan freemium selamanya).
- Gating berbasis `users.plan`: cek batas outlet & fitur di server (RLS/policy) dan sembunyikan menu di UI.

---

## 12. Kebutuhan Non-Fungsional

| Aspek | Target |
|---|---|
| Performa | Transaksi POS terproses < 2 detik; bundle kecil; hemat kuota. |
| PWA | Installable (manifest), offline cache aset & daftar produk; ikon & splash. |
| Offline (MVP dasar) | Halaman POS tetap terbuka saat koneksi putus; transaksi tersimpan lokal & tersinkron saat online (F-14 untuk penuh). |
| Autentikasi | Google / magic-link; tanpa OTP SMS. |
| Keamanan | TLS; Row Level Security per pemilik; validasi input; audit ringan pada koreksi keuangan. |
| Skalabilitas | Mulai free tier; siap upgrade hosting saat transaksi bertambah. |
| Kompatibilitas | Android 8+ (Chrome), browser modern; layout mobile-first & desktop. |
| Bahasa | Bahasa Indonesia, istilah membumi (modal, untung, utang). |

---

## 13. Kriteria Penerimaan (Acceptance Criteria)

**F-01 POS**
- [ ] Menambah produk ke keranjang menghitung total otomatis.
- [ ] Metode Tunai menampilkan kembalian; QRIS menampilkan QR; Utang membuat kasbon.
- [ ] Setelah simpan: stok berkurang, transaksi muncul di laporan, opsi kirim struk wa.me.

**F-04 Untung Hari Ini**
- [ ] Dashboard menampilkan untung hari ini = Σ(harga−modal)×qty − diskon untuk transaksi hari berjalan.
- [ ] Menampilkan omzet, jumlah transaksi, total piutang berjalan, grafik 7 hari.

**F-05 Kasbon**
- [ ] Transaksi Utang membuat record `debts` & muncul di `/kasbon`.
- [ ] Total piutang berjalan akurat.
- [ ] Pembayaran (penuh/cicil) mengurangi `remaining` & mengubah status.

**F-06 wa.me**
- [ ] Tombol Ingatkan/Kirim Struk membuka WhatsApp dengan pesan terisi & benar (URL-encoded, nomor 62…).

**F-07 Rekonsiliasi**
- [ ] Menghitung selisih kas & QRIS; menyorot selisih di luar ambang; menyimpan tutup buku dengan catatan.

**F-08/F-09 Auth & PWA**
- [ ] Login Google/magic-link berhasil; data terisolasi per pemilik (RLS).
- [ ] Aplikasi bisa di-"install" ke home screen & membuka halaman POS saat offline.

---

## 14. Rencana Rilis (Solo, Bertahap)

| Fase | Fokus | Perkiraan |
|---|---|---|
| **MVP (Rilis 1)** | F-01 s/d F-09 (POS, produk/stok, untung harian, kasbon, wa.me, rekonsiliasi, auth, PWA) | Bulan 1–4 |
| **Rilis 2** | F-10 multi-user, F-11 multi-outlet, F-12 push, F-14 offline penuh | Bulan 5–6 |
| **Rilis 3** | F-13 loyalti, F-15 otomasi pengingat (premium), QRIS dinamis, awal F-16 akuntansi | Bulan 7+ |

> Sebagai bisnis personal yang dibangun sendiri, **waktu** adalah anggaran termahal. Prioritaskan MVP yang tajam pada tiga ciri khas sebelum menambah fitur.

---

## 15. Risiko Utama (Ringkas)

| Risiko | Mitigasi |
|---|---|
| Scope creep memperlambat rilis solo | Kunci scope MVP di tiga ciri khas; tunda selain MUST. |
| Bug perhitungan keuangan (untung/kasbon) | Unit test fungsi hitung; snapshot harga/modal; jejak audit koreksi. |
| Founder = single point (bus factor) | Dokumentasi kode; commit rutin; backup DB otomatis. |
| Biaya hosting naik saat tumbuh | Mulai free tier; pantau kuota; optimasi query & aset. |

---

*Sumber angka & keputusan: BRD Synona, Strategi Diferensiasi (vs Majoo/Mekari), dan keputusan kanal wa.me + skala bisnis personal.*
