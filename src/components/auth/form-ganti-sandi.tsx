"use client";

import { ArrowRight, Loader2, Lock, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { MedanSandi } from "@/components/auth/medan";
import { gantiSandi } from "@/server/actions/auth";
import { aman } from "@/lib/aksi";

export function FormGantiSandi() {
  const [sandiLama, setSandiLama] = useState("");
  const [sandiBaru, setSandiBaru] = useState("");
  const [ulangiSandi, setUlangiSandi] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const hasil = await aman(gantiSandi({ sandiLama, sandiBaru, ulangiSandi }));
    if (!hasil.ok) {
      setError(hasil.error);
      setPending(false);
    }
  }

  return (
    <form onSubmit={kirim} className="mt-7 space-y-4">
      <MedanSandi
        label="Sandi sekarang"
        ikon={Lock}
        nilai={sandiLama}
        onUbah={setSandiLama}
        autoComplete="current-password"
        autoFocus
        placeholder="Sandi yang dipakai sekarang"
      />

      <MedanSandi
        label={
          <>
            Sandi baru{" "}
            <span className="font-normal text-muted">(minimal 8 karakter)</span>
          </>
        }
        ikon={Lock}
        nilai={sandiBaru}
        onUbah={setSandiBaru}
        autoComplete="new-password"
        placeholder="Sandi baru Anda"
      />

      <MedanSandi
        label="Ulangi sandi baru"
        ikon={Lock}
        nilai={ulangiSandi}
        onUbah={setUlangiSandi}
        autoComplete="new-password"
        placeholder="Ulangi sandi baru"
      />

      {error && (
        <p className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !sandiLama || !sandiBaru || !ulangiSandi}
        className="group flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 text-[15px] font-bold text-white shadow-[0_16px_30px_-16px_rgba(91,75,224,0.9)] transition-[transform,opacity] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none disabled:hover:translate-y-0"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Simpan Sandi Baru
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </form>
  );
}
