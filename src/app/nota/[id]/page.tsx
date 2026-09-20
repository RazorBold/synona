import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import qrcode from "qrcode-generator";

import { CetakOtomatis } from "@/components/nota/cetak-otomatis";
import { LABEL_METODE_NOTA, angkaNota, tautanNota } from "@/lib/nota";
import { getNota, kunciNotaSah } from "@/server/nota";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nota — Synona",
  robots: { index: false, follow: false },
  // Tautan bertanda tangan tidak boleh bocor ke situs lain lewat Referer.
  referrer: "no-referrer",
};

/**
 * Nota digital publik — tujuan QR code di nota cetak, dan halaman cetak
 * untuk mode "printer biasa". Tidak butuh sesi: aksesnya dijaga oleh
 * tanda tangan `k` (lihat src/server/nota.ts). Tanpa `k` yang cocok,
 * jawabannya 404 — tidak membedakan "tidak ada" dari "kunci salah".
 */
export default async function HalamanNota({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ k?: string; cetak?: string; lebar?: string }>;
}) {
  const { id } = await params;
  const { k, cetak, lebar } = await searchParams;
  if (!kunciNotaSah(id, k)) notFound();

  const d = getNota(id, null);
  if (!d) notFound();

  const h = await headers();
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim() || "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const tautan = tautanNota(`${proto}://${host}`, d);

  const q = qrcode(0, "M");
  q.addData(tautan);
  q.make();
  const n = q.getModuleCount();
  const kotak: string[] = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) if (q.isDark(r, c)) kotak.push(`M${c} ${r}h1v1h-1z`);

  const mm = lebar === "80" ? 80 : 58;

  return (
    <main className="min-h-dvh bg-canvas px-4 py-8 print:bg-white print:p-0">
      {cetak === "1" && <CetakOtomatis lebarMm={mm} />}

      <article
        className="mx-auto w-full max-w-[380px] bg-white px-5 py-6 font-mono text-[13px] leading-relaxed text-black shadow-card print:max-w-none print:px-1 print:py-0 print:text-[11px] print:shadow-none"
        style={{ backgroundImage: "none" }}
      >
        <header className="text-center">
          <h1 className="text-lg font-bold uppercase">{d.toko.nama}</h1>
          {d.toko.alamat && <p>{d.toko.alamat}</p>}
          {d.toko.telepon && <p>Telp. {d.toko.telepon}</p>}
        </header>

        <Garis />
        <Baris kiri="No" kanan={d.invoiceNo} />
        <Baris kiri="Waktu" kanan={d.waktu} />
        {d.pelanggan && <Baris kiri="Pelanggan" kanan={d.pelanggan} />}
        <Garis />

        <ul>
          {d.baris.map((b, i) => (
            <li key={i} className="py-0.5">
              <p>{b.nama}</p>
              <Baris
                kiri={b.harga !== null ? `  ${b.jumlah} x ${angkaNota(b.harga)}` : `  ${b.jumlah}`}
                kanan={angkaNota(b.kotor)}
              />
              {b.diskon > 0 && <Baris kiri="  Diskon" kanan={angkaNota(-b.diskon)} />}
            </li>
          ))}
        </ul>

        <Garis />
        <Baris kiri="Subtotal" kanan={angkaNota(d.subtotal)} />
        {d.diskon > 0 && <Baris kiri="Total diskon" kanan={angkaNota(-d.diskon)} />}
        {d.pajak > 0 && d.modePajak === "tambah" && (
          <Baris kiri={d.labelPajak ?? "Pajak"} kanan={angkaNota(d.pajak)} />
        )}
        <Baris kiri="TOTAL" kanan={`Rp ${angkaNota(d.tagihan)}`} tebal />
        {d.pajak > 0 && d.modePajak === "termasuk" && (
          <Baris kiri={`Termasuk ${d.labelPajak ?? "pajak"}`} kanan={angkaNota(d.pajak)} />
        )}
        {d.status === "debt" ? (
          <>
            <Baris kiri="Pembayaran" kanan="KASBON" />
            {d.jatuhTempo && <Baris kiri="Jatuh tempo" kanan={d.jatuhTempo} />}
          </>
        ) : (
          <>
            <Baris kiri={LABEL_METODE_NOTA[d.metode]} kanan={angkaNota(d.dibayar)} />
            {d.kembalian > 0 && <Baris kiri="Kembali" kanan={angkaNota(d.kembalian)} />}
          </>
        )}
        {d.status === "void" && (
          <p className="mt-1 text-center font-bold">*** DIBATALKAN ***</p>
        )}
        <Garis />

        <div className="mt-3 flex flex-col items-center text-center">
          <svg
            viewBox={`-2 -2 ${n + 4} ${n + 4}`}
            className="size-36 print:size-28"
            shapeRendering="crispEdges"
            role="img"
            aria-label="QR code nota digital"
          >
            <rect x={-2} y={-2} width={n + 4} height={n + 4} fill="#fff" />
            <path d={kotak.join("")} fill="#000" />
          </svg>
          <p className="mt-1">Pindai untuk nota digital</p>
          <p className="mt-3">Terima kasih atas kunjungan Anda</p>
          <p className="mt-3 font-bold">SYNONA</p>
          <p>Kelola usaha, lebih mudah</p>
        </div>
      </article>
    </main>
  );
}

function Garis() {
  return <div className="my-2 border-t border-dashed border-black" />;
}

function Baris({ kiri, kanan, tebal }: { kiri: string; kanan: string; tebal?: boolean }) {
  return (
    <p className={`flex justify-between gap-3 whitespace-pre ${tebal ? "font-bold" : ""}`}>
      <span className="min-w-0 truncate">{kiri}</span>
      <span className="shrink-0">{kanan}</span>
    </p>
  );
}
