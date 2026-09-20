import Image, { type StaticImageData } from "next/image";
import {
  Briefcase,
  Coffee,
  House,
  Layers,
  Scissors,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Stethoscope,
  Store,
  Tag,
  Utensils,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import latar from "@/images/jenis-usaha-bg.webp";
import gambarCampuran from "@/images/jenis-campuran.webp";
import gambarDagang from "@/images/jenis-dagang.webp";
import gambarJasa from "@/images/jenis-jasa.webp";
import { cn } from "@/lib/utils";

type Tema = {
  /** Lingkaran ikon di samping judul. */
  ikon: string;
  /** Pil "cocok untuk". */
  pil: string;
};

const TEMA = {
  biru: { ikon: "bg-blue-50 text-blue-600", pil: "bg-blue-50 text-blue-700" },
  hijau: { ikon: "bg-emerald-50 text-emerald-600", pil: "bg-emerald-50 text-emerald-700" },
  merah: { ikon: "bg-rose-50 text-rose-500", pil: "bg-rose-50 text-rose-600" },
} satisfies Record<string, Tema>;

type Jenis = {
  id: string;
  nama: string;
  isi: string;
  /**
   * Ilustrasinya sudah membawa label fiturnya sendiri ("Menu POS & Stok
   * Barang", dst.), jadi tidak ada lencana HTML di atasnya — kalau ditambah,
   * labelnya tampil dua kali.
   */
  gambar: StaticImageData;
  ikon: LucideIcon;
  tema: Tema;
  contoh: { label: string; ikon: LucideIcon }[];
};

const DATA_JENIS: Jenis[] = [
  {
    id: "dagang",
    nama: "Dagang / Ritel",
    isi: "Jual barang yang stoknya dihitung otomatis. Cocok untuk minimarket, toko kelontong, toko aksesoris, hingga usaha ritel modern.",
    gambar: gambarDagang,
    ikon: Store,
    tema: TEMA.biru,
    contoh: [
      { label: "Minimarket", ikon: ShoppingCart },
      { label: "Toko Kelontong", ikon: House },
      { label: "Toko Aksesoris", ikon: Tag },
    ],
  },
  {
    id: "jasa",
    nama: "Jasa & Servis",
    isi: "Jual pelayanan, bukan sekadar barang. Atur antrean dan lacak tiap pesanan layanan untuk usaha seperti bengkel, salon, klinik, dan lainnya.",
    gambar: gambarJasa,
    ikon: Briefcase,
    tema: TEMA.hijau,
    contoh: [
      { label: "Bengkel", ikon: Wrench },
      { label: "Salon", ikon: Scissors },
      { label: "Klinik", ikon: Stethoscope },
      { label: "Jasa Reparasi", ikon: Settings },
    ],
  },
  {
    id: "campuran",
    nama: "Campuran (Hybrid)",
    isi: "Gabungkan penjualan produk dan layanan dalam satu sistem. Cocok untuk usaha seperti restoran, kafe, salon + produk, dan berbagai model bisnis lain.",
    gambar: gambarCampuran,
    ikon: Layers,
    tema: TEMA.merah,
    contoh: [
      { label: "Restoran", ikon: Utensils },
      { label: "Salon + Produk", ikon: Scissors },
      { label: "Kafe", ikon: Coffee },
      { label: "Layanan + Retail", ikon: ShoppingBag },
    ],
  },
];

/**
 * Tata letak mengikuti mockup 1857×847, yang ukurannya sama persis dengan
 * gambar latarnya. Karena itu posisi di layar besar ditulis dalam PERSEN
 * LEBAR (teks mulai di 50%, kartu dari 39,4% selebar 54,1%): selama latar
 * dipasang selebar layar dengan proporsi aslinya, persen yang sama jatuh di
 * titik yang sama di gambar — karakter di kiri tidak pernah tertimpa.
 *
 * Tiga susunan:
 * - ≥1536px: persis mockup — teks & kartu di sisi kanan karakter.
 * - 1024–1535px: teks tetap di kanan karakter, tapi kartu terlalu sempit
 *   kalau dijejalkan ke 54% lebar, jadi kartu turun selebar isi dan
 *   menumpuk di meja kasir (di bawah papan "Usaha Lebih Mudah").
 * - <1024px: latar disembunyikan; karakternya tampil sebagai gambar biasa.
 */
export function JenisUsahaSection() {
  return (
    <section
      id="jenis-usaha"
      data-jejak-bagian="jenis-usaha"
      className="relative scroll-mt-24 overflow-hidden bg-[linear-gradient(180deg,#eaf3fe_0%,#f1f7fe_100%)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 hidden aspect-[1857/847] lg:block"
      >
        <Image
          src={latar}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-top [mask-image:linear-gradient(to_bottom,black_86%,transparent_100%)]"
        />
      </div>

      <div className="relative pb-16 pt-20 lg:pb-[4vw] lg:pt-[3.6vw]">
        {/* ------------------------------------------------ kepala */}
        <div className="wadah lg:m-0 lg:min-h-[35vw] lg:max-w-none lg:pl-[50%] lg:pr-[6%] 2xl:min-h-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-700 shadow-sm backdrop-blur">
            <Layers className="size-3.5" />
            Satu aplikasi, tiga bentuk usaha
          </span>

          <h2 className="mt-5 text-[clamp(2.1rem,3.15vw,4.3rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-[#0f1b3d] 2xl:mt-[1.2vw]">
            Menunya menyesuaikan
            <br />
            <span className="text-blue-600">usaha Anda</span>
          </h2>

          <p className="mt-4 max-w-[640px] text-[max(15px,0.92vw)] leading-[1.6] text-ink-soft lg:max-w-[34.5vw] 2xl:mt-[0.9vw]">
            Pemilik usaha tidak perlu pusing memikirkan menu produk, setiap
            bisnis punya kebutuhan yang berbeda. Pilih jenis usaha Anda, lalu
            kami sesuaikan tampilannya agar lebih relevan dan mudah digunakan.
          </p>
        </div>

        {/* Di bawah lg karakternya tampil sebagai gambar di bawah judul. */}
        <div className="wadah lg:hidden">
          <div className="relative mt-8 aspect-[16/10] w-full max-w-[760px] overflow-hidden rounded-[28px] sm:aspect-[16/9]">
            <Image
              src={latar}
              alt="Pemilik usaha memegang tablet di meja kasir"
              fill
              sizes="(min-width: 640px) 760px, 92vw"
              className="object-cover object-[12%_42%]"
            />
          </div>
        </div>

        {/* ------------------------------------------------- kartu */}
        <div className="wadah mt-8 grid gap-5 sm:grid-cols-2 lg:m-0 lg:grid-cols-3 lg:max-w-none lg:px-[5%] 2xl:ml-[39.4%] 2xl:mt-[1.7vw] 2xl:w-[54.1%] 2xl:gap-[0.75vw] 2xl:px-0 sm:[&>*:last-child]:col-span-2 sm:[&>*:last-child]:mx-auto sm:[&>*:last-child]:w-[calc(50%-0.625rem)] lg:[&>*:last-child]:col-span-1 lg:[&>*:last-child]:w-auto">
          {DATA_JENIS.map((j) => {
            const Ikon = j.ikon;
            return (
              <article
                key={j.id}
                className="group flex flex-col rounded-[22px] border border-white bg-white p-4 shadow-[0_18px_50px_-24px_rgba(30,58,138,0.35)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[0_26px_60px_-24px_rgba(30,58,138,0.45)] 2xl:rounded-[1.2vw] 2xl:p-[0.9vw]"
              >
                {/* Ditampilkan utuh dengan proporsi aslinya — tidak dipotong. */}
                <div className="overflow-hidden rounded-2xl 2xl:rounded-[0.85vw]">
                  <Image
                    src={j.gambar}
                    alt={j.nama}
                    sizes="(min-width: 1536px) 17vw, (min-width: 768px) 30vw, 92vw"
                    className="h-auto w-full transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  />
                </div>

                <div className="mt-3.5 flex items-center gap-2.5 2xl:mt-[0.7vw] 2xl:gap-[0.55vw]">
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-full 2xl:size-[1.75vw]",
                      j.tema.ikon,
                    )}
                  >
                    <Ikon className="size-[52%]" strokeWidth={2.2} />
                  </span>
                  <h3 className="text-[max(17px,1vw)] font-extrabold tracking-tight text-[#0f1b3d]">
                    {j.nama}
                  </h3>
                </div>

                <p className="mt-2.5 text-[max(13.5px,0.8vw)] leading-[1.55] text-ink-soft 2xl:mt-[0.6vw]">
                  {j.isi}
                </p>

                <div className="mt-auto border-t border-line pt-3 2xl:pt-[0.6vw]">
                  <p className="mt-1 text-[max(10.5px,0.6vw)] font-bold uppercase tracking-[0.12em] text-muted">
                    Cocok untuk:
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {j.contoh.map((c) => {
                      const IkonPil = c.ikon;
                      return (
                        <li
                          key={c.label}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[max(11.5px,0.66vw)] font-semibold",
                            j.tema.pil,
                          )}
                        >
                          <IkonPil className="size-3.5" />
                          {c.label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
