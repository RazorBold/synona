"use client";

import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  ImagePlus,
  Loader2,
  LogOut,
  QrCode,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { LogoSynona } from "@/components/ui/logo-synona";
import { aman } from "@/lib/aksi";
import { kompresGambar } from "@/lib/gambar";
import { formatRupiah } from "@/lib/money";
import {
  LABEL_PERIODE,
  PAKET,
  hargaPaket,
  type Paket,
  type Periode,
  type StatusLangganan,
} from "@/lib/paket";
import { cn } from "@/lib/utils";
import { keluar } from "@/server/actions/auth";
import {
  batalkanTagihan,
  buatTagihan,
  konfirmasiBayar,
} from "@/server/actions/langganan";
import type { Tagihan } from "@/server/langganan";

const URUTAN: Paket[] = ["mulai", "tumbuh", "juara"];

const tgl = (ms: number) => format(new Date(ms), "d MMMM yyyy", { locale: localeId });

type Props = {
  namaUsaha: string;
  namaAkun: string;
  pemilik: boolean;
  status: StatusLangganan;
  paketSekarang: Paket;
  berakhir: number | null;
  terbuka: Tagihan | null;
  ditolak: Tagihan | null;
  riwayat: Tagihan[];
  qris: { url: string | null; namaPenerima: string | null };
};

export function LanggananClient(p: Props) {
  // Langkah yang sedang berjalan; 5 = semua selesai. "Daftar" selalu sudah
  // selesai — orang yang sampai di halaman ini sudah punya akun.
  const langkah =
    p.status === "aktif" || p.status === "bebas" ? 5 : p.terbuka ? 3 : 2;

  return (
    <div className="min-h-dvh bg-[linear-gradient(135deg,#f2f2fd_0%,#f7f7ff_45%,#eeeefc_100%)]">
      <header className="border-b border-line/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <LogoSynona tinggi={32} />
            <span className="text-lg font-extrabold tracking-tight text-ink">Synona</span>
          </div>
          <div className="flex items-center gap-2">
            {(p.status === "aktif" || p.status === "bebas" || p.status === "habis") && (
              <Link
                href="/"
                className="hidden h-10 items-center rounded-xl px-3 text-sm font-semibold text-ink-soft hover:bg-canvas sm:flex"
              >
                Ke dashboard
              </Link>
            )}
            <form action={keluar}>
              <button className="flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-ink-soft hover:bg-canvas">
                <LogOut className="size-4" /> Keluar
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="text-center">
          <p className="text-sm font-semibold text-brand-600">{p.namaUsaha}</p>
          <h1 className="mt-1 text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold tracking-tight text-ink">
            {p.status === "belum-aktif"
              ? "Satu langkah lagi — aktifkan langganan"
              : p.status === "habis"
                ? "Perpanjang langganan Synona"
                : "Langganan Synona"}
          </h1>
          <StatusSingkat {...p} />
        </div>

        <Langkah aktif={langkah} />

        {!p.pemilik ? (
          <Kartu className="mx-auto mt-8 max-w-xl text-center">
            <p className="text-sm text-ink-soft">
              Langganan diurus oleh pemilik usaha. Minta pemilik masuk dengan
              akunnya untuk membayar atau memperpanjang.
            </p>
          </Kartu>
        ) : p.terbuka?.status === "diperiksa" ? (
          <MenungguVerifikasi tagihan={p.terbuka} />
        ) : p.terbuka ? (
          <PanelBayar tagihan={p.terbuka} qris={p.qris} />
        ) : p.status === "bebas" ? (
          <Kartu className="mx-auto mt-8 max-w-xl text-center">
            <p className="text-sm text-ink-soft">
              Akun ini terdaftar sebelum ada langganan berbayar, jadi tetap bisa
              dipakai tanpa pembayaran.
            </p>
          </Kartu>
        ) : (
          <>
            {p.ditolak && (
              <p className="mx-auto mt-8 flex max-w-3xl items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-danger">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>
                  Pembayaran {formatRupiah(p.ditolak.nominal)} tidak dapat
                  diverifikasi: <b>{p.ditolak.catatan}</b>. Silakan buat tagihan baru.
                </span>
              </p>
            )}
            <PilihPaket paketSekarang={p.status === "aktif" ? p.paketSekarang : null} />
          </>
        )}

        {p.riwayat.length > 0 && (
          <Kartu className="mx-auto mt-10 max-w-3xl">
            <p className="text-sm font-bold text-ink">Riwayat pembayaran</p>
            <ul className="mt-3 divide-y divide-line text-sm">
              {p.riwayat.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span className="text-ink-soft">
                    {PAKET[r.paket].label} · {LABEL_PERIODE[r.periode]}
                    {r.berlakuDari && r.berlakuSampai && (
                      <span className="text-muted">
                        {" "}
                        · {tgl(r.berlakuDari)} – {tgl(r.berlakuSampai)}
                      </span>
                    )}
                  </span>
                  <span className="tabular font-semibold text-ink">{formatRupiah(r.nominal)}</span>
                </li>
              ))}
            </ul>
          </Kartu>
        )}
      </main>
    </div>
  );
}

