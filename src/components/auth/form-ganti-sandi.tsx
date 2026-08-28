"use client";

import { Loader2, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { inputKelas, tombolKelas } from "@/components/auth/kartu-auth";
import { gantiSandi } from "@/server/actions/auth";

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

    const hasil = await gantiSandi({ sandiLama, sandiBaru, ulangiSandi });
    if (!hasil.ok) {
      setError(hasil.error);
      setPending(false);
    }
  }

  return (
    <form onSubmit={kirim} className="mt-6">
      <div>
        <label htmlFor="sandiLama" className="text-sm font-semibold text-ink">
          Sandi sekarang
        </label>
        <input
          id="sandiLama"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={sandiLama}
          onChange={(e) => setSandiLama(e.target.value)}
          className={inputKelas}
        />
      </div>

      <div className="mt-4">
        <label htmlFor="sandiBaru" className="text-sm font-semibold text-ink">
          Sandi baru <span className="font-normal text-muted">(minimal 8 karakter)</span>
        </label>
        <input
          id="sandiBaru"
          type="password"
          autoComplete="new-password"
          value={sandiBaru}
          onChange={(e) => setSandiBaru(e.target.value)}
          className={inputKelas}
        />
      </div>

      <div className="mt-4">
        <label htmlFor="ulangiSandi" className="text-sm font-semibold text-ink">
          Ulangi sandi baru
        </label>
        <input
          id="ulangiSandi"
          type="password"
          autoComplete="new-password"
          value={ulangiSandi}
          onChange={(e) => setUlangiSandi(e.target.value)}
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
        disabled={pending || !sandiLama || !sandiBaru || !ulangiSandi}
        className={tombolKelas}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Simpan Sandi Baru
      </button>
    </form>
  );
}
