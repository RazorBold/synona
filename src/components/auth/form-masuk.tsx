"use client";

import { Loader2, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { inputKelas, tombolKelas } from "@/components/auth/kartu-auth";
import { PilihJenisUsaha } from "@/components/onboarding/pilih-jenis-usaha";
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

    const hasil = await aman(
      masuk({ namaPengguna, sandi, lanjut, jenisUsaha }),
    );
    if (!hasil.ok) {
      setError(hasil.error);
      setSandi("");
      setPending(false);
    }
  }

  return (
    <form onSubmit={kirim} className="mt-6">
      {perluJenisUsaha && (
        <div className="mb-6">
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

      <div>
        <label htmlFor="namaPengguna" className="text-sm font-semibold text-ink">
          Nama pengguna
        </label>
        <input
          id="namaPengguna"
          name="username"
          autoComplete="username"
          autoFocus
          autoCapitalize="none"
          spellCheck={false}
          value={namaPengguna}
          onChange={(e) => setNamaPengguna(e.target.value)}
          className={inputKelas}
        />
      </div>

      <div className="mt-4">
        <label htmlFor="sandi" className="text-sm font-semibold text-ink">
          Sandi
        </label>
        <input
          id="sandi"
          name="password"
          type="password"
          autoComplete="current-password"
          value={sandi}
          onChange={(e) => setSandi(e.target.value)}
          className={inputKelas}
        />
      </div>

      {error && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">
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
        className={tombolKelas}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Masuk
      </button>
    </form>
  );
}
