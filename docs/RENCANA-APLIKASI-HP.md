# Rencana Synona Jadi Aplikasi HP

Dokumen kerja. Urutannya sengaja **desain dulu, baru kode** — supaya bentuk
tiap layar disepakati sebelum ada yang dibangun, dan supaya tidak ada menu
yang "hilang" di versi HP.

Status hari ini: Synona sudah berjalan sebagai web di `https://synona.cloud`,
sudah HTTPS, dan sudah punya manifest PWA, ikon, serta service worker. Artinya
**pondasi aplikasinya sudah ada** — yang belum adalah bentuk layarnya untuk
HP dan beberapa kemampuan khas perangkat.

---

## 1. Tujuan

1. Semua menu dan fitur yang ada di web **ada juga di aplikasi**, tanpa
   kecuali. Tidak ada "buka lewat browser saja untuk fitur ini".
2. Layarnya dirancang untuk **satu tangan sambil berdiri di belakang meja
   kasir**, bukan sekadar web yang dikecilkan.
3. Bisa dipasang dari Play Store maupun dibagikan sebagai file APK.
4. Kemampuan yang hanya masuk akal di HP dipakai: kamera untuk barcode dan
   foto produk, printer Bluetooth, berbagi ke WhatsApp, notifikasi pengingat.

### Bukan tujuan (sengaja)

- **Mode offline penuh.** Kasir yang mencatat penjualan saat internet mati
  lalu gagal tersinkron adalah cara tercepat kehilangan uang. Kalau nanti
  dibuat, ia butuh antrean tersinkron dengan penyelesaian konflik — keputusan
  produk tersendiri, bukan efek samping dari "dijadikan aplikasi".
- Menulis ulang aplikasi jadi native (Kotlin/Swift/React Native). Biayanya
  berlipat, hasilnya sama untuk kebutuhan ini.

---

## 2. Pilihan teknologi

| | PWA (pasang dari browser) | TWA / APK (PWABuilder) | Capacitor |
|---|---|---|---|
| Butuh HTTPS | Ya (sudah ada) | Ya | Tidak wajib (tapi tetap harus) |
| File APK | Tidak | **Ya** | Ya |
| Masuk Play Store | Tidak | Ya ($25 sekali) | Ya |
| Update aplikasi | Otomatis saat deploy | Otomatis saat deploy | Otomatis, kecuali bagian native |
| Printer Bluetooth BLE | Ya | Ya | Ya |
| Printer Bluetooth Classic | Tidak | Tidak | **Ya** |
| Scan barcode kamera | Ya (Web API) | Ya | **Ya (lebih cepat)** |
| Notifikasi push | Ya (Android) | Ya (Android) | Ya (Android + iOS) |
| Kerja tambahan | ~0 | 1–2 jam | ± 1 hari + pemeliharaan |

**Rencana bertahap:**

1. **Sekarang → PWA.** Rapikan layar untuk HP. Tidak ada biaya, tidak ada
   proses rilis, dan tiap perbaikan langsung sampai ke pengguna.
2. **Setelah layar HP beres → APK lewat PWABuilder.** Satu berkas
   `public/.well-known/assetlinks.json` ditambahkan ke repo supaya aplikasinya
   tampil tanpa bilah alamat. APK bisa dibagikan lewat WhatsApp; paket yang
   sama bisa diunggah ke Play Store kapan pun siap.
3. **Kalau nanti butuh → Capacitor.** Pemicunya jelas: ada pengguna dengan
   printer Bluetooth Classic, atau scan barcode lewat browser terasa lambat.
   Sebelum pemicu itu muncul, jangan dikerjakan.

**Catatan iPhone:** tidak ada APK. Pengguna iPhone memasang lewat Safari →
Bagikan → Tambah ke Layar Utama. Kalau mau masuk App Store, perlu akun Apple
$99/tahun dan pembungkus Capacitor.

---

## 3. Prinsip desain

1. **Satu tangan.** Semua aksi utama berada di sepertiga bawah layar. Menu
   dan navigasi di bawah, bukan di pojok kanan atas.
2. **Area sentuh minimal 44×44 px.** Tombol +/− jumlah di kasir lebih besar
   lagi, karena dipakai berulang dan sering sambil terburu-buru.
