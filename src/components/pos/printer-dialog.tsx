"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Bluetooth,
  BluetoothOff,
  Check,
  Loader2,
  Printer,
  Smartphone,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import {
  dengarSambungan,
  dukunganBluetooth,
  kirimKePrinter,
  pilihPrinter,
  printerTersambung,
  putuskan,
  sambungUlang,
  type DukunganBluetooth,
} from "@/lib/printer/bluetooth";
import { kirimKeRawbt } from "@/lib/printer/cetak";
import { susunNotaUji, type LebarKertas } from "@/lib/printer/escpos";
import { usePrinter, type ModePrinter } from "@/lib/printer/pengaturan";
import { cn } from "@/lib/utils";

/** Status sambungan Bluetooth yang ikut berubah saat printer terputus. */
export function useSambungan() {
  return useSyncExternalStore(
    dengarSambungan,
    () => printerTersambung()?.id ?? null,
    () => null,
  );
}

const MODE: { key: ModePrinter; judul: string; isi: string; ikon: typeof Bluetooth }[] = [
  {
    key: "bluetooth",
    judul: "Bluetooth langsung",
    isi: "Chrome di Android/PC, halaman HTTPS",
    ikon: Bluetooth,
  },
  {
    key: "rawbt",
    judul: "Aplikasi RawBT",
    isi: "Android, semua printer Bluetooth",
    ikon: Smartphone,
  },
  {
    key: "browser",
    judul: "Printer biasa",
    isi: "Dialog cetak browser (USB/Wi-Fi/PDF)",
    ikon: Printer,
  },
];

/** Tombol "Printer" di kepala halaman Kasir + dialog pengaturannya. */
export function TombolPrinter() {
  const [buka, setBuka] = useState(false);
  const { mode, perangkat } = usePrinter();
  const tersambung = useSambungan();

  // Coba sambung ulang diam-diam ke printer yang pernah dipakai.
  useEffect(() => {
    if (mode === "bluetooth" && perangkat && dukunganBluetooth() === "ok") {
      void sambungUlang(perangkat.id);
    }
  }, [mode, perangkat]);

  const siap = mode !== "bluetooth" || Boolean(tersambung);

  return (
    <>
      <button
        onClick={() => setBuka(true)}
        className="flex h-14 items-center gap-2.5 rounded-2xl border border-line bg-white px-4 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-canvas"
      >
        <span className="relative">
          <Printer className="size-5 text-ink-soft" />
          <span
            className={cn(
              "absolute -right-1 -top-1 size-2.5 rounded-full ring-2 ring-white",
              siap ? "bg-success" : "bg-amber-400",
            )}
          />
        </span>
        <span className="flex flex-col items-start leading-tight">
          <span className="text-[11px] font-medium text-muted">Printer nota</span>
          <span className="max-w-[140px] truncate">
            {mode === "bluetooth"
              ? tersambung
                ? (perangkat?.nama ?? "Tersambung")
                : "Belum tersambung"
              : mode === "rawbt"
                ? "Lewat RawBT"
                : "Dialog cetak"}
          </span>
        </span>
      </button>
      <PrinterDialog open={buka} onOpenChange={setBuka} />
    </>
  );
}

