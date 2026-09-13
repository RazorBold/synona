import { redirect } from "next/navigation";

/**
 * Menu Produksi sudah dihapus dari aplikasi. Rute ini dipertahankan hanya
 * supaya bookmark atau tautan lama tidak berakhir di halaman 404 — pengunjung
 * diantar ke Persediaan, tempat bahan baku dan packaging sekarang dikelola.
 *
 * Tabel `productions` dan riwayatnya TIDAK dihapus: produksi yang pernah
 * dicatat tetap memengaruhi stok dan HPP yang sudah ada.
 */
export default function ProduksiPage() {
  redirect("/persediaan");
}