3. **Satu layar, satu pekerjaan.** Layar kasir tidak dipakai untuk mengatur
   produk. Kalau butuh, buka lembar terpisah lalu kembali.
4. **Angka dulu, hiasan belakangan.** Nominal uang paling besar dan paling
   tebal di layarnya.
5. **Bahasa sehari-hari.** "Untung hari ini", bukan "Laba kotor periode".
   Istilah akuntansi hanya di Laporan.
6. **Jujur saat gagal.** Internet mati, printer tidak tersambung, langganan
   habis — semuanya diberi tahu apa adanya beserta cara memperbaikinya.
7. **Hemat kuota.** Gambar dikirim dalam ukuran tampilnya, daftar panjang
   dimuat bertahap. Keduanya sudah berjalan di web dan tetap dipakai.

---

## 4. Kerangka navigasi

Web memakai sidebar kiri 264 px. Di HP itu diganti:

```
┌─────────────────────────────┐
│ ▾ TOKO SEMBBAKO      🔔  ⋮  │  ← header: pemindah outlet, notifikasi, menu
├─────────────────────────────┤
│                             │
│         isi layar           │
│                             │
│                        (💬) │  ← asisten tanya-jawab
├─────────────────────────────┤
│  🏠     🛒     📋     ☰     │  ← bilah bawah
│ Beranda Kasir Kasbon Lainnya│
└─────────────────────────────┘
```

**Bilah bawah menyesuaikan jenis usaha** (aturannya sudah ada di
`src/lib/usaha.ts`):

| Jenis usaha | Tab 1 | Tab 2 | Tab 3 | Tab 4 |
|---|---|---|---|---|
| Dagang | Beranda | Kasir | Kasbon | Lainnya |
| Jasa | Beranda | Pesanan | Kasbon | Lainnya |
| Campuran | Beranda | Kasir | Pesanan | Lainnya |

**"Lainnya"** membuka lembar penuh berisi seluruh menu sisanya, dikelompokkan
sama seperti sidebar web: Pencatatan, Data Usaha, Analisa, Pengaturan. Jadi
tidak ada fitur yang hilang — hanya berpindah tempat.

**Yang ikut dirancang ulang:**

- **Pemindah outlet** pindah ke header, sebagai lembar pilihan dari bawah.
- **Pencarian global** (Ctrl+K di web) jadi ikon kaca pembesar di header.
- **Asisten tanya-jawab** tetap tombol mengambang, tapi naik sedikit supaya
  tidak bertabrakan dengan bilah bawah.
- **Tombol aksi utama tiap layar** jadi tombol mengambang di kanan bawah
  (mis. "Tambah Produk", "Catat Beban").

---

## 5. Inventaris layar

Semua rute yang ada sekarang, beserta yang perlu dikerjakan untuk HP.
Kolom **Prioritas**: P0 dipakai tiap hari, P1 mingguan, P2 sesekali.

### Dipakai kasir & pemilik tiap hari

| Layar | Rute | Prioritas | Yang perlu dirancang ulang |
|---|---|---|---|
| Beranda (dashboard) | `/` | P0 | KPI jadi 2 kolom; grafik digulir mendatar; kartu ditumpuk |
| Penjualan (POS) | `/kasir` | P0 | Paling berat. Grid produk 2 kolom, keranjang jadi lembar bawah, bilah total menempel di bawah |
| Bayar | dialog di `/kasir` | P0 | Jadi lembar penuh: metode, uang diterima, tombol nominal cepat besar-besar |
| Nota setelah bayar | dialog | P0 | Layar penuh: cetak, kirim WA, transaksi baru |
| Pesanan Jasa | `/pesanan` | P0 | Papan antrean jadi tab status (Masuk / Dikerjakan / Selesai), kartu bisa digeser untuk ubah status |
| Utang (Kasbon) | `/kasbon` | P0 | Daftar kartu; tombol tagih WA menempel di kartu |

### Data usaha

