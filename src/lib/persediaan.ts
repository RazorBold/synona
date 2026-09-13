/** Kosakata persediaan yang dipakai server maupun klien. */

export type JenisBahan = "baku" | "packaging";

export const LABEL_JENIS_BAHAN: Record<JenisBahan, string> = {
  baku: "Bahan Baku",
  packaging: "Packaging",
};
