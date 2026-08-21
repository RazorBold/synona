export const JENIS_GAMBAR = ["image/webp", "image/jpeg", "image/png"];
export const MAKS_UKURAN_BYTE = 2 * 1024 * 1024; // 2 MB setelah kompresi
export const MAKS_SISI = 720; // px

/** Nama berkas yang sah: hasil nanoid + ekstensi yang kita tulis sendiri. */
export const POLA_NAMA_GAMBAR = /^[A-Za-z0-9_-]{1,32}\.(webp|jpe?g|png)$/;

/** Nama berkas di database diubah menjadi URL yang bisa dibuka browser. */
export function urlGambar(nama: string | null | undefined): string | null {
  if (!nama) return null;
  return `/api/gambar/${nama}`;
}

/**
 * Mengecilkan foto di HP sebelum diunggah.
 *
 * Foto kamera HP bisa 3–5 MB; mengunggahnya apa adanya boros kuota pemilik
 * warung dan menembus batas body Server Action. Di sini foto diperkecil ke
 * sisi terpanjang 720px dan dikompres ke WebP (~40–90 KB).
 */
export async function kompresGambar(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);

  const skala = Math.min(1, MAKS_SISI / Math.max(bitmap.width, bitmap.height));
  const lebar = Math.round(bitmap.width * skala);
  const tinggi = Math.round(bitmap.height * skala);

  const kanvas = document.createElement("canvas");
  kanvas.width = lebar;
  kanvas.height = tinggi;

  const ctx = kanvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, lebar, tinggi);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    kanvas.toBlob(resolve, "image/webp", 0.82),
  );

  // Browser lama bisa saja tidak mendukung WebP — pakai berkas asli.
  if (!blob) return file;

  return new File([blob], "produk.webp", { type: "image/webp" });
}
