import { ArrowLeft, type LucideIcon } from "lucide-react";
import Link from "next/link";

/**
 * Halaman sementara untuk menu yang belum dibangun (langkah 6+ pada
 * PRD-TEKNIS.md §8). Ada agar navigasi sidebar tidak berujung 404.
 */
export function PlaceholderPage({
  judul,
  deskripsi,
  icon: Icon,
  langkah,
}: {
  judul: string;
  deskripsi: string;
  icon: LucideIcon;
  langkah: string;
}) {
  return (
    <div>
      <div className="card flex flex-col items-center px-6 py-20 text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-brand-50 text-brand-500">
          <Icon className="size-7" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">
          {judul}
        </h1>
        <p className="mt-2 max-w-md text-[15px] text-muted">{deskripsi}</p>
        <p className="mt-4 rounded-full bg-canvas px-4 py-1.5 text-xs font-semibold text-muted">
          Dijadwalkan pada {langkah}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-400 px-5 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95"
        >
          <ArrowLeft className="size-4" /> Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
