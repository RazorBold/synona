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
