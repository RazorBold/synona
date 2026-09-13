"use client";

import { ArrowRight, Loader2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PilihJenisUsaha } from "@/components/onboarding/pilih-jenis-usaha";
import { aman } from "@/lib/aksi";
import type { JenisUsaha } from "@/lib/usaha";
import { simpanJenisUsaha } from "@/server/actions/outlet";
import { LogoSynona } from "@/components/ui/logo-synona";

/**
 * Layar penyiapan untuk pengguna yang SUDAH masuk tapi outletnya belum punya
 * jenis usaha.
 *
 * Normalnya pertanyaan ini dijawab di halaman masuk. Kasus yang tersisa:
 * `npm run data:kosongkan` menghapus outlet lama dan membuat yang baru,
 * sementara cookie sesi pemiliknya masih hidup — jadi ia tidak pernah lewat
 * halaman masuk lagi. Tanpa layar ini, aplikasi tidak tahu menu apa yang
 * harus ditampilkan dan sidebar-nya jadi tebakan.
 */
export function SetupJenisUsaha({
  namaOutlet,
  namaPemilik,
}: {
  namaOutlet: string;
  namaPemilik: string;
}) {
  const router = useRouter();
  const [pilihan, setPilihan] = useState<JenisUsaha | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lanjut() {
    if (!pilihan) return;
    setPending(true);
    setError(null);

    const hasil = await aman(simpanJenisUsaha({ jenis: pilihan }));
    if (!hasil.ok) {
      setPending(false);
      return setError(hasil.error);
    }
    router.refresh();
  }

  return (
    <main className="relative min-h-dvh px-4 py-10 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat"
      />

      <div className="mx-auto w-full max-w-[680px]">
        <div className="flex items-center gap-3">
          <LogoSynona tinggi={40} />
          <span className="text-2xl font-extrabold tracking-tight text-ink">
            Synona
          </span>
        </div>

        <h1 className="mt-8 text-[30px] font-extrabold leading-tight tracking-tight text-ink">
          Halo, {namaPemilik.split(" ")[0]} 👋
        </h1>
        <p className="mt-2 max-w-lg text-[15px] text-muted">
          <span className="font-semibold text-ink-soft">{namaOutlet}</span> ini
          usaha yang seperti apa? Jawabannya menentukan menu apa saja yang Anda
          lihat.
        </p>

        <div className="mt-7">
          <PilihJenisUsaha
            nilai={pilihan}
            onPilih={setPilihan}
            disabled={pending}
          />
        </div>

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        <button
          onClick={lanjut}
          disabled={pending || !pilihan}
          className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-[15px] font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Mulai Pakai Synona
              <ArrowRight className="size-4" />
            </>
          )}
        </button>

        <p className="mt-3 text-center text-xs text-muted">
          Bisa diubah kapan saja lewat Pengaturan → Outlet &amp; Staf.
        </p>
      </div>
    </main>
  );
}
