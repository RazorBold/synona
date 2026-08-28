# Synona

Aplikasi web manajemen usaha untuk UMKM F&B & retail kecil — POS, stok, kasbon, dan laporan untung harian.

- **Produk & fitur:** [PRD.md](PRD.md)
- **Teknis (stack, skema DB, langkah kerja):** [PRD-TEKNIS.md](PRD-TEKNIS.md)

Stack: **Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · SQLite 3 (better-sqlite3) · Drizzle ORM · Recharts**

---

## Menjalankan di lokal

```bash
npm install
echo "SYNONA_JWT_SECRET=$(node -e \"console.log(require('node:crypto').randomBytes(32).toString('base64url'))\")" > .env
npm run db:migrate    # membuat data/synona.db + seluruh tabel
npm run db:seed       # mengisi data demo (Bu Sari, Outlet Utama, 7 hari transaksi)
npm run auth:init     # akun demo admin / admin
npm run dev           # http://localhost:3000
```

> `better-sqlite3` adalah modul native. Bila `npm install` gagal saat build, pasang Visual Studio Build Tools + Python 3 (Windows) atau `build-essential python3` (Linux).

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` / `npm start` | Build & jalankan produksi |
| `npm run db:generate` | Membuat file migrasi baru dari `src/db/schema.ts` |
| `npm run db:migrate` | Menjalankan migrasi di folder `drizzle/` |
| `npm run db:seed` | Mengisi ulang data demo (menghapus isi tabel lebih dulu) |
| `npm run db:reset` | Hapus DB → migrasi → seed |
| `npm run db:studio` | Drizzle Studio (penjelajah data) |
| `npm run auth:init` | Seed akun demo `admin` / `admin` (idempoten) |
| `npm run auth:reset [nama]` | Reset sandi dari server — jalan terakhir kalau sandi & kode pemulihan hilang |

## Struktur singkat

```
public/bg.png           # ornamen latar dari desain (dipasang di AppShell)
data/uploads/produk/    # foto produk (ikut volume persisten, JANGAN commit)
src/
├── app/(app)/          # route terproteksi + dashboard
├── components/
│   ├── layout/         # sidebar, topbar, app shell
│   └── dashboard/      # kartu KPI, grafik, panel utang, aksi cepat
├── db/                 # koneksi, skema Drizzle, migrasi, seed
├── lib/                # money.ts (uang), date.ts, wa.ts (WhatsApp)
└── server/queries/     # semua pembacaan database
```

**Aturan lapisan:** komponen tidak pernah mengimpor `src/db` langsung — hanya `src/server/queries` (baca) dan nanti `src/server/actions` (tulis). Aturan ini yang membuat penggantian database di kemudian hari hanya menyentuh satu folder.

## Yang sudah jalan

**Dashboard** — data nyata dari SQLite: penjualan & laba hari ini (dari snapshot harga/modal per item), jumlah transaksi, piutang berjalan, grafik 7/14/30 hari, utang jatuh tempo dengan tombol pengingat WhatsApp (`wa.me`), stok menipis, komposisi pembayaran, dan aksi cepat.

**POS (`/kasir`)** — pencarian & filter kategori, grid produk dengan indikator stok, keranjang yang bertahan saat halaman di-refresh, diskon, serta pembayaran **tunai** (saran nominal + kembalian), **QRIS**, **transfer**, dan **utang** (pilih pelanggan + jatuh tempo). Sekali simpan: transaksi + item + stok berkurang + catatan di buku besar stok + kasbon, semuanya dalam satu transaksi database. Selesai membayar, struk bisa langsung dikirim lewat WhatsApp.

**Produk & Stok (`/produk`)** — ringkasan nilai stok, pencarian + filter kategori/status, tabel di layar lebar dan kartu di HP, tambah/ubah produk lengkap dengan **foto** (dikompres di HP ke 720px WebP), hitung untung otomatis, arsip produk, serta penyesuaian stok (barang masuk / keluar / opname) lengkap dengan riwayat pergerakannya.

**Pelanggan (`/pelanggan`)** — daftar pelanggan dengan total belanja, jumlah transaksi, kapan terakhir belanja, dan sisa utang; penyaring Berutang/Baru/Belum belanja; tambah & ubah pelanggan (nomor WhatsApp dirapikan otomatis, nomor ganda ditolak); dialog detail berisi riwayat belanja dan utang; tombol chat WhatsApp langsung terisi pesan.

**Utang / Kasbon (`/kasbon`)** — total piutang, jumlah yang lewat tempo dan jatuh tempo hari ini, serta yang terkumpul bulan ini; daftar kasbon dengan penanda jatuh tempo dan bar kemajuan cicilan; catat cicilan atau pelunasan (dengan riwayat cicilan), catat kasbon manual, dan tombol **Ingatkan** yang membuka WhatsApp dengan pesan siap kirim — nadanya halus atau tegas mengikuti status jatuh tempo.

**Beban & Tagihan (`/beban`)** — catat listrik, gaji, sewa, internet, transport; penanda **beban rutin bulanan**; sebaran per kategori; dan rantai hitung **laba kotor − beban = laba bersih** per hari / 7 hari / bulan berjalan. Dashboard kini menampilkan **Laba Bersih Hari Ini**, bukan laba kotor.

**Bahan Baku (`/bahan`)** — stok bahan, pembelian ke supplier dengan **harga rata-rata bergerak**, dan hutang supplier beserta pelunasannya.

**Produksi (`/produksi`)** — bahan baku → produk jadi lewat resep; stok bahan berkurang, stok produk bertambah, HPP tersimpan sebagai snapshot.

**Resep & HPP** — di halaman Produk, tombol koki menyusun resep (bahan + tenaga + overhead). HPP dihitung otomatis dan ikut berubah setiap kali harga bahan berubah.

**Laporan & Kesehatan (`/laporan`)** — kesehatan keuangan (margin kotor/bersih, arus kas, piutang vs hutang, titik impas), kesehatan inventory (nilai stok, perputaran, barang kritis, stok mati), dan profitabilitas per produk. Semua diberi status sehat/waspada/bahaya beserta alasannya.

**Kas & Rekonsiliasi (`/rekonsiliasi`)** — tutup buku harian: kas sistem vs kas fisik, QRIS sistem vs settlement (dengan perkiraan MDR 0,3%), sorotan selisih di luar batas wajar, dan riwayat tutup buku.

**Dashboard** kini dibuka dengan **Radar 6 Pertanyaan** — Omzet, Untung, Kas, Stok, Tagihan, Agenda — masing-masing dengan status dan satu aksi yang bisa langsung diklik.

**Outlet & Staf (`/outlet`)** — kelola cabang, staf beserta perannya (pemilik/kasir), profil pemilik, dan kartu paket langganan dengan sisa kuota outlet. Batas paket ditegakkan di server.

**Pengingat (`/pengingat`)** — disusun otomatis dari keadaan usaha: kasbon jatuh tempo, produk & bahan menipis, tutup buku hari ini, dan beban rutin yang belum dicatat. Pengingat kasbon punya tombol Ingatkan yang membuka WhatsApp dengan pesan siap kirim.

Tersisa: PWA (installable + offline) dan autentikasi (Auth.js).

## Perombakan alur (Synona BOS)

Sejak `synona-alur-flowchart.pdf`, alur produk dirombak: owner mencatat **4 jenis kejadian** (beli bahan baku · produksi/olah · penjualan · beban & tagihan), lalu sistem mengubahnya jadi nilai stok, HPP, laba, dan status kesehatan usaha. Sidebar sudah dikelompokkan mengikuti alur itu: **Pencatatan → Data Usaha → Analisa → Pengaturan**.

Skema database untuk seluruh alur baru sudah terpasang (8 tabel: bahan baku, buku besar bahan, resep/BOM, produksi, pembelian, hutang supplier, beban). Rancangan lengkap dan urutan pengerjaannya ada di [PRD-TEKNIS.md §16](PRD-TEKNIS.md).

## Autentikasi

Seluruh halaman dan **setiap** server action mewajibkan sesi yang sah. Penjaganya berlapis dan sengaja tidak bergantung pada satu titik:

| Lapisan | Berkas | Yang dijamin |
|---|---|---|
| Middleware | `src/middleware.ts` | Menolak navigasi tanpa JWT yang tanda tangannya sah |
| Guard action | `wajibSesi()` di `src/server/auth.ts` | Dipanggil di awal tiap server action — inilah lapisan yang benar-benar menjamin |
| Layout | `src/app/(app)/layout.tsx` | Memastikan akun di token masih ada di database |

Middleware saja **tidak cukup**: server action dipanggil lewat POST ke URL halaman mana pun dengan header `Next-Action`, jadi guard di dalam action-nya wajib.

### Akun demo

`npm run auth:init` membuat akun `admin` dengan sandi `admin`. **Ini kredensial demo, bukan kredensial produksi** — ganti di `/ganti-sandi` sebelum aplikasi dipakai dengan data pelanggan sungguhan. Selama sandi bawaan itu masih aktif, aplikasi menampilkan banner peringatan di setiap halaman; banner hilang sendiri setelah sandinya diganti (dideteksi dengan mencocokkan hash, bukan flag terpisah yang bisa basi).

### Lupa sandi

Deployment ini tidak punya SMTP, dan `wa.me` hanya membuka tautan chat — tidak bisa mengirim pesan otomatis. Jadi pemulihannya memakai **kode pemulihan** yang dicatat sendiri oleh pemilik, bukan tautan reset lewat email.

1. Saat sudah masuk, buka **Ganti Sandi** → **Buat kode pemulihan**. Kodenya berbentuk `SYN-XXXX-XXXX-XXXX-XXXX` dan **hanya ditampilkan sekali** — catat di tempat aman.
2. Kalau sandinya lupa, buka `/lupa-sandi`, masukkan nama pengguna + kode itu + sandi baru.
3. Kode bersifat **sekali pakai**: setelah terpakai, kolomnya dikosongkan. Buat kode baru setelah masuk.

Yang disimpan di database hanya hash kodenya (scrypt + salt), sama seperti sandi — kode aslinya tidak bisa dibaca ulang dari DB.

Kalau sandi **dan** kode pemulihan sama-sama hilang, jalan terakhirnya di server:

```bash
npm run auth:reset            # akun "admin"
npm run auth:reset -- kasir1  # akun lain
```

Sandi barunya acak dan ditulis ke `.sandi-baru.txt` (mode 600, sudah di-gitignore) — tidak dicetak ke terminal, karena keluaran terminal gampang tersimpan di riwayat shell atau log pm2.

### Nomor bantuan WhatsApp

Kartu "Butuh bantuan?" di sidebar hanya muncul kalau `SYNONA_WA_BANTUAN` diisi di `.env` (format `62812…`, tanpa `+` atau spasi). Kalau kosong, kartunya disembunyikan — lebih baik tidak ada daripada menautkan ke nomor contoh yang tidak dijawab siapa pun.

### Sesi yang akunnya sudah tidak ada

Kalau cookie masih sah tapi baris `pengguna`-nya hilang (kasir dihapus, DB dipulihkan dari backup, `db:reset`), permintaan dialihkan ke route handler `/sesi-berakhir` yang **menghapus cookie** lalu melempar ke `/masuk`.

Ini bukan detail kosmetik: tanpa penghapusan cookie, `/` mengalihkan ke `/masuk`, lalu `/masuk` melihat token yang masih sah dan memantulkannya balik — pengguna terkunci dalam redirect tak berujung dan tombol Keluar pun tidak bisa diklik karena tidak ada halaman yang berhasil dimuat. Cookie hanya dihapus kalau sesinya memang sudah tidak sah, supaya rute GET ini tidak bisa dipakai halaman lain sebagai logout paksa.

### Secret JWT

Sesi dibawa sebagai JWT HS256 di cookie `httpOnly`, ditandatangani dengan `SYNONA_JWT_SECRET` dari `.env`. Kalau variabel itu tidak ada, **aplikasi sengaja menolak start** (`src/instrumentation.ts`) — tidak ada nilai default, karena secret bawaan yang diam-diam terpakai di produksi jauh lebih berbahaya daripada aplikasi yang gagal start.

`.env` ada di `.gitignore`. Jangan pernah menuliskan isinya ke git, log, atau tiket.

### Batasan: sesi JWT tidak bisa dicabut satu per satu

Ini konsekuensi yang harus diketahui sebelum memakainya:

- **Tidak ada daftar sesi di database.** Token yang sudah diterbitkan tetap sah sampai `exp`-nya lewat (30 hari), termasuk setelah pemiliknya ganti sandi.
- **Mencabut akses = mengganti `SYNONA_JWT_SECRET`.** Itu membatalkan *semua* token sekaligus dan memaksa setiap perangkat login ulang — tidak bisa hanya satu perangkat.
- Kalau nanti butuh pencabutan per-sesi (mis. "keluarkan HP yang hilang"), sesi harus dipindah ke tabel di database; JWT tanpa daftar sesi tidak bisa memberikannya.

## Penanganan galat di sisi klien

Server action bisa **melempar**, bukan cuma mengembalikan `{ ok: false }` — sesi habis (middleware menjawab 401), jaringan putus, atau galat tak terduga. Karena itu setiap pemanggilan aksi dari komponen dibungkus `aman()` (`src/lib/aksi.ts`), yang mengubah lemparan jadi hasil `ok: false` biasa.

Tanpa pembungkus itu, promise-nya ditolak, baris `setPending(false)` di bawahnya tidak pernah jalan, dan **tombolnya berputar selamanya** tanpa pesan apa pun. `aman()` sengaja meneruskan lemparan `NEXT_REDIRECT`, karena `redirect()` di server action memang bekerja dengan cara melempar.

Galat render ditangani `src/app/error.tsx` (dan `global-error.tsx` sebagai jaring terakhir), sementara alamat yang tidak ada masuk ke `src/app/not-found.tsx`. Ketiganya berbahasa Indonesia — bawaan Next adalah layar Inggris "Application error: a client-side exception has occurred" yang tidak berarti apa-apa bagi pemilik warung.

## Catatan deploy

**Jangan deploy ke Vercel/Netlify serverless** — filesystem-nya ephemeral sehingga file SQLite hilang. Gunakan VPS/Docker dengan volume persisten, satu replica. Detail dan jalur migrasi ke Turso/Postgres ada di [PRD-TEKNIS.md §11](PRD-TEKNIS.md).

Proses Next.js **hanya listen di `127.0.0.1`** (`HOSTNAME` di `ecosystem.config.js`); akses dari luar lewat nginx. Konfigurasi proxy-nya ada di [`deploy/nginx/synona.conf`](deploy/nginx/synona.conf) beserta perintah pemasangannya. Jangan ubah pm2 ke cluster mode atau `instances > 1` — SQLite satu penulis, akan kena `SQLITE_BUSY`.
# synona
