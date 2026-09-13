import { ChevronRight, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { PENGGUNA_DEFAULT } from "@/lib/auth-const";

/**
 * Muncul selama akun demo masih memakai sandi bawaan. Tidak bisa ditutup:
 * peringatan yang bisa di-dismiss akan hilang di kunjungan pertama dan tidak
 * pernah terlihat lagi, padahal risikonya masih ada.
 */
export function BannerSandiDefault() {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">
          Sandi demo bawaan masih aktif
        </p>
        <p className="mt-0.5 text-sm text-ink-soft">
          Akun <span className="font-semibold">{PENGGUNA_DEFAULT}</span> masih
          memakai sandi bawaan yang diketahui umum. Ganti sebelum aplikasi ini
          dipakai dengan data pelanggan sungguhan.
        </p>
        <Link href="/ganti-sandi" className="link-more mt-2">
          Ganti sandi sekarang <ChevronRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
