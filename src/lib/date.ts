import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export const TZ = "Asia/Jakarta";

/** Tanggal bisnis (YYYY-MM-DD) menurut zona waktu outlet, bukan UTC. */
export function businessDate(date: Date = new Date(), tz = TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** "2026-08-13" → "Selasa, 13 Agustus 2026" */
export function formatTanggalPanjang(isoDate: string): string {
  return format(new Date(`${isoDate}T00:00:00`), "EEEE, d MMMM yyyy", {
    locale: localeId,
  });
}

/** "2026-08-13" → "13 Agu" */
export function formatTanggalPendek(isoDate: string): string {
  return format(new Date(`${isoDate}T00:00:00`), "d MMM", { locale: localeId });
}

export function tambahHari(isoDate: string, jumlah: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + jumlah);
  return format(d, "yyyy-MM-dd");
}

/** Daftar N tanggal terakhir termasuk `sampai`, urut menaik. */
export function rentangHari(sampai: string, jumlah: number): string[] {
  return Array.from({ length: jumlah }, (_, i) =>
    tambahHari(sampai, i - (jumlah - 1)),
  );
}

/** Selisih hari (positif = di masa depan) terhadap tanggal acuan. */
export function selisihHari(target: string, acuan: string): number {
  const a = new Date(`${target}T00:00:00`).getTime();
  const b = new Date(`${acuan}T00:00:00`).getTime();
  return Math.round((a - b) / 86_400_000);
}

/** Label jatuh tempo manusiawi: "3 hari lewat" / "Hari ini" / "2 hari lagi" */
export function labelJatuhTempo(
  dueDate: string | null,
  acuan: string,
): { text: string; tone: "danger" | "warning" | "muted" } {
  if (!dueDate) return { text: "Tanpa tempo", tone: "muted" };
  const d = selisihHari(dueDate, acuan);
  if (d < 0) return { text: `${Math.abs(d)} hari lewat`, tone: "danger" };
  if (d === 0) return { text: "Hari ini", tone: "warning" };
  return { text: `${d} hari lagi`, tone: "muted" };
}

export function salamWaktu(date: Date = new Date(), tz = TZ): string {
  const jam = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      hour12: false,
    }).format(date),
  );
  if (jam < 11) return "Selamat pagi";
  if (jam < 15) return "Selamat siang";
  if (jam < 18) return "Selamat sore";
  return "Selamat malam";
}

/** "hari ini" / "3 hari lalu" / "12 Agu 2026" untuk kolom terakhir belanja. */
export function waktuRelatif(ms: number | null, acuan = new Date()): string {
  if (!ms) return "Belum pernah";
  const tanggal = businessDate(new Date(ms));
  const selisih = selisihHari(tanggal, businessDate(acuan));
  if (selisih === 0) return "Hari ini";
  if (selisih === -1) return "Kemarin";
  if (selisih > -7 && selisih < 0) return `${Math.abs(selisih)} hari lalu`;
  return format(new Date(ms), "d MMM yyyy", { locale: localeId });
}

/** "20 Agu, 14:30" untuk baris riwayat transaksi. */
export function formatWaktuSingkat(ms: number): string {
  return format(new Date(ms), "d MMM, HH:mm", { locale: localeId });
}
