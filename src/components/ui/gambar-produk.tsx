import { urlGambar } from "@/lib/gambar";
import { cn } from "@/lib/utils";

/**
 * Thumbnail produk: pakai foto bila ada, kalau tidak jatuh ke emoji.
 * Dipakai di daftar produk, POS, keranjang, dan kartu stok menipis.
 */
export function GambarProduk({
  gambar,
  emoji,
  nama,
  className,
  ukuranEmoji = "text-lg",
}: {
  gambar: string | null;
  emoji: string | null;
  nama: string;
  className?: string;
  ukuranEmoji?: string;
}) {
  const src = urlGambar(gambar);

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
          alt={nama}
          loading="lazy"
          className="size-full object-cover"
        />
      ) : (
        <span className={ukuranEmoji}>{emoji ?? "📦"}</span>
      )}
    </span>
  );
}