| Layar | Rute | Prioritas | Yang perlu dirancang ulang |
|---|---|---|---|
| Produk & Stok | `/produk` | P1 | Tabel jadi kartu; form jadi lembar bertahap; scan barcode untuk SKU |
| Layanan | `/layanan` | P1 | Sama seperti produk |
| Persediaan (bahan) | `/persediaan` | P1 | Kartu + penyesuaian stok cepat |
| Pembelian Stok | `/pembelian` | P1 | Form banyak baris — paling sulit di layar kecil; baris ditambah satu per satu lewat lembar |
| Pelanggan | `/pelanggan` | P1 | Daftar + pencarian; kartu detail jadi lembar |
| Promo & Diskon | `/promo` | P2 | Kartu promo sudah cocok; pemilihan produk jadi lembar dengan pencarian |
| Beban & Tagihan | `/beban` | P1 | Form pendek, cukup lembar |

### Analisa & uang

| Layar | Rute | Prioritas | Yang perlu dirancang ulang |
|---|---|---|---|
| Laporan | `/laporan` | P1 | Pemilih periode jadi chip; tabel digulir mendatar; ringkasan di atas |
| Kas & Bank | `/kas` | P1 | Saldo per akun jadi kartu bergulir; mutasi jadi daftar |
| Rekonsiliasi Harian | `/rekonsiliasi` | P1 | Input hitungan uang fisik dengan papan angka besar |
| Pencarian | `/cari` | P2 | Hasil dikelompokkan per jenis |

### Pengaturan & akun

| Layar | Rute | Prioritas | Catatan |
|---|---|---|---|
| Outlet & Staf | `/outlet` | P2 | Termasuk QRIS usaha dan pajak penjualan |
| Pengingat | `/pengingat` | P2 | Calon pemakai notifikasi push |
| Paket langganan | `/pengaturan/paket` | P2 | — |
| Langganan & bayar | `/langganan` | P1 | Sudah cukup ramah HP; QRIS perlu tombol simpan gambar |
| Masuk / Daftar / Lupa sandi | `/masuk`, `/register`, `/lupa-sandi` | P0 | Panel kiri disembunyikan; sudah berjalan, tinggal dirapikan |
| Ganti sandi & kode pemulihan | `/ganti-sandi` | P2 | — |

### Area pengelola platform

| Layar | Rute | Prioritas | Catatan |
|---|---|---|---|
| Ringkasan platform | `/admin` | P2 | Dipakai pemilik Synona, bukan pelanggan |
| Verifikasi langganan | `/admin/langganan` | P1 | Perlu enak dipakai dari HP — verifikasi sering dilakukan sambil jalan |
| Akun usaha | `/admin/akun` | P2 | Tabel lebar; jadi kartu di HP |
| Trafik pengunjung | `/admin/trafik` | P2 | — |

### Halaman publik

| Layar | Rute | Catatan |
|---|---|---|
| Halaman depan | `/beranda` | Sudah responsif |
| Nota digital | `/nota/[id]` | Dibuka pembeli dari QR — wajib rapi di HP |

---

## 6. Rancangan layar utama

Wireframe tekstual sebagai bahan diskusi sebelum digambar di Figma.

### 6.1 Beranda

```
┌─────────────────────────────┐
│ ▾ TOKO SEMBBAKO      🔍 🔔  │
├─────────────────────────────┤
│ Selamat pagi, Rudi 👋       │
│                             │
│ ┌───────────┐ ┌───────────┐ │
│ │ Penjualan │ │  Untung   │ │
│ │ Rp 147.300│ │ Rp 22.800 │ │
│ │  ▲ 12%    │ │  ▲ 8%     │ │
│ └───────────┘ └───────────┘ │
│ ┌───────────┐ ┌───────────┐ │
│ │ Transaksi │ │   Utang   │ │
│ │     3     │ │Rp 2.341.500│ │
│ └───────────┘ └───────────┘ │
│                             │
│ Penjualan 7 hari      [7▾]  │
│ ╭─────────────────────────╮ │
│ │      grafik area        │ │
│ ╰─────────────────────────╯ │
│                             │
│ Uang masuk           Rp ... │
│ Jatuh tempo hari ini   (3)  │
│ Stok menipis           (2)  │
└─────────────────────────────┘
```

Aturan: KPI selalu 2 kolom (4 kartu = 2 baris). Grafik tetap ditampilkan,
tapi hanya satu garis pada layar < 400 px supaya tidak jadi benang kusut.

