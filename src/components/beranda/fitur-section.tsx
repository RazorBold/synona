import Image, { type StaticImageData } from "next/image";
import { Layers } from "lucide-react";

import { FITUR } from "@/components/beranda/isi";
import ikon1 from "@/images/fitur-ikon-1.webp";
import ikon2 from "@/images/fitur-ikon-2.webp";
import ikon3 from "@/images/fitur-ikon-3.webp";
import ikon4 from "@/images/fitur-ikon-4.webp";
import ikon5 from "@/images/fitur-ikon-5.webp";
import ikon6 from "@/images/fitur-ikon-6.webp";

/**
 * Ikon 3D dipotong dari mockup (src/images/c.png), urutannya sama dengan
 * `FITUR` di isi.ts. Latar potongannya nyaris putih (#fefefe, bukan
 * #ffffff) — setelah dikompresi, bedanya cukup untuk memunculkan kotak samar
 * di latar putih. Tepinya karena itu dipudarkan lewat mask.
 */
const IKON: StaticImageData[] = [ikon1, ikon2, ikon3, ikon4, ikon5, ikon6];

export function FiturSection() {
  return (
    <section id="fitur" data-jejak-bagian="fitur" className="relative scroll-mt-24 overflow-hidden bg-white py-20 lg:py-24">
      {/* Lingkaran biru pucat di tepi, meniru mockup. Dipudarkan ke bawah:
          tanpa itu, lingkaran bawah terpotong garis lurus di batas section. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black_65%,transparent_100%)]"
      >
        <div className="absolute -left-[8%] -top-[30%] size-[30vw] min-h-[240px] min-w-[240px] max-h-[520px] max-w-[520px] rounded-full bg-[#f2f6fd]" />
        <div className="absolute left-[4%] top-[37%] hidden size-[3vw] max-h-14 max-w-14 rounded-full bg-[#eaf1fc] lg:block" />
        <div className="absolute -right-[4%] top-[45%] hidden size-[12vw] max-h-[220px] max-w-[220px] rounded-full bg-[#f2f6fd] lg:block" />
        <div className="absolute -bottom-[32%] -left-[9%] size-[28vw] min-h-[220px] min-w-[220px] max-h-[500px] max-w-[500px] rounded-full bg-[#f4f8fe]" />
        <div className="absolute -bottom-[26%] -right-[7%] size-[24vw] min-h-[200px] min-w-[200px] max-h-[440px] max-w-[440px] rounded-full bg-[#f4f8fe]" />
      </div>

      <div className="wadah relative">
        {/* ------------------------------------------------ kepala */}
        <div className="mx-auto max-w-[680px] text-center">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-indigo-100 bg-white/80 px-6 py-2.5 text-[max(14px,0.8vw)] font-bold uppercase tracking-[0.02em] text-indigo-700 shadow-sm">
            <Layers className="size-[1.15em]" />
            Fitur lengkap
          </span>

          <h2 className="mt-5 text-[clamp(2.1rem,3.1vw,3.6rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-[#0f1b3d]">
            Yang ikut terisi tanpa
            <br />
            <span className="text-blue-600">dicatat ulang</span>
          </h2>

          <p className="mx-auto mt-4 max-w-[560px] text-lead text-ink-soft">
            Satu kejadian dicatat di satu tempat saja. Karena itu laporan tidak
            pernah berselisih dengan penjualan.
          </p>
        </div>

        {/* ------------------------------------------------- fitur */}
        <ul className="mx-auto mt-10 grid max-w-[1320px] gap-x-10 gap-y-12 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-x-14 lg:gap-y-10">
          {FITUR.map((f, i) => (
            <li key={f.judul} className="flex flex-col items-center text-center">
              <Image
                src={IKON[i]}
                alt=""
                sizes="190px"
                className="h-[122px] w-[190px] transition-transform duration-300 [mask-image:radial-gradient(ellipse_at_center,black_58%,transparent_88%)] hover:-translate-y-1"
              />
              <h3 className="mt-2 text-[clamp(1.2rem,1.3vw,1.45rem)] font-extrabold tracking-tight text-[#0f1b3d]">
                {f.judul}
              </h3>
              <p className="mt-2.5 max-w-[34ch] text-[max(15px,0.86vw)] leading-[1.6] text-ink-soft">
                {f.isi}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
