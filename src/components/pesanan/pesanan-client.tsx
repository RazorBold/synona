"use client";

import {
  ClipboardList,
  Clock,
  HandCoins,
  Hourglass,
  PackageCheck,
  Plus,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";

import { PesananBaruDialog } from "@/components/pesanan/pesanan-baru-dialog";
import { PesananDetailDialog } from "@/components/pesanan/pesanan-detail-dialog";
import { Chip } from "@/components/ui/chip";
import { formatRupiah } from "@/lib/money";
import { formatTanggalPendek, labelJatuhTempo } from "@/lib/date";
import { ALUR_PESANAN, type StatusPesanan } from "@/lib/usaha";
import { cn } from "@/lib/utils";
import type { AkunKas } from "@/server/queries/kas";
import type { BarisLayanan } from "@/server/queries/layanan";
import type { BarisPesanan } from "@/server/queries/pesanan";

type Statistik = {
  masuk: number;
  dikerjakan: number;
  selesai: number;
  telat: number;
  omzetHari: number;
  belumLunas: number;
};

type Tab = "aktif" | StatusPesanan;

const GAYA_STATUS: Record<StatusPesanan, string> = {
  masuk: "bg-sky-50 text-sky-700",
  dikerjakan: "bg-amber-50 text-amber-700",
  selesai: "bg-emerald-50 text-emerald-700",
  diambil: "bg-canvas text-muted",
  batal: "bg-red-50 text-danger",
};

export function PesananClient({
  pesanan,
  layanan,
  pelanggan,
  petugas,
  akun,
  statistik,
  hariIni,
  namaToko,
}: {
  pesanan: BarisPesanan[];
  layanan: BarisLayanan[];
  pelanggan: { id: string; nama: string; phone: string | null }[];
  petugas: { id: string; nama: string; peran: string }[];
  akun: AkunKas[];
  statistik: Statistik;
  hariIni: string;
  namaToko: string;
}) {
  const [tab, setTab] = useState<Tab>("aktif");
  const [baruOpen, setBaruOpen] = useState(false);
  const [detail, setDetail] = useState<BarisPesanan | null>(null);

  const aktif = pesanan.filter((p) =>
    ["masuk", "dikerjakan", "selesai"].includes(p.status),
  );
  const tampil = tab === "aktif" ? aktif : pesanan.filter((p) => p.status === tab);

  const hitung = (s: Tab) =>
    s === "aktif" ? aktif.length : pesanan.filter((p) => p.status === s).length;

  return (
    <div className="relative z-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">
            Pesanan Jasa
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            Papan antrean pekerjaan — dari barang masuk sampai diserahkan.
          </p>
        </div>

        <button
          onClick={() => setBaruOpen(true)}
          disabled={layanan.length === 0}
          className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 px-5 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none"
        >
          <Plus className="size-4" strokeWidth={2.6} />
          Terima Pesanan
        </button>
      </div>

      {layanan.length === 0 && (
        <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          Belum ada layanan yang bisa dipesan. Isi dulu menu Layanan.
        </p>
      )}

      <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        <Kartu
          label="Antre Dikerjakan"
          nilai={String(statistik.masuk + statistik.dikerjakan)}
          catatan={`${statistik.masuk} belum disentuh`}
          icon={Hourglass}
          tone="brand"
        />
        <Kartu
          label="Siap Diambil"
          nilai={String(statistik.selesai)}
          icon={PackageCheck}
          tone="success"
        />
        <Kartu
          label="Lewat Janji"
          nilai={String(statistik.telat)}
          catatan="perlu dikabari"
          icon={Clock}
          tone="warning"
        />
        <Kartu
          label="Belum Dilunasi"
          nilai={formatRupiah(statistik.belumLunas)}
          icon={HandCoins}
          tone="danger"
        />
      </div>

      <section className="card min-w-0 p-5">
        <div className="thin-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Chip aktif={tab === "aktif"} onClick={() => setTab("aktif")}>
            Sedang Berjalan ({hitung("aktif")})
          </Chip>
          {ALUR_PESANAN.map((a) => (
            <Chip key={a.key} aktif={tab === a.key} onClick={() => setTab(a.key)}>
              {a.label} ({hitung(a.key)})
            </Chip>
          ))}
        </div>

        <ul className="mt-4 grid gap-3 lg:grid-cols-2">
          {tampil.map((p) => {
            const tempo =
              p.status === "masuk" || p.status === "dikerjakan"
                ? labelJatuhTempo(p.janjiSelesai, hariIni)
                : null;

            return (
              <li key={p.id}>
                <button
                  onClick={() => setDetail(p)}
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left transition-colors hover:border-brand-200",
                    tempo?.tone === "danger"
                      ? "border-red-100 bg-red-50/40"
                      : "border-line",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-canvas text-lg">
                      🧾
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">
                        {p.pelanggan ?? "Tanpa nama"}
                      </p>
                      <p className="tabular truncate text-xs text-muted">
                        {p.nomor} · {formatTanggalPendek(p.tanggal)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
                        GAYA_STATUS[p.status],
                      )}
                    >
                      {ALUR_PESANAN.find((a) => a.key === p.status)?.label}
                    </span>
                  </div>

                  <p className="mt-2.5 line-clamp-2 text-xs text-ink-soft">
                    {p.rincian}
                  </p>

                  {p.tandaBarang && (
                    <p className="mt-1 truncate text-[11px] text-muted">
                      Ciri: {p.tandaBarang}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line pt-3">
                    <span className="tabular text-base font-extrabold tracking-tight text-ink">
                      {formatRupiah(p.total)}
                    </span>
                    <span
                      className={cn(
                        "tabular text-xs font-semibold",
                        p.sisa > 0 ? "text-warning" : "text-success",
                      )}
                    >
                      {p.sisa > 0 ? `sisa ${formatRupiah(p.sisa)}` : "Lunas"}
                    </span>
                  </div>

                  {tempo && (
                    <p
                      className={cn(
                        "mt-1.5 text-[11px] font-medium",
                        tempo.tone === "danger"
                          ? "text-danger"
                          : tempo.tone === "warning"
                            ? "text-warning"
                            : "text-muted",
                      )}
                    >
                      Janji selesai: {tempo.text}
                    </p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {tampil.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-canvas text-muted">
              <ClipboardList className="size-6" />
            </span>
            <p className="mt-3 text-sm font-semibold text-ink">
              Tidak ada pesanan di sini
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted">
              Pesanan yang diterima akan muncul di papan ini sampai barangnya
              diserahkan kembali.
            </p>
          </div>
        )}
      </section>

      <PesananBaruDialog
        open={baruOpen}
        onOpenChange={setBaruOpen}
        layanan={layanan}
        pelanggan={pelanggan}
        petugas={petugas}
        akun={akun}
        hariIni={hariIni}
        namaToko={namaToko}
      />
      <PesananDetailDialog
        open={detail !== null}
        onOpenChange={(v: boolean) => !v && setDetail(null)}
        pesanan={detail}
        akun={akun}
        hariIni={hariIni}
        namaToko={namaToko}
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
