/**
 * Isi satu nota penjualan — dipakai bersama oleh printer thermal (ESC/POS),
 * halaman nota digital (/nota/[id]) yang dituju QR code, dan pratinjau.
 */
export type BarisNota = {
  nama: string;
  /** "2" untuk barang, "3,5 kg" untuk jasa. */
  jumlah: string;
  /** Harga satuan; null untuk baris jasa yang harganya sudah per baris. */
  harga: number | null;
  /** Nilai sebelum diskon. */
  kotor: number;
  diskon: number;
  total: number;
};

export type DataNota = {
  id: string;
  invoiceNo: string;
  toko: { nama: string; alamat: string | null; telepon: string | null };
  /** Sudah diformat di zona waktu outlet, mis. "19/09/2026 14:03". */
  waktu: string;
  pelanggan: string | null;
  baris: BarisNota[];
  subtotal: number;
  diskon: number;
  /** Penjualan bersih setelah diskon, sebelum pajak "tambah". */
  total: number;
  /** Pajak penjualan; 0 kalau outletnya tidak memungut. */
  pajak: number;
  labelPajak: string | null;
  modePajak: "termasuk" | "tambah" | null;
  /** Yang dibayar pembeli: total + pajak "tambah". */
  tagihan: number;
  metode: "cash" | "qris" | "transfer" | "debt" | "other";
  dibayar: number;
  kembalian: number;
  status: "paid" | "debt" | "void";
  jatuhTempo: string | null;
  /** Tanda tangan untuk tautan nota digital publik. */
  kunci: string;
};

export const LABEL_METODE_NOTA: Record<DataNota["metode"], string> = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer",
  debt: "Kasbon",
  other: "Lainnya",
};

/** Angka tanpa "Rp", titik ribuan: 12500 → "12.500". */
export function angkaNota(n: number): string {
  const s = Math.abs(n).toLocaleString("id-ID");
  return n < 0 ? `-${s}` : s;
}

export function tautanNota(origin: string, d: Pick<DataNota, "id" | "kunci">) {
  return `${origin.replace(/\/$/, "")}/nota/${d.id}?k=${d.kunci}`;
}

/* ------------------------------------------------ tata letak teks polos */

/**
 * Printer thermal hanya paham ASCII di code page bawaannya. Huruf beraksen
 * dilepas aksennya, sisanya (emoji, huruf non-Latin) diganti "?" supaya
 * tidak tercetak sebagai sampah.
 */
export function asciiNota(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7e]/g, "?");
}

/** Kiri dan kanan dalam satu baris selebar `lebar` karakter. */
export function kiriKanan(kiri: string, kanan: string, lebar: number): string {
  const ruang = lebar - kanan.length - 1;
  const k = kiri.length > ruang ? kiri.slice(0, Math.max(0, ruang)) : kiri;
  return k + " ".repeat(Math.max(1, lebar - k.length - kanan.length)) + kanan;
}

/** Memecah teks panjang per kata supaya tidak terpotong di tengah kata. */
export function bungkus(teks: string, lebar: number): string[] {
  const hasil: string[] = [];
  let baris = "";
  for (const kata of teks.split(/\s+/).filter(Boolean)) {
    if (kata.length > lebar) {
      if (baris) hasil.push(baris);
      for (let i = 0; i < kata.length; i += lebar) hasil.push(kata.slice(i, i + lebar));
      baris = "";
      continue;
    }
    if (!baris) baris = kata;
    else if (baris.length + 1 + kata.length <= lebar) baris += ` ${kata}`;
    else {
      hasil.push(baris);
      baris = kata;
    }
  }
  if (baris) hasil.push(baris);
  return hasil;
}
