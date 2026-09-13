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
  icon: LucideIcon;
  tema: "biru" | "hijau" | "merah";
  aksi: string;
  /** Tujuan setelah masuk — /masuk meneruskannya lewat `?lanjut=`. */
  tujuan: string;
}[] = [
  {
    judul: ["Penjualan &", "Pesanan"],
    isi: "Catat transaksi, kelola pesanan, dan pantau penjualan harian dengan mudah.",
    icon: ShoppingCart,
    tema: "biru",
    aksi: "Kelola Penjualan",
    tujuan: "/kasir",
  },
  {
    judul: ["Stok Selalu", "Terhitung"],
    isi: "Pantau stok barang dan bahan baku secara real-time. Dapat pengingat saat stok menipis.",
    icon: Package,
    tema: "hijau",
    aksi: "Kelola Stok",
    tujuan: "/produk",
  },
  {
    judul: ["Laporan yang", "Menjawab"],
    isi: "Lihat laporan penjualan, laba rugi, stok, dan arus kas dalam tampilan yang mudah dipahami.",
    icon: LineChart,
    tema: "merah",
    aksi: "Lihat Laporan",
    tujuan: "/laporan",
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
