"use client";

import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Kolom isian halaman masuk & daftar. Sengaja TIDAK memakai `inputKelas`
 * bersama yang dipakai dialog di dalam aplikasi: kolom di sini punya ikon di
 * kiri, dan mengubah kelas bersama itu akan ikut menggeser puluhan dialog
 * lain yang tidak ada hubungannya.
 */
const KOTAK =
  "h-12 w-full rounded-xl border border-[#e4e7f2] bg-white pl-11 pr-4 text-sm font-medium text-ink outline-none transition-[border-color,box-shadow] placeholder:font-normal placeholder:text-muted focus:border-brand-300 focus:ring-4 focus:ring-brand-100";

function Label({ htmlFor, anak }: { htmlFor: string; anak: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-[13px] font-semibold text-ink">
      {anak}
    </label>
  );
}

export function Medan({
  label,
  ikon: Ikon,
  nilai,
  onUbah,
  ...sisa
}: {
  label: React.ReactNode;
  ikon: LucideIcon;
  nilai: string;
  onUbah: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const id = useId();
  // `className` pemanggil DIGABUNG, bukan menimpa — kalau ditimpa, kotak dan
  // ikonnya ikut hilang dan kolomnya tampak seperti teks biasa.
  const { className, ...atribut } = sisa;
  return (
    <div>
      <Label htmlFor={id} anak={label} />
      <div className="relative mt-1.5">
        <Ikon className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
        <input
          id={id}
          value={nilai}
          onChange={(e) => onUbah(e.target.value)}
          className={cn(KOTAK, className)}
          {...atribut}
        />
      </div>
    </div>
  );
}

export function MedanSandi({
  label,
  ikon: Ikon,
  nilai,
  onUbah,
  ...sisa
}: {
  label: React.ReactNode;
  ikon: LucideIcon;
  nilai: string;
  onUbah: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const id = useId();
  const { className, ...atribut } = sisa;
  const [terlihat, setTerlihat] = useState(false);
  const Mata = terlihat ? EyeOff : Eye;

  return (
    <div>
      <Label htmlFor={id} anak={label} />
      <div className="relative mt-1.5">
        <Ikon className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
        <input
          id={id}
          type={terlihat ? "text" : "password"}
          value={nilai}
          onChange={(e) => onUbah(e.target.value)}
          className={cn(KOTAK, "pr-11", className)}
          {...atribut}
        />
        <button
          type="button"
          onClick={() => setTerlihat((v) => !v)}
          // Kosong untuk pembaca layar saat disembunyikan tidak cukup: tombol
          // ini mengubah keadaan, jadi labelnya ikut berubah.
          aria-label={terlihat ? "Sembunyikan sandi" : "Tampilkan sandi"}
          className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-ink"
        >
          <Mata className="size-[18px]" />
        </button>
      </div>
    </div>
  );
}
