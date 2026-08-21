"use client";

import {
  ChefHat,
  ChevronDown,
  ChevronRight,
  Clock,
  Crown,
  FileText,
  Home,
  MessageCircleQuestion,
  Package,
  PiggyBank,
  ReceiptText,
  Store,
  Users,
  Wallet,
  WalletCards,
  Wheat,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { WhatsAppIcon } from "@/components/icons/whatsapp";
import { cn } from "@/lib/utils";

const NAV: { judul: string; item: { href: string; label: string; icon: typeof Home }[] }[] = [
  {
    judul: "Pencatatan",
    item: [
      { href: "/kasir", label: "Penjualan (POS)", icon: ReceiptText },
      { href: "/produksi", label: "Produksi", icon: ChefHat },
      { href: "/bahan", label: "Bahan Baku", icon: Wheat },
      { href: "/beban", label: "Beban & Tagihan", icon: Wallet },
    ],
  },
  {
    judul: "Data Usaha",
    item: [
      { href: "/produk", label: "Produk & Stok", icon: Package },
      { href: "/pelanggan", label: "Pelanggan", icon: Users },
      { href: "/kasbon", label: "Utang (Kasbon)", icon: WalletCards },
    ],
  },
  {
    judul: "Analisa",
    item: [
      { href: "/laporan", label: "Laporan", icon: FileText },
      { href: "/rekonsiliasi", label: "Kas & Rekonsiliasi", icon: PiggyBank },
    ],
  },
  {
    judul: "Pengaturan",
    item: [
      { href: "/outlet", label: "Outlet & Staf", icon: Store },
      { href: "/pengingat", label: "Pengingat", icon: Clock },
    ],
  },
];

type Props = {
  namaPemilik: string;
  paket: string;
  berlakuSampai: string;
  open: boolean;
  onClose: () => void;
};

export function Sidebar({
  namaPemilik,
  paket,
  berlakuSampai,
  open,
  onClose,
}: Props) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay hanya di layar kecil */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-ink/30 backdrop-blur-[2px] transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col overflow-hidden bg-white transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Ornamen gradien di dasar sidebar (seperti mockup) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-44 opacity-80"
        >
          <svg viewBox="0 0 264 240" className="h-full w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sb1" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#c9c0ff" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#8b7cf8" stopOpacity="0.35" />
              </linearGradient>
              <linearGradient id="sb2" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a99bfd" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#6d5df6" stopOpacity="0.28" />
              </linearGradient>
            </defs>
            <path d="M0 120 C 70 70, 150 175, 264 110 L264 240 L0 240 Z" fill="url(#sb1)" />
            <path d="M0 168 C 80 128, 170 210, 264 158 L264 240 L0 240 Z" fill="url(#sb2)" />
          </svg>
        </div>

        <button
          onClick={onClose}
          aria-label="Tutup menu"
          className="absolute right-3 top-4 z-10 grid size-8 place-items-center rounded-lg text-muted hover:bg-canvas lg:hidden"
        >
          <X className="size-4" />
        </button>

        {/* Logo */}
        <div className="relative px-6 pb-5 pt-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-pop">
              <Store className="size-5 text-white" />
            </span>
            <span className="text-2xl font-extrabold tracking-tight text-ink">
              Synona
            </span>
          </Link>
          <p className="mt-2 pl-1 text-xs text-muted">
            Kelola usaha, makin untung.
          </p>
        </div>

        {/* Navigasi */}
        <nav className="thin-scroll relative flex-1 overflow-y-auto px-4 pb-4">
          <ul className="space-y-1">
            <li>
              <ItemNav
                href="/"
                label="Dashboard"
                icon={Home}
                aktif={pathname === "/"}
                onClose={onClose}
              />
            </li>
          </ul>

          {NAV.map((grup) => (
            <div key={grup.judul} className="mt-4">
              <p className="px-3.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                {grup.judul}
              </p>
              <ul className="space-y-1">
                {grup.item.map(({ href, label, icon }) => (
                  <li key={href}>
                    <ItemNav
                      href={href}
                      label={label}
                      icon={icon}
                      aktif={pathname.startsWith(href)}
                      onClose={onClose}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Kartu paket langganan */}
          <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
            <div className="flex items-start gap-3">
              <Crown className="mt-0.5 size-5 shrink-0 fill-amber-400 text-amber-500" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">Plan {paket}</p>
                <p className="mt-0.5 text-xs text-muted">
                  Berakhir {berlakuSampai}
                </p>
                <Link href="/pengaturan/paket" className="link-more mt-2">
                  Lihat Paket <ChevronRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Kartu bantuan */}
          <div className="mt-4 rounded-2xl border border-line bg-white p-4 shadow-card">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-500">
                <MessageCircleQuestion className="size-[18px]" />
              </span>
              <div>
                <p className="text-sm font-bold text-ink">Butuh bantuan?</p>
                <p className="text-xs text-muted">Chat via WhatsApp</p>
              </div>
            </div>
            <a
              href="https://wa.me/6281234567890"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-line bg-white py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-canvas"
            >
              Hubungi Kami
              <span className="grid size-6 place-items-center rounded-full bg-success text-white">
                <WhatsAppIcon className="size-3.5" />
              </span>
            </a>
          </div>
        </nav>

        {/* Profil pemilik */}
        <div className="relative border-t border-line/70 px-4 py-3">
          <button className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/60">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-[13px] font-bold text-white">
              {namaPemilik
                .split(" ")
                .slice(0, 2)
                .map((w) => w[0])
                .join("")
                .toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-ink">
                {namaPemilik}
              </span>
              <span className="block text-xs text-muted">Pemilik</span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted" />
          </button>
        </div>
      </aside>
    </>
  );
}

function ItemNav({
  href,
  label,
  icon: Icon,
  aktif,
  onClose,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  aktif: boolean;
  onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
        aktif
          ? "bg-gradient-to-r from-brand-500 to-brand-400 text-white shadow-pop"
          : "text-ink-soft hover:bg-canvas",
      )}
    >
      <Icon
        className={cn("size-[18px] shrink-0", aktif ? "text-white" : "text-muted")}
        strokeWidth={aktif ? 2.2 : 1.8}
      />
      {label}
    </Link>
  );
}
