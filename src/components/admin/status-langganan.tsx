import type { StatusLangganan } from "@/lib/paket";

const LABEL: Record<StatusLangganan, string> = {
  bebas: "Akun lama",
  "belum-aktif": "Belum bayar",
  aktif: "Aktif",
  habis: "Habis",
};

const WARNA: Record<StatusLangganan, string> = {
  bebas: "bg-canvas text-ink-soft",
  "belum-aktif": "bg-amber-50 text-amber-700",
  aktif: "bg-emerald-50 text-emerald-700",
  habis: "bg-red-50 text-danger",
};

export function StatusLanggananLencana({ status }: { status: StatusLangganan }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${WARNA[status]}`}>
      {LABEL[status]}
    </span>
  );
}
