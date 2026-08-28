import { differenceInCalendarDays, format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Check, Crown } from "lucide-react";
import type { Metadata } from "next";

import { PAKET, type Paket } from "@/lib/paket";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import { getOutletAktif } from "@/server/queries/dashboard";

export const metadata: Metadata = { title: "Paket Langganan — Synona" };
export const dynamic = "force-dynamic";

export default async function HalamanPaket() {
  const outlet = await getOutletAktif();
  const aktif = outlet.plan as Paket;
  const sisaHari =
    outlet.planEndsAt === null
      ? null
      : differenceInCalendarDays(new Date(outlet.planEndsAt), new Date());

  return (
    <>
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          Paket Langganan
        </h1>
        <p className="mt-1 text-sm text-muted">
          Paket menentukan jumlah outlet dan apakah Anda bisa menambah kasir.
        </p>
      </header>

      {/* Paket yang sedang berjalan */}
      <section className="mt-5 rounded-2xl border border-line bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Crown className="mt-0.5 size-6 shrink-0 fill-amber-400 text-amber-500" />
            <div>
              <p className="text-lg font-extrabold text-ink">
                Plan {PAKET[aktif].label}
              </p>
              <p className="text-sm text-muted">
                {outlet.planEndsAt
                  ? `Berlaku sampai ${format(new Date(outlet.planEndsAt), "d MMMM yyyy", { locale: localeId })}`
                  : "Tanpa tanggal berakhir"}
              </p>
            </div>
          </div>

          {sisaHari !== null && <LencanaMasa sisaHari={sisaHari} />}
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Fakta
            label="Batas outlet"
            nilai={PAKET[aktif].maksOutlet === null ? "Tanpa batas" : `${PAKET[aktif].maksOutlet} outlet`}
          />
          <Fakta
            label="Kasir tambahan"
            nilai={PAKET[aktif].bolehMultiStaf ? "Boleh" : "Tidak"}
          />
          <Fakta label="Biaya" nilai={`${formatRupiah(PAKET[aktif].harga)}/bulan`} />
        </dl>
      </section>

      {/* Perbandingan paket */}
      <h2 className="mt-8 text-sm font-bold uppercase tracking-wider text-muted">
        Semua paket
      </h2>
      <div className="mt-3 grid gap-4 lg:grid-cols-3">
        {(Object.keys(PAKET) as Paket[]).map((kunci) => {
          const p = PAKET[kunci];
          const ini = kunci === aktif;
          return (
            <section
              key={kunci}
              className={cn(
                "rounded-2xl border bg-white p-5 shadow-card",
                ini ? "border-brand-300 ring-4 ring-brand-100" : "border-line",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-extrabold text-ink">{p.label}</p>
                {ini && (
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-600">
                    Paket Anda
                  </span>
                )}
              </div>
              <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink">
                {formatRupiah(p.harga)}
                <span className="text-sm font-semibold text-muted">/bulan</span>
              </p>
              <ul className="mt-4 space-y-2">
                {p.fitur.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink-soft">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="mt-6 rounded-2xl bg-canvas px-4 py-3 text-sm text-ink-soft">
        Pembayaran otomatis belum aktif — paket diubah manual oleh pengelola
        Synona Anda. Batas outlet dan kasir di atas sudah ditegakkan di server,
        bukan cuma tampilan.
      </p>
    </>
  );
}

function LencanaMasa({ sisaHari }: { sisaHari: number }) {
  if (sisaHari < 0) {
    return (
      <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-danger">
        Sudah lewat {Math.abs(sisaHari)} hari
      </span>
    );
  }
  if (sisaHari <= 7) {
    return (
      <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-600">
        {sisaHari === 0 ? "Berakhir hari ini" : `Tinggal ${sisaHari} hari`}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-success">
      Aktif
    </span>
  );
}

function Fakta({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="rounded-xl bg-canvas px-4 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold text-ink">{nilai}</dd>
    </div>
  );
}
