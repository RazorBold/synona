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
