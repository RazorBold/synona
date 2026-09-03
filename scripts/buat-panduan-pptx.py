#!/usr/bin/env python3
"""
Membuat deck panduan pengguna Synona (docs/Panduan-Pengguna-Synona.pptx).

    python3 scripts/buat-panduan-pptx.py

Paletnya diambil dari design token di src/app/globals.css supaya deck dan
aplikasinya terlihat berasal dari produk yang sama.
"""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# ----------------------------------------------------------- palet
BRAND_50  = RGBColor(0xF1, 0xEF, 0xFF)
BRAND_100 = RGBColor(0xE6, 0xE2, 0xFF)
BRAND_300 = RGBColor(0xB3, 0xA7, 0xFB)
BRAND_400 = RGBColor(0x8B, 0x7C, 0xF8)
BRAND_500 = RGBColor(0x6D, 0x5D, 0xF6)
BRAND_600 = RGBColor(0x5B, 0x4B, 0xE0)
INK       = RGBColor(0x1E, 0x22, 0x35)
INK_SOFT  = RGBColor(0x4A, 0x50, 0x69)
MUTED     = RGBColor(0x8A, 0x90, 0xA6)
LINE      = RGBColor(0xED, 0xEF, 0xF5)
CANVAS    = RGBColor(0xF7, 0xF8, 0xFC)
WHITE     = RGBColor(0xFF, 0xFF, 0xFF)
SUCCESS   = RGBColor(0x22, 0xC5, 0x5E)
WARNING   = RGBColor(0xF5, 0x9E, 0x0B)
DANGER    = RGBColor(0xEF, 0x44, 0x44)
INFO      = RGBColor(0x3B, 0x82, 0xF6)

FONT = "Segoe UI"

W = Inches(13.333)
H = Inches(7.5)
MARGIN = Inches(0.85)

prs = Presentation()
prs.slide_width = W
prs.slide_height = H
BLANK = prs.slide_layouts[6]

nomor_halaman = [0]


# ------------------------------------------------------- utilitas
def kotak(slide, x, y, w, h, isi=None, garis=None, radius=None, tebal=Pt(1)):
    bentuk = MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE
    s = slide.shapes.add_shape(bentuk, x, y, w, h)
    if radius:
        s.adjustments[0] = radius
    if isi is None:
        s.fill.background()
    else:
        s.fill.solid()
        s.fill.fore_color.rgb = isi
    if garis is None:
        s.line.fill.background()
    else:
        s.line.color.rgb = garis
        s.line.width = tebal
    s.shadow.inherit = False
    s.text_frame.text = ""
    return s


def teks(slide, x, y, w, h, isi, ukuran=16, warna=INK, tebal=False,
         rata=PP_ALIGN.LEFT, spasi=1.15, anchor=MSO_ANCHOR.TOP):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = 0
    tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = anchor

    baris = isi if isinstance(isi, list) else [isi]
    for i, b in enumerate(baris):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = rata
        p.line_spacing = spasi
        if i:
            p.space_before = Pt(6)
        r = p.add_run()
        r.text = b
        r.font.size = Pt(ukuran)
        r.font.bold = tebal
        r.font.color.rgb = warna
        r.font.name = FONT
    return tb


def slide_baru(latar=WHITE):
    s = prs.slides.add_slide(BLANK)
    bg = kotak(s, 0, 0, W, H, isi=latar)
    bg.shadow.inherit = False
    return s


def kaki(slide, label=""):
    nomor_halaman[0] += 1
    teks(slide, MARGIN, H - Inches(0.62), Inches(8), Inches(0.3),
         label or "Panduan Pengguna Synona", ukuran=10, warna=MUTED)
    teks(slide, W - MARGIN - Inches(1.2), H - Inches(0.62), Inches(1.2), Inches(0.3),
         str(nomor_halaman[0]), ukuran=10, warna=MUTED, rata=PP_ALIGN.RIGHT)


def judul_halaman(slide, judul, anak=None, warna_aksen=BRAND_500):
    kotak(slide, MARGIN, Inches(0.72), Inches(0.09), Inches(0.62), isi=warna_aksen)
    teks(slide, MARGIN + Inches(0.28), Inches(0.66), Inches(11), Inches(0.55),
         judul, ukuran=30, warna=INK, tebal=True)
    if anak:
        teks(slide, MARGIN + Inches(0.28), Inches(1.28), Inches(11.2), Inches(0.4),
             anak, ukuran=14, warna=MUTED)


def pil(slide, x, y, label, isi=BRAND_50, warna=BRAND_600, lebar=None):
    w = lebar or Inches(1.6)
    s = kotak(slide, x, y, w, Inches(0.34), isi=isi, radius=0.5)
    tf = s.text_frame
    tf.margin_left = tf.margin_right = Inches(0.1)
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = label
    r.font.size = Pt(10)
    r.font.bold = True
    r.font.color.rgb = warna
    r.font.name = FONT
    return s


def kartu(slide, x, y, w, h, judul, baris, emoji="", aksen=BRAND_500,
          isi_kartu=WHITE, ukuran_judul=15):
    """Kartu putih bergaris tipis — bentuk yang sama dipakai di aplikasinya."""
    kotak(slide, x, y, w, h, isi=isi_kartu, garis=LINE, radius=0.08)
    kotak(slide, x, y, Inches(0.06), h, isi=aksen, radius=0.5)

    pendek = h < Inches(1.15)
    jarak_atas = Inches(0.15) if pendek else Inches(0.24)
    kiri = x + Inches(0.3)
    lebar = w - Inches(0.55)
    atas = y + jarak_atas

    if emoji:
        teks(slide, kiri, atas, Inches(0.6), Inches(0.45), emoji,
             ukuran=17 if pendek else 22)
        kiri_judul = kiri + (Inches(0.45) if pendek else Inches(0.55))
        lebar_judul = lebar - (Inches(0.45) if pendek else Inches(0.55))
    else:
        kiri_judul, lebar_judul = kiri, lebar

    tinggi_judul = Inches(0.26) if pendek else Inches(0.34)
    teks(slide, kiri_judul, atas, lebar_judul, tinggi_judul,
         judul, ukuran=ukuran_judul, warna=INK, tebal=True)

    if baris:
        # Isi kartu memakai SISA ruang yang benar-benar ada. Menghitungnya dari
        # angka tetap membuat kartu pendek punya tinggi isi negatif, dan
        # teksnya meluber keluar kartu di PowerPoint.
        y_isi = atas + tinggi_judul + Inches(0.06)
        h_isi = max(Inches(0.22), y + h - Inches(0.14) - y_isi)
        teks(slide, kiri_judul if pendek and emoji else kiri, y_isi,
             lebar_judul if pendek and emoji else lebar, h_isi,
             baris, ukuran=10.5 if pendek else 11.5, warna=INK_SOFT, spasi=1.28)


