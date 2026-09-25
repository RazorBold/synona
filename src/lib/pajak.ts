/**
 * Pajak penjualan per outlet (PPh final UMKM, PPN, pajak daerah).
 *
 * Tarif disimpan sebagai basis poin: 50 bp = 0,5%; 1100 bp = 11%. Alasannya
 * tarif pecahan seperti 0,5% tidak bisa disimpan sebagai persen bulat, dan
 * menyimpannya sebagai pecahan desimal membuka pintu galat pembulatan.
 */
export type ModePajak = "termasuk" | "tambah";

export type PengaturanPajak = {
  nama: string | null;
  bp: number;
  mode: ModePajak;
};

export const PAJAK_MATI: PengaturanPajak = { nama: null, bp: 0, mode: "termasuk" };

export function pajakAktif(p: PengaturanPajak): boolean {
  return Boolean(p.nama) && p.bp > 0;
}

/** Nilai pajak dari sebuah total penjualan (setelah diskon). */
export function hitungPajak(total: number, p: PengaturanPajak): number {
  if (!pajakAktif(p)) return 0;
  return Math.round((total * p.bp) / 10_000);
}

/** 50 → "0,5%" ; 1100 → "11%" */
export function persenPajak(bp: number): string {
  return `${(bp / 100).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;
}

/** "PPh 0,5%" — label singkat untuk nota dan layar bayar. */
export function labelPajak(p: PengaturanPajak): string {
  return `${p.nama ?? "Pajak"} ${persenPajak(p.bp)}`;
}

/** Yang harus dibayar pembeli: pajak "tambah" menambah tagihan, "termasuk" tidak. */
export function totalDibayar(total: number, pajak: number, mode: ModePajak): number {
  return mode === "tambah" ? total + pajak : total;
}

export const BP_MAKS = 5_000; // 50% — pagar terhadap salah ketik
