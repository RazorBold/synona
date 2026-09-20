import qrcode from "qrcode-generator";

import {
  LABEL_METODE_NOTA,
  angkaNota,
  asciiNota,
  bungkus,
  kiriKanan,
  type DataNota,
} from "@/lib/nota";

/**
 * Penyusun perintah ESC/POS untuk printer thermal 58 mm / 80 mm.
 *
 * QR code dicetak sebagai GAMBAR raster (GS v 0), bukan perintah QR bawaan
 * printer (GS ( k): printer Bluetooth murah banyak yang tidak mengenal
 * perintah QR, tapi hampir semuanya bisa mencetak gambar raster.
 */
export type LebarKertas = 58 | 80;

export const KOLOM: Record<LebarKertas, number> = { 58: 32, 80: 48 };

const ESC = 0x1b;
const GS = 0x1d;

export class Escpos {
  private potongan: number[] = [];

  constructor() {
    this.bytes(ESC, 0x40); // reset
  }

  bytes(...b: number[]) {
    this.potongan.push(...b);
    return this;
  }

  teks(s: string) {
    for (const ch of asciiNota(s)) this.potongan.push(ch.charCodeAt(0));
    return this;
  }

  baris(s = "") {
    return this.teks(s).bytes(0x0a);
  }

  rata(r: "kiri" | "tengah" | "kanan") {
    return this.bytes(ESC, 0x61, r === "kiri" ? 0 : r === "tengah" ? 1 : 2);
  }

  tebal(on: boolean) {
    return this.bytes(ESC, 0x45, on ? 1 : 0);
  }

  /** Ukuran huruf: 1 = normal, 2 = dua kali tinggi & lebar. */
  besar(kali: 1 | 2) {
    return this.bytes(GS, 0x21, kali === 2 ? 0x11 : 0x00);
  }

  maju(n = 1) {
    return this.bytes(ESC, 0x64, n);
  }

  potong() {
    return this.bytes(GS, 0x56, 0x42, 0x00);
  }

  /** Gambar 1-bit: `gelap(x, y)` true = titik hitam. */
  raster(lebar: number, tinggi: number, gelap: (x: number, y: number) => boolean) {
    const perBaris = Math.ceil(lebar / 8);
    this.bytes(GS, 0x76, 0x30, 0x00, perBaris & 0xff, perBaris >> 8, tinggi & 0xff, tinggi >> 8);
    for (let y = 0; y < tinggi; y++) {
      for (let bx = 0; bx < perBaris; bx++) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          const x = bx * 8 + bit;
          if (x < lebar && gelap(x, y)) byte |= 0x80 >> bit;
        }
        this.potongan.push(byte);
      }
    }
    return this;
  }

  qr(isi: string, skala: number) {
    const q = qrcode(0, "M");
    q.addData(isi);
    q.make();
    const n = q.getModuleCount();
    const tepi = 2;
    const sisi = (n + tepi * 2) * skala;
    return this.raster(sisi, sisi, (x, y) => {
      const c = Math.floor(x / skala) - tepi;
      const r = Math.floor(y / skala) - tepi;
      return r >= 0 && c >= 0 && r < n && c < n && q.isDark(r, c);
    });
  }

  hasil(): Uint8Array {
    return Uint8Array.from(this.potongan);
  }
}

export type OpsiNota = {
  lebar: LebarKertas;
  /** Tautan nota digital untuk QR code; null = tanpa QR. */
  tautan: string | null;
  catatanKaki: string;
};

