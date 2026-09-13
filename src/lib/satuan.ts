/**
 * Satuan stok bahan.
 *
 * Stok disimpan sebagai INTEGER dalam satuan terkecil (ADR-003). Karena itu
 * berat dan volume SELALU dicatat lewat "g" dan "ml" — "kg" dan "liter" hanya
 * satuan tampilan dan belanja. Kalau "kg" jadi satuan simpan, 2,5 kg akan
 * terbulatkan jadi 2 dan stoknya diam-diam hilang.
 *
 * Selain g dan ml, satuan hitungan bebas ditambahkan pemilik (botol, dus,
 * karung, lembar…) dan diperlakukan seperti pcs: satu unit = satu bilangan.
 */
export type SatuanBahan = string;

/** Satuan yang punya satuan besar dengan faktor ×1000. */
const BERSKALA: Record<string, { besar: string; label: string }> = {
  g: { besar: "kg", label: "gram" },
  ml: { besar: "liter", label: "mililiter" },
};

export const berskala = (satuan: string) => satuan in BERSKALA;

/** Pilihan bawaan di formulir bahan; pemilik tetap bisa mengetik satuan lain. */
export const SATUAN_BAHAN_BAWAAN: { nilai: string; label: string }[] = [
  { nilai: "g", label: "gram (dibeli per kg)" },
  { nilai: "ml", label: "mililiter (dibeli per liter)" },
  { nilai: "pcs", label: "pcs" },
  { nilai: "botol", label: "botol" },
  { nilai: "dus", label: "dus" },
  { nilai: "pack", label: "pack" },
  { nilai: "sachet", label: "sachet" },
  { nilai: "lembar", label: "lembar" },
  { nilai: "roll", label: "roll" },
  { nilai: "karung", label: "karung" },
];

export function labelSatuan(satuan: string): string {
  return BERSKALA[satuan]?.label ?? satuan;
}

/** Satuan yang dipakai saat membeli: kg untuk g, liter untuk ml, sisanya apa adanya. */
export function satuanBesar(satuan: string): string {
  return BERSKALA[satuan]?.besar ?? satuan;
}

/** Berapa satuan terkecil dalam satu satuan besar. */
export function faktorSatuan(satuan: string): number {
  return berskala(satuan) ? 1000 : 1;
}

/** 1500 g -> "1,5 kg" · 250 g -> "250 gram" · 12 botol -> "12 botol" */
export function formatJumlahBahan(jumlah: number, satuan: string): string {
  const skala = BERSKALA[satuan];
  if (!skala) return `${jumlah.toLocaleString("id-ID")} ${satuan}`;
  if (Math.abs(jumlah) >= 1000) {
    return `${(jumlah / 1000).toLocaleString("id-ID", {
      maximumFractionDigits: 2,
    })} ${skala.besar}`;
  }
  return `${jumlah.toLocaleString("id-ID")} ${satuan}`;
}

/**
 * Harga bahan disimpan sebagai rupiah x1.000 per satuan terkecil (ADR-003).
 * Fungsi ini mengubahnya jadi rupiah utuh per satuan belanja agar enak dibaca.
 */
export function hargaPerSatuanBesar(
  costPerUnitMilli: number,
  satuan: string,
): { nilai: number; label: string } {
  if (!berskala(satuan)) {
    return { nilai: Math.round(costPerUnitMilli / 1000), label: satuan };
  }
  return {
    nilai: Math.round(costPerUnitMilli), // x1000 satuan / 1000 milli = pas
    label: satuanBesar(satuan),
  };
}

/**
 * Merapikan satuan yang diketik pemilik: huruf kecil, tanpa spasi di tepi.
 * "Botol " dan "botol" harus jadi satu satuan, bukan dua.
 */
export function rapikanSatuan(satuan: string): string {
  return satuan.trim().toLowerCase().replace(/\s+/g, " ");
}
