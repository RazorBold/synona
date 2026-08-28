/**
 * Pembungkus pemanggilan server action di sisi klien.
 *
 * Server action bisa MELEMPAR, bukan cuma mengembalikan `{ ok: false }`:
 * sesi habis (middleware menjawab 401), jaringan putus, atau galat tak
 * terduga di server. Tanpa pembungkus ini, promise-nya ditolak, baris
 * `setPending(false)` di bawahnya tidak pernah jalan, dan tombolnya berputar
 * selamanya tanpa pesan apa pun — pengguna tidak tahu datanya tersimpan atau
 * tidak.
 *
 * Dengan `aman()`, kegagalan seperti itu berubah menjadi hasil `ok: false`
 * biasa, sehingga penanganan galat yang sudah ada di tiap komponen langsung
 * memakainya.
 */

export const PESAN_GAGAL_UMUM =
  "Gagal menghubungi server. Periksa koneksi, lalu coba lagi.";

const PESAN_SESI_HABIS =
  "Sesi Anda sudah berakhir. Muat ulang halaman ini, lalu masuk kembali.";

export async function aman<T extends { ok: boolean }>(
  janji: Promise<T>,
): Promise<T | { ok: false; error: string }> {
  try {
    return await janji;
  } catch (e) {
    return { ok: false, error: terjemahkan(e) };
  }
}

/**
 * `redirect()` di dalam server action bekerja DENGAN cara melempar. Kalau
 * pengalihan itu ikut ditangkap dan diubah jadi pesan galat, alur seperti
 * login dan simpan-lalu-pindah-halaman akan rusak — jadi lemparannya
 * diteruskan apa adanya.
 */
function terjemahkan(e: unknown): string {
  if (typeof e === "object" && e !== null) {
    const digest = (e as { digest?: unknown }).digest;
    if (typeof digest === "string") {
      if (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND") throw e;
    }
    const pesan = (e as { message?: unknown }).message;
    if (typeof pesan === "string" && pesan.includes("TIDAK_TERAUTENTIKASI")) {
      return PESAN_SESI_HABIS;
    }
  }
  return PESAN_GAGAL_UMUM;
}
