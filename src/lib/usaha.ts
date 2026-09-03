/**
 * Jenis usaha menentukan menu mana yang masuk akal untuk pemiliknya.
 *
 * Pemilik salon tidak pernah butuh "Produksi" atau "Pembelian Stok", dan
 * pemilik warung tidak pernah butuh "Papan Antrean". Menampilkan semuanya ke
 * semua orang membuat aplikasi terasa rumit padahal separuh menunya tidak
 * akan pernah diklik.
 *
 * Dipakai server maupun klien, jadi tinggal di lib — bukan di modul query
 * yang bertanda `server-only`.
 */

export type JenisUsaha = "dagang" | "jasa" | "campuran";

export const JENIS_USAHA: {
  key: JenisUsaha;
  label: string;
  ringkas: string;
  contoh: string;
  emoji: string;
}[] = [
  {
    key: "dagang",
    label: "Dagang / Ritel",
    ringkas: "Saya jual barang yang stoknya dihitung",
    contoh: "Warung sembako, toko kue, minimarket, kedai kopi",
    emoji: "🏪",
  },
  {
    key: "jasa",
    label: "Jasa",
    ringkas: "Saya jual pekerjaan, bukan barang",
    contoh: "Laundry, bengkel, salon, servis HP, penjahit, cuci mobil",
    emoji: "🧰",
  },
  {
    key: "campuran",
    label: "Campuran",
    ringkas: "Saya jual barang sekaligus melayani jasa",
    contoh: "Bengkel yang jual sparepart, salon yang jual shampo",
    emoji: "🧩",
  },
];

export const LABEL_JENIS_USAHA: Record<JenisUsaha, string> = {
  dagang: "Dagang / Ritel",
  jasa: "Jasa",
  campuran: "Campuran",
};

/** Menu barang: katalog produk, stok, persediaan, pembelian, produksi. */
export function punyaBarang(jenis: JenisUsaha | null): boolean {
  return jenis !== "jasa";
}

/** Menu jasa: katalog layanan dan papan antrean pesanan. */
export function punyaJasa(jenis: JenisUsaha | null): boolean {
  return jenis === "jasa" || jenis === "campuran";
}

export type SatuanLayanan = "pcs" | "kg" | "jam" | "hari" | "meter" | "m2";

export const SATUAN_LAYANAN: { key: SatuanLayanan; label: string; ket: string }[] = [
  { key: "pcs", label: "per item", ket: "potong rambut, servis unit" },
  { key: "kg", label: "per kg", ket: "laundry kiloan" },
  { key: "jam", label: "per jam", ket: "sewa, jasa borongan waktu" },
  { key: "hari", label: "per hari", ket: "sewa harian" },
  { key: "meter", label: "per meter", ket: "jahit, kabel, kain" },
  { key: "m2", label: "per m²", ket: "cuci karpet, cat, kaca" },
];

export const LABEL_SATUAN_LAYANAN: Record<SatuanLayanan, string> = {
  pcs: "item",
  kg: "kg",
  jam: "jam",
  hari: "hari",
  meter: "m",
  m2: "m²",
};

export type StatusPesanan = "masuk" | "dikerjakan" | "selesai" | "diambil" | "batal";

export const ALUR_PESANAN: {
  key: StatusPesanan;
  label: string;
  ringkas: string;
  lanjut: StatusPesanan | null;
  labelLanjut: string | null;
}[] = [
  {
    key: "masuk",
    label: "Masuk",
    ringkas: "Diterima, belum dikerjakan",
    lanjut: "dikerjakan",
    labelLanjut: "Mulai Kerjakan",
  },
  {
    key: "dikerjakan",
    label: "Dikerjakan",
    ringkas: "Sedang digarap",
    lanjut: "selesai",
    labelLanjut: "Tandai Selesai",
  },
  {
    key: "selesai",
    label: "Selesai",
    ringkas: "Siap diambil pelanggan",
    lanjut: "diambil",
    labelLanjut: "Serahkan",
  },
  {
    key: "diambil",
    label: "Diambil",
    ringkas: "Sudah diserahkan",
    lanjut: null,
    labelLanjut: null,
  },
  {
    key: "batal",
    label: "Batal",
    ringkas: "Dibatalkan",
    lanjut: null,
    labelLanjut: null,
  },
];

export const LABEL_STATUS_PESANAN: Record<StatusPesanan, string> = {
  masuk: "Masuk",
  dikerjakan: "Dikerjakan",
  selesai: "Selesai",
  diambil: "Diambil",
  batal: "Batal",
};

/**
 * Jumlah layanan disimpan × 1.000 supaya 3,5 kg tidak perlu float
 * (konvensi yang sama dengan harga bahan baku, ADR-003).
 */
export function formatJumlahLayanan(
  qtyMilli: number,
  unit: SatuanLayanan | string | null,
): string {
  const nilai = qtyMilli / 1000;
  const label =
    LABEL_SATUAN_LAYANAN[(unit ?? "pcs") as SatuanLayanan] ?? String(unit ?? "");
  return `${nilai.toLocaleString("id-ID", { maximumFractionDigits: 3 })} ${label}`;
}
