"use client";

import {
  BellRing,
  Check,
  CircleCheck,
  Clock,
  Loader2,
  PackageX,
  RefreshCw,
  Send,
  WalletCards,
} from "lucide-react";
import { useState, useTransition } from "react";

import { WhatsAppIcon } from "@/components/icons/whatsapp";
import { Chip } from "@/components/ui/chip";
import { IconButton } from "@/components/ui/icon-button";
import { formatWaktuSingkat } from "@/lib/date";
import { cn } from "@/lib/utils";
import { buildWaLink, pesanPengingatUtang } from "@/lib/wa";
import {
  segarkanPengingat,
  ubahStatusPengingat,
} from "@/server/actions/pengingat";
import type {
  BarisPengingat,
  JenisPengingat,
} from "@/server/queries/pengingat";

const GAYA: Record<
  JenisPengingat,
  { label: string; icon: typeof WalletCards; kelas: string }
> = {
  debt_due: {
    label: "Kasbon",
    icon: WalletCards,
    kelas: "bg-amber-50 text-warning",
  },
  low_stock: {
    label: "Stok",
    icon: PackageX,
    kelas: "bg-red-50 text-danger",
  },
  daily_report: {
    label: "Harian",
    icon: Clock,
    kelas: "bg-brand-50 text-brand-600",
  },
};

type Saring = "menunggu" | "kasbon" | "stok" | "selesai";

export function PengingatClient({
  pengingat,
  statistik,
  namaToko,
}: {
  pengingat: BarisPengingat[];
  statistik: {
    menunggu: number;
    terkirim: number;
    selesai: number;
    kasbon: number;
    stok: number;
  };
  namaToko: string;
}) {
  const [saring, setSaring] = useState<Saring>("menunggu");
  const [pending, startTransition] = useTransition();
  const [menyegarkan, setMenyegarkan] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  const hasil = pengingat.filter((p) => {
    if (saring === "selesai") return p.status !== "pending";
    if (p.status !== "pending") return false;
    if (saring === "kasbon") return p.jenis === "debt_due";
    if (saring === "stok") return p.jenis === "low_stock";
    return true;
  });

  async function segarkan() {
    setMenyegarkan(true);
    setPesan(null);
    const r = await segarkanPengingat();
    setMenyegarkan(false);
    setPesan(
      r.ok
        ? `${r.jumlah ?? 0} pengingat disusun dari keadaan usaha saat ini.`
        : r.error,
    );
  }

  function ubah(id: string, status: "sent" | "dismissed" | "pending") {
    startTransition(async () => {
      await ubahStatusPengingat({ id, status });
    });
  }

  return (
    <div className="relative z-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">
            Pengingat
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            Disusun otomatis dari kasbon jatuh tempo, stok menipis, dan tutup
            buku.
          </p>
        </div>

        <button
          onClick={segarkan}
          disabled={menyegarkan}
          className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 px-5 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:opacity-60"
        >
          {menyegarkan ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Segarkan Pengingat
        </button>
      </div>

      {pesan && (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {pesan}
        </p>
      )}

      <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        <Kartu label="Menunggu" nilai={statistik.menunggu} icon={BellRing} tone="brand" />
        <Kartu label="Kasbon" nilai={statistik.kasbon} icon={WalletCards} tone="warning" />
        <Kartu label="Stok" nilai={statistik.stok} icon={PackageX} tone="danger" />
        <Kartu label="Sudah Ditangani" nilai={statistik.terkirim + statistik.selesai} icon={CircleCheck} tone="success" />
      </div>

      <section className="card min-w-0 p-5">
        <div className="thin-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {(
            [
              ["menunggu", "Menunggu"],
              ["kasbon", "Kasbon"],
              ["stok", "Stok"],
              ["selesai", "Sudah ditangani"],
            ] as [Saring, string][]
          ).map(([key, label]) => (
            <Chip key={key} aktif={saring === key} onClick={() => setSaring(key)}>
              {label}
            </Chip>
          ))}
        </div>

        <ul
          className="mt-4 divide-y divide-line/70 transition-opacity"
          style={{ opacity: pending ? 0.6 : 1 }}
        >
          {hasil.map((p) => {
            const g = GAYA[p.jenis];
            const bisaWa =
              p.jenis === "debt_due" && p.telepon && p.nama && p.sisa;

            return (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl",
                    g.kelas,
                  )}
                >
                  <g.icon className="size-[18px]" />
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm font-semibold",
                      p.status === "pending" ? "text-ink" : "text-muted line-through",
                    )}
                  >
                    {p.judul}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {g.label} · {p.isi}
                    {p.dikirimPada &&
                      ` · dikirim ${formatWaktuSingkat(p.dikirimPada)}`}
                  </p>
                </div>

                {p.status === "pending" ? (
                  <div className="flex shrink-0 items-center gap-1.5">
                    {bisaWa && (
                      <a
                        href={buildWaLink(
                          p.telepon!,
                          pesanPengingatUtang({
                            nama: p.nama!,
                            toko: namaToko,
                            sisa: p.sisa!,
                            tegas: true,
                          }),
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => ubah(p.id, "sent")}
                        className="inline-flex h-9 items-center gap-2 rounded-xl bg-success px-3 text-[13px] font-bold text-white transition-colors hover:bg-emerald-600"
                      >
                        <WhatsAppIcon className="size-4" />
                        Ingatkan
                      </a>
                    )}
                    {!bisaWa && (
                      <IconButton
                        label="Tandai terkirim"
                        onClick={() => ubah(p.id, "sent")}
                        icon={Send}
                      />
                    )}
                    <IconButton
                      label="Tandai selesai"
                      onClick={() => ubah(p.id, "dismissed")}
                      icon={Check}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => ubah(p.id, "pending")}
                    className="shrink-0 rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-canvas"
                  >
                    Kembalikan
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {hasil.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-canvas text-muted">
              <BellRing className="size-6" />
            </span>
            <p className="mt-3 text-sm font-semibold text-ink">
              {saring === "selesai"
                ? "Belum ada pengingat yang ditangani"
                : "Tidak ada pengingat menunggu"}
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted">
              Tekan Segarkan Pengingat untuk menyusun ulang dari kasbon, stok,
              dan tutup buku hari ini.
            </p>
          </div>
        )}
      </section>
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
  icon: Icon,
  tone,
}: {
  label: string;
  nilai: number;
  icon: typeof BellRing;
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
        <span className="tabular block text-lg font-extrabold leading-tight text-ink">
          {nilai}
        </span>
      </span>
    </div>
  );
}
