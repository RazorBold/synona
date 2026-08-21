import { ChevronRight, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { GambarProduk } from "@/components/ui/gambar-produk";
import type { BarisStok } from "@/server/queries/dashboard";
import { cn } from "@/lib/utils";

export function LowStockCard({
  daftar,
  total,
  batasKritis = 3,
}: {
  daftar: BarisStok[];
  total: number;
  batasKritis?: number;
}) {
  const sisaLain = Math.max(0, total - daftar.length);

  return (
    <section className="card flex flex-col p-5">
      <div className="flex items-center justify-between">
        <h2 className="card-title text-[17px]">Stok Menipis</h2>
        <Link href="/produk?filter=menipis" className="link-more">
          Lihat Semua <ChevronRight className="size-3.5" />
        </Link>
      </div>

      <ul className="mt-3 flex-1 space-y-3">
        {daftar.length === 0 && (
          <li className="py-6 text-center text-sm text-muted">
            Semua stok aman. 👍
          </li>
        )}

        {daftar.map((p) => (
          <li key={p.id} className="flex items-center gap-3">
            <GambarProduk
              gambar={p.gambar}
              emoji={p.emoji}
              nama={p.nama}
              className="size-9"
              ukuranEmoji="text-base"
            />
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink-soft">
              {p.nama}
            </p>
            <p className="shrink-0 text-sm text-muted">
              Stok:{" "}
              <span
                className={cn(
                  "tabular font-bold",
                  p.stok <= batasKritis ? "text-danger" : "text-warning",
                )}
              >
                {p.stok}
              </span>
            </p>
          </li>
        ))}
      </ul>

      {sisaLain > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-danger">
          <TriangleAlert className="size-4 shrink-0" />
          {sisaLain} produk lainnya stok menipis
        </div>
      )}
    </section>
  );
}
