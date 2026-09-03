import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Store } from "lucide-react";

import { Hero } from "@/components/beranda/hero";
import { FITUR, JENIS, LANGKAH } from "@/components/beranda/isi";

export const metadata: Metadata = {
  title: "Synona — Kelola usaha, makin untung",
  description:
    "Aplikasi pencatatan usaha untuk UMKM dagang, jasa, dan campuran: POS, papan antrean jasa, stok, kas & bank, kasbon, dan laporan kesehatan usaha.",
};

export default function BerandaPage() {
  return (
    <div className="min-h-dvh bg-white">
      {/* -------------------------------------------------------- kepala */}
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-[1528px] items-center justify-between px-5 py-5 sm:px-8 lg:px-[8.12%] lg:py-7">
          <Link href="/beranda" className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-pop">
              <Store className="size-5 text-white" />
            </span>
            <span className="text-xl font-extrabold tracking-tight text-ink">
              Synona
            </span>
          </Link>

          <Link
            href="/masuk"
            className="rounded-full border border-ink/15 px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-white"
          >
            Masuk
          </Link>
        </div>
      </header>

      <Hero />

      {/* -------------------------------------------------- jenis usaha */}
      <section className="mx-auto max-w-[1528px] px-5 py-20 sm:px-8 lg:px-[8.12%] lg:py-28">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
          Satu aplikasi, tiga bentuk usaha
        </p>
        <h2 className="mt-4 max-w-[18ch] font-display text-[clamp(32px,4.2vw,56px)] font-normal leading-[1.08] tracking-[-0.02em] text-ink">
          Menunya menyesuaikan usaha Anda
        </h2>
        <p className="mt-5 max-w-[52ch] text-[15px] leading-relaxed text-ink-soft">
          Pemilik salon tidak pernah butuh menu Produksi, dan pemilik warung
          tidak pernah butuh papan antrean. Anda memilih sekali di awal —
          sisanya disembunyikan, bukan dibiarkan memenuhi layar.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {JENIS.map((j) => (
            <article
              key={j.nama}
              className="rounded-[26px] border border-line bg-white p-7 shadow-card transition-colors hover:border-brand-200"
            >
              <span className="text-3xl">{j.emoji}</span>
              <h3 className="mt-4 font-display text-[26px] font-normal leading-tight text-ink">
                {j.nama}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{j.isi}</p>
              <p className={`mt-5 text-xs font-semibold ${j.warna}`}>{j.contoh}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- langkah */}
      <section className="bg-krem py-20 lg:py-28">
        <div className="mx-auto max-w-[1528px] px-5 sm:px-8 lg:px-[8.12%]">
          <h2 className="max-w-[16ch] font-display text-[clamp(32px,4.2vw,56px)] font-normal leading-[1.08] tracking-[-0.02em] text-ink">
            Tiga langkah, lalu berulang tiap hari
          </h2>

          <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-10">
            {LANGKAH.map((l) => (
              <li key={l.nomor} className="border-t-2 border-ink/10 pt-6">
                <span className="font-display text-[40px] font-normal leading-none text-ink/25">
                  {l.nomor}
                </span>
                <h3 className="mt-4 text-lg font-extrabold tracking-tight text-ink">
                  {l.judul}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
                  {l.isi}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* --------------------------------------------------------- fitur */}
      <section className="mx-auto max-w-[1528px] px-5 py-20 sm:px-8 lg:px-[8.12%] lg:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="max-w-[20ch] font-display text-[clamp(32px,4.2vw,56px)] font-normal leading-[1.08] tracking-[-0.02em] text-ink">
            Yang ikut terisi tanpa dicatat ulang
          </h2>
          <p className="max-w-[38ch] text-[15px] leading-relaxed text-ink-soft">
            Satu kejadian dicatat di satu tempat saja. Karena itu laporan tidak
            pernah berselisih dengan penjualan.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FITUR.map((f) => {
            const Icon = f.icon;
            return (
              <article
                key={f.judul}
                className="rounded-[22px] border border-line bg-white p-6 shadow-card"
              >
                <span className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-500">
                  <Icon className="size-5" strokeWidth={1.8} />
                </span>
                <h3 className="mt-4 text-[15px] font-extrabold tracking-tight text-ink">
                  {f.judul}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {f.isi}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------ ajakan */}
      <section className="px-5 pb-20 sm:px-8 lg:px-[8.12%] lg:pb-28">
        <div className="relative mx-auto max-w-[1528px] overflow-hidden rounded-[32px] bg-ink px-8 py-16 text-center sm:px-12 lg:py-24">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-32 -top-40 size-[30rem] rounded-full bg-brand-600/35 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-48 -left-28 size-[26rem] rounded-full bg-brand-500/25 blur-3xl"
          />

          <div className="relative">
            <h2 className="mx-auto max-w-[16ch] font-display text-[clamp(30px,3.8vw,52px)] font-normal leading-[1.1] tracking-[-0.02em] text-white">
              Mulai dari satu kebiasaan
            </h2>
            <p className="mx-auto mt-5 max-w-[46ch] text-[15px] leading-relaxed text-brand-100">
              Catat saat kejadian, bukan saat ingat. Lima menit menutup buku tiap
              malam jauh lebih murah daripada satu hari penuh mencari selisih di
              akhir bulan.
            </p>

            <ul className="mx-auto mt-8 flex max-w-lg flex-wrap justify-center gap-x-6 gap-y-3">
              {[
                "Jalan di HP, tablet, dan komputer",
                "Data tersimpan di server Anda sendiri",
                "Bahasa sehari-hari, bukan istilah akuntansi",
              ].map((t) => (
                <li
                  key={t}
                  className="flex items-center gap-2 text-[13px] font-medium text-brand-100"
                >
                  <Check className="size-3.5 shrink-0 text-brand-300" strokeWidth={3} />
                  {t}
                </li>
              ))}
            </ul>

            <Link
              href="/masuk"
              className="group mt-10 inline-flex h-14 items-center gap-2 rounded-full bg-white px-8 text-[15px] font-bold text-ink transition-transform hover:-translate-y-0.5"
            >
              Masuk ke Synona
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- kaki */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1528px] flex-wrap items-center justify-between gap-4 px-5 py-8 sm:px-8 lg:px-[8.12%]">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600">
              <Store className="size-4 text-white" />
            </span>
            <span className="text-sm font-extrabold tracking-tight text-ink">
              Synona
            </span>
            <span className="text-sm text-muted">— Kelola usaha, makin untung.</span>
          </div>
          <Link
            href="/masuk"
            className="text-sm font-semibold text-brand-500 hover:text-brand-600"
          >
            Masuk ke aplikasi →
          </Link>
        </div>
      </footer>
    </div>
  );
}
