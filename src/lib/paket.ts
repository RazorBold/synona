export type Paket = "mulai" | "tumbuh" | "juara";

export type BatasPaket = {
  label: string;
  harga: number;
  maksOutlet: number | null; // null = tanpa batas
  bolehMultiStaf: boolean;
  fitur: string[];
};

/** Batas paket dari PRD.md §11. Ditegakkan di server, bukan cuma di UI. */
export const PAKET: Record<Paket, BatasPaket> = {
  mulai: {
    label: "Mulai",
    harga: 29000,
    maksOutlet: 1,
    bolehMultiStaf: false,
    fitur: ["1 outlet", "POS & kasbon", "Untung harian", "Struk & pengingat WhatsApp"],
  },
  tumbuh: {
    label: "Tumbuh",
    harga: 49000,
    maksOutlet: 3,
    bolehMultiStaf: true,
    fitur: ["Sampai 3 outlet", "Multi-user / kasir", "Laporan lintas outlet", "Notifikasi"],
  },
  juara: {
    label: "Juara",
    harga: 79000,
    maksOutlet: null,
    bolehMultiStaf: true,
    fitur: ["Outlet tak terbatas", "QRIS dinamis", "Rekonsiliasi otomatis", "Prioritas dukungan"],
  },
};

export type Periode = "bulan" | "tahun";

export const LABEL_PERIODE: Record<Periode, string> = {
  bulan: "Bulanan",
  tahun: "Tahunan",
};

/** Tahunan = 10× bulanan: dua bulan gratis. */
export function hargaPaket(paket: Paket, periode: Periode): number {
  return PAKET[paket].harga * (periode === "tahun" ? 10 : 1);
}

export type StatusLangganan =
  /** Akun lama / pengelola platform — tidak pernah dikunci. */
  | "bebas"
  /** Baru mendaftar, pembayaran pertama belum disetujui. */
  | "belum-aktif"
  | "aktif"
  /** Pernah aktif, masa berlakunya sudah lewat: hanya-baca. */
  | "habis";

export function statusLangganan(
  u: { wajibBayar: number; planEndsAt: number | null },
  sekarang = Date.now(),
): StatusLangganan {
  if (u.wajibBayar !== 1) return "bebas";
  if (u.planEndsAt === null) return "belum-aktif";
  return u.planEndsAt > sekarang ? "aktif" : "habis";
}