export function susunNotaEscpos(d: DataNota, o: OpsiNota): Uint8Array {
  const w = KOLOM[o.lebar];
  const garis = "-".repeat(w);
  const p = new Escpos();

  // ---- kepala: nama toko besar, alamat & telepon
  p.rata("tengah").tebal(true).besar(2);
  for (const b of bungkus(d.toko.nama, Math.floor(w / 2))) p.baris(b);
  p.besar(1).tebal(false);
  if (d.toko.alamat) for (const b of bungkus(d.toko.alamat, w)) p.baris(b);
  if (d.toko.telepon) p.baris(`Telp. ${d.toko.telepon}`);

  p.rata("kiri").baris(garis);
  p.baris(kiriKanan("No", d.invoiceNo, w));
  p.baris(kiriKanan("Waktu", d.waktu, w));
  if (d.pelanggan) p.baris(kiriKanan("Pelanggan", d.pelanggan, w));
  p.baris(garis);

  // ---- barang
  for (const b of d.baris) {
    for (const nama of bungkus(b.nama, w)) p.baris(nama);
    const rincian = b.harga !== null ? `  ${b.jumlah} x ${angkaNota(b.harga)}` : `  ${b.jumlah}`;
    p.baris(kiriKanan(rincian, angkaNota(b.kotor), w));
    if (b.diskon > 0) p.baris(kiriKanan("  Diskon", angkaNota(-b.diskon), w));
  }
  p.baris(garis);

  // ---- ringkasan
  p.baris(kiriKanan("Subtotal", angkaNota(d.subtotal), w));
  if (d.diskon > 0) p.baris(kiriKanan("Total diskon", angkaNota(-d.diskon), w));
  if (d.pajak > 0 && d.modePajak === "tambah") {
    p.baris(kiriKanan(d.labelPajak ?? "Pajak", angkaNota(d.pajak), w));
  }
  p.tebal(true).baris(kiriKanan("TOTAL", `Rp ${angkaNota(d.tagihan)}`, w)).tebal(false);
  if (d.pajak > 0 && d.modePajak === "termasuk") {
    p.baris(kiriKanan(`Termasuk ${d.labelPajak ?? "pajak"}`, angkaNota(d.pajak), w));
  }

  if (d.status === "debt") {
    p.baris(kiriKanan("Pembayaran", "KASBON", w));
    if (d.jatuhTempo) p.baris(kiriKanan("Jatuh tempo", d.jatuhTempo, w));
  } else {
    p.baris(kiriKanan(LABEL_METODE_NOTA[d.metode], angkaNota(d.dibayar), w));
    if (d.kembalian > 0) p.baris(kiriKanan("Kembali", angkaNota(d.kembalian), w));
  }
  if (d.status === "void") p.rata("tengah").tebal(true).baris("*** DIBATALKAN ***").tebal(false);
  p.rata("kiri").baris(garis);

  // ---- QR nota digital + penutup
  p.rata("tengah");
  if (o.tautan) {
    p.qr(o.tautan, o.lebar === 80 ? 7 : 5);
    p.baris("Pindai untuk nota digital");
  }
  p.maju(1);
  for (const b of bungkus(o.catatanKaki || "Terima kasih atas kunjungan Anda", w)) p.baris(b);
  p.maju(1).tebal(true).baris("SYNONA").tebal(false).baris("Kelola usaha, lebih mudah");
  p.maju(4).potong();

  return p.hasil();
}

/** Nota uji untuk halaman pengaturan printer. */
export function susunNotaUji(
  lebar: LebarKertas,
  nama: string,
  tautan: string,
): Uint8Array {
  const w = KOLOM[lebar];
  const p = new Escpos();
  p.rata("tengah").tebal(true).besar(2).baris("SYNONA").besar(1).tebal(false);
  p.baris("Tes printer berhasil");
  p.baris(nama);
  p.rata("kiri").baris("-".repeat(w));
  p.baris(kiriKanan("Kertas", `${lebar} mm (${w} kolom)`, w));
  p.baris("0123456789".repeat(Math.ceil(w / 10)).slice(0, w));
  p.baris("-".repeat(w)).rata("tengah");
  p.qr(tautan, lebar === 80 ? 7 : 5);
  p.baris("QR code terbaca = siap");
  p.maju(4).potong();
  return p.hasil();
}
