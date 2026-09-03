import { ArrowRight, Lightbulb } from "lucide-react";
import Link from "next/link";

export function TipsBanner({
  teks,
  href = "/kasir",
  aksi = "Buka POS",
}: {
  teks: string;
  href?: string;
  aksi?: string;
}) {
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-card border border-brand-100 bg-gradient-to-r from-brand-50 via-violet-50 to-brand-50 px-5 py-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-brand-500 shadow-card">
        <Lightbulb className="size-5" />
      </span>

      <p className="min-w-0 flex-1 text-sm">
        <span className="font-bold text-ink">Tips hari ini</span>
        <span className="mx-3 hidden text-brand-200 sm:inline">|</span>
        <span className="text-ink-soft">{teks}</span>
      </p>

      <Link
        href={href}
        className="ml-auto inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-400 px-5 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95"
      >
        {aksi} <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}
