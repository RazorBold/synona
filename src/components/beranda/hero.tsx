import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { Caveat } from "next/font/google";
import {
  ArrowRight,
  BarChart3,
  Check,
  Layers,
  Package,
  Play,
  TrendingUp,
} from "lucide-react";

import latar from "@/images/hero-bg.webp";
import gambarLaporan from "@/images/fitur-laporan.webp";
import gambarPenjualan from "@/images/fitur-penjualan.webp";
import gambarStok from "@/images/fitur-stok.webp";
import { KARTU } from "@/components/beranda/isi";
import { RUTE_MASUK } from "@/lib/auth-const";
import { cn } from "@/lib/utils";

/** Tulisan tangan di papan: hanya dipakai di sini, jadi dimuat di sini. */
const tulisan = Caveat({ subsets: ["latin"], weight: ["600"], display: "swap" });

const GAMBAR: Record<(typeof KARTU)[number]["tema"], StaticImageData> = {
  biru: gambarPenjualan,
  hijau: gambarStok,
  merah: gambarLaporan,
};

/**
 * Warna kartu = warna latar studio tiap ilustrasi (diambil dari tepinya),
 * supaya tepi gambar yang dipudarkan menyatu dengan kartunya tanpa garis.
 */
const TEMA = {
  biru: {
    kartu: "bg-[linear-gradient(135deg,#f4f8ff_0%,#e8f1fe_100%)]",
    ikon: "bg-blue-500 shadow-blue-500/30",
    tombol: "border-blue-200 text-blue-600 hover:bg-blue-50",
  },
  hijau: {
    kartu: "bg-[linear-gradient(135deg,#f3fcf8_0%,#e8f8f1_100%)]",
    ikon: "bg-emerald-500 shadow-emerald-500/30",
    tombol: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
  },
  merah: {
    kartu: "bg-[linear-gradient(135deg,#fff5f9_0%,#feedf5_100%)]",
    ikon: "bg-rose-500 shadow-rose-500/30",
    tombol: "border-rose-200 text-rose-600 hover:bg-rose-50",
  },
} as const;

const CEKLIS = ["Penjualan tercatat", "Stok terpantau", "Laporan siap"];

/**
 * Kartu-kartu kecil yang melayang di atas latar. Posisinya dalam persen
 * terhadap LAPISAN LATAR (bukan terhadap layar), jadi selalu duduk di atas
 * kartu grafik & checklist yang tergambar di ilustrasinya, berapa pun lebar
 * layarnya. Isinya contoh tampilan, bukan data siapa pun.
 */
function HiasanLatar() {
  return (
    <>
      <div className="absolute left-[49.2%] top-[21%] hidden rounded-2xl bg-white/95 p-[0.9vw] shadow-[0_18px_40px_-18px_rgba(30,58,138,0.35)] ring-1 ring-white xl:block">
        <div className="flex items-center gap-[0.7vw]">
          <span className="grid size-[2.4vw] place-items-center rounded-xl bg-blue-50 text-blue-600">
            <BarChart3 className="size-[55%]" />
          </span>
          <div>
            <p className="text-[max(10px,0.72vw)] font-semibold text-ink-soft">
              Penjualan Hari Ini
            </p>
            <p className="text-[max(13px,1.05vw)] font-extrabold tracking-tight text-[#0f1b3d]">
              Rp 1.280.000
            </p>
            <span className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[max(9px,0.62vw)] font-bold text-emerald-600">
              <TrendingUp className="size-3" /> 12%
            </span>
          </div>
        </div>
      </div>

      <div className="absolute left-[49.8%] top-[33%] z-10 hidden items-center gap-[0.7vw] rounded-2xl bg-white/95 px-[0.9vw] py-[0.6vw] shadow-[0_18px_40px_-18px_rgba(30,58,138,0.35)] ring-1 ring-white xl:flex">
        <span className="grid size-[2.1vw] place-items-center rounded-xl bg-amber-50 text-amber-500">
          <Package className="size-[55%]" />
        </span>
        <div>
          <p className="text-[max(10px,0.72vw)] font-semibold text-ink-soft">
            Stok Menipis
          </p>
          <p className="text-[max(11px,0.85vw)] font-extrabold text-[#0f1b3d]">
            3 produk
          </p>
        </div>
        <ArrowRight className="ml-[0.5vw] size-3.5 text-blue-500" />
      </div>

      <ul className="absolute left-[78.4%] top-[29%] hidden space-y-[0.75vw] rounded-2xl bg-white/95 p-[0.95vw] shadow-[0_18px_40px_-18px_rgba(30,58,138,0.35)] ring-1 ring-white xl:block">
        {CEKLIS.map((t) => (
          <li
            key={t}
            className="flex items-center gap-[0.55vw] text-[max(10px,0.7vw)] font-semibold text-ink-soft"
          >
            <span className="grid size-[1.3vw] place-items-center rounded-full bg-blue-500 text-white">
              <Check className="size-[65%]" strokeWidth={3} />
            </span>
            {t}
          </li>
        ))}
      </ul>

      <p
        className={cn(
          tulisan.className,
          "absolute left-[76.5%] top-[12.5%] hidden -rotate-6 text-center text-[clamp(18px,1.75vw,32px)] leading-[1.1] text-[#1e2a4a] xl:block",
        )}
      >
        Usaha Lebih Mudah
        <br />
        Bersama Synona ♡
      </p>
    </>
  );
}