function StatusSingkat(p: Props) {
  if (p.status === "aktif" && p.berakhir) {
    return (
      <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">
        <CheckCircle2 className="size-4" />
        Paket {PAKET[p.paketSekarang].label} aktif sampai {tgl(p.berakhir)}
      </p>
    );
  }
  if (p.status === "habis" && p.berakhir) {
    return (
      <p className="mt-2 text-sm text-danger">
        Berakhir {tgl(p.berakhir)}. Data Anda aman dan tetap bisa dilihat, tapi
        belum bisa mencatat transaksi baru sampai diperpanjang.
      </p>
    );
  }
  if (p.status === "belum-aktif") {
    return (
      <p className="mx-auto mt-2 max-w-xl text-[15px] text-ink-soft">
        Akun <b>{p.namaAkun}</b> sudah dibuat. Pilih paket, bayar lewat QRIS,
        dan Synona siap dipakai begitu pembayaran diverifikasi.
      </p>
    );
  }
  return null;
}

function Langkah({ aktif }: { aktif: number }) {
  const daftar = ["Daftar", "Pilih paket", "Bayar QRIS", "Langganan aktif"];
  return (
    <ol className="mx-auto mt-8 flex max-w-3xl items-center">
      {daftar.map((l, i) => {
        const n = i + 1;
        const selesai = n < aktif;
        const sekarang = n === aktif;
        return (
          <li key={l} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-full text-sm font-bold",
                  selesai
                    ? "bg-success text-white"
                    : sekarang
                      ? "bg-brand-500 text-white ring-4 ring-brand-100"
                      : "bg-white text-muted ring-1 ring-line",
                )}
              >
                {selesai ? <Check className="size-4" /> : n}
              </span>
              <span className="whitespace-nowrap text-[11px] font-semibold text-ink-soft sm:text-xs">
                {l}
              </span>
            </div>
            {n < daftar.length && (
              <span
                className={cn("mx-1 mb-5 h-0.5 flex-1 rounded", n < aktif ? "bg-success" : "bg-line")}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function PilihPaket({ paketSekarang }: { paketSekarang: Paket | null }) {
  const router = useRouter();
  const [periode, setPeriode] = useState<Periode>("bulan");
  const [dipilih, setDipilih] = useState<Paket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, mulai] = useTransition();

  function pilih(paket: Paket) {
    setDipilih(paket);
    setError(null);
    mulai(async () => {
      const r = await aman(buatTagihan({ paket, periode }));
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <section className="mt-8">
      <div className="flex justify-center">
        <div className="inline-flex rounded-2xl border border-line bg-white p-1 shadow-card">
          {(["bulan", "tahun"] as Periode[]).map((pr) => (
            <button
              key={pr}
              onClick={() => setPeriode(pr)}
              className={cn(
                "flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-bold transition-colors",
                periode === pr ? "bg-brand-500 text-white" : "text-ink-soft hover:bg-canvas",
              )}
            >
              {LABEL_PERIODE[pr]}
              {pr === "tahun" && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-extrabold",
                    periode === pr ? "bg-white/20" : "bg-emerald-50 text-emerald-700",
                  )}
                >
                  GRATIS 2 BULAN
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-6 grid max-w-5xl gap-5 md:grid-cols-3">
        {URUTAN.map((k) => {
          const pk = PAKET[k];
          const unggulan = k === "tumbuh";
          const harga = hargaPaket(k, periode);
          return (
            <div
              key={k}
              className={cn(
                "relative flex flex-col rounded-3xl border bg-white p-6 shadow-card",
                unggulan ? "border-brand-300 ring-4 ring-brand-100" : "border-line",
              )}
            >
              {unggulan && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white">
                  Paling pas
                </span>
              )}
              <p className="flex items-center gap-2 text-lg font-extrabold text-ink">
                <Crown className="size-5 fill-amber-400 text-amber-500" /> {pk.label}
                {paketSekarang === k && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                    Paket Anda
                  </span>
                )}
              </p>
              <p className="mt-3">
                <span className="tabular text-[28px] font-extrabold tracking-tight text-ink">
                  {formatRupiah(harga)}
                </span>
                <span className="text-sm text-muted"> /{periode === "tahun" ? "tahun" : "bulan"}</span>
              </p>
              {periode === "tahun" && (
                <p className="text-xs text-muted">
                  setara {formatRupiah(Math.round(harga / 12))}/bulan
                </p>
              )}
              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-ink-soft">
                {pk.fitur.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => pilih(k)}
                disabled={pending}
                className={cn(
                  "mt-6 flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-bold transition-opacity disabled:opacity-60",
                  unggulan
                    ? "bg-gradient-to-r from-brand-500 to-brand-400 text-white shadow-pop"
                    : "border border-brand-200 bg-brand-50 text-brand-600",
                )}
              >
                {pending && dipilih === k ? <Loader2 className="size-4 animate-spin" /> : null}
                {paketSekarang === k ? "Perpanjang" : "Pilih paket ini"}
                <ArrowRight className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
      {error && (
        <p className="mx-auto mt-4 max-w-xl rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </section>
  );
}

function PanelBayar({
  tagihan,
  qris,
}: {
  tagihan: Tagihan;
  qris: Props["qris"];
}) {
  const router = useRouter();
  const [bukti, setBukti] = useState<File | null>(null);
  const [tersalin, setTersalin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, mulai] = useTransition();

  function salin() {
    void navigator.clipboard?.writeText(String(tagihan.nominal)).then(() => {
      setTersalin(true);
      setTimeout(() => setTersalin(false), 1500);
    });
  }

  function sudahBayar() {
    setError(null);
    mulai(async () => {
      const fd = new FormData();
      fd.set("id", tagihan.id);
      if (bukti) fd.set("bukti", await kompresGambar(bukti).catch(() => bukti));
      const r = await aman(konfirmasiBayar(fd));
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  function ganti() {
    mulai(async () => {
      await aman(batalkanTagihan(tagihan.id));
      router.refresh();
    });
  }

  return (
    <section className="mx-auto mt-8 grid max-w-4xl gap-5 md:grid-cols-[1fr_1.1fr]">
      <Kartu className="flex flex-col items-center text-center">
        <p className="flex items-center gap-2 text-sm font-bold text-ink">
          <QrCode className="size-4 text-brand-500" /> Pindai QRIS
        </p>
        {qris.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qris.url}
            alt="QRIS pembayaran Synona"
            className="mt-4 w-full max-w-[300px] rounded-2xl border border-line"
          />
        ) : (
          <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-6 text-sm text-amber-700">
            QRIS belum dipasang oleh pengelola Synona. Silakan hubungi admin.
          </p>
        )}
        {qris.namaPenerima && (
          <p className="mt-3 text-sm text-ink-soft">
            a.n. <b>{qris.namaPenerima}</b>
          </p>
        )}
        <p className="mt-2 text-xs text-muted">
          Bisa dibayar dari aplikasi bank atau e-wallet mana pun (GoPay, OVO,
          DANA, ShopeePay, m-banking).
        </p>
      </Kartu>

      <Kartu>
        <p className="text-sm text-muted">
          Paket {PAKET[tagihan.paket].label} · {LABEL_PERIODE[tagihan.periode]}
        </p>
        <p className="mt-4 text-sm font-semibold text-ink">Bayar tepat sebesar</p>
        <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-brand-50 to-violet-50 px-5 py-4">
          <span className="tabular text-[30px] font-extrabold tracking-tight text-ink">
            {formatRupiah(tagihan.nominal)}
          </span>
          <button
            onClick={salin}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-bold text-brand-600 shadow-card"
          >
            {tersalin ? <Check className="size-4" /> : <Copy className="size-4" />}
            {tersalin ? "Tersalin" : "Salin"}
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Harga paket {formatRupiah(tagihan.harga)} + kode unik{" "}
          <b className="text-ink">{tagihan.kodeUnik}</b>. Ketik nominal persis
          sampai digit terakhir — dari situ pembayaran Anda dikenali.
        </p>

        <label className="mt-5 block text-sm font-semibold text-ink">
          Bukti bayar <span className="font-normal text-muted">(opsional, mempercepat verifikasi)</span>
        </label>
        <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-line bg-canvas px-4 py-3 text-sm text-ink-soft hover:bg-white">
          <ImagePlus className="size-5 text-muted" />
          <span className="min-w-0 flex-1 truncate">
            {bukti ? bukti.name : "Unggah tangkapan layar pembayaran"}
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => setBukti(e.target.files?.[0] ?? null)}
          />
        </label>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">{error}</p>
        )}

        <button
          onClick={sudahBayar}
          disabled={pending}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-sm font-bold text-white shadow-pop disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Saya sudah bayar
        </button>
        <button
          onClick={ganti}
          disabled={pending}
          className="mt-2 h-10 w-full rounded-2xl text-sm font-semibold text-ink-soft hover:bg-canvas"
        >
          Ganti paket
        </button>
      </Kartu>
    </section>
  );
}

function MenungguVerifikasi({ tagihan }: { tagihan: Tagihan }) {
  const router = useRouter();

  // Cek ulang berkala: begitu pengelola menyetujui, halaman berubah sendiri.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <Kartu className="mx-auto mt-8 max-w-xl text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-amber-50 text-amber-500">
        <Clock className="size-7" />
      </span>
      <p className="mt-4 text-lg font-extrabold text-ink">Pembayaran sedang diverifikasi</p>
      <p className="mt-1 text-sm text-ink-soft">
        {formatRupiah(tagihan.nominal)} · Paket {PAKET[tagihan.paket].label}{" "}
        {LABEL_PERIODE[tagihan.periode].toLowerCase()}
      </p>
      <p className="mt-4 text-sm text-muted">
        Biasanya tidak lama. Halaman ini diperbarui otomatis — begitu
        disetujui, Synona langsung bisa dipakai.
      </p>
    </Kartu>
  );
}

function Kartu({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-3xl border border-line bg-white p-6 shadow-card", className)}>
      {children}
    </div>
  );
}
