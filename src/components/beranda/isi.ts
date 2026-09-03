import {
  ClipboardList,
  Landmark,
  LineChart,
  Package,
  Receipt,
  ScanLine,
  ShoppingCart,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Isi halaman depan, ditulis sekali dan dipakai oleh susunan layar besar
 * maupun layar kecil — dua tata letak itu berbeda cukup jauh untuk digabung,
 * tapi kalimatnya tidak boleh berbeda.
 */

export const KARTU: {
  judul: [string, string];
  isi: string;
  warna: string;
  icon: LucideIcon;
}[] = [
  {
    judul: ["Penjualan", "& Pesanan"],
    isi: "POS untuk barang, papan antrean untuk jasa.",
    warna: "bg-kartu-biru",
    icon: ShoppingCart,
  },
  {
    judul: ["Stok Selalu", "Terhitung"],
    isi: "Berkurang sendiri tiap kali ada penjualan.",
    warna: "bg-kartu-hijau",
    icon: Package,
  },
  {
    judul: ["Laporan yang", "Menjawab"],
    isi: "Sehat, waspada, atau bahaya — beserta alasannya.",
    warna: "bg-kartu-merah",
    icon: LineChart,
  },
];

export const JENIS = [
  {
    emoji: "🏪",
    nama: "Dagang / Ritel",
    isi: "Jual barang yang stoknya dihitung. Tiap penjualan mengurangi stok dan mencatat modalnya sekaligus.",
    contoh: "Warung sembako · toko aksesoris · minimarket",
    warna: "text-kartu-biru",
  },
  {
    emoji: "🧰",
    nama: "Jasa",
    isi: "Jual pekerjaan, bukan barang. Yang dititipkan pelanggan terlacak sampai diserahkan kembali.",
    contoh: "Laundry · bengkel · salon · servis HP · penjahit",
    warna: "text-kartu-hijau",
  },
  {
    emoji: "🧩",
    nama: "Campuran",
    isi: "Jual barang sekaligus melayani jasa. Keduanya masuk ke laporan yang sama.",
    contoh: "Bengkel + sparepart · salon + produk perawatan",
    warna: "text-kartu-merah",
  },
];

export const FITUR: { judul: string; isi: string; icon: LucideIcon }[] = [
  {
    judul: "Kas & Bank",
    isi: "Uang laci, tiap rekening, dan saldo QRIS punya saldonya sendiri. Setoran antar akun ikut tercatat.",
    icon: Landmark,
  },
  {
    judul: "Utang & Kasbon",
    isi: "Piutang pelanggan dan hutang supplier lengkap dengan jatuh tempo, plus pesan penagihan siap kirim.",
    icon: Receipt,
  },
  {
    judul: "Pembelian Stok",
    isi: "Belanja ke supplier dicatat sebagai persediaan, bukan beban — jadi laba bulanan tidak naik-turun palsu.",
    icon: Wallet,
  },
  {
    judul: "Papan Antrean",
    isi: "Masuk, dikerjakan, selesai, diambil. Barang tidak bisa diserahkan selama masih ada sisa bayar.",
    icon: ClipboardList,
  },
  {
    judul: "Rekonsiliasi Harian",
    isi: "Cocokkan uang fisik di laci dengan catatan sistem selagi ingatannya masih segar.",
    icon: ScanLine,
  },
  {
    judul: "Radar 6 Pertanyaan",
    isi: "Omzet, untung, kas, stok, tagihan, agenda — masing-masing satu angka dan satu tombol aksi.",
    icon: LineChart,
  },
];

export const LANGKAH = [
  {
    nomor: "01",
    judul: "Pilih jenis usaha",
    isi: "Dagang, jasa, atau campuran. Menu menyesuaikan sendiri supaya layarnya tidak penuh hal yang tidak Anda pakai.",
  },
  {
    nomor: "02",
    judul: "Catat seperti biasa",
    isi: "Jual lewat POS atau terima pesanan. Stok, modal, kas, dan utang ikut terisi tanpa dicatat ulang.",
  },
  {
    nomor: "03",
    judul: "Baca jawabannya",
    isi: "Laporan menerjemahkan angka jadi status dan satu daftar kerja untuk besok.",
  },
];
