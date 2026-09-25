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

/** Panjang masa coba gratis untuk setiap pendaftar baru. */
export const HARI_MASA_COBA = 14;

export type StatusLangganan =
  /** Akun lama / pengelola platform — tidak pernah dikunci. */
  | "bebas"
  /** Masa coba gratis sedang berjalan. */
  | "coba"
  /** Sudah membayar dan masih berlaku. */
  | "aktif"
  /** Masa coba atau langganannya sudah lewat: hanya-baca. */
  | "habis"
  /**
   * Tidak punya tanggal berakhir sama sekali padahal wajib bayar. Sejak
   * pendaftaran memberi masa coba otomatis, ini hanya terjadi pada akun
   * yang sempat dibuat di versi lama — diperlakukan sama seperti habis,
   * dan pemiliknya diarahkan ke halaman langganan.
   */
  | "belum-aktif";

type BarisLangganan = {
  wajibBayar: number;
  planEndsAt: number | null;
  trialEndsAt?: number | null;
};

export function statusLangganan(
  u: BarisLangganan,
  sekarang = Date.now(),
): StatusLangganan {
  if (u.wajibBayar !== 1) return "bebas";
  if (u.planEndsAt === null) return "belum-aktif";
  if (u.planEndsAt <= sekarang) return "habis";
  /*
   * Masih masa coba selama belum ada pembayaran yang memperpanjangnya.
   * Pembayaran menambah masa dari tanggal berakhir yang berjalan, jadi
   * begitu disetujui `planEndsAt` pasti melewati `trialEndsAt`.
   */
  const masihCoba =
    u.trialEndsAt !== null &&
    u.trialEndsAt !== undefined &&
    u.planEndsAt <= u.trialEndsAt;
  return masihCoba ? "coba" : "aktif";
}

/** Sisa hari sampai berakhir; negatif berarti sudah lewat. */
export function sisaHariLangganan(planEndsAt: number | null, sekarang = Date.now()): number | null {
  if (planEndsAt === null) return null;
  return Math.ceil((planEndsAt - sekarang) / 86_400_000);
}

/** Boleh mencatat data baru? "habis" dan "belum-aktif" hanya-baca. */
export function bolehMenulis(status: StatusLangganan): boolean {
  return status === "bebas" || status === "coba" || status === "aktif";
}
