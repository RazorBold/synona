/**
 * Satu-satunya sumber kebenaran perhitungan uang.
 *
 * SEMUA nilai uang adalah INTEGER rupiah utuh. Rupiah tidak memakai sen,
 * dan float akan membuat laporan untung meleset karena pembulatan.
 */

const rupiah = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

/** 1250000 → "Rp 1.250.000" */
export function formatRupiah(value: number): string {
  const abs = rupiah.format(Math.abs(Math.round(value)));
  return `${value < 0 ? "-" : ""}Rp ${abs}`;
}

/** 1250000 → "1,25 jt" (untuk sumbu grafik & ruang sempit) */
export function formatRingkas(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("id-ID", {
      maximumFractionDigits: 1,
    })}jt`;
  }
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

export type ItemHitung = {
  priceSnapshot: number;
  costSnapshot: number;
  qty: number;
};

/** Laba kotor = Σ (harga − modal) × qty − diskon */
export function hitungLabaTransaksi(
  items: ItemHitung[],
  discount = 0,
): number {
  const margin = items.reduce(
    (acc, i) => acc + (i.priceSnapshot - i.costSnapshot) * i.qty,
    0,
  );
  return margin - discount;
}

export function hitungKembalian(total: number, dibayar: number): number {
  return Math.max(0, dibayar - total);
}

/** Perubahan persen vs periode sebelumnya. null bila pembanding 0. */
export function hitungTren(
  sekarang: number,
  sebelumnya: number,
): number | null {
  if (sebelumnya === 0) return null;
  return Math.round(((sekarang - sebelumnya) / sebelumnya) * 100);
}

/** Porsi dalam persen bulat (untuk legenda donut pembayaran). */
export function persen(bagian: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((bagian / total) * 100);
}
