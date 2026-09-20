"use client";

import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Check, ImagePlus, Loader2, QrCode, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { aman } from "@/lib/aksi";
import { formatRupiah } from "@/lib/money";
import { LABEL_PERIODE, PAKET } from "@/lib/paket";
import { cn } from "@/lib/utils";
import {
  setujuiPembayaran,
  simpanQris,
  tolakPembayaran,
} from "@/server/actions/langganan";
import type { BarisTagihanAdmin, corongLangganan } from "@/server/langganan";

const waktu = (ms: number | null) =>
  ms ? format(new Date(ms), "d MMM yyyy, HH:mm", { locale: localeId }) : "—";

export function AdminLanggananClient({
  corong,
  perluDiperiksa,
  terakhir,
  qris,
}: {
  corong: ReturnType<typeof corongLangganan>;
  perluDiperiksa: BarisTagihanAdmin[];
  terakhir: BarisTagihanAdmin[];
  qris: { url: string | null; namaPenerima: string | null };
}) {
  const tahap = [
    { label: "Mendaftar", nilai: corong.daftar },
    { label: "Checkout", nilai: corong.checkout },
    { label: "Membayar", nilai: corong.bayar },
    { label: "Aktif", nilai: corong.aktif },
    { label: "Perpanjang", nilai: corong.perpanjang },
  ];

  return (
    <div className="relative z-10 space-y-6">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight text-ink">Verifikasi langganan</h1>
        <p className="mt-1 text-[15px] text-muted">
          Cocokkan nominal dengan mutasi QRIS, lalu setujui — langganannya aktif seketika.
        </p>
      </div>

      {/* Corong: daftar → checkout → bayar → aktif → perpanjang */}
      <section className="card p-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {tahap.map((t, i) => (
            <div key={t.label} className="rounded-2xl bg-canvas px-4 py-3">
              <p className="text-xs font-semibold text-muted">
                {i + 1}. {t.label}
              </p>
              <p className="tabular mt-1 text-2xl font-extrabold text-ink">{t.nilai}</p>
              {i > 0 && tahap[i - 1].nilai > 0 && (
                <p className="text-[11px] text-muted">
                  {Math.round((t.nilai / tahap[i - 1].nilai) * 100)}% dari tahap sebelumnya
                </p>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          Pendapatan langganan tercatat: <b className="text-ink">{formatRupiah(corong.pendapatan)}</b>
          {corong.habis > 0 && <> · {corong.habis} usaha sudah habis masa langganannya</>}
        </p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <section className="card p-5">
          <h2 className="card-title text-[17px]">Perlu diperiksa ({perluDiperiksa.length})</h2>
          {perluDiperiksa.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-muted">
              Tidak ada pembayaran yang menunggu.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {perluDiperiksa.map((t) => (
                <BarisPeriksa key={t.id} t={t} />
              ))}
            </ul>
          )}
        </section>

        <PengaturanQris qris={qris} />
      </div>

      <section className="card p-5">
        <h2 className="card-title text-[17px]">Keputusan terakhir</h2>
        {terakhir.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Belum ada.</p>
        ) : (
          <div className="thin-scroll mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="py-2 font-semibold">Usaha</th>
                  <th className="py-2 font-semibold">Paket</th>
                  <th className="py-2 text-right font-semibold">Nominal</th>
                  <th className="py-2 font-semibold">Status</th>
                  <th className="py-2 font-semibold">Diputuskan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {terakhir.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2.5">
                      <b className="text-ink">{t.namaUsaha ?? "—"}</b>
                      <span className="block text-xs text-muted">{t.namaPengguna}</span>
                    </td>
                    <td className="py-2.5 text-ink-soft">
                      {PAKET[t.paket].label} · {LABEL_PERIODE[t.periode]}
                    </td>
                    <td className="tabular py-2.5 text-right font-semibold">{formatRupiah(t.nominal)}</td>
                    <td className="py-2.5">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-bold",
                          t.status === "disetujui"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-danger",
                        )}
                      >
                        {t.status === "disetujui" ? "Disetujui" : "Ditolak"}
                      </span>
                      {t.catatan && <span className="block pt-1 text-xs text-muted">{t.catatan}</span>}
                    </td>
                    <td className="py-2.5 text-ink-soft">{waktu(t.diputuskanPada)}</td>
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

function BarisPeriksa({ t }: { t: BarisTagihanAdmin }) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [tolak, setTolak] = useState(false);
  const [alasan, setAlasan] = useState("Nominal tidak ditemukan di mutasi QRIS");
  const [error, setError] = useState<string | null>(null);

  function jalankan(f: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    mulai(async () => {
      const r = await aman(f());
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <li className="rounded-2xl border border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-ink">
            {t.namaUsaha ?? "—"}{" "}
            <span className="font-normal text-muted">· {t.namaPemilik} ({t.namaPengguna})</span>
          </p>
          <p className="text-sm text-ink-soft">
            {PAKET[t.paket].label} · {LABEL_PERIODE[t.periode]}
            {t.telepon && <> · {t.telepon}</>}
          </p>
          <p className="mt-1 text-xs text-muted">
            Tagihan {waktu(t.dibuatPada)}
            {t.dibayarPada && <> · klaim bayar {waktu(t.dibayarPada)}</>}
          </p>
        </div>
        <div className="text-right">
          <p className="tabular text-xl font-extrabold text-ink">{formatRupiah(t.nominal)}</p>
          <p className="text-xs text-muted">kode unik {t.kodeUnik}</p>
          <span
            className={cn(
              "mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold",
              t.status === "diperiksa" ? "bg-amber-50 text-amber-700" : "bg-canvas text-muted",
            )}
          >
            {t.status === "diperiksa" ? "Sudah bayar (klaim)" : "Belum konfirmasi"}
          </span>
        </div>
      </div>

      {t.bukti && (
        <a
          href={`/api/langganan/${t.bukti}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
        >
          <ImagePlus className="size-4" /> Lihat bukti bayar
        </a>
      )}

      {tolak ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            maxLength={200}
            className="h-10 flex-1 rounded-xl border border-line bg-canvas px-3 text-sm outline-none focus:border-brand-200 focus:bg-white"
          />
          <button
            onClick={() => jalankan(() => tolakPembayaran(t.id, alasan))}
            disabled={pending}
            className="h-10 rounded-xl bg-danger px-4 text-sm font-bold text-white disabled:opacity-60"
          >
            Tolak
          </button>
          <button onClick={() => setTolak(false)} className="h-10 rounded-xl px-3 text-sm text-ink-soft">
            Batal
          </button>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => jalankan(() => setujuiPembayaran(t.id))}
            disabled={pending}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-success px-4 text-sm font-bold text-white disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Setujui
          </button>
          <button
            onClick={() => setTolak(true)}
            disabled={pending}
            className="flex h-10 items-center gap-1.5 rounded-xl border border-line px-4 text-sm font-semibold text-ink-soft hover:bg-canvas"
          >
            <X className="size-4" /> Tolak
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </li>
  );
}

function PengaturanQris({ qris }: { qris: { url: string | null; namaPenerima: string | null } }) {
  const router = useRouter();
  const [nama, setNama] = useState(qris.namaPenerima ?? "");
  const [berkas, setBerkas] = useState<File | null>(null);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);
  const [pending, mulai] = useTransition();

  function simpan() {
    setPesan(null);
    mulai(async () => {
      const fd = new FormData();
      fd.set("namaPenerima", nama);
      // Gambar QRIS diunggah apa adanya — dikompres bisa membuat QR sulit terbaca.
      if (berkas) fd.set("gambar", berkas);
      const r = await aman(simpanQris(fd));
      setPesan(r.ok ? { ok: true, teks: "QRIS tersimpan" } : { ok: false, teks: r.error });
      if (r.ok) {
        setBerkas(null);
        router.refresh();
      }
    });
  }

  return (
    <section className="card p-5">
      <h2 className="card-title flex items-center gap-2 text-[17px]">
        <QrCode className="size-5 text-brand-500" /> QRIS penerima
      </h2>
      <p className="mt-1 text-sm text-muted">Ditampilkan ke pendaftar di halaman pembayaran.</p>

      <div className="mt-4 flex justify-center rounded-2xl bg-canvas p-4">
        {qris.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qris.url} alt="QRIS" className="max-h-64 rounded-xl" />
        ) : (
          <p className="py-8 text-sm text-amber-700">Belum ada QRIS — pendaftar belum bisa membayar.</p>
        )}
      </div>

      <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-ink-soft hover:bg-canvas">
        <ImagePlus className="size-5 text-muted" />
        <span className="min-w-0 flex-1 truncate">
          {berkas ? berkas.name : qris.url ? "Ganti gambar QRIS" : "Unggah gambar QRIS (PNG/JPG, maks 2 MB)"}
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => setBerkas(e.target.files?.[0] ?? null)}
        />
      </label>

      <label className="mt-3 block text-sm font-semibold text-ink">Nama penerima</label>
      <input
        value={nama}
        onChange={(e) => setNama(e.target.value)}
        maxLength={80}
        placeholder="mis. SYNONA / nama merchant QRIS"
        className="mt-1.5 h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm outline-none focus:border-brand-200 focus:bg-white"
      />

      {pesan && (
        <p className={cn("mt-3 text-sm", pesan.ok ? "text-success" : "text-danger")}>{pesan.teks}</p>
      )}
      <button
        onClick={simpan}
        disabled={pending}
        className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Simpan
      </button>
    </section>
  );
}
