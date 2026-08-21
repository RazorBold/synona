"use client";

import { cn } from "@/lib/utils";

/** Pil penyaring yang dipakai di POS, Produk, dan Pelanggan. */
export function Chip({
  aktif,
  onClick,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors",
        aktif
          ? "bg-gradient-to-r from-brand-500 to-brand-400 text-white shadow-pop"
          : "border border-line bg-white text-ink-soft hover:bg-canvas",
      )}
    >
      {children}
    </button>
  );
}
