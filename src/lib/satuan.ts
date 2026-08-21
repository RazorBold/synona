/** Satuan terkecil yang dipakai untuk menyimpan stok bahan baku. */
export type SatuanBahan = "g" | "ml" | "pcs";

export const LABEL_SATUAN: Record<SatuanBahan, string> = {
  g: "gram",
  ml: "mililiter",
  pcs: "pcs",
};

/** Satuan besar yang biasa dipakai saat belanja ke supplier. */
export const SATUAN_BELANJA: Record<
  SatuanBahan,
  { label: string; faktor: number }[]
> = {
  g: [
    { label: "gram", faktor: 1 },
    { label: "kg", faktor: 1000 },
  ],
  ml: [
    { label: "ml", faktor: 1 },
    { label: "liter", faktor: 1000 },
  ],
  pcs: [{ label: "pcs", faktor: 1 }],
};

/** 1500 g -> "1,5 kg" · 250 g -> "250 gram" */
export function formatJumlahBahan(jumlah: number, satuan: SatuanBahan): string {
  if (satuan === "pcs") return `${jumlah.toLocaleString("id-ID")} pcs`;
  const besar = satuan === "g" ? "kg" : "liter";
  if (Math.abs(jumlah) >= 1000) {
    return `${(jumlah / 1000).toLocaleString("id-ID", {
      maximumFractionDigits: 2,
    })} ${besar}`;
  }
  return `${jumlah.toLocaleString("id-ID")} ${satuan}`;
}

/**
 * Harga bahan disimpan sebagai rupiah x1.000 per satuan terkecil (ADR-003).
 * Fungsi ini mengubahnya jadi rupiah utuh per satuan belanja agar enak dibaca.
 */
export function hargaPerSatuanBesar(
  costPerUnitMilli: number,
  satuan: SatuanBahan,
): { nilai: number; label: string } {
  if (satuan === "pcs") {
    return { nilai: Math.round(costPerUnitMilli / 1000), label: "pcs" };
  }
  return {
    nilai: Math.round(costPerUnitMilli), // x1000 satuan / 1000 milli = pas
    label: satuan === "g" ? "kg" : "liter",
  };
}
