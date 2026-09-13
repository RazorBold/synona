"use client";

import { ArrowRight, Loader2, Lock, TriangleAlert, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Medan, MedanSandi } from "@/components/auth/medan";
import { PilihJenisUsaha } from "@/components/onboarding/pilih-jenis-usaha";
import { RUTE_LUPA_SANDI } from "@/lib/auth-const";
import { aman } from "@/lib/aksi";
import type { JenisUsaha } from "@/lib/usaha";
import { masuk } from "@/server/actions/auth";

export function FormMasuk({
  lanjut,
  perluJenisUsaha = false,
}: {
  lanjut: string | null;
  /** Pemasangan baru: jenis usaha belum pernah dipilih. */
  perluJenisUsaha?: boolean;
}) {
  const [namaPengguna, setNamaPengguna] = useState("");
  const [sandi, setSandi] = useState("");
  const [jenisUsaha, setJenisUsaha] = useState<JenisUsaha | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const hasil = await aman(masuk({ namaPengguna, sandi, lanjut, jenisUsaha }));
    if (!hasil.ok) {
      setError(hasil.error);
      setSandi("");
      setPending(false);
    }
  }

  return (
    <form onSubmit={kirim} className="mt-7 space-y-4">
      {perluJenisUsaha && (
        <div className="rounded-2xl bg-canvas p-4">
          <p className="text-sm font-semibold text-ink">
            Usaha Anda yang seperti apa?
          </p>
          <p className="mb-3 mt-0.5 text-xs text-muted">
            Menentukan menu yang tampil. Bisa diubah lagi lewat Pengaturan.
          </p>
          <PilihJenisUsaha
            nilai={jenisUsaha}
            onPilih={setJenisUsaha}
            ringkas
            disabled={pending}
          />
        </div>
      )}

      <Medan
        label="Nama pengguna"
        ikon={User}
        nilai={namaPengguna}
        onUbah={setNamaPengguna}
        name="username"
        autoComplete="username"
        autoFocus
        autoCapitalize="none"
        spellCheck={false}
        placeholder="Masukkan nama pengguna"
      />

      <MedanSandi
        label="Sandi"
        ikon={Lock}
        nilai={sandi}
        onUbah={setSandi}
        name="password"
        autoComplete="current-password"
        placeholder="Masukkan sandi"
      />

      <div className="flex justify-end pt-0.5">
        <Link
          href={RUTE_LUPA_SANDI}
          className="text-[13px] font-semibold text-brand-500 hover:text-brand-600"
        >
          Lupa sandi?
        </Link>
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={
          pending ||
          !namaPengguna.trim() ||
          !sandi ||
          (perluJenisUsaha && jenisUsaha === null)
        }
        className="group flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 text-[15px] font-bold text-white shadow-[0_16px_30px_-16px_rgba(91,75,224,0.9)] transition-[transform,opacity] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none disabled:hover:translate-y-0"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Masuk
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </form>
  );
}