def daftar(slide, x, y, w, butir, ukuran=13.5, jarak=Inches(0.46),
           warna_bulat=BRAND_500):
    """Daftar bernomor bulat — lebih terbaca daripada bullet standar."""
    for i, (utama, ket) in enumerate(butir):
        yy = y + i * jarak
        b = kotak(slide, x, yy + Inches(0.02), Inches(0.26), Inches(0.26),
                  isi=warna_bulat, radius=0.5)
        tf = b.text_frame
        tf.margin_left = tf.margin_right = 0
        tf.margin_top = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        r = p.add_run()
        r.text = str(i + 1)
        r.font.size = Pt(10)
        r.font.bold = True
        r.font.color.rgb = WHITE
        r.font.name = FONT

        tb = slide.shapes.add_textbox(x + Inches(0.42), yy - Inches(0.03),
                                      w - Inches(0.42), jarak)
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        r = p.add_run()
        r.text = utama
        r.font.size = Pt(ukuran)
        r.font.bold = True
        r.font.color.rgb = INK
        r.font.name = FONT
        if ket:
            r2 = p.add_run()
            r2.text = "  " + ket
            r2.font.size = Pt(ukuran - 1.5)
            r2.font.bold = False
            r2.font.color.rgb = MUTED
            r2.font.name = FONT


def tabel(slide, x, y, w, kolom, baris, lebar_kolom=None, tinggi_baris=Inches(0.44)):
    n = len(kolom)
    lebar_kolom = lebar_kolom or [w / n] * n
    th = Inches(0.44)

    kotak(slide, x, y, w, th, isi=BRAND_50, radius=None)
    cx = x
    for i, k in enumerate(kolom):
        teks(slide, cx + Inches(0.14), y + Inches(0.11), lebar_kolom[i] - Inches(0.2),
             Inches(0.3), k, ukuran=11, warna=BRAND_600, tebal=True)
        cx += lebar_kolom[i]

    yy = y + th
    for j, br in enumerate(baris):
        if j % 2:
            kotak(slide, x, yy, w, tinggi_baris, isi=CANVAS)
        kotak(slide, x, yy, w, Emu(9525), isi=LINE)
        cx = x
        for i, sel in enumerate(br):
            warna = INK if i == 0 else INK_SOFT
            tebal = i == 0
            teks(slide, cx + Inches(0.14), yy + Inches(0.1),
                 lebar_kolom[i] - Inches(0.2), tinggi_baris - Inches(0.1),
                 sel, ukuran=11, warna=warna, tebal=tebal, spasi=1.05)
            cx += lebar_kolom[i]
        yy += tinggi_baris
    return yy


def alur(slide, x, y, w, langkah, warna=None):
    """Rangkaian tahap dengan panah — untuk alur kerja harian."""
    n = len(langkah)
    celah = Inches(0.34)
    lw = (w - celah * (n - 1)) / n
    warna = warna or [BRAND_500] * n

    for i, (judul, ket) in enumerate(langkah):
        xx = x + i * (lw + celah)
        kotak(slide, xx, y, lw, Inches(1.28), isi=WHITE, garis=LINE, radius=0.1)
        kotak(slide, xx, y, lw, Inches(0.07), isi=warna[i], radius=0.3)
        teks(slide, xx + Inches(0.16), y + Inches(0.24), lw - Inches(0.32),
             Inches(0.32), judul, ukuran=13, warna=INK, tebal=True,
             rata=PP_ALIGN.CENTER)
        teks(slide, xx + Inches(0.16), y + Inches(0.63), lw - Inches(0.32),
             Inches(0.6), ket, ukuran=10, warna=MUTED, rata=PP_ALIGN.CENTER,
             spasi=1.2)
        if i < n - 1:
            teks(slide, xx + lw, y + Inches(0.44), celah, Inches(0.4), "›",
                 ukuran=22, warna=BRAND_300, rata=PP_ALIGN.CENTER)


def catatan(slide, x, y, w, judul, isi, warna=WARNING, latar=RGBColor(0xFF, 0xFB, 0xEB),
            h=Inches(1.05)):
    kotak(slide, x, y, w, h, isi=latar, radius=0.1)
    kotak(slide, x, y, Inches(0.07), h, isi=warna, radius=0.5)
    teks(slide, x + Inches(0.32), y + Inches(0.16), w - Inches(0.6), Inches(0.3),
         judul, ukuran=12.5, warna=INK, tebal=True)
    teks(slide, x + Inches(0.32), y + Inches(0.46), w - Inches(0.6),
         h - Inches(0.56), isi, ukuran=11, warna=INK_SOFT, spasi=1.25)


# =============================================================== 1. sampul
s = slide_baru(INK)
kotak(s, 0, 0, W, H, isi=INK)
kotak(s, Inches(8.2), Inches(-1.6), Inches(7.2), Inches(7.2), isi=BRAND_600, radius=0.5)
kotak(s, Inches(9.6), Inches(2.4), Inches(5.4), Inches(5.4), isi=BRAND_500, radius=0.5)
kotak(s, Inches(11.0), Inches(4.6), Inches(3.2), Inches(3.2), isi=BRAND_400, radius=0.5)

logo = kotak(s, MARGIN, Inches(1.05), Inches(0.62), Inches(0.62), isi=BRAND_500, radius=0.28)
teks(s, MARGIN, Inches(1.14), Inches(0.62), Inches(0.5), "🏪", ukuran=20,
     rata=PP_ALIGN.CENTER)
teks(s, MARGIN + Inches(0.82), Inches(1.13), Inches(4), Inches(0.5),
     "Synona", ukuran=26, warna=WHITE, tebal=True)

teks(s, MARGIN, Inches(2.35), Inches(7.6), Inches(2.2),
     ["Panduan Pengguna", "Dagang · Jasa · Campuran"],
     ukuran=46, warna=WHITE, tebal=True, spasi=1.06)
