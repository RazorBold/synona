"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Receipt, WalletCards, X } from "lucide-react";
import { useEffect, useState } from "react";

import { WhatsAppIcon } from "@/components/icons/whatsapp";
import { AvatarInisial } from "@/components/ui/avatar-inisial";
import { formatWaktuSingkat, labelJatuhTempo } from "@/lib/date";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import { buildWaLink, pesanPengingatUtang } from "@/lib/wa";
import { ambilRiwayatPelanggan } from "@/server/actions/pelanggan";
import type { BarisPelanggan } from "@/server/queries/pelanggan";
import type {
  TransaksiPelanggan,
  UtangPelanggan,
} from "@/server/queries/pelanggan";

const LABEL_METODE: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer",
  debt: "Utang",
  other: "Lainnya",
};

const TONE_TEMPO = {
  danger: "text-danger",
  warning: "text-warning",
  muted: "text-muted",
} as const;

export function DetailPelangganDialog({
  open,
  onOpenChange,
  pelanggan,
  hariIni,
  namaToko,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pelanggan: BarisPelanggan | null;
  hariIni: string;
  namaToko: string;
}) {
  const [muat, setMuat] = useState(true);
  const [transaksi, setTransaksi] = useState<TransaksiPelanggan[]>([]);
  const [utang, setUtang] = useState<UtangPelanggan[]>([]);

  useEffect(() => {
    if (!open || !pelanggan) return;
    setMuat(true);
    void ambilRiwayatPelanggan(pelanggan.id).then((r) => {
      setTransaksi(r.transaksi);
      setUtang(r.utang);
      setMuat(false);
    })
      // Gagal memuat riwayat tidak boleh meninggalkan dialog
      // berputar selamanya — hentikan pemuatannya.
      .catch(() => setMuat(false));
  }, [open, pelanggan]);

  if (!pelanggan) return null;

  const pesan = pesanPengingatUtang({
    nama: pelanggan.nama,
    toko: namaToko,
    sisa: pelanggan.sisaUtang,
  });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[3px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100vw-2rem)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
            <div className="flex min-w-0 items-center gap-3">
              <AvatarInisial nama={pelanggan.nama} className="size-12 text-sm" />
              <div className="min-w-0">
                <Dialog.Title className="truncate text-lg font-extrabold tracking-tight text-ink">
                  {pelanggan.nama}
                </Dialog.Title>
                <Dialog.Description className="tabular truncate text-sm text-muted">
                  {pelanggan.phone ?? "Tanpa nomor WhatsApp"}
                </Dialog.Description>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {pelanggan.phone && (
                <a
                  href={buildWaLink(pelanggan.phone, pesan)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Chat ${pelanggan.nama} via WhatsApp`}
                  className="grid size-9 place-items-center rounded-xl bg-success text-white transition-colors hover:bg-emerald-600"
                >
                  <WhatsAppIcon className="size-[18px]" />
                </a>
              )}
              <Dialog.Close className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-canvas">
                <X className="size-4" />
              </Dialog.Close>
            </div>
          </div>

          <div className="thin-scroll flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-3 gap-3">
              <Ringkas label="Total belanja" nilai={formatRupiah(pelanggan.totalBelanja)} />
              <Ringkas label="Transaksi" nilai={String(pelanggan.jumlahTransaksi)} />
              <Ringkas
                label="Sisa utang"
                nilai={formatRupiah(pelanggan.sisaUtang)}
                bahaya={pelanggan.sisaUtang > 0}
              />
            </div>

            {pelanggan.catatan && (
              <p className="mt-4 rounded-xl bg-canvas px-4 py-3 text-sm text-ink-soft">
                {pelanggan.catatan}
              </p>
            )}

            {muat ? (
              <div className="flex items-center justify-center py-12 text-muted">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : (
              <>
                {utang.length > 0 && (
                  <section className="mt-6">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
                      <WalletCards className="size-4 text-warning" />
                      Utang belum lunas
                    </h3>
                    <ul className="mt-2 divide-y divide-line/70">
                      {utang.map((u) => {
                        const tempo = labelJatuhTempo(u.jatuhTempo, hariIni);
                        return (
                          <li
                            key={u.id}
                            className="flex items-center gap-3 py-2.5"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="tabular block text-[13px] font-semibold text-ink">
                                {formatRupiah(u.sisa)}
                              </span>
                              <span
                                className={cn(
                                  "block text-xs font-medium",
                                  TONE_TEMPO[tempo.tone],
                                )}
                              >
                                {tempo.text}
                              </span>
                            </span>
                            <span className="tabular shrink-0 text-xs text-muted">
                              dari {formatRupiah(u.jumlah)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}

                <section className="mt-6">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
                    <Receipt className="size-4 text-brand-500" />
                    Riwayat belanja
                  </h3>

                  {transaksi.length === 0 ? (
                    <p className="mt-2 rounded-xl bg-canvas px-4 py-6 text-center text-sm text-muted">
                      Belum ada transaksi atas nama pelanggan ini.
                    </p>
                  ) : (
                    <ul className="mt-2 divide-y divide-line/70">
                      {transaksi.map((t) => (
                        <li key={t.id} className="flex items-center gap-3 py-2.5">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-semibold text-ink">
                              {t.invoiceNo}
                            </span>
                            <span className="block text-xs text-muted">
                              {formatWaktuSingkat(t.waktu)} ·{" "}
                              {LABEL_METODE[t.metode] ?? t.metode}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "tabular shrink-0 text-sm font-bold",
                              t.status === "void"
                                ? "text-muted line-through"
                                : "text-ink",
                            )}
                          >
                            {formatRupiah(t.total)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Ringkas({
  label,
  nilai,
  bahaya = false,
}: {
  label: string;
  nilai: string;
  bahaya?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-canvas px-3 py-3 text-center">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p
        className={cn(
          "tabular mt-0.5 text-sm font-extrabold",
          bahaya ? "text-danger" : "text-ink",
        )}
      >
        {nilai}
      </p>
    </div>
  );
}
