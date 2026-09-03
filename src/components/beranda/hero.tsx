import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";

import pemilik from "@/images/pemilik-usaha.png";
import { KARTU } from "@/components/beranda/isi";
import { cn } from "@/lib/utils";

/**
 * Hero disusun dua kali: satu tata letak berproporsi tetap untuk layar besar
 * yang menempel persis pada komposisi ilustrasinya, satu tumpukan biasa untuk
 * layar kecil. Menggabungkannya jadi satu susunan memaksa salah satunya
 * kompromi — dan yang kompromi biasanya layar HP, tempat aplikasi ini
 * sebenarnya dipakai.
 *
 * Angka persen di bawah diukur langsung dari src/images/bg.png (1528 × 1029),
 * jadi teks dan kartunya jatuh tepat di tempat yang sama dengan rancangannya.
 */

const CIRI_USAHA = ["🏪", "🧰", "🧺", "✂️", "🔧"];

function BuktiSosial({ ringkas = false }: { ringkas?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2.5">
        {CIRI_USAHA.map((e) => (
          <span
            key={e}
            className={cn(
              "grid place-items-center rounded-full border-2 border-white bg-krem shadow-sm",
              ringkas ? "size-8 text-sm" : "size-9 text-base",
            )}
          >
            {e}
          </span>
        ))}
      </div>
      <div>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="size-3 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <p className="mt-0.5 text-[11px] font-medium text-ink-soft">
          Warung, bengkel, laundry, salon, toko
        </p>
      </div>
    </div>
  );
}

function Judul({ kelas }: { kelas: string }) {
  return (
    <h1 className={cn("font-display font-normal tracking-[-0.02em] text-ink", kelas)}>
      Kelola Usaha,
      <br />
      Makin Untung
      <br />
      Tiap Hari
    </h1>
  );
}

function Ajakan({ penuh = false }: { penuh?: boolean }) {
  return (
    <Link
      href="/masuk"
      className={cn(
        "group inline-flex items-center justify-center gap-2 rounded-full bg-ink text-sm font-bold text-white transition-transform hover:-translate-y-0.5",
        penuh ? "h-14 w-full px-6 text-[15px]" : "h-13 px-7 py-4",
      )}
    >
      Mulai Pakai Synona
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function IsiKartu({
  kartu,
  ringkas = false,
}: {
  kartu: (typeof KARTU)[number];
  ringkas?: boolean;
}) {
  const Icon = kartu.icon;
  return (
    <>
      <h2
        className={cn(
          "relative font-display font-normal leading-[1.06] text-white",
          ringkas ? "text-[26px]" : "text-[clamp(18px,2.15vw,33px)]",
        )}
      >
        {kartu.judul[0]}
        <br />
        {kartu.judul[1]}
      </h2>
      <p
        className={cn(
          "relative mt-3 max-w-[22ch] font-medium leading-snug text-white/85",
          ringkas ? "text-sm" : "text-[clamp(11px,0.95vw,15px)]",
        )}
      >
        {kartu.isi}
      </p>

      {/* Rancangan aslinya menaruh ilustrasi orang di sini. Karena asetnya
          tidak ada, ruang itu diisi cap air ikon berukuran besar — bidang
          warnanya jadi punya bobot, bukan sekadar kosong. */}
      <Icon
        aria-hidden
        className={cn(
          "absolute text-white/20",
          ringkas
            ? "-bottom-5 -right-4 size-32"
            : "-bottom-[8%] -right-[6%] size-[46%]",
        )}
        strokeWidth={1}
      />
    </>
  );
}

export function Hero() {
  return (
    <section className="relative bg-white">
      {/* ---------------------------------------------- layar besar */}
      <div className="relative mx-auto hidden w-full max-w-[1528px] lg:block lg:aspect-[1528/1029]">
        {/* Bidang krem berhenti di 79,01% — persis seperti di rancangannya,
            sehingga kartu memotong garis batas krem/putih. */}
        <div className="absolute inset-x-0 top-0 h-[79.01%] bg-krem" />

        <Image
          src={pemilik}
          alt="Pemilik usaha memegang tablet"
          priority
          sizes="(min-width: 1528px) 490px, 33vw"
          className="absolute left-[60.21%] top-[0.97%] w-[32.07%]"
        />

        <div className="absolute left-[8.12%] top-[11.6%] w-[45%]">
          <BuktiSosial />
          <Judul kelas="mt-5 text-[clamp(44px,5vw,78px)] leading-[1.02]" />
          <p className="mt-6 max-w-[34ch] text-[clamp(14px,1.15vw,17px)] leading-relaxed text-ink-soft">
            Catat penjualan, pekerjaan, stok, dan kas dalam satu aplikasi — lalu
            tahu persis usaha Anda sehat atau tidak.
          </p>
          <div className="mt-7">
            <Ajakan />
          </div>
        </div>

        {/* Kartu: koordinat diukur dari bg.png */}
        {KARTU.map((k, i) => (
          <article
            key={k.judul.join(" ")}
            className={cn(
              "absolute top-[63.56%] h-[32.65%] overflow-hidden rounded-[1.9%] p-[2.2%]",
              k.warna,
              i === 0 && "left-[8.12%] w-[26.96%]",
              i === 1 && "left-[36.65%] w-[26.57%]",
              i === 2 && "left-[64.92%] w-[26.83%]",
            )}
          >
            <IsiKartu kartu={k} />
          </article>
        ))}
      </div>

      {/* ----------------------------------------------- layar kecil */}
      <div className="lg:hidden">
        <div className="bg-krem px-5 pb-40 pt-28 sm:px-8">
          <BuktiSosial ringkas />
          <Judul kelas="mt-6 text-[clamp(38px,10vw,56px)] leading-[1.05]" />
          <p className="mt-5 max-w-[36ch] text-[15px] leading-relaxed text-ink-soft">
            Catat penjualan, pekerjaan, stok, dan kas dalam satu aplikasi — lalu
            tahu persis usaha Anda sehat atau tidak.
          </p>
          <div className="mt-7 max-w-xs">
            <Ajakan penuh />
          </div>

          <Image
            src={pemilik}
            alt="Pemilik usaha memegang tablet"
            priority
            sizes="(min-width: 640px) 420px, 78vw"
            className="mx-auto mt-8 w-[78%] max-w-[420px] [mask-image:linear-gradient(to_bottom,black_84%,transparent_99%)]"
          />
        </div>

        <div className="-mt-32 space-y-4 px-5 pb-4 sm:px-8">
          {KARTU.map((k) => (
            <article
              key={k.judul.join(" ")}
              className={cn(
                "relative overflow-hidden rounded-[26px] p-6 pb-16",
                k.warna,
              )}
            >
              <IsiKartu kartu={k} ringkas />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
