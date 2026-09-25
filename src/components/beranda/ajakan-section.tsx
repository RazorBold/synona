import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Cloud,
  MonitorSmartphone,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { RUTE_DAFTAR } from "@/lib/auth-const";

const JANJI: { ikon: LucideIcon; baris: [string, string] }[] = [
  { ikon: MonitorSmartphone, baris: ["Jalan di HP, tablet,", "dan komputer"] },
  { ikon: Cloud, baris: ["Data tersimpan", "di server Anda sendiri"] },
  { ikon: ShieldCheck, baris: ["Bahasa sehari-hari,", "bukan istilah akuntansi"] },
];

/** Penutup halaman depan — mengikuti mockup src/images/b.png. */
export function AjakanSection() {
  return (
    <section
      data-jejak-bagian="ajakan"
      className="bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] px-5 py-16 sm:px-8 lg:py-20"
    >
      <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[32px] border border-[#e3ebf8] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-6 py-12 text-center shadow-[0_30px_70px_-40px_rgba(30,58,138,0.35)] sm:px-10 lg:py-14">
        {/* Hiasan: kisi titik di kanan atas, lingkaran pucat di kiri bawah. */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-10 top-10 hidden grid-cols-4 gap-[14px] md:grid"
        >
          {Array.from({ length: 16 }).map((_, i) => (
            <span key={i} className="size-2 rounded-full bg-[#dfe8f6]" />
          ))}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-24 size-80 rounded-full border border-[#e6eefb] bg-[#f1f6fe]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-64 left-4 size-[26rem] rounded-full border border-[#e6eefb] bg-[#f5f9ff]/70"
        />

        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#e8f0fd] px-5 py-2 text-[13px] font-bold uppercase tracking-[0.02em] text-blue-600">
            <BookOpen className="size-4" />
            Mulai lebih mudah
          </span>

          <h2 className="mt-5 font-display text-[clamp(2.2rem,3.4vw,4.2rem)] font-bold leading-[1.08] tracking-[-0.02em] text-[#0f1b3d]">
            Mulai dari satu <span className="text-blue-600">kebiasaan</span>
          </h2>

          <p className="mx-auto mt-4 max-w-[62ch] text-lead text-ink-soft">
            Catat saat kejadian, bukan saat ingat. Lima menit menutup buku tiap
            malam jauh lebih murah daripada satu hari penuh mencari selisih di
            akhir bulan.
          </p>

          <ul className="mx-auto mt-9 grid max-w-[1000px] gap-6 text-left sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-[#e6ecf6]">
            {JANJI.map((j) => {
              const Ikon = j.ikon;
              return (
                <li key={j.baris[0]} className="flex items-center justify-center gap-4 sm:px-6">
                  <span className="grid size-[60px] shrink-0 place-items-center rounded-full bg-[#eaf1fd] text-blue-600">
                    <Ikon className="size-7" strokeWidth={1.8} />
                  </span>
                  <span className="text-[15px] leading-snug text-ink">
                    {j.baris[0]}
                    <br />
                    {j.baris[1]}
                  </span>
                </li>
              );
            })}
          </ul>

          <Link
            href={RUTE_DAFTAR}
            data-jejak="ajakan:daftar"
            className="group mt-9 inline-flex h-14 items-center gap-2.5 rounded-full bg-blue-600 px-12 text-[16px] font-bold text-white shadow-[0_16px_32px_-14px_rgba(37,99,235,0.75)] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-blue-700"
          >
            Coba Gratis 14 Hari
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <p className="mt-4 text-sm text-ink-soft">
            Tanpa kartu kredit. Semua fitur terbuka sejak hari pertama.
          </p>
        </div>
      </div>
    </section>
  );
}
