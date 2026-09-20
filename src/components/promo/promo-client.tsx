"use client";

import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PromoDialog } from "@/components/promo/promo-dialog";
import { aman } from "@/lib/aksi";
import { persenDiskon, statusPromo, type StatusPromo } from "@/lib/diskon";
import { cn } from "@/lib/utils";
import { hapusPromo, ubahAktifPromo } from "@/server/actions/promo";
import type { BarisPromo } from "@/server/queries/promo";

const WARNA: Record<StatusPromo, string> = {
  berjalan: "bg-emerald-50 text-emerald-700",
  terjadwal: "bg-amber-50 text-amber-700",
  berakhir: "bg-canvas text-muted",
  nonaktif: "bg-canvas text-muted",
};

const LABEL: Record<StatusPromo, string> = {
  berjalan: "Sedang berjalan",
  terjadwal: "Terjadwal",
  berakhir: "Berakhir",
  nonaktif: "Dimatikan",
};

const tgl = (t: string) => format(new Date(`${t}T00:00:00`), "d MMM yyyy", { locale: localeId });

export function PromoClient({
  promo,
  pilihan,
  hariIni,
}: {
  promo: BarisPromo[];
  pilihan: { produk: { id: string; nama: string }[]; kategori: { id: string; nama: string }[] };
  hariIni: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [terpilih, setTerpilih] = useState<BarisPromo | null>(null);
  const [pending, mulai] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const berjalan = promo.filter((p) => statusPromo(p, hariIni) === "berjalan");

  function jalankan(f: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    mulai(async () => {
      const r = await aman(f());
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="relative z-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">Promo & Diskon</h1>
          <p className="mt-1 text-[15px] text-muted">
            {berjalan.length > 0
              ? `${berjalan.length} promo sedang berjalan hari ini.`
              : "Atur diskon untuk semua barang, produk tertentu, atau satu kategori."}
          </p>
        </div>
        <button
          onClick={() => {
            setTerpilih(null);
            setOpen(true);
          }}
          className="flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 px-5 text-sm font-bold text-white shadow-pop"
        >
          <Plus className="size-4" /> Buat Promo
        </button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">{error}</p>
      )}

      {promo.length === 0 ? (
        <section className="card flex flex-col items-center py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-canvas text-muted">
            <Tag className="size-6" />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink">Belum ada promo</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Contoh: &quot;Diskon 10% semua barang hari Minggu&quot; atau &quot;Minyak goreng
            turun 5% sepekan ini&quot;.
          </p>
        </section>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {promo.map((p) => {
            const status = statusPromo(p, hariIni);
            return (
              <li
                key={p.id}
                className={cn(
                  "card flex flex-col p-5",
                  status === "berjalan" && "ring-2 ring-emerald-100",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-extrabold text-ink">{p.nama}</p>
                    <span
                      className={cn(
                        "mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                        WARNA[status],
                      )}
                    >
                      {LABEL[status]}
                    </span>
                  </div>
                  <span className="tabular shrink-0 rounded-xl bg-rose-50 px-3 py-1.5 text-lg font-extrabold text-rose-600">
                    −{persenDiskon(p.diskonBp)}
                  </span>
                </div>

                <p className="mt-3 text-sm text-ink-soft">
                  {p.tipe === "semua"
                    ? "Semua barang"
                    : p.tipe === "kategori"
                      ? `Kategori: ${p.sasaran ?? "—"}`
                      : `${p.jumlahSasaran} produk: ${p.sasaran ?? "—"}`}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {tgl(p.mulai)} – {p.selesai ? tgl(p.selesai) : "seterusnya"}
                </p>

                <div className="mt-4 flex items-center gap-1.5 border-t border-line pt-3">
                  <button
                    onClick={() => jalankan(() => ubahAktifPromo(p.id, p.aktif !== 1))}
                    disabled={pending}
                    className={cn(
                      "h-9 rounded-xl px-3 text-xs font-bold",
                      p.aktif === 1
                        ? "border border-line text-ink-soft hover:bg-canvas"
                        : "bg-success text-white",
                    )}
                  >
                    {p.aktif === 1 ? "Matikan" : "Nyalakan"}
                  </button>
                  <button
                    onClick={() => {
                      setTerpilih(p);
                      setOpen(true);
                    }}
                    className="grid size-9 place-items-center rounded-xl text-muted hover:bg-canvas hover:text-ink"
                    aria-label={`Ubah ${p.nama}`}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Hapus promo "${p.nama}"? Potongan yang sudah terjadi tetap tercatat.`))
                        jalankan(() => hapusPromo(p.id));
                    }}
                    className="ml-auto grid size-9 place-items-center rounded-xl text-muted hover:bg-red-50 hover:text-danger"
                    aria-label={`Hapus ${p.nama}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <PromoDialog
        open={open}
        onOpenChange={setOpen}
        promo={terpilih}
        pilihan={pilihan}
        hariIni={hariIni}
      />
    </div>
  );
}
