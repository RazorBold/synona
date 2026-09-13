import Link from "next/link";

/**
 * Bingkai untuk layar 404 / galat. Sengaja tidak memakai AppShell: layar ini
 * juga tampil saat sesi atau data outlet bermasalah, dan sidebar butuh
 * keduanya — kalau dipaksakan, halaman galatnya sendiri ikut galat.
 */
export function LayarPesan({
  kode,
  judul,
  keterangan,
  aksi,
}: {
  kode: string;
  judul: string;
  keterangan: string;
  aksi: React.ReactNode;
}) {
  return (
    <div className="relative grid min-h-dvh place-items-center px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat"
      />

      <div className="w-full max-w-[440px] rounded-3xl border border-line bg-white p-7 text-center shadow-card sm:p-8">
        <p className="text-5xl font-extrabold tracking-tight text-brand-500">{kode}</p>
        <h1 className="mt-4 text-xl font-extrabold tracking-tight text-ink">{judul}</h1>
        <p className="mt-2 text-sm text-ink-soft">{keterangan}</p>
        <div className="mt-6 flex flex-col gap-2">{aksi}</div>
      </div>
    </div>
  );
}

export const tombolUtama =
  "flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95";

export const tombolKedua =
  "flex h-12 w-full items-center justify-center rounded-2xl border border-line text-sm font-bold text-ink-soft transition-colors hover:bg-canvas";

export { Link };
