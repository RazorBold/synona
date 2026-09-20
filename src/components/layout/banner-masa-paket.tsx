import { ChevronRight, CalendarClock } from "lucide-react";
import Link from "next/link";

/**
 * Peringatan masa langganan.
 *
 * Untuk usaha berlangganan berbayar (`wajibBayar`), langganan yang lewat
 * membuat aplikasi HANYA-BACA: data tetap bisa dilihat, tapi server action
 * yang mengubah data menolak (lihat `getOutletMenulis`). Akun lama dari
 * sebelum ada pembayaran tetap hanya diperingatkan, tidak dikunci.
 */
export function BannerMasaPaket({
  sisaHari,
  hanyaBaca = false,
  wajibBayar = false,
}: {
  sisaHari: number;
  hanyaBaca?: boolean;
  wajibBayar?: boolean;
}) {
  const lewat = sisaHari < 0;

  return (
    <div
      className={
        lewat
          ? "mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5"
          : "mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5"
      }
    >
      <CalendarClock
        className={`mt-0.5 size-5 shrink-0 ${lewat ? "text-danger" : "text-amber-500"}`}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">
          {lewat
            ? `Masa langganan sudah lewat ${Math.abs(sisaHari)} hari`
            : sisaHari === 0
              ? "Masa langganan berakhir hari ini"
              : `Masa langganan tinggal ${sisaHari} hari`}
        </p>
        <p className="mt-0.5 text-sm text-ink-soft">
          {hanyaBaca
            ? "Data Anda aman dan tetap bisa dilihat, tapi transaksi baru belum bisa dicatat sampai langganan diperpanjang."
            : wajibBayar
              ? "Perpanjang sebelum berakhir supaya kasir tidak terhenti — sisa hari tidak hangus."
              : "Aplikasi masih bisa dipakai seperti biasa. Perpanjang supaya tidak ada gangguan di kemudian hari."}
        </p>
        <Link href={wajibBayar ? "/langganan" : "/pengaturan/paket"} className="link-more mt-2">
          {wajibBayar ? "Perpanjang sekarang" : "Lihat paket"} <ChevronRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
