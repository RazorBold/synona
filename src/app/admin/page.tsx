import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowRight, BadgeCheck, CalendarClock, Store, Wallet } from "lucide-react";
import Link from "next/link";

import { StatusLanggananLencana } from "@/components/admin/status-langganan";
import { formatRupiah } from "@/lib/money";
import { PAKET } from "@/lib/paket";
import { daftarUsaha, jumlahPerluDiperiksa } from "@/server/admin";
import { corongLangganan } from "@/server/langganan";

export const dynamic = "force-dynamic";

export default function RingkasanAdmin() {
  const usaha = daftarUsaha();
  const corong = corongLangganan();
  const perlu = jumlahPerluDiperiksa();
  const sekarang = Date.now();
  const sepekan = sekarang + 7 * 86_400_000;
  const segeraHabis = usaha.filter(
    (u) => u.status === "aktif" && u.berakhir !== null && u.berakhir <= sepekan,
  );
  const terbaru = usaha.slice(0, 6);

  const tahap = [
    { label: "Mendaftar", nilai: corong.daftar },
    { label: "Masa coba", nilai: corong.coba },
    { label: "Checkout", nilai: corong.checkout },
    { label: "Membayar", nilai: corong.bayar },
    { label: "Aktif", nilai: corong.aktif },
    { label: "Perpanjang", nilai: corong.perpanjang },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight text-ink">Ringkasan platform</h1>
        <p className="mt-1 text-[15px] text-muted">
          Perjalanan pelanggan Synona: datang → daftar → bayar → berlangganan → perpanjang.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi ikon={Store} label="Usaha terdaftar" nilai={String(usaha.length)} />
        <Kpi
          ikon={BadgeCheck}
          label="Perlu diverifikasi"
          nilai={String(perlu)}
          sorot={perlu > 0}
          href="/admin/langganan"
        />
        <Kpi ikon={CalendarClock} label="Habis dalam 7 hari" nilai={String(segeraHabis.length)} />
        <Kpi ikon={Wallet} label="Pendapatan langganan" nilai={formatRupiah(corong.pendapatan)} />
      </div>

      <section className="card p-5">
        <h2 className="card-title text-[17px]">Corong pelanggan berbayar</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {tahap.map((t, i) => (
            <div key={t.label} className="rounded-2xl bg-canvas px-4 py-3">
              <p className="text-xs font-semibold text-muted">
                {i + 1}. {t.label}
              </p>
              <p className="tabular mt-1 text-2xl font-extrabold text-ink">{t.nilai}</p>
            </div>
          ))}
        </div>
        <Link href="/admin/trafik" className="link-more mt-3">
          Lihat pengunjung halaman depan <ArrowRight className="size-3.5" />
        </Link>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-[17px]">Pendaftar terbaru</h2>
            <Link href="/admin/akun" className="link-more">
              Semua akun <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-line">
            {terbaru.map((u) => (
              <li key={u.userId} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0">
                  <b className="block truncate text-sm text-ink">{u.usaha ?? "—"}</b>
                  <span className="text-xs text-muted">
                    {u.pemilik} · {format(new Date(u.terdaftar), "d MMM yyyy", { locale: localeId })}
                  </span>
                </span>
                <StatusLanggananLencana status={u.status} />
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="card-title text-[17px]">Segera habis (7 hari)</h2>
          {segeraHabis.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-muted">
              Tidak ada langganan yang akan habis minggu ini.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {segeraHabis.map((u) => (
                <li key={u.userId} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <b className="block truncate text-sm text-ink">{u.usaha ?? "—"}</b>
                    <span className="text-xs text-muted">
                      {PAKET[u.paket].label} · {u.telepon ?? "tanpa nomor"}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-amber-600">
                    {format(new Date(u.berakhir!), "d MMM", { locale: localeId })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({
  ikon: Ikon,
  label,
  nilai,
  sorot,
  href,
}: {
  ikon: typeof Store;
  label: string;
  nilai: string;
  sorot?: boolean;
  href?: string;
}) {
  const isi = (
    <div
      className={
        sorot
          ? "card flex items-center gap-4 border-amber-200 bg-amber-50 p-5"
          : "card flex items-center gap-4 p-5"
      }
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-500">
        <Ikon className="size-6" />
      </span>
      <span>
        <span className="block text-sm text-muted">{label}</span>
        <span className="tabular block text-2xl font-extrabold text-ink">{nilai}</span>
      </span>
    </div>
  );
  return href ? <Link href={href}>{isi}</Link> : isi;
}
