"use client";

import { Loader2, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { inputKelas, tombolKelas } from "@/components/auth/kartu-auth";
import { masuk } from "@/server/actions/auth";
import { aman } from "@/lib/aksi";

export function FormMasuk({ lanjut }: { lanjut: string | null }) {
  const [namaPengguna, setNamaPengguna] = useState("");
  const [sandi, setSandi] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const hasil = await aman(masuk({ namaPengguna, sandi, lanjut }));
    if (!hasil.ok) {
      setError(hasil.error);
      setSandi("");
      setPending(false);
    }
  }

  return (
    <form onSubmit={kirim} className="mt-6">
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
        disabled={pending || !namaPengguna.trim() || !sandi}
        className={tombolKelas}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Masuk
      </button>
    </form>
  );
}
