"use client";

import {
  ChevronDown,
  Eye,
  LogIn,
  MousePointerClick,
  Percent,
  UserPlus,
} from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { formatTanggalPendek } from "@/lib/date";
import { Chip } from "@/components/ui/chip";
import { labelTarget, WARNA_TRAFIK } from "@/lib/trafik";
import { cn } from "@/lib/utils";
import type { LaporanTrafik, Segmen } from "@/server/queries/trafik";

// Recharts dimuat lazy, sama seperti grafik di dashboard (charts-lazy.tsx).
const GrafikTrafik = dynamic(
  () => import("./grafik-trafik").then((m) => m.GrafikTrafik),
  {
    ssr: false,
    loading: () => <div className="h-[260px] animate-pulse rounded-xl bg-canvas" />,
  },
);

const LABEL_PERANGKAT: Record<string, string> = {
  hp: "HP",
  tablet: "Tablet",
  desktop: "Komputer",
  lainnya: "Tidak diketahui",
};

const LABEL_HALAMAN: Record<string, string> = {
  "/beranda": "Beranda",
  "/register": "Daftar",
  "/masuk": "Masuk",
};

function persen(a: number, b: number): string {
  if (b === 0) return "—";
  const p = (a / b) * 100;
  return `${p < 10 && p > 0 ? p.toFixed(1) : Math.round(p)}%`;
}

