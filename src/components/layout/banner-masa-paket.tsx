import { CalendarClock, ChevronRight, Gift, TriangleAlert } from "lucide-react";
import Link from "next/link";

import type { StatusLangganan } from "@/lib/paket";

/**
 * Peringatan masa coba dan masa langganan.
 *
 * Masa coba SELALU ditampilkan hitungan mundurnya, bukan cuma di hari-hari
 * terakhir: pendaftar baru perlu tahu sejak hari pertama bahwa masanya
 * terbatas, supaya tidak kaget saat aplikasinya mengunci diri.
 *
 * Setelah lewat, aplikasi jadi HANYA-BACA — data tetap bisa dilihat, tapi
 * server action yang mengubah data menolak (lihat `getOutletMenulis`).
 */
export function BannerMasaPaket({
  sisaHari,
  status,
}: {
  sisaHari: number;
  status: StatusLangganan;
}) {
  const lewat = status === "habis" || sisaHari < 0;
  const coba = status === "coba";
  // Masa coba yang masih panjang cukup diberi nada tenang.
  const tenang = coba && sisaHari > 3;

  const Ikon = lewat ? TriangleAlert : coba ? Gift : CalendarClock;

  const judul = lewat
    ? "Masa coba gratis sudah berakhir"
    : coba
      ? sisaHari <= 1
        ? "Masa coba gratis berakhir hari ini"
        : `Masa coba gratis tinggal ${sisaHari} hari`
      : sisaHari <= 0
        ? "Masa langganan berakhir hari ini"
        : `Masa langganan tinggal ${sisaHari} hari`;

  const isi = lewat
    ? "Data Anda aman dan tetap bisa dilihat, tapi transaksi baru belum bisa dicatat sampai langganan diaktifkan."
    : coba
      ? "Semua fitur terbuka selama masa coba. Pilih paket sebelum masa cobanya habis supaya pencatatan tidak terhenti."
      : "Perpanjang sebelum berakhir supaya kasir tidak terhenti — sisa hari tidak hangus.";

  const warna = lewat
    ? "border-red-200 bg-red-50"
    : tenang
      ? "border-brand-200 bg-brand-50"
      : "border-amber-200 bg-amber-50";

  const warnaIkon = lewat ? "text-danger" : tenang ? "text-brand-500" : "text-amber-500";

  return (
    <div className={`mb-5 flex items-start gap-3 rounded-2xl border px-4 py-3.5 ${warna}`}>
      <Ikon className={`mt-0.5 size-5 shrink-0 ${warnaIkon}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">{judul}</p>
        <p className="mt-0.5 text-sm text-ink-soft">{isi}</p>
        <Link href="/langganan" className="link-more mt-2">
          {lewat ? "Aktifkan sekarang" : coba ? "Lihat paket" : "Perpanjang sekarang"}
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
