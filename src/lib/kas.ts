/**
 * Kosakata kas & bank yang dipakai server maupun klien.
 *
 * Ditaruh di lib, bukan di query, karena modul query menandai dirinya
 * `server-only` — komponen klien tidak boleh mengimpornya.
 */

export type JenisAkun = "kas" | "bank" | "ewallet";

export const LABEL_JENIS_AKUN: Record<JenisAkun, string> = {
  kas: "Kas tunai",
  bank: "Rekening bank",
  ewallet: "Dompet digital",
};

export type KategoriMutasi =
  | "penjualan"
  | "cicilan_piutang"
  | "transfer_masuk"
  | "transfer_keluar"
  | "pembelian"
  | "pelunasan_hutang"
  | "beban";

export const LABEL_KATEGORI: Record<KategoriMutasi, string> = {
  penjualan: "Penjualan",
  cicilan_piutang: "Cicilan kasbon",
  transfer_masuk: "Transfer masuk",
  transfer_keluar: "Transfer keluar",
  pembelian: "Pembelian stok",
  pelunasan_hutang: "Bayar hutang",
  beban: "Beban",
};

export type MetodeBayar = "cash" | "qris" | "transfer" | "other";

/**
 * Kolom `method` lama masih dibaca rekonsiliasi harian dan laporan, jadi
 * tetap diisi — diturunkan dari jenis akun yang dipilih supaya keduanya
 * tidak pernah bertentangan.
 */
export function metodeAkun(jenis: JenisAkun | undefined): MetodeBayar {
  return jenis === "bank" ? "transfer" : jenis === "ewallet" ? "qris" : "cash";
}
