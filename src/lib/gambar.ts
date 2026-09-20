export const JENIS_GAMBAR = ["image/webp", "image/jpeg", "image/png"];
export const MAKS_UKURAN_BYTE = 2 * 1024 * 1024; // 2 MB setelah kompresi
export const MAKS_SISI = 720; // px

/** Nama berkas yang sah: hasil nanoid + ekstensi yang kita tulis sendiri. */
export const POLA_NAMA_GAMBAR = /^[A-Za-z0-9_-]{1,32}\.(webp|jpe?g|png)$/;

/**
 * Lebar thumbnail yang boleh diminta ke /api/gambar. Daftarnya dibatasi
 * supaya orang tidak bisa menyuruh server membuat ribuan ukuran berbeda —
 * tiap ukuran baru berarti satu kerja resize dan satu berkas cache.
 */
export const LEBAR_THUMBNAIL = [96, 192, 384, 768] as const;
export type LebarThumbnail = (typeof LEBAR_THUMBNAIL)[number];

/**
 * Nama berkas di database diubah menjadi URL yang bisa dibuka browser.
 * `lebar` meminta versi kecil: kartu POS hanya butuh ±200px, jadi mengirim
 * foto asli 720px ke sana memboroskan kuota pemilik warung berkali lipat.
 */
export function urlGambar(
  nama: string | null | undefined,
  lebar?: LebarThumbnail,
): string | null {
  if (!nama) return null;
  return lebar ? `/api/gambar/${nama}?l=${lebar}` : `/api/gambar/${nama}`;
}

/** Ukuran thumbnail terkecil yang masih >= lebar tampilan. */
export function lebarThumbnail(perlu: number): LebarThumbnail {
  return LEBAR_THUMBNAIL.find((l) => l >= perlu) ?? LEBAR_THUMBNAIL[LEBAR_THUMBNAIL.length - 1];
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
