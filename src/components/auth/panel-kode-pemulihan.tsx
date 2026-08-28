"use client";

import { Check, Copy, KeyRound, Loader2, ShieldAlert, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { buatKodePemulihanBaru } from "@/server/actions/auth";
import { aman } from "@/lib/aksi";

export function PanelKodePemulihan({
  punyaKode,
  dibuatPada,
}: {
  punyaKode: boolean;
  dibuatPada: string | null;
}) {
  const [kode, setKode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tersalin, setTersalin] = useState(false);

  async function buat() {
    setPending(true);
    setError(null);
    try {
      const hasil = await aman(buatKodePemulihanBaru());
      if (hasil.ok) setKode(hasil.kode);
      else setError(hasil.error);
    } catch {
      setError("Gagal menghubungi server. Periksa koneksi, lalu coba lagi.");
    }
    setPending(false);
  }

  async function salin() {
    if (!kode) return;
    try {
      await navigator.clipboard.writeText(kode);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      // Clipboard bisa ditolak browser; kodenya tetap terlihat untuk disalin
      // manual, jadi kegagalan di sini tidak perlu diberitahukan.
    }
  }

  if (kode) {
    return (
      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-500" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">
              Catat kode ini sekarang
            </p>
            <p className="mt-0.5 text-sm text-ink-soft">
              Kode ini <span className="font-semibold">hanya ditampilkan sekali</span> dan
              tidak bisa dilihat lagi. Tulis di tempat aman — dengan kode ini
              sandi Anda bisa diganti tanpa sandi lama.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-3">
          <code className="tabular flex-1 select-all break-all text-base font-bold tracking-wide text-ink">
            {kode}
          </code>
          <button
            type="button"
            onClick={salin}
            aria-label="Salin kode pemulihan"
            className="grid size-9 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-canvas hover:text-ink"
          >
            {tersalin ? (
              <Check className="size-4 text-success" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-line bg-canvas p-5">
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 size-5 shrink-0 text-brand-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">Kode pemulihan</p>
          <p className="mt-0.5 text-sm text-ink-soft">
            {punyaKode
              ? `Sudah ada, dibuat ${dibuatPada}. Membuat kode baru akan membatalkan kode lama.`
              : "Belum ada. Tanpa kode ini, sandi yang lupa hanya bisa direset dari server."}
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={buat}
        disabled={pending}
        className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white text-sm font-bold text-ink-soft transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:text-muted"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {punyaKode ? "Buat kode baru" : "Buat kode pemulihan"}
      </button>
    </div>
  );
}
