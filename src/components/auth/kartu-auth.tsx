import { Store } from "lucide-react";

/**
 * Bingkai halaman /masuk dan /ganti-sandi. Sengaja tidak memakai AppShell:
 * sidebar dan topbar mengandalkan data outlet yang belum boleh dibaca sebelum
 * ada sesi.
 */
export function KartuAuth({
  judul,
  keterangan,
  children,
}: {
  judul: string;
  keterangan: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative grid min-h-dvh place-items-center px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat"
      />

      <div className="w-full max-w-[420px] rounded-3xl border border-line bg-white p-7 shadow-card sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-pop">
            <Store className="size-5 text-white" />
          </span>
          <span className="text-2xl font-extrabold tracking-tight text-ink">
            Synona
          </span>
        </div>

        <h1 className="mt-6 text-xl font-extrabold tracking-tight text-ink">
          {judul}
        </h1>
        <p className="mt-1 text-sm text-muted">{keterangan}</p>

        {children}
      </div>
    </div>
  );
}

export const inputKelas =
  "mt-2 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm font-medium text-ink outline-none transition-shadow placeholder:font-normal placeholder:text-muted focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100";

export const tombolKelas =
  "mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none";
