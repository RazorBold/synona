"use client";

import {
  Banknote,
  CircleCheck,
  Loader2,
  QrCode,
  TriangleAlert,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { formatTanggalPanjang, formatTanggalPendek } from "@/lib/date";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import { simpanRekonsiliasi } from "@/server/actions/rekonsiliasi";
import type {
  BarisRekonsiliasi,
  RingkasanKas,
} from "@/server/queries/rekonsiliasi";

/** MDR QRIS ±0,3% dipotong dari settlement, jadi selisih segitu masih wajar. */
const MDR = 0.003;
const AMBANG_KAS = 5_000;

export function RekonsiliasiClient({
  sistem,
  tersimpan,
  riwayat,
  tanggal,
}: {
  sistem: RingkasanKas;
  tersimpan: BarisRekonsiliasi | null;
  riwayat: BarisRekonsiliasi[];
  tanggal: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pindah, startTransition] = useTransition();

  const [kasFisik, setKasFisik] = useState(tersimpan?.kasFisik ?? 0);
  const [qrisSettled, setQrisSettled] = useState(tersimpan?.qrisSettled ?? 0);
  const [catatan, setCatatan] = useState(tersimpan?.catatan ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);

  const selisihKas = kasFisik - sistem.kasSistem;
  const selisihQris = qrisSettled - sistem.qrisSistem;
  const mdrWajar = Math.round(sistem.qrisSistem * MDR);

  const kasBermasalah = Math.abs(selisihKas) > AMBANG_KAS;
  const qrisBermasalah =
    sistem.qrisSistem > 0 && Math.abs(selisihQris + mdrWajar) > mdrWajar * 2 + 1000;

  function gantiTanggal(nilai: string) {
    const next = new URLSearchParams(params.toString());
    next.set("tanggal", nilai);
    startTransition(() => router.push(`${pathname}?${next}`, { scroll: false }));
  }

  async function simpan() {
    setPending(true);
    setError(null);
    setSukses(false);

    const hasil = await simpanRekonsiliasi({
      tanggal,
      kasFisik,
      qrisSettled,
      catatan: catatan.trim() || null,
    });

    setPending(false);
    if (!hasil.ok) return setError(hasil.error);
    setSukses(true);
  }

  return (
    <div
      className="relative z-10 space-y-6 transition-opacity"
      style={{ opacity: pindah ? 0.6 : 1 }}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">
            Kas &amp; Rekonsiliasi
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            Cocokkan uang di laci dengan catatan sistem sebelum tutup toko.
          </p>
        </div>

        <input
          type="date"
          value={tanggal}
          onChange={(e) => gantiTanggal(e.target.value)}
          className="h-12 rounded-2xl border border-line bg-white px-4 text-sm font-semibold text-ink shadow-card outline-none focus:border-brand-200 focus:ring-4 focus:ring-brand-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Kas tunai */}
        <section className="card p-5 lg:col-span-2">
          <h2 className="card-title flex items-center gap-2 text-[17px]">
            <Banknote className="size-[18px] text-brand-500" />
            Kas Tunai · {formatTanggalPanjang(tanggal)}
          </h2>

          <div className="mt-4 space-y-2">
            <Baris label="Penjualan tunai" nilai={sistem.penjualanTunai} masuk />
            <Baris label="Cicilan kasbon (tunai)" nilai={sistem.cicilanTunai} masuk />
            <Baris label="Beli bahan (tunai)" nilai={-sistem.pembelianTunai} />
            <Baris label="Bayar hutang supplier" nilai={-sistem.hutangTunai} />
            <Baris label="Beban & tagihan (tunai)" nilai={-sistem.bebanTunai} />

            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="text-sm font-bold text-ink">
                Kas menurut sistem
              </span>
              <span className="tabular text-lg font-extrabold text-ink">
                {formatRupiah(sistem.kasSistem)}
              </span>
            </div>
          </div>

          <div className="mt-5">
            <label className="text-sm font-semibold text-ink">
              Kas fisik hasil hitung
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-canvas px-4 focus-within:border-brand-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100">
              <span className="text-sm font-semibold text-muted">Rp</span>
              <input
                type="number"
                min={0}
                value={kasFisik || ""}
                placeholder="0"
                onChange={(e) => setKasFisik(Number(e.target.value))}
                className="tabular h-12 w-full bg-transparent text-right text-lg font-bold text-ink outline-none"
              />
            </div>
            <button
              onClick={() => setKasFisik(sistem.kasSistem)}
              className="mt-2 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-brand-200 hover:text-brand-600"
            >
              Samakan dengan sistem
            </button>
          </div>

          <div
            className={cn(
              "mt-4 flex items-center justify-between rounded-2xl px-4 py-3",
              selisihKas === 0
                ? "bg-emerald-50"
                : kasBermasalah
                  ? "bg-red-50"
                  : "bg-amber-50",
            )}
          >
            <span
              className={cn(
                "text-sm font-semibold",
                selisihKas === 0
                  ? "text-emerald-700"
                  : kasBermasalah
                    ? "text-danger"
                    : "text-amber-700",
              )}
            >
              {selisihKas === 0
                ? "Kas cocok"
                : selisihKas > 0
                  ? "Kas lebih"
                  : "Kas kurang"}
            </span>
            <span
              className={cn(
                "tabular text-lg font-extrabold",
                selisihKas === 0
                  ? "text-emerald-700"
                  : kasBermasalah
                    ? "text-danger"
                    : "text-amber-700",
              )}
            >
              {formatRupiah(selisihKas)}
            </span>
          </div>
        </section>

        {/* QRIS */}
        <section className="card flex flex-col p-5">
          <h2 className="card-title flex items-center gap-2 text-[17px]">
            <QrCode className="size-[18px] text-info" />
            QRIS
          </h2>

          <div className="mt-4 space-y-2">
            <Baris label="QRIS menurut sistem" nilai={sistem.qrisSistem} masuk />
            <Baris label="Perkiraan MDR 0,3%" nilai={-mdrWajar} />
            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="text-[13px] font-bold text-ink">
                Wajar diterima
              </span>
              <span className="tabular text-sm font-extrabold text-ink">
                {formatRupiah(sistem.qrisSistem - mdrWajar)}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-semibold text-ink">
              Settlement diterima
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-canvas px-4 focus-within:border-brand-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100">
              <span className="text-sm font-semibold text-muted">Rp</span>
              <input
                type="number"
                min={0}
                value={qrisSettled || ""}
                placeholder="0"
                onChange={(e) => setQrisSettled(Number(e.target.value))}
                className="tabular h-12 w-full bg-transparent text-right text-sm font-bold text-ink outline-none"
              />
            </div>
          </div>

          <div
            className={cn(
              "mt-4 flex items-center justify-between rounded-2xl px-4 py-3",
              qrisBermasalah ? "bg-red-50" : "bg-canvas",
            )}
          >
            <span
              className={cn(
                "text-[13px] font-semibold",
                qrisBermasalah ? "text-danger" : "text-muted",
              )}
            >
              Selisih QRIS
            </span>
            <span
              className={cn(
                "tabular text-base font-extrabold",
                qrisBermasalah ? "text-danger" : "text-ink",
              )}
            >
              {formatRupiah(selisihQris)}
            </span>
          </div>
        </section>
      </div>

      <section className="card p-5">
        <label className="text-sm font-semibold text-ink">
          Catatan tutup buku{" "}
          <span className="font-normal text-muted">(opsional)</span>
        </label>
        <input
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="Contoh: selisih karena uang kembalian belum dicatat"
          className="mt-2 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm text-ink outline-none focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100"
        />

        {(kasBermasalah || qrisBermasalah) && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            Selisih di luar batas wajar. Beri catatan supaya bisa ditelusuri
            nanti.
          </p>
        )}

        {error && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        {sukses && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <CircleCheck className="mt-0.5 size-4 shrink-0" />
            Tutup buku tersimpan.
          </p>
        )}

        <button
          onClick={simpan}
          disabled={pending}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none sm:w-auto sm:px-8"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {tersimpan ? "Perbarui Tutup Buku" : "Simpan Tutup Buku"}
        </button>
      </section>

      <section className="card min-w-0 p-5">
        <h2 className="card-title text-[17px]">Riwayat Tutup Buku</h2>
        {riwayat.length === 0 ? (
          <p className="mt-3 rounded-xl bg-canvas px-4 py-8 text-center text-sm text-muted">
            Belum ada tutup buku tersimpan.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="pb-3 pl-2 pr-3">Tanggal</th>
                  <th className="pb-3 pr-3 text-right">Kas Sistem</th>
                  <th className="pb-3 pr-3 text-right">Kas Fisik</th>
                  <th className="pb-3 pr-3 text-right">Selisih Kas</th>
                  <th className="pb-3 pr-2 text-right">Selisih QRIS</th>
                </tr>
              </thead>
              <tbody>
                {riwayat.map((r) => (
                  <tr key={r.id} className="border-b border-line/70">
                    <td className="py-3 pl-2 pr-3 text-sm font-semibold text-ink">
                      {formatTanggalPendek(r.tanggal)}
                    </td>
                    <td className="tabular py-3 pr-3 text-right text-sm text-muted">
                      {formatRupiah(r.kasSistem)}
                    </td>
                    <td className="tabular py-3 pr-3 text-right text-sm text-ink">
                      {formatRupiah(r.kasFisik)}
                    </td>
                    <td
                      className={cn(
                        "tabular py-3 pr-3 text-right text-sm font-bold",
                        r.selisihKas === 0
                          ? "text-success"
                          : Math.abs(r.selisihKas) > AMBANG_KAS
                            ? "text-danger"
                            : "text-warning",
                      )}
                    >
                      {formatRupiah(r.selisihKas)}
                    </td>
                    <td className="tabular py-3 pr-2 text-right text-sm text-muted">
                      {formatRupiah(r.selisihQris)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Baris({
  label,
  nilai,
  masuk = false,
}: {
  label: string;
  nilai: number;
  masuk?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-muted">{label}</span>
      <span
        className={cn(
          "tabular text-[13px] font-semibold",
          masuk ? "text-ink" : nilai === 0 ? "text-muted" : "text-danger",
        )}
      >
        {formatRupiah(nilai)}
      </span>
    </div>
  );
}