function Ajakan() {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
      <Link
        href={RUTE_MASUK}
        data-jejak="hero:mulai"
        className="group inline-flex h-14 items-center gap-2 rounded-full bg-blue-600 px-8 text-[15px] font-bold text-white shadow-[0_14px_30px_-12px_rgba(37,99,235,0.7)] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-blue-700"
      >
        Mulai Pakai Synona
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
      <a
        href="#cara-kerja"
        data-jejak="hero:cara-kerja"
        className="group inline-flex items-center gap-3 text-[15px] font-semibold text-ink-soft transition-colors hover:text-ink"
      >
        <span className="grid size-11 place-items-center rounded-full bg-white text-blue-600 shadow-[0_8px_20px_-10px_rgba(30,58,138,0.45)] ring-1 ring-blue-100 transition-transform group-hover:scale-105">
          <Play className="size-4 fill-current" />
        </span>
        Lihat cara kerjanya
      </a>
    </div>
  );
}

function KartuFitur({ k }: { k: (typeof KARTU)[number] }) {
  const Ikon = k.icon;
  const t = TEMA[k.tema];

  return (
    <article
      className={cn(
        "group relative flex overflow-hidden rounded-3xl border-2 border-white p-6 shadow-[0_22px_50px_-28px_rgba(30,58,138,0.45)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-26px_rgba(30,58,138,0.5)]",
        // HP & layar besar: teks kiri, ilustrasi kanan (seperti mockup).
        // Tablet (3 kolom sempit): ilustrasi turun ke bawah teks.
        "flex-row lg:flex-col xl:flex-row",
        t.kartu,
      )}
    >
      <div className="relative z-10 flex w-[56%] flex-col lg:w-full xl:w-[53%]">
        <span
          className={cn(
            "grid size-10 place-items-center rounded-xl text-white shadow-lg",
            t.ikon,
          )}
        >
          <Ikon className="size-5" />
        </span>
        <h2 className="mt-4 text-[clamp(1.25rem,1.4vw,1.65rem)] font-extrabold leading-[1.15] tracking-tight text-[#0f1b3d]">
          {k.judul[0]}
          <br />
          {k.judul[1]}
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{k.isi}</p>
        <Link
          href={`${RUTE_MASUK}?lanjut=${encodeURIComponent(k.tujuan)}`}
          data-jejak={`kartu:${k.tema}`}
          className={cn(
            "mt-5 inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-full border bg-white/70 px-5 py-2.5 text-sm font-bold backdrop-blur transition-colors",
            t.tombol,
          )}
        >
          {k.aksi}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/*
        Ilustrasi utuh (tidak dipotong), tepinya dipudarkan ke warna kartu.
        Di HP & layar besar ia menempel di kanan dan boleh sedikit keluar dari
        padding kartu; di tablet ia turun ke bawah teks.
      */}
      <div className="relative -my-2 -mr-4 flex w-[50%] items-center lg:mx-0 lg:mb-0 lg:mt-4 lg:w-full xl:absolute xl:inset-y-0 xl:right-3 xl:m-0 xl:w-[46%]">
        <Image
          src={GAMBAR[k.tema]}
          alt=""
          sizes="(min-width: 1280px) 26vw, (min-width: 768px) 30vw, 50vw"
          className="h-auto w-full [mask-image:radial-gradient(ellipse_at_center,black_58%,transparent_100%)] transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
      </div>
    </article>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#eef4fd_0%,#f6f9ff_55%,#ffffff_100%)]">
      {/*
        Lapisan latar selebar layar dengan proporsi aslinya. Lebar yang jadi
        patokan skala — kalau `object-cover` setinggi section, karakternya
        membesar sampai menabrak judul. Hiasan melayang ikut di lapisan ini
        supaya posisinya terkunci pada gambarnya.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 hidden aspect-[1816/866] lg:block"
      >
        <Image
          src={latar}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-top [mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)]"
        />
        <HiasanLatar />
      </div>

      <div className="wadah relative pb-16 pt-28 lg:pb-20 lg:pt-32">
        <div className="lg:max-w-[46%]">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-700 shadow-sm backdrop-blur">
            <Layers className="size-3.5" />
            Satu aplikasi, semua dalam kendali
          </span>

          <h1 className="mt-5 font-display text-[clamp(2.6rem,4.1vw,4.4rem)] font-bold leading-[1.04] tracking-[-0.02em] text-[#0f1b3d]">
            Kelola Usaha,
            <br />
            <span className="text-blue-600">Makin Untung</span>
            <br />
            Tiap Hari
          </h1>

          <p className="mt-5 max-w-[46ch] text-lead text-ink-soft">
            Catat penjualan, pekerjaan, stok, dan kas dalam satu aplikasi — lalu
            tahu persis usaha Anda sehat atau tidak.
          </p>

          <Ajakan />
        </div>

        {/* Di bawah lg lapisan latar disembunyikan; karakternya tampil
            sebagai gambar biasa di bawah ajakan. */}
        <div className="relative mx-auto mt-10 aspect-[16/10] w-full max-w-[760px] overflow-hidden rounded-[28px] sm:aspect-[16/9] lg:hidden">
          <Image
            src={latar}
            alt="Pemilik usaha memegang tablet"
            fill
            sizes="(min-width: 640px) 760px, 92vw"
            className="object-cover object-[76%_20%] [mask-image:linear-gradient(to_bottom,black_78%,transparent_100%)]"
          />
        </div>

        {/* Di mockup baris kartu lebih lebar dari kolom teks di atasnya. */}
        <div className="mt-8 grid gap-6 lg:mt-14 lg:grid-cols-3 xl:-mx-10 2xl:-mx-20">
          {KARTU.map((k) => (
            <KartuFitur key={k.tema} k={k} />
          ))}
        </div>
      </div>
    </section>
  );
}
