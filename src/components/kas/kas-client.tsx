"use client";

import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Landmark,
  Pencil,
  Plus,
  Smartphone,
  Wallet,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { AkunKasDialog } from "@/components/kas/akun-kas-dialog";
import { TransferKasDialog } from "@/components/kas/transfer-kas-dialog";
import { Chip } from "@/components/ui/chip";
import { IconButton } from "@/components/ui/icon-button";
import { formatTanggalPendek } from "@/lib/date";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import { LABEL_JENIS_AKUN, LABEL_KATEGORI, type JenisAkun } from "@/lib/kas";
import type { AkunKas, BarisMutasi, SaldoAkun } from "@/server/queries/kas";

const IKON_AKUN: Record<JenisAkun, typeof Wallet> = {
  kas: Banknote,
  bank: Landmark,
  ewallet: Smartphone,
};

const PERIODE = [
  { id: "bulan", label: "Bulan Ini" },
  { id: "30hari", label: "30 Hari" },
  { id: "7hari", label: "7 Hari" },
];

export function KasClient({
  akun,
  saldo,
  mutasi,
  periode,
  akunTerpilih,
  hariIni,
}: {
  akun: AkunKas[];
  saldo: SaldoAkun[];
  mutasi: BarisMutasi[];
  periode: string;
  akunTerpilih: string | null;
  hariIni: string;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [terpilih, setTerpilih] = useState<AkunKas | null>(null);

  const totalSaldo = saldo.reduce((a, s) => a + s.saldoAkhir, 0);
  const totalMasuk = saldo.reduce((a, s) => a + s.masuk, 0);
  const totalKeluar = saldo.reduce((a, s) => a + s.keluar, 0);

  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function ganti(kunci: "periode" | "akun", nilai: string | null) {
    const next = new URLSearchParams(params.toString());
    if (nilai) next.set(kunci, nilai);
    else next.delete(kunci);
    startTransition(() => router.push(`${pathname}?${next}`, { scroll: false }));
  }

  return (
    <div
      className="relative z-10 space-y-6 transition-opacity"
      style={{ opacity: pending ? 0.6 : 1 }}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">
            Kas &amp; Bank
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            Uang laci, rekening, dan dompet digital — masing-masing saldonya.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setTerpilih(null);
              setFormOpen(true);
            }}
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-line bg-white px-4 text-sm font-bold text-ink-soft shadow-card transition-colors hover:bg-canvas"
          >
            <Plus className="size-4" strokeWidth={2.6} />
            Tambah Akun
          </button>
          <button
            onClick={() => setTransferOpen(true)}
            disabled={akun.length < 2}
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 px-5 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none"
          >
            <ArrowLeftRight className="size-4" />
            Pindah Uang
          </button>
        </div>
      </div>

      <div className="thin-scroll -mx-1 flex gap-2 overflow-x-auto px-1">
        {PERIODE.map((p) => (
          <Chip
            key={p.id}
            aktif={periode === p.id}
            onClick={() => ganti("periode", p.id)}
          >
            {p.label}
          </Chip>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Ringkas
          label="Total Saldo Sekarang"
          nilai={formatRupiah(totalSaldo)}
          icon={Wallet}
          tone="brand"
        />
        <Ringkas
          label="Uang Masuk"
          nilai={formatRupiah(totalMasuk)}
          icon={ArrowDownLeft}
          tone="success"
        />
        <Ringkas
          label="Uang Keluar"
          nilai={formatRupiah(totalKeluar)}
          icon={ArrowUpRight}
          tone="danger"
        />
      </div>

      {/* --- Saldo per akun --- */}
      <section className="card min-w-0 p-5">
        <h2 className="text-base font-extrabold tracking-tight text-ink">
          Saldo per Akun
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          Saldo awal periode, mutasinya, lalu posisi terakhir.
        </p>

        <ul className="mt-4 grid gap-3 lg:grid-cols-2">
          {saldo.map((s) => {
            const Icon = IKON_AKUN[s.jenis];
            const asli = akun.find((a) => a.id === s.id);
            return (
              <li key={s.id} className="rounded-2xl border border-line p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{s.nama}</p>
                    <p className="truncate text-xs text-muted">
                      {s.namaBank ?? LABEL_JENIS_AKUN[s.jenis]}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <IconButton
                      label="Ubah akun"
                      onClick={() => {
                        setTerpilih(asli ?? null);
                        setFormOpen(true);
                      }}
                      icon={Pencil}
                    />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                  <Angka label="Saldo awal" nilai={s.saldoAwal} />
                  <Angka label="Masuk" nilai={s.masuk} tone="success" />
                  <Angka label="Keluar" nilai={s.keluar} tone="danger" />
                </div>

                <div className="mt-3 flex items-baseline justify-between rounded-xl bg-canvas px-3 py-2.5">
                  <span className="text-xs font-semibold text-muted">
                    Saldo sekarang
                  </span>
                  <span
                    className={cn(
                      "tabular text-lg font-extrabold tracking-tight",
                      s.saldoAkhir < 0 ? "text-danger" : "text-ink",
                    )}
                  >
                    {formatRupiah(s.saldoAkhir)}
                  </span>
                </div>

                {s.saldoAkhir < 0 && (
                  <p className="mt-2 text-[11px] font-medium text-danger">
                    Saldo minus — kemungkinan ada pengeluaran yang salah akun,
                    atau saldo awal akun ini belum diisi.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* --- Mutasi --- */}
      <section className="card min-w-0 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-ink">
              Mutasi Keluar Masuk
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Setiap baris berasal dari catatan aslinya — penjualan, belanja,
              beban, atau pindah uang.
            </p>
          </div>
        </div>

        <div className="thin-scroll -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
          <Chip aktif={!akunTerpilih} onClick={() => ganti("akun", null)}>
            Semua Akun
          </Chip>
          {akun.map((a) => (
            <Chip
              key={a.id}
              aktif={akunTerpilih === a.id}
              onClick={() => ganti("akun", a.id)}
            >
              {a.nama}
            </Chip>
          ))}
        </div>

        <ul className="mt-3 divide-y divide-line/70">
          {mutasi.map((m) => (
            <li key={`${m.kategori}-${m.refId}`} className="flex items-center gap-3 py-3">
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl",
                  m.nilai > 0
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-rose-50 text-danger",
                )}
              >
                {m.nilai > 0 ? (
                  <ArrowDownLeft className="size-4" />
                ) : (
                  <ArrowUpRight className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {m.keterangan}
                </p>
                <p className="truncate text-xs text-muted">
                  {formatTanggalPendek(m.tanggal)} · {LABEL_KATEGORI[m.kategori]}{" "}
                  · {m.namaAkun}
                </p>
              </div>
              <p
                className={cn(
                  "tabular shrink-0 text-sm font-bold",
                  m.nilai > 0 ? "text-emerald-600" : "text-danger",
                )}
              >
                {m.nilai > 0 ? "+" : "−"}
                {formatRupiah(Math.abs(m.nilai)).replace("Rp ", "Rp ")}
              </p>
            </li>
          ))}
        </ul>

        {mutasi.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-canvas text-muted">
              <Wallet className="size-6" />
            </span>
            <p className="mt-3 text-sm font-semibold text-ink">
              Belum ada mutasi di periode ini
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted">
              Penjualan, pembelian, dan beban akan muncul di sini begitu
              dicatat.
            </p>
          </div>
        )}
      </section>

      <AkunKasDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        akun={terpilih}
        jumlahAkun={akun.length}
      />
      <TransferKasDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        akun={akun}
        hariIni={hariIni}
      />
    </div>
  );
}

function Angka({
  label,
  nilai,
  tone,
}: {
  label: string;
  nilai: number;
  tone?: "success" | "danger";
}) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p
        className={cn(
          "tabular text-[13px] font-bold",
          tone === "success"
            ? "text-emerald-600"
            : tone === "danger"
              ? "text-danger"
              : "text-ink",
        )}
      >
        {formatRupiah(nilai)}
      </p>
    </div>
  );
}

const TONE = {
  brand: "from-brand-400 to-brand-600",
  success: "from-emerald-400 to-emerald-600",
  danger: "from-rose-400 to-red-500",
} as const;

function Ringkas({
  label,
  nilai,
  icon: Icon,
  tone,
}: {
  label: string;
  nilai: string;
  icon: typeof Wallet;
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
        <span className="tabular block text-lg font-extrabold leading-tight tracking-tight text-ink">
          {nilai}
        </span>
      </span>
    </div>
  );
}
