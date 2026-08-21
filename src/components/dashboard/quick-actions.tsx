import {
  BarChart3,
  FileText,
  Package,
  ScanLine,
  ShoppingCart,
  UserPlus,
} from "lucide-react";
import Link from "next/link";

const AKSI = [
  {
    href: "/kasir",
    label: "Penjualan\n(POS)",
    icon: ShoppingCart,
    kelas: "bg-brand-50 text-brand-500 hover:bg-brand-100",
  },
  {
    href: "/produk/baru",
    label: "Tambah\nProduk",
    icon: Package,
    kelas: "bg-emerald-50 text-emerald-500 hover:bg-emerald-100",
  },
  {
    href: "/pelanggan/baru",
    label: "Tambah\nPelanggan",
    icon: UserPlus,
    kelas: "bg-orange-50 text-orange-500 hover:bg-orange-100",
  },
  {
    href: "/kasbon/baru",
    label: "Catat\nUtang",
    icon: FileText,
    kelas: "bg-violet-50 text-violet-500 hover:bg-violet-100",
  },
  {
    href: "/rekonsiliasi",
    label: "Rekonsiliasi\nHarian",
    icon: ScanLine,
    kelas: "bg-rose-50 text-rose-500 hover:bg-rose-100",
  },
  {
    href: "/laporan",
    label: "Lihat\nLaporan",
    icon: BarChart3,
    kelas: "bg-sky-50 text-sky-500 hover:bg-sky-100",
  },
];

export function QuickActions() {
  return (
    <section className="card flex flex-col p-5">
      <h2 className="card-title text-[17px]">Aksi Cepat</h2>

      <div className="mt-3 grid flex-1 grid-cols-3 gap-3">
        {AKSI.map(({ href, label, icon: Icon, kelas }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl px-2 py-4 text-center transition-colors ${kelas}`}
          >
            <Icon className="size-6" strokeWidth={1.9} />
            <span className="whitespace-pre-line text-[11px] font-semibold leading-tight text-ink-soft">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