### 6.2 Kasir — layar tersulit

```
┌─────────────────────────────┐
│ ← Kasir        🖨 ▾ 🔍  ⌗   │  ← printer, cari, scan barcode
├─────────────────────────────┤
│ [Semua][Sembako][Minuman]…  │
│ ┌─────────┐ ┌─────────┐     │
│ │  foto   │ │  foto   │     │
│ │ Beras   │ │ Minyak  │     │
│ │ 132.000 │ │  17.500 │     │
│ └─────────┘ └─────────┘     │
│ ┌─────────┐ ┌─────────┐     │
│ …                           │
├─────────────────────────────┤
│ 🛒 3 barang      Rp 176.500 │  ← selalu menempel
│ [        BAYAR          ]   │
└─────────────────────────────┘
```

Ketuk bilah keranjang → lembar bawah berisi rincian, ubah jumlah, diskon per
baris, dan tombol Bayar. Ketuk Bayar → lembar penuh pembayaran.

Kartu produk memuat foto (tidak dipotong), nama, harga, label promo, dan
sisa stok. Ketuk = tambah satu. Tekan lama = masukkan jumlah langsung
(berguna untuk 12 bungkus mi).

### 6.3 Pembayaran

```
┌─────────────────────────────┐
│ ✕  Pembayaran               │
│                             │
│      Total Bayar            │
│      Rp 176.500             │
│   Termasuk PPh 0,5% Rp 880  │
│                             │
│ [Tunai][QRIS][Transfer][Utang]│
│                             │
│ Uang diterima               │
│ ┌─────────────────────────┐ │
│ │              Rp 200.000 │ │
│ └─────────────────────────┘ │
│ [pas][200rb][250rb][300rb]  │
│                             │
│ Kembalian      Rp 23.500    │
│                             │
│ Nama pelanggan (opsional)   │
│ ┌─────────────────────────┐ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ [      TANDAI LUNAS      ]  │
└─────────────────────────────┘
```

Papan angka HP muncul otomatis di kolom uang diterima. Pilih QRIS → gambar
QRIS usaha tampil sebesar mungkin supaya mudah dipindai pembeli.

### 6.4 Setelah bayar

