import { formatRupiah } from "./money";

/** "08123…" / "+62 812…" → "62812…" */
export function normalisasiNomorHp(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

/** Membuka WhatsApp pemilik dengan pesan terisi — tanpa WhatsApp Business API. */
export function buildWaLink(phone: string, message: string): string {
  return `https://wa.me/${normalisasiNomorHp(phone)}?text=${encodeURIComponent(
    message,
  )}`;
}

export function pesanPengingatUtang(opts: {
  nama: string;
  toko: string;
  sisa: number;
  jatuhTempo?: string | null;
  tegas?: boolean;
}): string {
  const sisa = formatRupiah(opts.sisa);
  if (opts.tegas && opts.jatuhTempo) {
    return `Halo kak ${opts.nama}, kasbon di ${opts.toko} sebesar ${sisa} sudah melewati ${opts.jatuhTempo}. Mohon diselesaikan ya. Jika sudah bayar abaikan pesan ini 🙏`;
  }
  return `Halo kak ${opts.nama} 🙏 Sekadar mengingatkan, kasbon di ${opts.toko} saat ini ${sisa}. Kalau sudah sempat boleh diselesaikan ya. Terima kasih 😊`;
}

export function pesanStruk(opts: {
  nama: string;
  toko: string;
  item: { nama: string; qty: number; total: number }[];
  total: number;
  metode: string;
}): string {
  const rincian = opts.item
    .map((i) => `${i.nama} x${i.qty} = ${formatRupiah(i.total)}`)
    .join(", ");
  return `Halo kak ${opts.nama} 🙏 Terima kasih sudah belanja di ${opts.toko}. Rincian: ${rincian}. Total: ${formatRupiah(opts.total)} (${opts.metode}).`;
}

/** Nota tanda terima jasa — pengganti kertas yang gampang hilang. */
export function pesanTandaTerima(opts: {
  nama: string;
  toko: string;
  nomor: string;
  item: { nama: string; total: number }[];
  total: number;
  dibayar: number;
  sisa: number;
  janjiSelesai?: string | null;
}): string {
  const rincian = opts.item
    .map((i) => `• ${i.nama} = ${formatRupiah(i.total)}`)
    .join("\n");

  const bayar =
    opts.sisa > 0
      ? `Dibayar: ${formatRupiah(opts.dibayar)}\nSisa saat diambil: ${formatRupiah(opts.sisa)}`
      : `Lunas: ${formatRupiah(opts.total)}`;

  const janji = opts.janjiSelesai
    ? `\nPerkiraan selesai: ${opts.janjiSelesai}`
    : "";

  return `Halo kak ${opts.nama} 🙏 Terima kasih sudah mempercayakan pekerjaannya ke ${opts.toko}.\n\nNo. pesanan: ${opts.nomor}\n${rincian}\n\nTotal: ${formatRupiah(opts.total)}\n${bayar}${janji}\n\nSimpan pesan ini sebagai tanda terima ya 😊`;
}

/** Kabar bahwa pekerjaan sudah selesai dan barangnya bisa diambil. */
export function pesanSiapDiambil(opts: {
  nama: string;
  toko: string;
  nomor: string;
  sisa: number;
}): string {
  const sisa =
    opts.sisa > 0
      ? ` Sisa pembayaran ${formatRupiah(opts.sisa)} bisa dilunasi saat pengambilan.`
      : " Pembayarannya sudah lunas.";
  return `Halo kak ${opts.nama} 😊 Pesanan ${opts.nomor} di ${opts.toko} sudah selesai dan siap diambil.${sisa} Terima kasih 🙏`;
}