teks(s, MARGIN, Inches(4.45), Inches(6.6), Inches(1.2),
     "Satu aplikasi untuk mencatat jualan, stok, pekerjaan, kas, dan utang — "
     "lalu menerjemahkannya jadi jawaban: usaha saya sehat atau tidak?",
     ukuran=14, warna=BRAND_100, spasi=1.4)

pil(s, MARGIN, Inches(5.7), "Untuk pemilik & kasir", isi=BRAND_600, warna=WHITE,
    lebar=Inches(2.1))
pil(s, MARGIN + Inches(2.25), Inches(5.7), "Termasuk data contoh", isi=BRAND_600,
    warna=WHITE, lebar=Inches(2.2))

teks(s, MARGIN, H - Inches(0.9), Inches(6), Inches(0.4),
     "Versi Agustus 2026", ukuran=11, warna=MUTED)

# =============================================================== 2. isi deck
s = slide_baru()
judul_halaman(s, "Isi panduan ini", "Tiga bagian sesuai jenis usaha, lalu menu yang dipakai semuanya.")

bagian = [
    ("Mulai", "Apa itu Synona · memilih jenis usaha · peta menu", BRAND_500, "🧭"),
    ("Usaha Dagang", "POS · Produk & Stok · Persediaan · Pembelian", INFO, "🏪"),
    ("Usaha Jasa", "Layanan · Terima pesanan · Papan antrean · Petugas", SUCCESS, "🧰"),
    ("Usaha Campuran", "Kapan pakai POS, kapan pakai Pesanan", WARNING, "🧩"),
    ("Dipakai semua", "Kas & Bank · Kasbon · Beban · Laporan · Rekonsiliasi", BRAND_600, "📊"),
    ("Data contoh", "Toko Aksesoris Kita untuk latihan", MUTED, "🧪"),
]
for i, (j, k, warna, e) in enumerate(bagian):
    x = MARGIN + (i % 2) * Inches(5.9)
    y = Inches(2.0) + (i // 2) * Inches(1.42)
    kartu(s, x, y, Inches(5.5), Inches(1.16), j, k, emoji=e, aksen=warna)
kaki(s)

# =============================================================== 3. apa itu
s = slide_baru()
judul_halaman(s, "Apa yang Synona kerjakan", "Bukan sekadar mencatat — mengubah catatan jadi keputusan.")

kolom = [
    ("Mencatat", "Penjualan, pekerjaan, belanja, beban, dan utang. Sekali catat, "
     "tidak perlu diulang di buku lain.", "📝", BRAND_500),
    ("Menghitung", "Modal, laba, stok, dan kas dihitung sendiri dari catatan tadi. "
     "Tidak ada rumus manual yang bisa salah ketik.", "🧮", INFO),
    ("Memberi tahu", "Radar 6 Pertanyaan dan status Sehat/Waspada/Bahaya "
     "menunjukkan apa yang perlu dikerjakan hari ini.", "🚦", SUCCESS),
]
for i, (j, k, e, warna) in enumerate(kolom):
    kartu(s, MARGIN + i * Inches(3.95), Inches(2.05), Inches(3.6), Inches(2.5),
          j, k, emoji=e, aksen=warna, ukuran_judul=17)

catatan(s, MARGIN, Inches(4.95), Inches(11.6),
        "Prinsip yang dipegang di seluruh aplikasi",
        "Satu kejadian dicatat di satu tempat saja. Karena itu laporan tidak pernah "
        "berselisih dengan penjualan — semuanya dirakit dari catatan yang sama, bukan "
        "dari pembukuan kedua yang harus dicocokkan.",
        warna=BRAND_500, latar=BRAND_50)
kaki(s)

# ================================================== 4. pilih jenis usaha
s = slide_baru()
judul_halaman(s, "Langkah pertama: pilih jenis usaha",
              "Muncul di halaman masuk saat aplikasi baru dipasang. Menentukan menu yang Anda lihat.")

jenis = [
    ("Dagang / Ritel", "Saya jual barang yang stoknya dihitung",
     "Warung sembako, toko kue, minimarket, toko aksesoris", "🏪", INFO),
    ("Jasa", "Saya jual pekerjaan, bukan barang",
     "Laundry, bengkel, salon, servis HP, penjahit, cuci mobil", "🧰", SUCCESS),
    ("Campuran", "Saya jual barang sekaligus melayani jasa",
     "Bengkel yang jual sparepart, salon yang jual shampo", "🧩", WARNING),
]
for i, (j, ringkas, contoh, e, warna) in enumerate(jenis):
    x = MARGIN + i * Inches(3.95)
    kartu(s, x, Inches(2.0), Inches(3.6), Inches(2.35), j,
          [ringkas, f"Contoh: {contoh}"], emoji=e, aksen=warna, ukuran_judul=17)

catatan(s, MARGIN, Inches(4.75), Inches(11.6),
        "Salah pilih? Tidak apa-apa.",
        "Ganti kapan saja lewat Pengaturan → Outlet & Staf → Jenis Usaha. "
        "Mengubahnya tidak menghapus data apa pun — menu yang disembunyikan hanya "
        "disembunyikan, dan isinya utuh saat dimunculkan lagi.",
        warna=SUCCESS, latar=RGBColor(0xEC, 0xFD, 0xF3))
kaki(s)

# ================================================== 5. peta menu
s = slide_baru()
judul_halaman(s, "Menu apa yang muncul", "Tanda ✓ berarti menunya tampil untuk jenis usaha itu.")

lk = [Inches(3.5), Inches(2.0), Inches(2.0), Inches(2.0), Inches(2.1)]
tabel(s, MARGIN, Inches(1.95), Inches(11.6),
      ["Menu", "Dagang", "Jasa", "Campuran", "Untuk apa"],
      [
          ["Penjualan (POS)", "✓", "—", "✓", "Jual barang di tempat"],
          ["Pesanan Jasa", "—", "✓", "✓", "Papan antrean pekerjaan"],
          ["Layanan", "—", "✓", "✓", "Katalog jasa"],
          ["Produk & Stok", "✓", "—", "✓", "Katalog barang"],
          ["Persediaan", "✓", "—", "✓", "Bahan & barang jadi"],
          ["Pembelian Stok", "✓", "—", "✓", "Belanja ke supplier"],
          ["Produksi", "✓", "—", "✓", "Olah bahan jadi produk"],
          ["Kas & Bank, Kasbon, Beban", "✓", "✓", "✓", "Dipakai semua jenis"],
          ["Laporan, Rekonsiliasi", "✓", "✓", "✓", "Dipakai semua jenis"],
      ], lebar_kolom=lk, tinggi_baris=Inches(0.4))
kaki(s)


def pemisah(judul, anak, nomor, warna=BRAND_500, emoji=""):
    s = slide_baru(INK)
    kotak(s, 0, 0, W, H, isi=INK)
    kotak(s, Inches(9.4), Inches(-1.2), Inches(6.2), Inches(6.2), isi=warna, radius=0.5)
    kotak(s, Inches(10.9), Inches(3.6), Inches(4.2), Inches(4.2), isi=BRAND_600, radius=0.5)
    teks(s, MARGIN, Inches(2.5), Inches(2), Inches(0.6), nomor, ukuran=15,
         warna=BRAND_300, tebal=True)
    teks(s, MARGIN, Inches(3.0), Inches(8.4), Inches(1.25),
         f"{emoji} {judul}".strip(), ukuran=44, warna=WHITE, tebal=True)
    teks(s, MARGIN, Inches(4.3), Inches(7.2), Inches(1.7), anak, ukuran=15,
         warna=BRAND_100, spasi=1.35)
    return s


# ============================================================ BAGIAN DAGANG
pemisah("Usaha Dagang", "Jual barang yang stoknya dihitung. Setiap penjualan "
        "mengurangi stok dan mencatat modalnya sekaligus.", "BAGIAN 1", INFO, "🏪")

# --- alur harian dagang
s = slide_baru()
judul_halaman(s, "Alur harian usaha dagang", "Empat langkah, berulang tiap hari.", INFO)
alur(s, MARGIN, Inches(2.05), Inches(11.6), [
    ("Buka POS", "Ketuk produk, tekan Bayar"),
    ("Stok turun sendiri", "Tanpa dicatat ulang"),
    ("Catat beban", "Listrik, gaji, sewa"),
    ("Tutup buku", "Rekonsiliasi + Laporan"),
], warna=[INFO, INFO, WARNING, BRAND_500])

daftar(s, MARGIN, Inches(3.9), Inches(11.4), [
    ("Isi katalog dulu.", "Produk & Stok → Tambah Produk. Harga jual dan modal wajib diisi — tanpa modal, laba tidak bisa dihitung."),
    ("Jual lewat POS.", "Pilih cara bayar; uangnya otomatis masuk ke akun kas yang sesuai (laci, bank, atau QRIS)."),
    ("Belanja lewat Pembelian Stok.", "Bukan lewat Beban. Stok bertambah dan modal rata-rata ikut diperbarui."),
    ("Tutup hari di Rekonsiliasi.", "Cocokkan uang laci dengan catatan sistem, selagi ingatannya masih segar."),
])
kaki(s)

# --- produk & stok
s = slide_baru()
judul_halaman(s, "Produk & Stok", "Katalog barang yang Anda jual.", INFO)

kartu(s, MARGIN, Inches(1.95), Inches(5.5), Inches(2.15), "Yang wajib diisi",
      ["Nama, harga jual, dan modal (HPP). Modal inilah yang membuat kata "
       "\"untung\" jujur — kalau dikosongkan, seluruh penjualan terlihat untung penuh.",
       "Batas stok menipis menentukan kapan produk muncul di kartu peringatan."],
      emoji="📦", aksen=INFO)

kartu(s, MARGIN + Inches(5.9), Inches(1.95), Inches(5.7), Inches(2.15),
      "Produk tanpa lacak stok",
      ["Untuk masakan yang dibuat saat dipesan — nasi goreng, kopi susu — matikan "
       "\"lacak stok\".",
       "Tanpa itu Anda harus mengisi stok palsu yang besar, atau POS menolak "
       "penjualan dengan \"stok tinggal 0\" di tengah jam ramai."],
      emoji="🍳", aksen=SUCCESS)

teks(s, MARGIN, Inches(4.35), Inches(11.6), Inches(0.4),
     "Stok tidak bisa diubah lewat form produk. Satu-satunya pintu adalah tombol "
     "Sesuaikan Stok, dengan tiga mode:", ukuran=13, warna=INK_SOFT)

mode = [("Masuk", "barang datang", SUCCESS), ("Keluar", "rusak / terpakai", DANGER),
        ("Opname", "stok diset ke hasil hitung fisik", INFO)]
for i, (j, k, warna) in enumerate(mode):
    kartu(s, MARGIN + i * Inches(3.95), Inches(4.88), Inches(3.6), Inches(1.0),
          j, k, aksen=warna, ukuran_judul=13)

catatan(s, MARGIN, Inches(6.05), Inches(11.6), "Kenapa dibuat serumit itu?",
        "Supaya pertanyaan \"kenapa stok berubah?\" selalu bisa dijawab. Setiap "
        "perubahan menulis satu baris di buku besar stok, lengkap dengan sebabnya.",
        warna=BRAND_500, latar=BRAND_50)
kaki(s)

# --- persediaan
s = slide_baru()
judul_halaman(s, "Persediaan", "Barang yang Anda simpan tapi belum tentu dijual apa adanya.", INFO)

jenis_p = [
    ("Bahan Baku", "Masih harus diolah", "Tepung, gula, biji kopi, cairan pembersih", "🌾", INFO),
    ("Setengah Jadi", "Hasil olahan, dipakai lagi", "Adonan, kaldu, cairan poles siap pakai", "🥣", WARNING),
    ("Barang Jadi", "Siap pakai / siap jual", "Air mineral, kerupuk kemasan, anting steril", "📦", SUCCESS),
]
for i, (j, ringkas, contoh, e, warna) in enumerate(jenis_p):
    kartu(s, MARGIN + i * Inches(3.95), Inches(1.95), Inches(3.6), Inches(2.3),
          j, [ringkas, f"Contoh: {contoh}"], emoji=e, aksen=warna)

daftar(s, MARGIN, Inches(4.6), Inches(11.4), [
    ("Harga bahan memakai rata-rata bergerak.", "Sekali beli mahal tidak melonjakkan HPP semua produk."),
    ("Resep menyambungkan bahan ke produk.", "Isi resep, ubah mode HPP ke \"resep\", dan HPP dihitung otomatis."),
    ("Setiap pembelian menyesuaikan HPP produk terkait.", "Tidak perlu mengubah harga modal satu per satu."),
])
kaki(s)

# --- pembelian
s = slide_baru()
judul_halaman(s, "Pembelian Stok — dan kenapa bukan Beban",
              "Kesalahan pencatatan paling mahal yang bisa dihindari sejak awal.", INFO)

kartu(s, MARGIN, Inches(1.95), Inches(5.6), Inches(2.5), "❌ Kalau dicatat sebagai Beban",
      ["Bulan Anda belanja besar, laba terlihat anjlok. Bulan berikutnya, saat "
       "barangnya laku, laba terlihat melonjak.",
       "Padahal usahanya biasa saja — yang berubah cuma cara mencatat."],
      aksen=DANGER, isi_kartu=RGBColor(0xFE, 0xF2, 0xF2))

kartu(s, MARGIN + Inches(6.0), Inches(1.95), Inches(5.6), Inches(2.5),
      "✓ Dicatat sebagai Pembelian Stok",
      ["Uangnya belum jadi biaya — ia berubah jadi persediaan.",
       "Baru menjadi HPP saat barangnya benar-benar terjual. Laba tiap bulan jadi "
       "mencerminkan yang sungguh terjadi."],
      aksen=SUCCESS, isi_kartu=RGBColor(0xEC, 0xFD, 0xF3))

daftar(s, MARGIN, Inches(4.75), Inches(11.4), [
    ("Satu nota boleh campur.", "Bahan baku dan produk siap jual bisa masuk di nota belanja yang sama."),
    ("Belum lunas? Jadi hutang supplier.", "Isi jatuh temponya, dan pelunasannya dicatat dari menu yang sama."),
    ("Pilih uangnya diambil dari akun mana.", "Kas laci, bank, atau QRIS — supaya saldo tiap akun tetap benar."),
])
kaki(s)


# ============================================================= BAGIAN JASA
pemisah("Usaha Jasa", "Jual pekerjaan, bukan barang. Yang dititipkan pelanggan "
        "harus bisa dilacak sampai diserahkan kembali.", "BAGIAN 2", SUCCESS, "🧰")

# --- alur pesanan
s = slide_baru()
judul_halaman(s, "Alur pesanan jasa", "Empat tahap, dari barang masuk sampai diserahkan.", SUCCESS)
alur(s, MARGIN, Inches(2.0), Inches(11.6), [
    ("Masuk", "Diterima, belum digarap"),
    ("Dikerjakan", "Sedang dikerjakan"),
    ("Selesai", "Siap diambil pelanggan"),
    ("Diambil", "Sudah diserahkan"),
], warna=[INFO, WARNING, SUCCESS, MUTED])

daftar(s, MARGIN, Inches(3.75), Inches(11.4), [
    ("Nilai pesanan tercatat sejak DITERIMA.", "Di titik itu harga sudah disepakati dan barangnya sudah di tangan Anda."),
    ("Uang muka boleh, boleh juga lunas di depan.", "Sisanya otomatis masuk menu Kasbon lengkap dengan jatuh temponya."),
    ("Barang tidak bisa diserahkan kalau masih ada sisa bayar.", "Aplikasi menahannya — melepas barang yang belum lunas harus disengaja."),
    ("Batal? Pesanan di-void, bukan dihapus.", "Nilainya keluar dari omzet dan sisa tagihannya ditutup, tapi jejaknya tetap ada."),
])
kaki(s)

# --- layanan
s = slide_baru()
judul_halaman(s, "Layanan", "Katalog pekerjaan yang Anda jual. Tidak punya stok.", SUCCESS)

kartu(s, MARGIN, Inches(1.95), Inches(5.6), Inches(2.6), "Satuan penagihan",
      ["Pilih yang sesuai cara Anda menagih:",
       "per item · per kg · per jam · per hari · per meter · per m²",
       "Laundry kiloan tinggal isi 3,5 kg — pecahan tidak dibulatkan, jadi laba "
       "tetap tepat."],
      emoji="⚖️", aksen=SUCCESS)

kartu(s, MARGIN + Inches(6.0), Inches(1.95), Inches(5.6), Inches(2.6),
      "Harga bisa diubah saat menerima",
      ["Nyalakan untuk pekerjaan yang harganya baru ketahuan setelah dilihat — "
       "servis, perbaikan, jahit model bebas.",
       "Kalau tidak dinyalakan, harga katalog dipakai apa adanya dan tidak bisa "
       "diubah dari layar penerimaan."],
      emoji="🔧", aksen=WARNING)

kartu(s, MARGIN, Inches(4.75), Inches(5.6), Inches(1.65), "Biaya bahan",
      ["Isi perkiraan bahan pakai per satuan (lem, cairan, anting steril) supaya "
       "margin jasanya jujur, bukan seolah untung 100%."],
      emoji="💧", aksen=INFO)

kartu(s, MARGIN + Inches(6.0), Inches(4.75), Inches(5.6), Inches(1.65),
      "Perkiraan lama kerja",
      ["Dipakai sebagai ancar-ancar saat menentukan janji selesai ke pelanggan."],
      emoji="⏱️", aksen=BRAND_500)
kaki(s)

# --- terima pesanan
s = slide_baru()
judul_halaman(s, "Menerima pesanan", "Yang diisi saat pelanggan datang menitipkan pekerjaan.", SUCCESS)

daftar(s, MARGIN, Inches(2.0), Inches(6.9), [
    ("Pilih pelanggan.", "Wajib kalau belum lunas — kalau tidak, nanti tidak ada yang bisa ditagih."),
    ("Pilih layanan & jumlahnya.", "Boleh beberapa baris dalam satu pesanan."),
    ("Tandai petugasnya.", "Per baris, bukan per pesanan — satu pelanggan bisa dikerjakan dua orang."),
    ("Isi ciri barang.", "\"2 kantong putih\", \"Beat merah B 1234 XY\" — supaya tidak tertukar."),
    ("Tentukan janji selesai.", "Jadi dasar kartu \"Lewat Janji\" di papan antrean."),
    ("Terima uang muka (opsional).", "Pilih akun kasnya; sisanya jadi kasbon."),
], jarak=Inches(0.62), warna_bulat=SUCCESS)

kartu(s, MARGIN + Inches(7.3), Inches(2.0), Inches(4.3), Inches(1.9),
      "Tanda terima WhatsApp",
      ["Setelah tersimpan, aplikasi menawarkan mengirim tanda terima ke pelanggan.",
       "Nota kertas paling sering hilang duluan; pesan WhatsApp tidak."],
      emoji="💬", aksen=SUCCESS)

catatan(s, MARGIN + Inches(7.3), Inches(4.1), Inches(4.3),
        "Kenapa omzet dihitung sejak awal?",
        "Kalau ditunda sampai barang diambil, pekerjaan yang menyeberang bulan akan "
        "hilang dari laporan bulan berjalan.",
        warna=BRAND_500, latar=BRAND_50, h=Inches(1.35))
kaki(s)

# --- papan antrean
s = slide_baru()
judul_halaman(s, "Papan antrean & serah terima", "Semua pekerjaan yang belum selesai ada di satu layar.", SUCCESS)

kartu_papan = [
    ("Antre Dikerjakan", "Masuk + sedang digarap", "⏳", INFO),
    ("Siap Diambil", "Selesai, menunggu pelanggan", "✅", SUCCESS),
    ("Lewat Janji", "Sudah lewat tanggal — kabari", "⚠️", WARNING),
    ("Belum Dilunasi", "Total sisa yang masih ditahan", "💰", DANGER),
]
for i, (j, k, e, warna) in enumerate(kartu_papan):
    kartu(s, MARGIN + i * Inches(2.95), Inches(1.95), Inches(2.7), Inches(1.5),
          j, k, emoji=e, aksen=warna, ukuran_judul=13)

daftar(s, MARGIN, Inches(3.75), Inches(11.4), [
    ("Ketuk kartu pesanan untuk membukanya.", "Rincian pekerjaan, petugas, sisa bayar, dan tombol tahap berikutnya."),
    ("Tombolnya menyesuaikan tahap.", "Mulai Kerjakan → Tandai Selesai → Serahkan."),
    ("Kabari lewat WhatsApp saat selesai.", "Tombolnya muncul sendiri begitu status jadi Selesai."),
    ("Terima pelunasan di layar yang sama.", "Pilih akun kasnya; setelah lunas, tombol Serahkan terbuka."),
])

catatan(s, MARGIN, Inches(6.05), Inches(11.6), "Laporan Pendapatan per Petugas",
        "Karena petugas ditandai per baris pekerjaan, Laporan bisa menampilkan omzet "
        "dan margin tiap orang — dasar yang jelas untuk pembagian komisi.",
        warna=SUCCESS, latar=RGBColor(0xEC, 0xFD, 0xF3))
kaki(s)

# ========================================================= BAGIAN CAMPURAN
pemisah("Usaha Campuran", "Jual barang sekaligus melayani jasa. Semua menu tampil, "
        "dan keduanya masuk ke laporan yang sama.", "BAGIAN 3", WARNING, "🧩")

s = slide_baru()
judul_halaman(s, "Kapan POS, kapan Pesanan Jasa?",
              "Satu aturan sederhana: apakah pelanggan menunggu, atau meninggalkan barangnya?", WARNING)

kartu(s, MARGIN, Inches(1.95), Inches(5.6), Inches(2.45), "Pakai POS",
      ["Pelanggan bayar dan langsung pergi membawa barangnya.",
       "Contoh: beli tempered glass, beli charger, beli gelang.",
       "Stok berkurang saat itu juga."],
      emoji="🛒", aksen=INFO)

kartu(s, MARGIN + Inches(6.0), Inches(1.95), Inches(5.6), Inches(2.45),
      "Pakai Pesanan Jasa",
      ["Ada pekerjaan yang harus digarap dulu, atau barangnya ditinggal.",
       "Contoh: servis ganti LCD, pasang skin, ukir nama.",
       "Masuk papan antrean sampai diserahkan."],
      emoji="🧰", aksen=SUCCESS)

catatan(s, MARGIN, Inches(4.65), Inches(11.6),
        "Pekerjaan cepat yang ditunggu di tempat?",
        "Pasang anti gores selesai dalam lima menit. Catat lewat Pesanan Jasa, isi "
        "lunas di depan, lalu langsung tandai sampai Diambil. Tercatat rapi tanpa "
        "menahan antrean.",
        warna=WARNING)

teks(s, MARGIN, Inches(5.95), Inches(11.6), Inches(0.8),
     "Keduanya masuk ke omzet, laba, arus kas, dan Laporan yang sama — jadi Anda "
     "tidak perlu menjumlahkan dua pembukuan.",
     ukuran=13, warna=INK_SOFT, spasi=1.3)
kaki(s)


# =================================================== BAGIAN DIPAKAI SEMUA
pemisah("Dipakai Semua Usaha", "Kas & Bank, Kasbon, Beban, Laporan, dan "
        "Rekonsiliasi bekerja sama untuk dagang, jasa, maupun campuran.",
        "BAGIAN 4", BRAND_500, "📊")

# --- kas & bank
s = slide_baru()
judul_halaman(s, "Kas & Bank", "Menjawab pertanyaan yang paling sering ditanya: uangnya sekarang ada di mana?")

kartu(s, MARGIN, Inches(1.95), Inches(3.6), Inches(2.0), "Pisahkan tiap dompet",
      ["Kas laci, rekening BCA, rekening BRI, saldo QRIS — masing-masing satu akun, "
       "masing-masing punya saldo sendiri."],
      emoji="🏦", aksen=BRAND_500)

kartu(s, MARGIN + Inches(3.95), Inches(1.95), Inches(3.6), Inches(2.0),
      "Setoran & tarik tunai",
      ["Pindah uang antar akun sendiri dicatat lewat tombol Pindah Uang. Bukan "
       "pemasukan, bukan beban — hanya berpindah tempat."],
      emoji="🔁", aksen=INFO)

kartu(s, MARGIN + Inches(7.9), Inches(1.95), Inches(3.7), Inches(2.0),
      "Mutasi keluar masuk",
      ["Tiap baris berasal dari catatan aslinya: penjualan, belanja, beban, cicilan. "
       "Bisa disaring per akun dan per periode."],
      emoji="📜", aksen=SUCCESS)

daftar(s, MARGIN, Inches(4.35), Inches(11.4), [
    ("Isi saldo awal tiap akun.", "Uang yang sudah ada sebelum memakai Synona. Tanpa ini saldo akhirnya meleset."),
    ("Tandai akun default tiap cara bayar.", "Kasir yang buru-buru tidak perlu memilih akun; uang QRIS langsung masuk ke akun QRIS."),
    ("Saldo minus itu tanda.", "Biasanya ada pengeluaran yang salah akun, atau saldo awal belum diisi."),
])
kaki(s)

# --- kasbon & beban
s = slide_baru()
judul_halaman(s, "Kasbon & Beban", "Dua catatan yang paling sering dilupakan, dan paling mahal akibatnya.")

kartu(s, MARGIN, Inches(1.95), Inches(5.6), Inches(2.7), "Kasbon (piutang pelanggan)",
      ["Semua utang pelanggan berkumpul di sini, termasuk sisa bayar pesanan jasa.",
       "Isi jatuh temponya — yang lewat tempo muncul di Pengingat dan Radar.",
       "Tombol WhatsApp menyiapkan pesan penagihan yang sopan, tinggal kirim."],
      emoji="🧾", aksen=WARNING)

kartu(s, MARGIN + Inches(6.0), Inches(1.95), Inches(5.6), Inches(2.7),
      "Beban & Tagihan",
      ["Listrik, gaji, sewa, internet, transport. Tanpa ini kata \"untung\" bohong.",
       "Tandai \"berulang\" untuk beban bulanan — dipakai menghitung titik impas (BEP).",
       "Beban rutin disebar rata ke seluruh hari, jadi hari gajian tidak terlihat rugi besar."],
      emoji="💡", aksen=DANGER)

catatan(s, MARGIN, Inches(4.95), Inches(11.6), "Ingat bedanya",
        "Belanja stok BUKAN beban — itu masuk menu Pembelian Stok. Beban adalah uang "
        "yang habis dipakai dan tidak berubah jadi barang: listrik, sewa, gaji.",
        warna=BRAND_500, latar=BRAND_50)
kaki(s)

# --- laporan
s = slide_baru()
judul_halaman(s, "Laporan & Kesehatan Usaha", "Angka diterjemahkan jadi status, lengkap dengan alasannya.")

status = [
    ("SEHAT", "Laba bersih positif dan omzet di atas titik impas", SUCCESS, RGBColor(0xEC, 0xFD, 0xF3)),
    ("WASPADA", "Margin tipis, atau omzet masih di bawah titik impas", WARNING, RGBColor(0xFF, 0xFB, 0xEB)),
    ("BAHAYA", "Beban lebih besar daripada laba kotor", DANGER, RGBColor(0xFE, 0xF2, 0xF2)),
]
for i, (j, k, warna, latar) in enumerate(status):
    kartu(s, MARGIN + i * Inches(3.95), Inches(1.95), Inches(3.6), Inches(1.5),
          j, k, aksen=warna, isi_kartu=latar, ukuran_judul=15)

teks(s, MARGIN, Inches(3.7), Inches(11.6), Inches(0.35),
     "Yang bisa Anda baca di satu halaman:", ukuran=13, warna=INK, tebal=True)

isi_laporan = [
    ("Margin kotor & bersih", "Berapa persen dari tiap rupiah penjualan yang benar-benar tinggal"),
    ("Titik impas (BEP) harian", "Omzet minimal per hari supaya tidak rugi"),
    ("Arus kas per akun", "Saldo awal, masuk, keluar, saldo akhir tiap kas dan bank"),
    ("Profitabilitas per produk", "Mana yang laris tapi tipis, mana yang jarang tapi gemuk"),
    ("Pendapatan per petugas", "Untuk usaha jasa — dasar pembagian komisi"),
    ("Perputaran & stok mati", "Barang yang tidak bergerak lebih dari 30 hari"),
]
for i, (j, k) in enumerate(isi_laporan):
    x = MARGIN + (i % 2) * Inches(5.9)
    y = Inches(4.12) + (i // 2) * Inches(0.86)
    kartu(s, x, y, Inches(5.5), Inches(0.76), j, k, aksen=BRAND_400, ukuran_judul=12.5)
kaki(s)

# --- rekonsiliasi + radar
s = slide_baru()
judul_halaman(s, "Rekonsiliasi harian & Radar", "Menutup hari, lalu membuka hari berikutnya dengan daftar kerja.")

kartu(s, MARGIN, Inches(1.95), Inches(5.6), Inches(2.75), "Rekonsiliasi Harian",
      ["Hitung uang fisik di laci, masukkan angkanya, dan aplikasi menunjukkan "
       "selisihnya dengan catatan sistem.",
       "Selisih kecil itu wajar. Yang berbahaya adalah selisih yang tidak pernah "
       "diperiksa — semakin lama semakin sulit dicari sebabnya.",
       "QRIS dipisah dengan perkiraan potongan 0,3% sebagai batas selisih wajar."],
      emoji="⚖️", aksen=INFO)

kartu(s, MARGIN + Inches(6.0), Inches(1.95), Inches(5.6), Inches(2.75),
      "Radar 6 Pertanyaan",
      ["Enam pertanyaan yang dijawab satu angka di dashboard, masing-masing dengan "
       "status dan satu tombol aksi:",
       "Omzet · Untung · Kas · Stok (atau Antrean untuk jasa) · Tagihan · Agenda"],
      emoji="🚦", aksen=BRAND_500)

catatan(s, MARGIN, Inches(5.0), Inches(11.6), "Kebiasaan yang membuat semuanya bekerja",
        "Catat saat kejadian, bukan saat ingat. Lima menit menutup buku tiap malam "
        "jauh lebih murah daripada satu hari penuh mencari selisih di akhir bulan.",
        warna=SUCCESS, latar=RGBColor(0xEC, 0xFD, 0xF3))
kaki(s)


# ================================================================ contoh
def angka_contoh():
    """Angka diambil dari database supaya slide contoh tidak pernah basi."""
    import os
    import sqlite3

    path = os.environ.get("DATABASE_PATH", "./data/synona.db")
    kosong = {k: "—" for k in
              ["produk", "layanan", "persediaan", "pelanggan", "transaksi",
               "pesanan", "pembelian", "beban", "akun", "omzet", "outlet"]}
    if not os.path.exists(path):
        return kosong
    try:
        db = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
        n = lambda q: db.execute(q).fetchone()[0]
        Q_OMZET = ("SELECT COALESCE(SUM(total), 0) FROM transactions "
                   "WHERE status != 'void'")
        rupiah = lambda v: "Rp " + format(v, ",").replace(",", ".")
        ribuan = lambda v: format(v, ",").replace(",", ".")
        hasil = {
            "outlet": n("SELECT name FROM outlets LIMIT 1"),
            "produk": ribuan(n("SELECT COUNT(*) FROM products")),
            "layanan": str(n("SELECT COUNT(*) FROM services")),
            "persediaan": str(n("SELECT COUNT(*) FROM materials")),
            "pelanggan": str(n("SELECT COUNT(*) FROM customers")),
            "transaksi": ribuan(n("SELECT COUNT(*) FROM transactions")),
            "pesanan": str(n("SELECT COUNT(*) FROM service_orders")),
            "pembelian": str(n("SELECT COUNT(*) FROM purchases")),
            "beban": str(n("SELECT COUNT(*) FROM expenses")),
            "akun": str(n("SELECT COUNT(*) FROM cash_accounts")),
            "omzet": rupiah(n(Q_OMZET)),
        }
        db.close()
        return hasil
    except Exception:
        return kosong


a = angka_contoh()

s = slide_baru()
judul_halaman(s, "Data contoh untuk latihan",
              f'Outlet "{a["outlet"]}" — toko aksesoris HP yang juga melayani jasa.')

teks(s, MARGIN, Inches(1.9), Inches(11.6), Inches(0.4),
     "Dipasang lewat terminal:", ukuran=12, warna=INK_SOFT)
kotak(s, MARGIN, Inches(2.22), Inches(11.6), Inches(0.52), isi=INK, radius=0.1)
teks(s, MARGIN + Inches(0.28), Inches(2.34), Inches(11), Inches(0.35),
     "npm run contoh:aksesoris -- --ya", ukuran=13, warna=RGBColor(0xB3, 0xA7, 0xFB))

isi_contoh = [
    ("Produk", a["produk"], "📦"), ("Layanan", a["layanan"], "🧰"),
    ("Persediaan", a["persediaan"], "🌾"), ("Pelanggan", a["pelanggan"], "👥"),
    ("Transaksi", a["transaksi"], "🧾"), ("Pesanan jasa", a["pesanan"], "📋"),
    ("Nota belanja", a["pembelian"], "🚚"), ("Akun kas", a["akun"], "🏦"),
]
for i, (label, nilai, e) in enumerate(isi_contoh):
    x = MARGIN + (i % 4) * Inches(2.95)
    y = Inches(3.05) + (i // 4) * Inches(1.12)
    kotak(s, x, y, Inches(2.7), Inches(0.98), isi=WHITE, garis=LINE, radius=0.1)
    teks(s, x + Inches(0.2), y + Inches(0.17), Inches(0.5), Inches(0.4), e, ukuran=17)
    teks(s, x + Inches(0.78), y + Inches(0.14), Inches(1.8), Inches(0.3),
         nilai, ukuran=17, warna=INK, tebal=True)
    teks(s, x + Inches(0.78), y + Inches(0.53), Inches(1.8), Inches(0.28),
         label, ukuran=10.5, warna=MUTED)

catatan(s, MARGIN, Inches(5.35), Inches(11.6),
        f'Omzet 30 hari terakhir: {a["omzet"]} · jenis usaha: campuran',
        "Karena bertipe campuran, ketiga mode bisa dicoba dari satu data ini: ganti "
        "Jenis Usaha di Pengaturan → Outlet & Staf ke Dagang (menu jasa hilang), "
        "Jasa (menu barang hilang), atau kembali ke Campuran.",
        warna=BRAND_500, latar=BRAND_50)

teks(s, MARGIN, Inches(6.5), Inches(11.6), Inches(0.5),
     "Perintahnya membuat backup otomatis dulu, dan tanpa --ya hanya menampilkan "
     "pratinjau tanpa mengubah apa pun. Akun login tidak ikut terhapus.",
     ukuran=11, warna=MUTED, spasi=1.3)
kaki(s)

# ====================================================== kesalahan umum
s = slide_baru()
judul_halaman(s, "Kesalahan umum — dan cara menghindarinya", "Lima hal yang paling sering membuat angka jadi tidak masuk akal.")

salah = [
    ("Modal produk dikosongkan", "Semua penjualan terlihat untung penuh. Isi HPP-nya, "
     "walau baru perkiraan.", DANGER),
    ("Belanja stok dicatat sebagai Beban", "Laba bulan belanja anjlok, bulan berikutnya "
     "melonjak. Pakai menu Pembelian Stok.", DANGER),
    ("Beban rutin tidak pernah dicatat", "Titik impas tidak bisa dihitung, dan laba "
     "bersih terlihat lebih besar dari kenyataan.", WARNING),
    ("Setoran ke bank tidak dicatat", "Saldo laci dan saldo bank sama-sama salah walau "
     "total uangnya benar. Pakai Pindah Uang.", WARNING),
    ("Pesanan jasa diserahkan tanpa dilunasi", "Aplikasi menahannya. Kalau memang mau "
     "dilepas, terima pelunasannya dulu atau catat sisanya sebagai kasbon.", INFO),
]
for i, (j, k, warna) in enumerate(salah):
    y = Inches(1.9) + i * Inches(1.02)
    kartu(s, MARGIN, y, Inches(11.6), Inches(0.92), j, k, aksen=warna,
          ukuran_judul=13.5)
kaki(s)

# ============================================================== penutup
s = slide_baru(INK)
kotak(s, 0, 0, W, H, isi=INK)
kotak(s, Inches(-2.2), Inches(3.4), Inches(6.6), Inches(6.6), isi=BRAND_600, radius=0.5)
kotak(s, Inches(9.6), Inches(-1.8), Inches(6.2), Inches(6.2), isi=BRAND_500, radius=0.5)

teks(s, Inches(3.4), Inches(2.5), Inches(6.5), Inches(1.4),
     "Selamat mencoba", ukuran=44, warna=WHITE, tebal=True, rata=PP_ALIGN.CENTER)
teks(s, Inches(3.4), Inches(3.75), Inches(6.5), Inches(1.3),
     "Mulai dari satu kebiasaan: catat saat kejadian, bukan saat ingat. "
     "Sisanya dikerjakan Synona.",
     ukuran=15, warna=BRAND_100, rata=PP_ALIGN.CENTER, spasi=1.4)
teks(s, Inches(3.4), Inches(5.15), Inches(6.5), Inches(0.5),
     "Kelola usaha, makin untung.", ukuran=13, warna=BRAND_300,
     rata=PP_ALIGN.CENTER)

# ================================================================ simpan
import os
os.makedirs("docs", exist_ok=True)
TUJUAN = "docs/Panduan-Pengguna-Synona.pptx"
prs.save(TUJUAN)
print(f"✓ {TUJUAN} — {len(prs.slides.__iter__.__self__._sldIdLst)} slide")