Layar penuh: tanda centang, nomor nota, total, kembalian besar-besar, lalu
tiga tombol sejajar — **Cetak nota**, **Kirim WA**, **Transaksi baru**.
Kalau "cetak otomatis" menyala, statusnya ("Mencetak…", "Terkirim ke
printer") tampil di layar ini.

### 6.5 Pesanan Jasa

Tab status di atas: **Masuk (7) · Dikerjakan (10) · Selesai (10)**.
Tiap pesanan jadi kartu: nomor, nama pelanggan, janji selesai, sisa bayar.
Geser kartu ke kanan = majukan status. Ketuk = lembar detail.

### 6.6 Daftar (Produk, Pelanggan, Bahan, Beban)

Pola yang sama dipakai semuanya: kolom pencarian menempel di atas, chip
penyaring, daftar kartu, tombol mengambang "+" di kanan bawah, dan geser
kartu ke kiri untuk aksi cepat (ubah / arsipkan).

### 6.7 Laporan

Pilih periode lewat chip (Hari ini · 7 hari · 30 hari · Bulan ini · Pilih
tanggal). Ringkasan omzet–untung–beban di atas sebagai kartu, lalu tabel
rincian yang bisa digulir mendatar dengan kolom pertama tetap di tempat.

---

## 7. Sistem desain

Warna dan huruf mengikuti yang sudah dipakai web (`src/app/globals.css`),
jadi aplikasi dan web tetap terasa satu keluarga.

**Warna inti:** brand `#6d5df6` · teks `#1e2235` · teks lembut `#4a5069` ·
redup `#8a90a6` · garis `#edeff5` · latar `#f7f8fc` · berhasil `#22c55e` ·
peringatan `#f59e0b` · bahaya `#ef4444` · info `#3b82f6`.

**Huruf:** Plus Jakarta Sans. Skala untuk HP:

| Peran | Ukuran | Contoh |
|---|---|---|
| Angka besar | 32–40 px, extrabold | Total bayar, KPI |
| Judul layar | 22 px, extrabold | "Penjualan (POS)" |
| Judul kartu | 16 px, bold | Nama produk |
| Tubuh | 15 px | Isi umum |
| Keterangan | 13 px | Baris pendukung |
| Mikro | 11 px | Label chip, satuan |

**Komponen baru yang perlu dibuat:**

1. `BilahBawah` — navigasi 4 tab + status aktif.
2. `LembarBawah` — lembar dari bawah, bisa digeser turun untuk menutup.
   Menggantikan sebagian besar dialog di HP.
3. `BilahKeranjang` — bilah menempel di kasir.
4. `KartuDaftar` — kartu seragam untuk semua daftar, dengan aksi geser.
5. `PapanAngka` — input nominal besar untuk uang diterima dan rekonsiliasi.
6. `TabStatus` — tab berhitung untuk papan pesanan.
7. `TombolMengambang` — aksi utama tiap layar.
8. `LayarKosong` — keadaan kosong dengan satu ajakan tindakan.
9. `Toast` — pemberitahuan singkat hasil aksi.

Semuanya dibuat sebagai komponen React biasa di `src/components/hp/` dan
dipakai bersama layar web lewat titik putus `lg:` — bukan aplikasi terpisah.
**Satu kode, dua bentuk.** Tidak ada percabangan "versi mobile" yang harus
diurus dua kali.

---

## 8. Kemampuan khas HP

| Kemampuan | Cara | Butuh Capacitor? | Fase |
|---|---|---|---|
| Cetak nota Bluetooth | Web Bluetooth (sudah jalan di HTTPS) | Tidak | Sudah ada |
| Cetak lewat RawBT | Intent Android (sudah ada) | Tidak | Sudah ada |
| Foto produk dari kamera | `<input capture>` (sudah ada) | Tidak | Sudah ada |
| Scan barcode ke pencarian produk | `BarcodeDetector` di Chrome Android | Tidak | Fase 3 |
| Kirim nota ke WhatsApp | `wa.me` (sudah ada) | Tidak | Sudah ada |
| Bagikan nota lewat menu bagikan HP | Web Share API | Tidak | Fase 3 |
| Simpan gambar QRIS ke galeri | Web Share / unduh | Tidak | Fase 3 |
| Notifikasi pengingat kasbon | Web Push (Android) | Tidak | Fase 4 |
| Kunci aplikasi dengan PIN/sidik jari | WebAuthn | Tidak | Fase 4 |
| Printer Bluetooth Classic | Plugin native | **Ya** | Nanti, kalau ada pemicunya |
| Notifikasi di iPhone | Plugin native | **Ya** | Nanti |

---

## 9. Tahapan kerja

### Fase 0 — Desain (sebelum kode apa pun)

Keluaran:

1. **Peta navigasi** — isi bilah bawah per jenis usaha, isi lembar "Lainnya".
2. **Wireframe 12 layar utama** (bagian 6 dokumen ini, digambar rapi).
3. **Berkas Figma** berisi: token warna & huruf, 9 komponen baru, lalu layar
   jadi untuk 12 layar itu dalam ukuran 390×844.
4. **Persetujuanmu** atas ketiganya sebelum kode disentuh.

Aku bisa membuat berkas Figma-nya langsung dari sini — koneksi Figma sudah
tersedia di sesi ini.

### Fase 1 — Pondasi (setelah desain disetujui)

- Bilah bawah + lembar "Lainnya" + header HP.
- 9 komponen baru di `src/components/hp/`.
- Semua layar tetap jalan seperti sekarang, hanya kerangkanya yang berubah.

### Fase 2 — Layar P0

Kasir, pembayaran, nota, beranda, pesanan jasa, kasbon. Ini yang paling
menentukan rasa "ini aplikasi, bukan situs".

### Fase 3 — Layar P1 & P2 + kemampuan HP

Produk, layanan, persediaan, pembelian, pelanggan, promo, beban, laporan,
kas, rekonsiliasi, pengaturan, area pengelola. Ditambah scan barcode, Web
Share, dan simpan QRIS.

### Fase 4 — Rilis aplikasi

- `public/.well-known/assetlinks.json` masuk repo.
- APK dibuat lewat PWABuilder, diuji di HP sungguhan.
- Notifikasi pengingat dan kunci PIN.
- Opsional: unggah ke Play Store.

### Perkiraan waktu

| Fase | Perkiraan |
|---|---|
| 0 — Desain | 1–2 hari |
| 1 — Pondasi | 1–2 hari |
| 2 — Layar P0 | 3–4 hari |
| 3 — Sisanya | 4–6 hari |
| 4 — Rilis | 1 hari |

Perkiraan ini untuk pengerjaan berurutan denganku, termasuk pengujian di
salinan database seperti yang selama ini dilakukan — bukan hitungan hari
kerja tim.

---

## 10. Keputusan yang menunggu darimu

1. **Isi bilah bawah.** Usulanku di bagian 4. Kalau menurutmu Laporan lebih
   sering dibuka daripada Kasbon, tinggal ditukar.
2. **Kasir sebagai layar pembuka.** Untuk akun kasir, apakah aplikasi
   langsung membuka POS, bukan Beranda?
3. **Nama & ikon aplikasi di HP.** Sekarang "Synona" dengan ikon ungu. Tetap?
4. **Play Store atau cukup APK** yang dibagikan sendiri.
5. **Warna tema aplikasi** (bilah status Android) — sekarang `#6d5df6`.
6. **Urutan pengerjaan** — apakah Fase 2 didahulukan penuh, atau mau satu
   layar dulu (Kasir) untuk dicoba di HP sungguhan sebelum lanjut.

---

## 11. Risiko

| Risiko | Penanganan |
|---|---|
| Layar kasir jadi sesak di HP kecil (< 360 px) | Grid produk turun ke 2 kolom; foto boleh disembunyikan lewat pengaturan |
| Form pembelian banyak baris sulit di HP | Baris ditambah lewat lembar terpisah, bukan tabel yang digulir |
| Internet mati saat mencatat | Pesan jujur + tombol coba lagi; data tidak pernah dianggap tersimpan sebelum server menjawab |
| Printer Bluetooth tidak terdeteksi | Sudah ada tiga mode (BLE, RawBT, dialog cetak) beserta penjelasannya |
| PWA di iPhone terbatas | Diberi tahu sejak awal; kalau pengguna iPhone banyak, baru pertimbangkan Capacitor |
| Desain berubah di tengah jalan | Karena itu Fase 0 ada, dan kode baru disentuh setelah desain disetujui |

---

## 12. Definisi selesai

- Semua rute di bagian 5 bisa dipakai penuh dari layar 390×844 tanpa perlu
  memperbesar atau menggulir mendatar (kecuali tabel laporan yang memang
  dirancang bergulir).
- Transaksi penuh — pilih barang, beri diskon, bayar tunai, cetak nota —
  selesai dalam 30 detik di HP.
- Aplikasi terpasang di layar utama Android dan iPhone dengan ikon Synona
  dan terbuka tanpa bilah alamat.
- File APK ada, sudah diuji pasang di HP sungguhan.
- Tidak ada menu web yang tidak punya padanan di aplikasi.

---

## 13. Backend & sinkronisasi

Pertanyaan yang paling sering muncul saat web dijadikan aplikasi: "backend-nya
bagaimana, biar datanya sama dengan web?"

**Jawabannya: tidak ada backend kedua yang perlu disatukan.** Aplikasinya
adalah web yang sama, dibuka dari ikon di layar utama alih-alih dari tab
browser.

```
   HP (ikon Synona)  ─┐
   HP (APK/TWA)      ─┼──►  https://synona.cloud  ──►  satu proses Next.js
   Laptop kasir      ─┤                                       │
   Tablet pemilik    ─┘                                 data/synona.db
```

Tidak ada database di dalam HP, jadi tidak ada yang perlu dicocokkan. Kasir
menekan "Tandai Lunas" → permintaan langsung ke server → baris ditulis ke
SQLite di VPS. Pemilik yang sedang membuka laporan di laptop cukup memuat
ulang halamannya untuk melihat transaksi itu.

Sesi login juga satu: cookie JWT yang sama dipakai browser maupun aplikasi.
Ganti sandi di HP berarti sesi di laptop ikut memakai sandi baru.

### Kenapa bisa begitu

Synona memakai Next.js App Router. Semua perubahan data lewat **Server
Action** — fungsi bertanda `"use server"` yang berjalan di server, bukan di
perangkat (saat ini ada 70 aksi di `src/server/actions/`). Halamannya pun
dirender di server (`export const dynamic = "force-dynamic"`), jadi angka
yang tampil selalu dibaca ulang dari database tiap kali halaman dibuka.

Perangkat hanya menampilkan hasil. Itu sebabnya "sinkronisasi" tidak pernah
jadi pekerjaan tersendiri di jalur PWA, TWA, maupun Capacitor — ketiganya
membuka URL yang sama.

### Yang tetap perlu diurus meski backend-nya satu

1. **Beberapa perangkat menulis bersamaan.** SQLite memakai mode WAL: pembaca
   tidak memblokir penulis, dan penulis diantre (`busy_timeout = 5000`).
   Untuk satu outlet dengan beberapa kasir, ini cukup. Ambang untuk pindah ke
   Postgres: lebih dari sekitar 10 perangkat yang aktif menulis bersamaan,
   atau saat aplikasi harus berjalan di lebih dari satu VPS sekaligus.

2. **Rebutan stok.** Dua kasir menjual barang terakhir di saat yang sama tidak
   akan membuat stok minus: pengecekan stok, pengurangan stok, dan pencatatan
   transaksi berada dalam SATU transaksi database, dan SQLite menjalankan
   penulis satu per satu.

3. **Layar tidak menyegar sendiri.** Transaksi dari HP tidak otomatis muncul
   di laptop yang sedang terbuka — halamannya perlu dimuat ulang. Rencana
   Fase 2: muat ulang otomatis saat aplikasi kembali dibuka (`visibilitychange`),
   plus penyegaran berkala di layar yang memang dipantau (Beranda, papan
   Pesanan). Kalau nanti benar-benar butuh perubahan langsung terlihat,
   barulah pertimbangkan SSE — jangan dibangun sebelum ada keluhannya.

4. **Pengaturan yang memang milik perangkat.** Printer nota (mode, lebar
   kertas, cetak otomatis) sengaja disimpan di HP masing-masing, bukan di
   server: printer itu milik satu meja kasir, bukan milik usaha. Jadi memang
   tidak ikut sinkron, dan itu bukan bug.

5. **Versi aplikasi tidak akan campur.** Service worker hanya menyimpan aset
   ber-hash dari `/_next/static/`; halaman HTML tidak pernah di-cache. Sekali
   deploy di VPS, semua perangkat langsung memakai versi baru tanpa perlu
   memasang ulang APK.

6. **Cadangan data.** Karena semuanya ada di satu berkas SQLite di satu VPS,
   backup adalah satu-satunya jaring pengaman. Rencana: cron harian yang
   menyalin `data/synona.db` ke folder backup, lalu menyalinnya ke luar VPS
   (mis. Google Drive atau VPS lain). Ini pekerjaan Fase 4, dan sebaiknya
   tidak ditunda lebih lama dari itu.

### Kalau suatu saat mau aplikasi native sungguhan

Barulah muncul pekerjaan "menyatukan backend", dan besarnya nyata: aplikasi
native tidak bisa memanggil Server Action, jadi setiap aksi harus dikembarkan
sebagai endpoint JSON (`/api/...`) lengkap dengan autentikasi token, lalu tiap
layar ditulis ulang di bahasa native. Artinya 70 aksi harus dipelihara di dua
tempat, dan tiap fitur baru dikerjakan dua kali.

Karena itu urutan di dokumen ini sengaja menghindarinya. Kalau yang dibutuhkan
cuma akses perangkat (printer Bluetooth Classic, scan barcode cepat),
**Capacitor sudah cukup**: bagian native dipanggil lewat plugin di dalam
aplikasi, dan datanya tetap lewat server yang sama — tanpa API tambahan.

Pindah ke API terpisah baru masuk akal kalau salah satu ini terjadi:

- Ada aplikasi pihak lain yang harus membaca data Synona (mis. marketplace).
- Aplikasi harus benar-benar jalan offline dan mengantre transaksi.
- Ada tim lain yang membangun klien sendiri di luar repo ini.
