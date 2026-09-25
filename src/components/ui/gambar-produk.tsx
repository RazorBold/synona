import { lebarThumbnail, urlGambar } from "@/lib/gambar";
import { cn } from "@/lib/utils";

/**
 * Thumbnail produk: pakai foto bila ada, kalau tidak jatuh ke emoji.
 * Dipakai di daftar produk, POS, keranjang, dan kartu stok menipis.
 *
 * Dua hal yang disengaja:
 * - `object-contain`, bukan `cover`. Foto kemasan produk sering berbentuk
 *   tinggi atau lebar; memotongnya membuat merek dan ukuran kemasan hilang,
 *   padahal itulah yang dilihat kasir saat memilih barang.
 * - Server mengirim versi kecil sesuai `perluLebar` (plus varian 2x untuk
 *   layar rapat). Satu kartu POS hanya butuh ±200px; foto aslinya 720px.
 */
export function GambarProduk({
  gambar,
  emoji,
  nama,
  className,
  ukuranEmoji = "text-lg",
  perluLebar = 48,
  prioritas = false,
}: {
  gambar: string | null;
  emoji: string | null;
  nama: string;
  className?: string;
  ukuranEmoji?: string;
  /** Perkiraan lebar tampil dalam piksel CSS. Bawaannya thumbnail kecil
   * (daftar, keranjang); kartu besar seperti POS meminta lebih. */
  perluLebar?: number;
  /** Foto yang terlihat tanpa menggulir — jangan ditunda pemuatannya. */
  prioritas?: boolean;
}) {
  const satuX = lebarThumbnail(perluLebar);
  const duaX = lebarThumbnail(perluLebar * 2);
  const src = urlGambar(gambar, satuX);

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-xl bg-canvas",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          srcSet={duaX !== satuX ? `${src} 1x, ${urlGambar(gambar, duaX)} 2x` : undefined}
          alt={nama}
          loading={prioritas ? "eager" : "lazy"}
          decoding="async"
          // Dekode di luar thread utama saat digulir cepat; `sync` hanya untuk
          // yang memang harus tampil segera.
          fetchPriority={prioritas ? "high" : "low"}
          className="size-full object-contain"
        />
      ) : (
        <span className={ukuranEmoji}>{emoji ?? "📦"}</span>
      )}
    </span>
  );
}