export function TrafikClient({
  laporan,
  hari,
}: {
  laporan: LaporanTrafik;
  hari: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const calon = laporan.segmen === "calon";
  const datang = laporan.corong[0];
  const tahap2 = laporan.corong[1];
  const akhir = laporan.corong[laporan.corong.length - 1];
  const kosong = laporan.jumlah.calon === 0 && laporan.jumlah.lama === 0;

  function ganti(kunci: "hari" | "segmen", nilai: string) {
    const next = new URLSearchParams(params.toString());
    next.set(kunci, nilai);
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
            Trafik Pengunjung
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            Berapa orang yang datang ke halaman depan, apa yang mereka klik, dan
            berapa yang akhirnya mendaftar · {formatTanggalPendek(laporan.dari)} –{" "}
            {formatTanggalPendek(laporan.sampai)}
          </p>
        </div>

        <div className="relative">
          <select
            value={hari}
            onChange={(e) => ganti("hari", e.target.value)}
            aria-label="Pilih periode"
            className="h-10 cursor-pointer appearance-none rounded-xl border border-line bg-white pl-3.5 pr-9 text-sm font-semibold text-ink-soft outline-none transition-colors hover:bg-canvas focus:ring-4 focus:ring-brand-100"
          >
            <option value="7">7 Hari</option>
            <option value="30">30 Hari</option>
            <option value="90">90 Hari</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {(
          [
            ["calon", "Calon pelanggan"],
            ["lama", "Pelanggan lama"],
          ] as [Segmen, string][]
        ).map(([kunci, label]) => (
          <Chip key={kunci} aktif={laporan.segmen === kunci} onClick={() => ganti("segmen", kunci)}>
            {label} · {laporan.jumlah[kunci]}
          </Chip>
        ))}
        <p className="basis-full text-[13px] text-muted sm:basis-auto sm:pl-2">
          {calon
            ? "Orang yang belum punya akun — yang ingin Anda ajak bergabung."
            : "Sudah punya akun: dikenali saat pernah berhasil login dari peramban itu."}
        </p>
      </div>

      {kosong && (
        <p className="rounded-2xl bg-brand-50 px-4 py-3 text-sm text-ink-soft">
          Belum ada pengunjung tercatat di periode ini. Pencatatan dimulai sejak
          fitur ini dipasang — buka <span className="font-semibold">/beranda</span>{" "}
          dari peramban yang <span className="font-semibold">tidak</span> sedang
          login untuk mencobanya (kunjungan dari akun yang login sengaja tidak
          dihitung).
        </p>
      )}

      <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        <Kartu label={datang.label} nilai={String(datang.orang)} sub={`${laporan.kunjungan} kunjungan`} icon={Eye} />
        <Kartu label={tahap2.label} nilai={String(tahap2.orang)} sub={`${laporan.totalKlik} klik total`} icon={MousePointerClick} />
        <Kartu
          label={akhir.label}
          nilai={String(akhir.orang)}
          sub={calon ? "usaha baru" : "login di periode ini"}
          icon={calon ? UserPlus : LogIn}
        />
        <Kartu
          label="Konversi"
          nilai={persen(akhir.orang, datang.orang)}
          sub={calon ? "sampai daftar" : "sampai login"}
          icon={Percent}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Corong laporan={laporan} />

        <section className="card p-5">
          <h2 className="card-title text-[17px]">Pengunjung per Hari</h2>
          <div className="mt-3 flex flex-wrap items-center gap-5">
            <Legenda warna={WARNA_TRAFIK.calon} label="Calon pelanggan" />
            <Legenda warna={WARNA_TRAFIK.lama} label="Pelanggan lama" />
          </div>
          <div className="mt-4">
            <GrafikTrafik data={laporan.harian} />
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card p-5">
          <h2 className="card-title text-[17px]">Tombol yang Paling Diklik</h2>
          <p className="mt-1 text-[13px] text-muted">
            {calon
              ? "Tanda minat paling jelas: orang yang mengklik tombol ajakan."
              : "Jalan yang dipakai pelanggan lama untuk masuk ke aplikasi."}
          </p>
          {laporan.tombol.length === 0 ? (
            <Kosong />
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left text-[12px] font-semibold uppercase tracking-wide text-muted">
                  <th className="pb-2 font-semibold">Tombol</th>
                  <th className="pb-2 pl-3 text-right font-semibold">Orang</th>
                  <th className="pb-2 pl-4 text-right font-semibold">Klik</th>
                </tr>
              </thead>
              <tbody>
                {laporan.tombol.map((t) => (
                  <tr key={`${t.halaman}${t.target}`} className="border-t border-line">
                    <td className="py-2.5 pr-3">
                      <span className="font-semibold text-ink">{labelTarget(t.target)}</span>
                      <span className="ml-2 text-[12px] text-muted">
                        {LABEL_HALAMAN[t.halaman] ?? t.halaman}
                      </span>
                    </td>
                    <td className="tabular py-2.5 pl-3 text-right font-bold text-ink">{t.orang}</td>
                    <td className="tabular py-2.5 pl-4 text-right text-ink-soft">{t.klik}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card p-5">
          <h2 className="card-title text-[17px]">Bagian yang Dibaca</h2>
          <p className="mt-1 text-[13px] text-muted">
            Dari {laporan.pengunjungBeranda} pengunjung beranda, berapa yang
            menggulir sampai bagian ini.
          </p>
          {laporan.bagian.length === 0 ? (
            <Kosong />
          ) : (
            <ul className="mt-4 space-y-3">
              {laporan.bagian.map((b) => (
                <BarisBar
                  key={b.target}
                  label={labelTarget(b.target)}
                  nilai={b.orang}
                  dari={laporan.pengunjungBeranda}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="card-title text-[17px]">Datang dari Mana</h2>
          <p className="mt-1 text-[13px] text-muted">
            Situs perujuk atau <code className="text-[12px]">?utm_source=</code> di
            tautan. &ldquo;Langsung&rdquo; = mengetik alamat, bookmark, atau
            tautan dari aplikasi chat.
          </p>
          {laporan.sumber.length === 0 ? (
            <Kosong />
          ) : (
            <ul className="mt-4 space-y-3">
              {laporan.sumber.map((s) => (
                <BarisBar key={s.sumber} label={s.sumber} nilai={s.orang} dari={datang.orang} />
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="card-title text-[17px]">Perangkat</h2>
          <p className="mt-1 text-[13px] text-muted">Ditebak dari lebar layar.</p>
          {laporan.perangkat.length === 0 ? (
            <Kosong />
          ) : (
            <ul className="mt-4 space-y-3">
              {laporan.perangkat.map((p) => (
                <BarisBar
                  key={p.perangkat}
                  label={LABEL_PERANGKAT[p.perangkat] ?? p.perangkat}
                  nilai={p.orang}
                  dari={datang.orang}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * Corong minat. Batang satu warna (besaran, bukan identitas); tiap tahap
 * menunjukkan berapa persen yang lanjut dari tahap sebelumnya.
 */
function Corong({ laporan }: { laporan: LaporanTrafik }) {
  const puncak = Math.max(laporan.corong[0].orang, 1);

  return (
    <section className="card p-5">
      <h2 className="card-title text-[17px]">Alur Minat</h2>
      <p className="mt-1 text-[13px] text-muted">
        {laporan.segmen === "calon"
          ? "Dari datang sampai mendaftar — di tahap mana orang berhenti."
          : "Dari datang sampai berhasil login."}
      </p>
      <ol className="mt-5 space-y-4">
        {laporan.corong.map((t, i) => {
          const sebelum = i === 0 ? null : laporan.corong[i - 1].orang;
          return (
            <li key={t.kunci}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-bold text-ink">{t.label}</span>
                <span className="flex items-baseline gap-2">
                  {sebelum !== null && (
                    <span className="text-[12px] font-semibold text-muted">
                      {persen(t.orang, sebelum)} lanjut
                    </span>
                  )}
                  <span className="tabular text-lg font-extrabold text-ink">{t.orang}</span>
                </span>
              </div>
              <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-canvas">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${Math.max((t.orang / puncak) * 100, t.orang > 0 ? 2 : 0)}%` }}
                />
              </div>
              <p className="mt-1 text-[12px] text-muted">{t.keterangan}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function BarisBar({ label, nilai, dari }: { label: string; nilai: number; dari: number }) {
  const lebar = dari > 0 ? Math.min((nilai / dari) * 100, 100) : 0;
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate font-semibold text-ink">{label}</span>
        <span className="shrink-0">
          <span className="tabular font-bold text-ink">{nilai}</span>
          <span className="ml-1.5 text-[12px] text-muted">{persen(nilai, dari)}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-canvas">
        <div className="h-full rounded-full bg-brand-400" style={{ width: `${lebar}%` }} />
      </div>
    </li>
  );
}

function Kartu({
  label,
  nilai,
  sub,
  icon: Icon,
}: {
  label: string;
  nilai: string;
  sub: string;
  icon: typeof Eye;
}) {
  return (
    <div className="card flex items-center gap-3.5 p-4">
      <span
        className={cn(
          "grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white",
          "from-brand-400 to-brand-600",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-muted">{label}</span>
        <span className="tabular block text-lg font-extrabold leading-tight text-ink">
          {nilai}
        </span>
        <span className="block truncate text-[12px] text-muted">{sub}</span>
      </span>
    </div>
  );
}

function Legenda({ warna, label }: { warna: string; label: string }) {
  return (
    <span className="flex items-center gap-2 text-[13px] font-medium text-ink-soft">
      <span className="size-2.5 rounded-full" style={{ background: warna }} />
      {label}
    </span>
  );
}

function Kosong() {
  return <p className="mt-4 text-sm text-muted">Belum ada data di periode ini.</p>;
}
