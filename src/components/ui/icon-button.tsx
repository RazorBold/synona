"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Tombol aksi berbentuk ikon pada baris tabel/kartu. */
export function IconButton({
  label,
  onClick,
  icon: Icon,
  bahaya = false,
}: {
  label: string;
  onClick: () => void;
  icon: LucideIcon;
  bahaya?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "grid size-9 place-items-center rounded-xl border border-line text-ink-soft transition-colors",
        bahaya
          ? "hover:border-red-200 hover:bg-red-50 hover:text-danger"
          : "hover:bg-canvas",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}
