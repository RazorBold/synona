import { ChevronRight, CalendarClock } from "lucide-react";
import Link from "next/link";

/**
 * Peringatan masa langganan.
 *
 * SENGAJA hanya memperingatkan, tidak mengunci aplikasi. Mengunci pemilik dari
 * data penjualannya sendiri karena langganan lewat adalah keputusan bisnis,
 * bukan keputusan teknis — dan kalau salah, akibatnya kasir berhenti jalan di
 * tengah jam ramai. Penegakan keras menunggu keputusan pemilik produk.
 */
export function BannerMasaPaket({ sisaHari }: { sisaHari: number }) {
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
          Aplikasi masih bisa dipakai seperti biasa. Perpanjang supaya tidak ada
          gangguan di kemudian hari.
        </p>
        <Link href="/pengaturan/paket" className="link-more mt-2">
          Lihat paket <ChevronRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
