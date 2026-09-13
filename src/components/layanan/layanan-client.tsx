"use client";

import {
  Archive,
  Banknote,
  Clock,
  Pencil,
  Plus,
  Scissors,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

import { LayananDialog } from "@/components/layanan/layanan-dialog";
import { Chip } from "@/components/ui/chip";
import { IconButton } from "@/components/ui/icon-button";
import { aman } from "@/lib/aksi";
import { formatRupiah } from "@/lib/money";
import { LABEL_SATUAN_LAYANAN } from "@/lib/usaha";
import { cn } from "@/lib/utils";
import { arsipkanLayanan } from "@/server/actions/layanan";
import type { BarisLayanan } from "@/server/queries/layanan";

type Statistik = {
  jumlah: number;
  hargaRata: number;
  omzet: number;
  baris: number;
};

export function LayananClient({
  layanan,
  kategori,
  statistik,
}: {
  layanan: BarisLayanan[];
  kategori: { id: string; nama: string }[];
  statistik: Statistik;
}) {
  const [filter, setFilter] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [terpilih, setTerpilih] = useState<BarisLayanan | null>(null);

  const tampil = filter
    ? layanan.filter((l) => l.kategoriId === filter)
    : layanan;

  async function arsipkan(l: BarisLayanan) {
    if (!confirm(`Arsipkan layanan "${l.nama}"?`)) return;
    const hasil = await aman(arsipkanLayanan(l.id));
    if (!hasil.ok) alert(hasil.error);
  }

  return (
    <div className="relative z-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">
            Layanan
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            Daftar pekerjaan yang Anda jual, lengkap dengan satuan dan
            perkiraan biayanya.
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
          Tambah Layanan
        </button>
      </div>

      <div className="grid grid-cols-2 gap-5 xl:grid-cols-3">
        <Kartu
          label="Jenis Layanan"
          nilai={String(statistik.jumlah)}
          icon={Scissors}
          tone="brand"
        />
        <Kartu
          label="Omzet Jasa Bulan Ini"
          nilai={formatRupiah(statistik.omzet)}
          catatan={`${statistik.baris} pekerjaan`}
          icon={TrendingUp}
          tone="success"
        />
        <Kartu
          label="Harga Rata-rata"
          nilai={formatRupiah(statistik.hargaRata)}
          icon={Banknote}
          tone="warning"
        />
      </div>

      <section className="card min-w-0 p-5">
        {kategori.length > 0 && (
          <div className="thin-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <Chip aktif={filter === null} onClick={() => setFilter(null)}>
              Semua ({layanan.length})
            </Chip>
            {kategori.map((k) => (
              <Chip
                key={k.id}
                aktif={filter === k.id}
                onClick={() => setFilter(k.id)}
              >
                {k.nama} ({layanan.filter((l) => l.kategoriId === k.id).length})
              </Chip>
            ))}
          </div>
        )}

        <ul className="mt-4 grid gap-3 lg:grid-cols-2">
          {tampil.map((l) => (
            <li key={l.id} className="rounded-2xl border border-line p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-canvas text-xl">
                  {l.emoji ?? "🧰"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{l.nama}</p>
                  <p className="truncate text-xs text-muted">
                    {l.namaKategori ?? "Tanpa kategori"}
                    {l.estimasiJam > 0 && ` · ± ${l.estimasiJam} jam`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <IconButton
                    label="Ubah layanan"
                    onClick={() => {
                      setTerpilih(l);
                      setFormOpen(true);
                    }}
                    icon={Pencil}
                  />
                  <IconButton
                    label="Arsipkan"
                    onClick={() => arsipkan(l)}
                    icon={Archive}
                    bahaya
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line pt-3">
                <span className="tabular text-lg font-extrabold tracking-tight text-ink">
                  {formatRupiah(l.harga)}
                  <span className="text-xs font-semibold text-muted">
                    {" "}
                    / {LABEL_SATUAN_LAYANAN[l.satuan]}
                  </span>
                </span>
                <span className="tabular text-xs text-muted">
                  {l.modal > 0
                    ? `bahan ${formatRupiah(l.modal)} · margin ${formatRupiah(l.harga - l.modal)}`
                    : "tanpa biaya bahan"}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {l.hargaBisaDiubah === 1 && (
                  <Label tone="brand">Harga bisa diubah saat menerima</Label>
                )}
                {l.omzet30 > 0 && (
                  <Label tone="muted">
                    30 hari: {formatRupiah(l.omzet30)}
                  </Label>
                )}
              </div>
            </li>
          ))}
        </ul>

        {tampil.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-canvas text-muted">
              <Scissors className="size-6" />
            </span>
            <p className="mt-3 text-sm font-semibold text-ink">
              Belum ada layanan
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted">
              Tambahkan pekerjaan yang Anda jual — cuci kiloan, ganti oli,
              potong rambut — beserta satuan penagihannya.
            </p>
          </div>
        )}
      </section>

      <LayananDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        layanan={terpilih}
        kategori={kategori}
      />
    </div>
  );
}

function Label({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "brand" | "muted";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
        tone === "brand" ? "bg-brand-50 text-brand-600" : "bg-canvas text-muted",
      )}
    >
      {children}
    </span>
  );
}

const TONE = {
  brand: "from-brand-400 to-brand-600",
  success: "from-emerald-400 to-emerald-600",
  warning: "from-amber-400 to-orange-500",
} as const;

function Kartu({
  label,
  nilai,
  catatan,
  icon: Icon,
  tone,
}: {
  label: string;
  nilai: string;
  catatan?: string;
  icon: typeof Clock;
  tone: keyof typeof TONE;
}) {
  return (
    <div className="card flex items-center gap-3.5 p-4">
      <span
        className={cn(
          "grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white",
          TONE[tone],
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-muted">{label}</span>
        <span className="tabular block text-[15px] font-extrabold leading-tight tracking-tight text-ink sm:text-lg">
          {nilai}
        </span>
        {catatan && (
          <span className="block text-[11px] leading-tight text-muted">
            {catatan}
          </span>
        )}
      </span>
    </div>
  );
}
