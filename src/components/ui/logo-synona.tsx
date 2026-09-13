import Image from "next/image";

import lambang from "@/images/logo-synona.webp";
import { cn } from "@/lib/utils";

/**
 * Lambang Synona. Satu-satunya tempat berkasnya disebut, supaya penggantian
 * logo berikutnya cukup di sini — bukan diburu satu per satu di sidebar,
 * halaman depan, dan halaman masuk.
 *
 * Lambangnya lebih tinggi daripada lebar (rasio ±0,85), jadi yang dikunci
 * TINGGI-nya; lebarnya mengikuti supaya tidak pernah gepeng.
 */
export function LogoSynona({
  tinggi = 36,
  kelas,
  prioritas = false,
}: {
  /** Tinggi lambang dalam piksel. */
  tinggi?: number;
  kelas?: string;
  prioritas?: boolean;
}) {
  const lebar = Math.round((tinggi * lambang.width) / lambang.height);

  return (
    <Image
      src={lambang}
      alt=""
      aria-hidden
      priority={prioritas}
      width={lebar}
      height={tinggi}
      style={{ height: tinggi, width: lebar }}
      className={cn("shrink-0 object-contain", kelas)}
    />
  );
}

/** Lambang + tulisan "Synona", susunan yang paling sering dipakai. */
export function MerekSynona({
  tinggi = 36,
  kelasTeks,
  prioritas = false,
}: {
  tinggi?: number;
  kelasTeks?: string;
  prioritas?: boolean;
}) {
  return (
    <>
      <LogoSynona tinggi={tinggi} prioritas={prioritas} />
      <span
        className={cn(
          "font-extrabold tracking-tight text-ink",
          kelasTeks ?? "text-xl",
        )}
      >
        Synona
      </span>
    </>
  );
}
