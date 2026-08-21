"use client";

import {
  ArrowDownRight,
  Pencil,
  Plus,
  Receipt,
  Repeat,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { BebanDialog, KATEGORI } from "@/components/beban/beban-dialog";
import { Chip } from "@/components/ui/chip";
import { IconButton } from "@/components/ui/icon-button";
import { formatTanggalPendek } from "@/lib/date";
import { formatRupiah, persen } from "@/lib/money";
import { cn } from "@/lib/utils";
import { hapusBeban } from "@/server/actions/beban";
import type { BarisBeban, KategoriBeban } from "@/server/queries/beban";

type Statistik = {
  total: number;
  jumlah: number;
  rutin: number;
  perKategori: { kategori: KategoriBeban; total: number }[];
  omzet: number;
  labaKotor: number;
  labaBersih: number;
};

const LABEL: Record<KategoriBeban, { label: string; emoji: string }> =
  Object.fromEntries(
    KATEGORI.map((k) => [k.key, { label: k.label, emoji: k.emoji }]),
  ) as Record<KategoriBeban, { label: string; emoji: string }>;

const PERIODE = [
  ["bulan", "Bulan ini"],
  ["7hari", "7 hari"],
  ["hari", "Hari ini"],
] as const;

export function BebanClient({
  beban,
  statistik,
  periode,
  labelPeriode,
}: {
  beban: BarisBeban[];
  statistik: Statistik;
  periode: string;
  labelPeriode: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [terpilih, setTerpilih] = useState<BarisBeban | null>(null);

  function gantiPeriode(nilai: string) {
    const next = new URLSearchParams(params.toString());
    next.set("periode", nilai);
    startTransition(() => router.push(`${pathname}?${next}`, { scroll: false }));
  }

  async function hapus(b: BarisBeban) {
    if (!confirm(`Hapus beban "${b.nama}" sebesar ${formatRupiah(b.jumlah)}?`))
      return;
    const hasil = await hapusBeban(b.id);
    if (!hasil.ok) alert(hasil.error);
  }

  const rugi = statistik.labaBersih < 0;

  return (
    <div className="relative z-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">
            Beban &amp; Tagihan
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            Biaya di luar modal barang. Inilah yang membuat angka untung jadi
            jujur.
          </p>
        </div>

        <button
          onClick={() => {
            setTerpilih(null);
            setFormOpen(true);
          }}
          className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 px-5 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95"
        >
          <Plus className="size-4" strokeWidth={2.6} />
          Catat Beban
        </button>
      </div>

      {/* Rantai hitung: laba kotor - beban = laba bersih */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Kartu
          label={`Laba Kotor ${labelPeriode}`}
          nilai={formatRupiah(statistik.labaKotor)}
          catatan={`dari omzet ${formatRupiah(statistik.omzet)}`}
          icon={TrendingUp}
          tone="brand"
        />
        <Kartu
          label={`Beban ${labelPeriode}`}
          nilai={formatRupiah(statistik.total)}
          catatan={`${statistik.jumlah} catatan · rutin ${formatRupiah(statistik.rutin)}`}
          icon={ArrowDownRight}
          tone="warning"
        />
        <Kartu
          label={`Laba Bersih ${labelPeriode}`}
          nilai={formatRupiah(statistik.labaBersih)}
          catatan={
            statistik.omzet > 0
              ? `margin bersih ${persen(statistik.labaBersih, statistik.omzet)}%`
              : "belum ada penjualan"
          }
          icon={Wallet}
          tone={rugi ? "danger" : "success"}
          tebal
        />
      </div>

      <section className="card min-w-0 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="card-title text-[17px]">Rincian Beban</h2>
          <div className="thin-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {PERIODE.map(([key, label]) => (
              <Chip
                key={key}
                aktif={periode === key}
                onClick={() => gantiPeriode(key)}
              >
                {label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Sebaran kategori */}
        {statistik.perKategori.length > 0 && (
          <div className="mt-4 space-y-2.5">
            {statistik.perKategori.map((k) => (
              <div key={k.kategori} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-[13px] font-medium text-ink-soft">
                  {LABEL[k.kategori].emoji} {LABEL[k.kategori].label}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400"
                    style={{
                      width: `${statistik.total ? Math.max(3, Math.round((k.total / statistik.total) * 100)) : 0}%`,
                    }}
                  />
                </span>
                <span className="tabular w-28 shrink-0 text-right text-[13px] font-bold text-ink">
                  {formatRupiah(k.total)}
                </span>
              </div>
            ))}
          </div>
        )}

        <ul
          className="mt-5 divide-y divide-line/70 transition-opacity"
          style={{ opacity: pending ? 0.5 : 1 }}
        >
          {beban.map((b) => (
            <li key={b.id} className="flex items-center gap-3 py-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-canvas text-base">
                {LABEL[b.kategori].emoji}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {b.nama}
                  {b.berulang === 1 && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600">
                      <Repeat className="size-2.5" />
                      Rutin
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted">
                  {LABEL[b.kategori].label} · {formatTanggalPendek(b.tanggal)}
                  {b.catatan && ` · ${b.catatan}`}
                </p>
              </div>

              <p className="tabular shrink-0 text-sm font-bold text-ink">
                {formatRupiah(b.jumlah)}
              </p>

              <div className="flex shrink-0 items-center gap-1.5">
                <IconButton
                  label="Ubah beban"
                  onClick={() => {
                    setTerpilih(b);
                    setFormOpen(true);
                  }}
                  icon={Pencil}
                />
                <IconButton
                  label="Hapus beban"
                  onClick={() => hapus(b)}
                  icon={Trash2}
                  bahaya
                />
              </div>
            </li>
          ))}
        </ul>

        {beban.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-canvas text-muted">
              <Receipt className="size-6" />
            </span>
            <p className="mt-3 text-sm font-semibold text-ink">
              Belum ada beban dicatat
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted">
              Tanpa beban, angka untung hanya laba kotor — belum termasuk
              listrik, gaji, dan sewa.
            </p>
          </div>
        )}
      </section>

      <BebanDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        beban={terpilih}
      />
    </div>
  );
}

const TONE = {
  brand: "from-brand-400 to-brand-600",
  success: "from-emerald-400 to-emerald-600",
  warning: "from-amber-400 to-orange-500",
  danger: "from-rose-400 to-red-500",
} as const;

function Kartu({
  label,
  nilai,
  catatan,
  icon: Icon,
  tone,
  tebal = false,
}: {
  label: string;
  nilai: string;
  catatan?: string;
  icon: typeof Wallet;
  tone: keyof typeof TONE;
  tebal?: boolean;
}) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span
        className={cn(
          "grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white",
          TONE[tone],
        )}
      >
        <Icon className="size-6" />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        <p
          className={cn(
            "tabular font-extrabold leading-tight tracking-tight text-ink",
            tebal ? "text-2xl" : "text-xl",
          )}
        >
          {nilai}
        </p>
        {catatan && (
          <p className="text-[11px] leading-tight text-muted">{catatan}</p>
        )}
      </div>
    </div>
  );
}
