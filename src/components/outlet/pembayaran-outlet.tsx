"use client";

import { ImagePlus, Loader2, QrCode, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { aman } from "@/lib/aksi";
import { urlGambar } from "@/lib/gambar";
import { persenPajak, type ModePajak } from "@/lib/pajak";
import { cn } from "@/lib/utils";
import { simpanPembayaranOutlet } from "@/server/actions/outlet";

/**
 * QRIS dan pajak milik outlet yang sedang aktif. QRIS-nya dipakai di layar
 * bayar POS; pajaknya ikut tercatat di tiap transaksi dan tercetak di nota.
 */
export function PembayaranOutlet({
  namaOutlet,
  qris,
  pajak,
}: {
  namaOutlet: string;
  qris: string | null;
  pajak: { nama: string | null; bp: number; mode: ModePajak };
}) {
  const [berkas, setBerkas] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [hapus, setHapus] = useState(false);
  const [aktif, setAktif] = useState(Boolean(pajak.nama) && pajak.bp > 0);
  const [nama, setNama] = useState(pajak.nama ?? "PPh Final");
  const [persen, setPersen] = useState(
    pajak.bp > 0 ? String(pajak.bp / 100).replace(".", ",") : "0,5",
  );
  const [mode, setMode] = useState<ModePajak>(pajak.mode);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);
  const [pending, mulai] = useTransition();

  const tampilQris = pratinjau ?? (hapus ? null : urlGambar(qris));

  function pilihBerkas(f: File | null) {
    setBerkas(f);
    setHapus(false);
    setPratinjau(f ? URL.createObjectURL(f) : null);
  }

  function simpan() {
    setPesan(null);
    mulai(async () => {
      const fd = new FormData();
      fd.set("pajakAktif", aktif ? "1" : "0");
      fd.set("pajakNama", nama);
      fd.set("pajakPersen", persen);
      fd.set("pajakMode", mode);
      if (berkas) fd.set("qris", berkas);
      if (hapus) fd.set("hapusQris", "1");
      const r = await aman(simpanPembayaranOutlet(fd));
      setPesan(r.ok ? { ok: true, teks: "Tersimpan" } : { ok: false, teks: r.error });
      if (r.ok) {
        setBerkas(null);
        setHapus(false);
      }
    });
  }

  const contoh = 100_000;
  const nilaiPajak = aktif
    ? Math.round((contoh * Math.round(Number(persen.replace(",", ".")) * 100 || 0)) / 10_000)
    : 0;

  return (
    <section className="card min-w-0 p-5">
      <h2 className="card-title text-[17px]">Pembayaran & Pajak</h2>
      <p className="mt-1 text-sm text-muted">
        Berlaku untuk outlet <b className="text-ink">{namaOutlet}</b>.
      </p>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        {/* ------------------------------------------------ QRIS */}
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <QrCode className="size-4 text-brand-500" /> Gambar QRIS usaha
          </p>
          <p className="mt-1 text-xs text-muted">
            Ditampilkan ke pembeli saat kasir memilih metode QRIS. Unggah
            tangkapan layar atau foto QRIS dari bank/e-wallet Anda.
          </p>

          <div className="mt-3 flex items-start gap-3">
            <div className="grid size-32 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-canvas">
              {tampilQris ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tampilQris} alt="QRIS usaha" className="size-full object-contain" />
              ) : (
                <QrCode className="size-8 text-muted" />
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line px-3 py-2.5 text-sm text-ink-soft hover:bg-canvas">
                <ImagePlus className="size-4 text-muted" />
                <span className="min-w-0 flex-1 truncate">
                  {berkas ? berkas.name : tampilQris ? "Ganti gambar QRIS" : "Unggah gambar QRIS"}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(e) => pilihBerkas(e.target.files?.[0] ?? null)}
                />
              </label>
              {tampilQris && (
                <button
                  onClick={() => {
                    setHapus(true);
                    setBerkas(null);
                    setPratinjau(null);
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-danger hover:underline"
                >
                  <Trash2 className="size-3.5" /> Hapus QRIS
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------ pajak */}
        <div>
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span className="text-sm font-semibold text-ink">Pajak penjualan</span>
            <input
              type="checkbox"
              checked={aktif}
              onChange={(e) => setAktif(e.target.checked)}
              className="size-5 accent-brand-500"
            />
          </label>
          <p className="mt-1 text-xs text-muted">
            Kalau dimatikan, nota dan laporan tidak menyebut pajak sama sekali.
          </p>

          <div className={cn("mt-3 space-y-3", !aktif && "pointer-events-none opacity-50")}>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs font-semibold text-ink-soft">Nama pajak</label>
                <input
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  maxLength={24}
                  placeholder="PPh Final"
                  className="mt-1 h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm outline-none focus:border-brand-200 focus:bg-white"
                />
              </div>
              <div className="w-28">
                <label className="text-xs font-semibold text-ink-soft">Tarif (%)</label>
                <input
                  value={persen}
                  onChange={(e) => setPersen(e.target.value)}
                  inputMode="decimal"
                  placeholder="0,5"
                  className="tabular mt-1 h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm outline-none focus:border-brand-200 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  {
                    key: "termasuk" as const,
                    judul: "Ditanggung usaha",
                    isi: "Pembeli bayar seperti biasa; nota hanya memberi keterangan. Pajaknya mengurangi laba.",
                  },
                  {
                    key: "tambah" as const,
                    judul: "Ditambahkan ke tagihan",
                    isi: "Pembeli membayar lebih sebesar pajaknya. Uangnya masuk kas, tapi bukan omzet dan bukan laba.",
                  },
                ]
              ).map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition-colors",
                    mode === m.key ? "border-brand-300 bg-brand-50" : "border-line hover:bg-canvas",
                  )}
                >
                  <span className="block text-sm font-bold text-ink">{m.judul}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted">{m.isi}</span>
                </button>
              ))}
            </div>

            {aktif && (
              <p className="rounded-xl bg-canvas px-4 py-3 text-xs text-ink-soft">
                Contoh belanja Rp 100.000 dengan {nama || "pajak"}{" "}
                {persenPajak(Math.round(Number(persen.replace(",", ".")) * 100) || 0)}:{" "}
                {mode === "tambah" ? (
                  <>
                    pembeli membayar{" "}
                    <b className="text-ink">
                      Rp {(contoh + nilaiPajak).toLocaleString("id-ID")}
                    </b>{" "}
                    (pajak Rp {nilaiPajak.toLocaleString("id-ID")}).
                  </>
                ) : (
                  <>
                    pembeli tetap membayar <b className="text-ink">Rp 100.000</b>, di nota
                    tertulis pajak Rp {nilaiPajak.toLocaleString("id-ID")}.
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={simpan}
          disabled={pending}
          className="flex h-11 items-center gap-2 rounded-xl bg-brand-500 px-5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Simpan
        </button>
        {pesan && (
          <span className={cn("text-sm font-medium", pesan.ok ? "text-success" : "text-danger")}>
            {pesan.teks}
          </span>
        )}
      </div>
    </section>
  );
}
