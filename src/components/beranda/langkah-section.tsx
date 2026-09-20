import Image, { type StaticImageData } from "next/image";
import { Layers } from "lucide-react";

import { LANGKAH } from "@/components/beranda/isi";
import ikon1 from "@/images/langkah-1.webp";
import ikon2 from "@/images/langkah-2.webp";
import ikon3 from "@/images/langkah-3.webp";

/**
 * Ikon 3D dipotong dari mockup (src/images/d.png). Sisanya — judul, teks,
 * nomor, garis penghubung, dan latar — dibangun ulang sebagai HTML, bukan
 * gambar utuh: teks di dalam gambar tidak terbaca mesin pencari, tidak bisa
 * diterjemahkan, dan tidak bisa menyusun ulang dirinya di layar HP.
 */
const IKON: StaticImageData[] = [ikon1, ikon2, ikon3];

export function LangkahSection() {
  return (
    <section
      id="cara-kerja"
      data-jejak-bagian="cara-kerja"
      className="relative scroll-mt-24 overflow-hidden bg-[linear-gradient(180deg,#f3f8ff_0%,#eef5fe_60%,#f4f8ff_100%)] py-20 lg:py-24"
    >
      {/* Latar: lingkaran biru pucat di pojok + gelombang putih di bawah,
          meniru mockup tanpa gambar tambahan. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-[9%] -top-[40%] size-[34vw] max-w-[560px] max-h-[560px] min-w-[260px] min-h-[260px] rounded-full bg-[radial-gradient(circle_at_60%_60%,#e2eefd_0%,#eaf3fe_70%)]" />
        <div className="absolute -right-[5%] -top-[12%] size-[20vw] max-w-[340px] max-h-[340px] min-w-[180px] min-h-[180px] rounded-full bg-[radial-gradient(circle_at_35%_40%,#d6e8fd_0%,#c6dffc_100%)] opacity-80" />
        <div className="absolute -bottom-[25%] -right-[6%] size-[22vw] max-w-[380px] max-h-[380px] min-w-[200px] min-h-[200px] rounded-full bg-[radial-gradient(circle_at_35%_35%,#dcebfd_0%,#cfe3fc_100%)] opacity-80" />
        <svg
          className="absolute inset-x-0 bottom-0 h-[38%] w-full"
          viewBox="0 0 1440 300"
          preserveAspectRatio="none"
        >
          <path
            d="M0 150 C 240 60, 420 70, 640 150 S 1080 260, 1440 120 L1440 300 L0 300 Z"
            fill="#ffffff"
            opacity="0.55"
          />
          <path
            d="M0 220 C 300 150, 560 170, 820 230 S 1220 270, 1440 200 L1440 300 L0 300 Z"
            fill="#ffffff"
            opacity="0.7"
          />
        </svg>
      </div>

      <div className="wadah relative">
        {/* ------------------------------------------------ kepala */}
        <div className="mx-auto max-w-[680px] text-center">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-indigo-100 bg-white/70 px-6 py-2.5 text-[max(14px,0.8vw)] font-bold uppercase tracking-[0.02em] text-indigo-700 shadow-sm backdrop-blur">
            <Layers className="size-[1.15em]" />
            Cara mulai
          </span>

          <h2 className="mt-5 text-[clamp(2.1rem,3.1vw,3.6rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-[#0f1b3d]">
            Tiga langkah, lalu
            <br />
            <span className="text-blue-600">berulang tiap hari</span>
          </h2>

          <p className="mx-auto mt-4 max-w-[600px] text-lead text-ink-soft">
            Mulai kelola usaha dengan mudah. Ikuti tiga langkah sederhana ini,
            dan jadikan rutinitas harian Anda lebih efisien.
          </p>
        </div>

        {/* ------------------------------------------------ langkah */}
        <ol className="mx-auto mt-12 grid max-w-[1240px] gap-12 lg:mt-14 lg:grid-cols-3 lg:gap-14">
          {LANGKAH.map((l, i) => (
            <li key={l.nomor} className="relative flex flex-col items-center text-center">
              {/* Garis putus-putus ke langkah berikutnya, di tinggi tengah ikon. */}
              {i < LANGKAH.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-[calc(50%+120px)] top-[78px] hidden w-[calc(100%+3.5rem-240px)] border-t-2 border-dashed border-blue-400/70 lg:block lg:w-[calc(100%+3.5rem-240px)]"
                />
              )}

              <div className="relative">
                <span className="absolute -left-12 -top-1 grid size-16 place-items-center rounded-full bg-[#dceafd] text-[26px] font-extrabold text-blue-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  {l.nomor}
                </span>
                <Image
                  src={IKON[i]}
                  alt=""
                  sizes="208px"
                  className="h-[156px] w-[208px] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_90%)]"
                />
              </div>

              <h3 className="mt-3 text-[clamp(1.2rem,1.3vw,1.45rem)] font-extrabold tracking-tight text-[#0f1b3d]">
                {l.judul}
              </h3>
              <p className="mt-2.5 max-w-[31ch] text-[max(15px,0.84vw)] leading-[1.6] text-ink-soft">{l.isi}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
