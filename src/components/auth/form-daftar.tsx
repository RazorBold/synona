"use client";

import {
  ArrowRight,
  AtSign,
  Check,
  Loader2,
  Lock,
  Phone,
  Store,
  TriangleAlert,
  User,
  Wrench,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { Medan, MedanSandi } from "@/components/auth/medan";
import { aman } from "@/lib/aksi";
import type { JenisUsaha } from "@/lib/usaha";
import { cn } from "@/lib/utils";
import { daftar } from "@/server/actions/auth";

const JENIS: { key: JenisUsaha; label: string; ikon: LucideIcon }[] = [
  { key: "dagang", label: "Dagang / Ritel", ikon: Store },
  { key: "jasa", label: "Jasa", ikon: Wrench },
  { key: "campuran", label: "Campuran", ikon: Layers },
];

export function FormDaftar() {
  const [namaPemilik, setNamaPemilik] = useState("");
  const [namaOutlet, setNamaOutlet] = useState("");
  const [namaPengguna, setNamaPengguna] = useState("");
  const [email, setEmail] = useState("");
  const [telepon, setTelepon] = useState("");
  const [sandi, setSandi] = useState("");
  const [ulangiSandi, setUlangiSandi] = useState("");
  const [jenisUsaha, setJenisUsaha] = useState<JenisUsaha | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const hasil = await aman(
      daftar({
        namaOutlet,
        namaPemilik,
        jenisUsaha,
        namaPengguna,
        email: email.trim() || null,
        telepon: telepon.trim() || null,
        sandi,
        ulangiSandi,
      }),
    );
    if (!hasil.ok) {
      setError(hasil.error);
      setPending(false);
    }
  }

  const siap =
    namaPemilik.trim() &&
    namaOutlet.trim() &&
    namaPengguna.trim() &&
    sandi &&
    ulangiSandi &&
    jenisUsaha !== null;

  return (
    <form onSubmit={kirim} className="mt-7 space-y-4">
      <Medan
        label="Nama lengkap"
        ikon={User}
        nilai={namaPemilik}
        onUbah={setNamaPemilik}
        autoFocus
        placeholder="Masukkan nama lengkap Anda"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Medan
          label="Nama usaha"
          ikon={Store}
          nilai={namaOutlet}
          onUbah={setNamaOutlet}
          placeholder="mis. Toko Berkah"
        />
        <Medan
          label="Nama pengguna"
          ikon={User}
          nilai={namaPengguna}
          onUbah={setNamaPengguna}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="untuk masuk nanti"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Medan
          label={
            <>
              Email <span className="font-normal text-muted">(opsional)</span>
            </>
          }
          ikon={AtSign}
          nilai={email}
          onUbah={setEmail}
          type="email"
          autoComplete="email"
          placeholder="nama@contoh.com"
        />
        <Medan
          label={
            <>
              Nomor HP <span className="font-normal text-muted">(opsional)</span>
            </>
          }
          ikon={Phone}
          nilai={telepon}
          onUbah={setTelepon}
          type="tel"
          autoComplete="tel"
          placeholder="08xxxxxxxxxx"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MedanSandi
          label="Buat sandi"
          ikon={Lock}
          nilai={sandi}
          onUbah={setSandi}
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
        />
        <MedanSandi
          label="Konfirmasi sandi"
          ikon={Lock}
          nilai={ulangiSandi}
          onUbah={setUlangiSandi}
          autoComplete="new-password"
          placeholder="Ulangi sandi Anda"
        />
      </div>

      {/* Jenis usaha menentukan menu yang tampil setelah masuk. */}
      <div>
        <p className="text-[13px] font-semibold text-ink">Jenis usaha Anda</p>
        <div className="mt-1.5 grid grid-cols-3 gap-3">
          {JENIS.map((j) => {
            const Ikon = j.ikon;
            const aktif = jenisUsaha === j.key;
            return (
              <button
                key={j.key}
                type="button"
                onClick={() => setJenisUsaha(j.key)}
                disabled={pending}
                aria-pressed={aktif}
                className={cn(
                  "relative flex flex-col items-center gap-2 rounded-2xl border px-2 py-4 text-center transition-colors",
                  aktif
                    ? "border-brand-400 bg-brand-50/70 text-brand-600 ring-2 ring-brand-100"
                    : "border-[#e4e7f2] bg-white text-ink-soft hover:border-brand-200",
                )}
              >
                {aktif && (
                  <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-brand-500 text-white">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                )}
                <Ikon className="size-5" />
                <span className="text-xs font-bold">{j.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !siap}
        className="group flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 text-[15px] font-bold text-white shadow-[0_16px_30px_-16px_rgba(91,75,224,0.9)] transition-[transform,opacity] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none disabled:hover:translate-y-0"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Daftar Sekarang
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </button>

      <p className="pt-1 text-center text-xs leading-relaxed text-muted">
        Akun ini dibuat langsung di server Anda sendiri. Tidak ada data yang
        dikirim ke pihak lain.
      </p>
    </form>
  );
}