export function PrinterDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const s = usePrinter();
  const tersambung = useSambungan();
  const [dukungan, setDukungan] = useState<DukunganBluetooth>("ok");
  const [sibuk, setSibuk] = useState<null | "sambung" | "tes">(null);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);

  useEffect(() => setDukungan(dukunganBluetooth()), []);

  async function sambungkan() {
    setSibuk("sambung");
    setPesan(null);
    try {
      const p = await pilihPrinter();
      s.ubah({ perangkat: p });
      setPesan({ ok: true, teks: `Tersambung ke ${p.nama}` });
    } catch (e) {
      // Menutup pemilih perangkat juga melempar — itu bukan galat.
      const nama = e instanceof Error ? e.name : "";
      if (nama !== "NotFoundError") {
        setPesan({ ok: false, teks: e instanceof Error ? e.message : "Gagal menyambung" });
      }
    } finally {
      setSibuk(null);
    }
  }

  async function cetakTes() {
    setSibuk("tes");
    setPesan(null);
    try {
      const data = susunNotaUji(s.lebar, s.perangkat?.nama ?? "Printer", window.location.origin);
      if (s.mode === "rawbt") kirimKeRawbt(data);
      else {
        if (!printerTersambung()) throw new Error("Sambungkan printer dulu");
        await kirimKePrinter(data);
      }
      if (s.mode === "bluetooth") setPesan({ ok: true, teks: "Nota tes terkirim ke printer" });
    } catch (e) {
      setPesan({ ok: false, teks: e instanceof Error ? e.message : "Gagal mencetak" });
    } finally {
      setSibuk(null);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[3px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100vw-2rem)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between border-b border-line px-6 py-5">
            <div>
              <Dialog.Title className="text-lg font-extrabold tracking-tight text-ink">
                Printer Nota
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-muted">
                Pengaturan ini tersimpan di perangkat ini saja.
              </Dialog.Description>
            </div>
            <Dialog.Close className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-canvas">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="thin-scroll flex-1 space-y-6 overflow-y-auto px-6 py-5">
            {/* Cara mencetak */}
            <div>
              <p className="text-sm font-semibold text-ink">Cara mencetak</p>
              <div className="mt-2 grid gap-2">
                {MODE.map(({ key, judul, isi, ikon: Ikon }) => (
                  <button
                    key={key}
                    onClick={() => {
                      s.ubah({ mode: key });
                      setPesan(null);
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                      s.mode === key
                        ? "border-brand-300 bg-brand-50"
                        : "border-line bg-white hover:bg-canvas",
                    )}
                  >
                    <Ikon className={cn("size-5 shrink-0", s.mode === key ? "text-brand-600" : "text-muted")} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-ink">{judul}</span>
                      <span className="block text-xs text-muted">{isi}</span>
                    </span>
                    {s.mode === key && <Check className="size-4 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>

            {s.mode === "bluetooth" && (
              <div className="rounded-2xl border border-line p-4">
                {dukungan !== "ok" ? (
                  <p className="flex items-start gap-2 text-sm text-amber-700">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                    {dukungan === "butuh-https"
                      ? "Bluetooth dari browser hanya jalan di alamat HTTPS. Di alamat http:// ini, pakai mode Aplikasi RawBT, atau buka Synona lewat domain ber-HTTPS."
                      : "Browser ini tidak mendukung Bluetooth. Pakai Chrome di Android/PC, atau pilih mode Aplikasi RawBT."}
                  </p>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      {tersambung ? (
                        <Bluetooth className="size-5 text-success" />
                      ) : (
                        <BluetoothOff className="size-5 text-muted" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">
                          {tersambung ? (s.perangkat?.nama ?? "Printer") : "Belum tersambung"}
                        </p>
                        <p className="text-xs text-muted">
                          {tersambung
                            ? "Siap mencetak"
                            : "Nyalakan printer, lalu tekan Sambungkan dan pilih namanya."}
                        </p>
                      </div>
                      {tersambung ? (
                        <button
                          onClick={putuskan}
                          className="h-10 rounded-xl border border-line px-3 text-sm font-semibold text-ink-soft hover:bg-canvas"
                        >
                          Putuskan
                        </button>
                      ) : (
                        <button
                          onClick={sambungkan}
                          disabled={sibuk !== null}
                          className="flex h-10 items-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-60"
                        >
                          {sibuk === "sambung" && <Loader2 className="size-4 animate-spin" />}
                          Sambungkan
                        </button>
                      )}
                    </div>
                    <p className="mt-3 text-xs text-muted">
                      Printer yang tidak muncul di daftar biasanya hanya
                      Bluetooth Classic — pakai mode Aplikasi RawBT.
                    </p>
                  </>
                )}
              </div>
            )}

            {s.mode === "rawbt" && (
              <ol className="list-decimal space-y-1.5 rounded-2xl border border-line py-4 pl-9 pr-4 text-sm text-ink-soft">
                <li>Pasang aplikasi <b>RawBT</b> dari Play Store.</li>
                <li>Pasangkan (pair) printer di pengaturan Bluetooth Android.</li>
                <li>Buka RawBT, pilih printer tersebut, lalu kembali ke sini.</li>
                <li>Tekan <b>Cetak tes</b>. Izinkan Chrome membuka RawBT.</li>
              </ol>
            )}

            {s.mode === "browser" && (
              <p className="rounded-2xl border border-line p-4 text-sm text-ink-soft">
                Nota dibuka di tab baru dan dialog cetak muncul otomatis. Pilih
                printer Anda dan ukuran kertas yang sesuai.
              </p>
            )}

            {/* Lebar kertas */}
            <div>
              <p className="text-sm font-semibold text-ink">Lebar kertas</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {([58, 80] as LebarKertas[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => s.ubah({ lebar: l })}
                    className={cn(
                      "h-11 rounded-2xl border text-sm font-bold transition-colors",
                      s.lebar === l
                        ? "border-brand-300 bg-brand-50 text-brand-600"
                        : "border-line text-ink-soft hover:bg-canvas",
                    )}
                  >
                    {l} mm
                  </button>
                ))}
              </div>
            </div>

            {/* Cetak otomatis */}
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-line px-4 py-3">
              <span>
                <span className="block text-sm font-bold text-ink">Cetak otomatis</span>
                <span className="block text-xs text-muted">
                  Nota langsung tercetak begitu pembayaran tersimpan.
                </span>
              </span>
              <input
                type="checkbox"
                checked={s.otomatis}
                onChange={(e) => s.ubah({ otomatis: e.target.checked })}
                className="size-5 accent-brand-500"
              />
            </label>

            {/* Catatan kaki */}
            <div>
              <label htmlFor="catatan-kaki" className="text-sm font-semibold text-ink">
                Tulisan di bawah nota
              </label>
              <textarea
                id="catatan-kaki"
                rows={2}
                maxLength={120}
                value={s.catatanKaki}
                onChange={(e) => s.ubah({ catatanKaki: e.target.value })}
                className="mt-2 w-full resize-none rounded-2xl border border-line bg-canvas px-4 py-3 text-sm text-ink outline-none focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {pesan && (
              <p
                className={cn(
                  "rounded-xl px-4 py-3 text-sm font-medium",
                  pesan.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-danger",
                )}
              >
                {pesan.teks}
              </p>
            )}
          </div>

          <div className="flex gap-3 border-t border-line px-6 py-4">
            <button
              onClick={cetakTes}
              disabled={
                sibuk !== null ||
                s.mode === "browser" ||
                (s.mode === "bluetooth" && !tersambung)
              }
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-line text-sm font-bold text-ink-soft transition-colors hover:bg-canvas disabled:opacity-50"
            >
              {sibuk === "tes" ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
              Cetak tes
            </button>
            <Dialog.Close className="h-12 flex-1 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-sm font-bold text-white shadow-pop">
              Selesai
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
