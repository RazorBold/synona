/** Kosakata persediaan yang dipakai server maupun klien. */

export type JenisBahan = "baku" | "setengah_jadi" | "jadi";

export const LABEL_JENIS_BAHAN: Record<JenisBahan, string> = {
  baku: "Bahan Baku",
  setengah_jadi: "Setengah Jadi",
  jadi: "Barang Jadi",
};
