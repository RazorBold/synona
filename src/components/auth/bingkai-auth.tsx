import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { Caveat } from "next/font/google";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { LogoSynona } from "@/components/ui/logo-synona";

const tulisan = Caveat({ subsets: ["latin"], weight: ["600"], display: "swap" });

export type NilaiJual = {
  ikon: LucideIcon;
  judul: string;
  isi: string;
};

/**
 * Bingkai dua panel untuk /masuk dan /register: kiri panel ajakan berlatar
 * lembayung dengan ilustrasi, kanan formulirnya.
 *
 * Panel kiri disembunyikan di bawah lg. Di layar HP yang penting adalah
 * formulirnya; ilustrasi setinggi layar hanya akan mendorong kolom isian
 * jauh ke bawah lipatan.
 */
export function BingkaiAuth({
  lencana,
  judulPanel,
  judulPanelAksen,
  isiPanel,
  nilaiJual,
  tulisanTangan,
  gambar,
  judul,
  keterangan,
  tautanAtas,
  children,
}: {
  lencana: string;
  judulPanel: string;
  /** Bagian judul yang diberi warna, ditempel setelah `judulPanel`. */
  judulPanelAksen: string;
  isiPanel: string;
  nilaiJual: NilaiJual[];
  tulisanTangan: [string, string];
  gambar: StaticImageData;
  judul: React.ReactNode;
  keterangan: string;
  tautanAtas: { tanya: string; label: string; href: string };
  children: React.ReactNode;
}) {
  /*
   * `min-h-dvh` + `items-center`: kartunya duduk di tengah layar, bukan
   * menempel ke atas. Kalau isinya lebih tinggi dari layar (HP, formulir
   * daftar), pembungkusnya ikut memanjang — jadi tidak ada yang terpotong
   * meskipun pembungkusnya `overflow-hidden`.
   */
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#f2f2fd_0%,#f7f7ff_45%,#eeeefc_100%)] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[12%] top-[8%] size-[42vw] max-h-[620px] max-w-[620px] rounded-full bg-white/50 blur-[2px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[10%] bottom-[-14%] size-[38vw] max-h-[560px] max-w-[560px] rounded-full bg-white/45"
      />

      <div className="relative mx-auto grid w-full max-w-[1460px] overflow-hidden rounded-[28px] bg-white shadow-[0_40px_90px_-50px_rgba(49,46,129,0.45)] ring-1 ring-[#eceafb] lg:grid-cols-[1.04fr_0.96fr] lg:rounded-[32px]">
        {/* ------------------------------------------------ panel kiri */}
        <div className="relative hidden overflow-hidden bg-[linear-gradient(150deg,#f6f5ff_0%,#eeecfd_55%,#e7e5fc_100%)] p-10 lg:flex lg:flex-col xl:p-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/50"
          />

          <Link href="/beranda" className="relative flex w-fit items-center gap-3">
            <LogoSynona tinggi={42} prioritas />
            <span className="text-[26px] font-extrabold tracking-tight text-[#1d2444]">
              Synona
            </span>
          </Link>

          <div className="relative mt-10 max-w-[68%] xl:max-w-[64%]">
            <span className="inline-flex items-center rounded-full bg-white/70 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-brand-600">
              {lencana}
            </span>

            <h2 className="mt-5 max-w-[16ch] text-[clamp(1.8rem,2.25vw,2.5rem)] font-extrabold leading-[1.12] tracking-[-0.02em] text-[#1d2444]">
              {judulPanel} <span className="text-brand-500">{judulPanelAksen}</span>
            </h2>

            <p className="mt-4 max-w-[38ch] text-[15px] leading-[1.7] text-ink-soft">
              {isiPanel}
            </p>

            <ul className="mt-7 space-y-4">
              {nilaiJual.map((n) => {
                const Ikon = n.ikon;
                return (
                  <li key={n.judul} className="flex items-start gap-3.5">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-brand-500 shadow-[0_10px_24px_-16px_rgba(49,46,129,0.6)]">
                      <Ikon className="size-5" strokeWidth={2} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-extrabold tracking-tight text-[#1d2444]">
                        {n.judul}
                      </span>
                      <span className="mt-0.5 block max-w-[34ch] text-[13px] leading-relaxed text-ink-soft">
                        {n.isi}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>

            <p
              className={cn(
                tulisan.className,
                "mt-8 -rotate-3 text-[26px] leading-[1.15] text-brand-500",
              )}
            >
              {tulisanTangan[0]}
              <br />
              {tulisanTangan[1]}
            </p>
          </div>

          {/* Ilustrasi menempel di kanan bawah panel, melewati padding —
              sama seperti mockup. */}
          <Image
            src={gambar}
            alt=""
            aria-hidden
            priority
            sizes="(min-width: 1280px) 620px, 50vw"
            className="pointer-events-none absolute -bottom-4 -right-12 w-[54%] max-w-[560px] xl:-right-10"
          />
        </div>

        {/* ------------------------------------------------ panel kanan */}
        <div className="relative flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-14">
          {/* Logo hanya di layar kecil — di layar besar sudah ada di kiri. */}
          <Link href="/beranda" className="mb-8 flex w-fit items-center gap-2.5 lg:hidden">
            <LogoSynona tinggi={36} />
            <span className="text-xl font-extrabold tracking-tight text-ink">
              Synona
            </span>
          </Link>

          <p className="mb-6 flex items-center justify-end gap-3 text-[13px] text-ink-soft lg:absolute lg:right-12 lg:top-9 lg:mb-0">
            {tautanAtas.tanya}
            <Link
              href={tautanAtas.href}
              className="rounded-full bg-brand-50 px-4 py-1.5 font-bold text-brand-600 transition-colors hover:bg-brand-100"
            >
              {tautanAtas.label}
            </Link>
          </p>

          <div className="mx-auto w-full max-w-[520px]">
            <h1 className="text-[clamp(1.6rem,2vw,2.1rem)] font-extrabold tracking-tight text-[#1d2444]">
              {judul}
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
              {keterangan}
            </p>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
