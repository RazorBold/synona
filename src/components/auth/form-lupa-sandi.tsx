"use client";

import { Loader2, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { inputKelas, tombolKelas } from "@/components/auth/kartu-auth";
import { pulihkanSandi } from "@/server/actions/auth";

export function FormLupaSandi() {
  const [namaPengguna, setNamaPengguna] = useState("");
  const [kode, setKode] = useState("");
  const [sandiBaru, setSandiBaru] = useState("");
  const [ulangiSandi, setUlangiSandi] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    try {
      // Sukses tidak kembali ke sini: aksinya berakhir dengan redirect().
      const hasil = await pulihkanSandi({ namaPengguna, kode, sandiBaru, ulangiSandi });
      if (!hasil.ok) {
        setError(hasil.error);
        setPending(false);
      }
    } catch {
      setError("Gagal menghubungi server. Periksa koneksi, lalu coba lagi.");
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
        <label htmlFor="kode" className="text-sm font-semibold text-ink">
          Kode pemulihan
        </label>
        <input
          id="kode"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="SYN-XXXX-XXXX-XXXX-XXXX"
          value={kode}
          onChange={(e) => setKode(e.target.value)}
          className={`${inputKelas} tabular tracking-wide`}
        />
        <p className="mt-1.5 text-xs text-muted">
          Huruf besar/kecil dan tanda hubung tidak masalah.
        </p>
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
        disabled={pending || !namaPengguna.trim() || !kode.trim() || !sandiBaru || !ulangiSandi}
        className={tombolKelas}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Pulihkan Akses
      </button>
    </form>
  );
}
