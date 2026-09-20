"use client";

import { ChevronRight, MessageCircleQuestion, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { aman } from "@/lib/aksi";
import { cn } from "@/lib/utils";
import { tanyaAsisten } from "@/server/actions/asisten";
import type { ButirPertanyaan, Jawaban, NadaJawaban } from "@/server/queries/asisten";

const WARNA_NADA: Record<NadaJawaban, string> = {
  baik: "border-emerald-200 bg-emerald-50/70",
  netral: "border-line bg-white",
  waspada: "border-amber-200 bg-amber-50/70",
  bahaya: "border-red-200 bg-red-50/70",
};

type Pesan =
  | { peran: "pengguna"; teks: string }
  | { peran: "asisten"; isi: Jawaban }
  | { peran: "asisten"; teks: string };

/**
 * Asisten tanya-jawab mengambang, meniru kotak live chat — tapi bukan bot
 * yang mengarang: pemilik memilih pertanyaan dari daftar, dan jawabannya
 * dirakit dari data outletnya sendiri (lihat server/queries/asisten.ts).
 */
export function AsistenChat({
  pertanyaan,
  namaPemilik,
}: {
  pertanyaan: ButirPertanyaan[];
  namaPemilik: string;
}) {
  const [buka, setBuka] = useState(false);
  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [menunggu, setMenunggu] = useState(false);
  const akhir = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (buka) akhir.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [pesan, buka, menunggu]);

  async function tanya(p: ButirPertanyaan) {
    if (menunggu) return;
    setPesan((s) => [...s, { peran: "pengguna", teks: p.teks }]);
    setMenunggu(true);
    const r = await aman(tanyaAsisten(p.kode));
    setMenunggu(false);
    setPesan((s) => [
      ...s,
      r.ok ? { peran: "asisten", isi: r.jawaban } : { peran: "asisten", teks: r.error },
    ]);
  }

  const grup = [...new Set(pertanyaan.map((p) => p.grup))];

  return (
    <>
      {/* Tombol mengambang. Di bawah xl ada bilah keranjang POS di dasar
          layar, jadi tombolnya dinaikkan supaya tidak saling menutupi. */}
      <button
        onClick={() => setBuka((v) => !v)}
        aria-label={buka ? "Tutup asisten" : "Buka asisten"}
        className={cn(
          "fixed bottom-5 right-5 z-40 grid size-14 place-items-center rounded-full",
          "bg-gradient-to-br from-brand-500 to-brand-600 text-white",
          "shadow-[0_18px_40px_-16px_rgba(91,75,224,0.9)] transition-transform hover:-translate-y-0.5",
          "max-xl:bottom-24",
        )}
      >
        {buka ? <X className="size-6" /> : <MessageCircleQuestion className="size-6" />}
      </button>

      {buka && (
        <section
          aria-label="Asisten Synona"
          className="fixed bottom-24 right-5 z-40 flex max-h-[min(640px,80dvh)] w-[calc(100vw-2.5rem)] max-w-[380px] flex-col overflow-hidden rounded-3xl border border-line bg-canvas shadow-2xl max-xl:bottom-44"
        >
          <header className="flex items-center gap-3 bg-gradient-to-r from-brand-500 to-brand-400 px-4 py-3.5 text-white">
            <span className="grid size-10 place-items-center rounded-full bg-white/20">
              <Sparkles className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold">Asisten Synona</p>
              <p className="text-xs text-white/80">Jawaban dari data usaha Anda</p>
            </div>
            <button
              onClick={() => setBuka(false)}
              aria-label="Tutup"
              className="grid size-8 place-items-center rounded-lg hover:bg-white/15"
            >
              <X className="size-4" />
            </button>
          </header>

          <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-4 py-4">
            <div className="rounded-2xl rounded-tl-sm border border-line bg-white px-4 py-3 text-sm text-ink-soft">
              Halo {namaPemilik.split(" ")[0]} 👋 Pilih pertanyaan di bawah, nanti
              saya jawab dari catatan usaha Anda — bukan perkiraan.
            </div>

            {pesan.map((p, i) =>
              p.peran === "pengguna" ? (
                <p
                  key={i}
                  className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-brand-500 px-4 py-2.5 text-sm font-medium text-white"
                >
                  {p.teks}
                </p>
              ) : "teks" in p ? (
                <p
                  key={i}
                  className="max-w-[90%] rounded-2xl rounded-tl-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger"
                >
                  {p.teks}
                </p>
              ) : (
                <div
                  key={i}
                  className={cn(
                    "max-w-[92%] rounded-2xl rounded-tl-sm border px-4 py-3",
                    WARNA_NADA[p.isi.nada],
                  )}
                >
                  <p className="text-sm font-bold text-ink">{p.isi.jawaban}</p>
                  {p.isi.rincian && (
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                      {p.isi.rincian}
                    </p>
                  )}
                  {p.isi.aksi && p.isi.href && (
                    <Link
                      href={p.isi.href}
                      onClick={() => setBuka(false)}
                      className="mt-2 inline-flex items-center gap-1 text-[13px] font-bold text-brand-600 hover:underline"
                    >
                      {p.isi.aksi} <ChevronRight className="size-3.5" />
                    </Link>
                  )}
                </div>
              ),
            )}

            {menunggu && (
              <p className="flex w-16 items-center justify-center gap-1 rounded-2xl rounded-tl-sm border border-line bg-white px-4 py-3">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="size-1.5 animate-bounce rounded-full bg-muted"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </p>
            )}

            <div ref={akhir} />
          </div>

          {/* Daftar pertanyaan yang bisa dipilih */}
          <div className="thin-scroll max-h-[40%] overflow-y-auto border-t border-line bg-white px-4 py-3">
            {grup.map((g) => (
              <div key={g} className="mb-2 last:mb-0">
                <p className="pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                  {g}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {pertanyaan
                    .filter((p) => p.grup === g)
                    .map((p) => (
                      <button
                        key={p.kode}
                        onClick={() => tanya(p)}
                        disabled={menunggu}
                        className="rounded-full border border-line bg-canvas px-3 py-1.5 text-left text-[12px] font-semibold text-ink-soft transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50"
                      >
                        {p.teks}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
