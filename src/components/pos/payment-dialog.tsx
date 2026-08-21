"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Banknote,
  CheckCircle2,
  Landmark,
  Loader2,
  QrCode,
  TriangleAlert,
  WalletCards,
  X,
} from "lucide-react";
import { useState } from "react";

import { WhatsAppIcon } from "@/components/icons/whatsapp";
import { businessDate, tambahHari } from "@/lib/date";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import { buildWaLink, pesanStruk } from "@/lib/wa";
import { simpanTransaksi, type HasilTransaksi } from "@/server/actions/transaksi";
import { hitungSubtotal, useCart } from "@/store/cart";

type Metode = "cash" | "qris" | "transfer" | "debt";

const METODE: { key: Metode; label: string; icon: typeof Banknote }[] = [
  { key: "cash", label: "Tunai", icon: Banknote },
  { key: "qris", label: "QRIS", icon: QrCode },
  { key: "transfer", label: "Transfer", icon: Landmark },
  { key: "debt", label: "Utang", icon: WalletCards },
];

export function PaymentDialog({
  open,
  onOpenChange,
  pelanggan,
  namaToko,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pelanggan: { id: string; nama: string; phone: string | null }[];
  namaToko: string;
}) {
  const { items, diskon, kosongkan } = useCart();
  const subtotal = hitungSubtotal(items);
  const total = subtotal - Math.min(diskon, subtotal);

  const [metode, setMetode] = useState<Metode>("cash");
  const [uang, setUang] = useState<number>(0);
  const [customerId, setCustomerId] = useState<string>("");
  const [jatuhTempo, setJatuhTempo] = useState(() =>
    tambahHari(businessDate(), 7),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState<
    Extract<HasilTransaksi, { ok: true }> | null
  >(null);
  const [teleponStruk, setTeleponStruk] = useState("");

  const kembalian = Math.max(0, uang - total);
  const kurang = metode === "cash" && uang < total;

  function tutup(v: boolean) {
    onOpenChange(v);
    if (!v) {
      // Reset hanya setelah dialog benar-benar tertutup.
      setTimeout(() => {
        setSukses(null);
        setError(null);
        setUang(0);
        setMetode("cash");
        setCustomerId("");
        setTeleponStruk("");
      }, 200);
    }
  }

  async function bayar() {
    setPending(true);
    setError(null);

    const hasil = await simpanTransaksi({
      items: items.map((i) => ({ productId: i.id, qty: i.qty })),
      discount: Math.min(diskon, subtotal),
      paymentMethod: metode,
      paidAmount: metode === "cash" ? uang : total,
      customerId: metode === "debt" ? customerId || null : customerId || null,
      dueDate: metode === "debt" ? jatuhTempo : null,
      note: null,
    });

    setPending(false);

    if (!hasil.ok) {
      setError(hasil.error);
      return;
    }

    setSukses(hasil);
    setTeleponStruk(hasil.pelanggan?.phone ?? "");
    kosongkan();
  }

  // Saran uang: pembulatan ke atas dari total + pecahan uang yang lazim.
  const nominalCepat = [
    total,
    ...[
      ...new Set([
        Math.ceil(total / 5_000) * 5_000,
        Math.ceil(total / 10_000) * 10_000,
        Math.ceil(total / 50_000) * 50_000,
        20_000,
        50_000,
        100_000,
        200_000,
      ]),
    ]
      .filter((n) => n > total)
      .sort((a, b) => a - b)
      .slice(0, 4),
  ];

  return (
    <Dialog.Root open={open} onOpenChange={tutup}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[3px] data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100vw-2rem)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl focus:outline-none">
          {sukses ? (
            <LayarSukses
              hasil={sukses}
              namaToko={namaToko}
              telepon={teleponStruk}
              setTelepon={setTeleponStruk}
              onSelesai={() => tutup(false)}
            />
          ) : (
            <>
              <div className="flex items-start justify-between border-b border-line px-6 py-5">
                <div>
                  <Dialog.Title className="text-lg font-extrabold tracking-tight text-ink">
                    Pembayaran
                  </Dialog.Title>
                  <Dialog.Description className="mt-0.5 text-sm text-muted">
                    {items.length} produk · pilih metode pembayaran
                  </Dialog.Description>
                </div>
                <Dialog.Close className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-canvas">
                  <X className="size-4" />
                </Dialog.Close>
              </div>

              <div className="thin-scroll flex-1 overflow-y-auto px-6 py-5">
                <div className="rounded-2xl bg-gradient-to-r from-brand-50 to-violet-50 px-5 py-4 text-center">
                  <p className="text-sm font-medium text-muted">Total Bayar</p>
                  <p className="tabular mt-1 text-[32px] font-extrabold tracking-tight text-ink">
                    {formatRupiah(total)}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-4 gap-2">
                  {METODE.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setMetode(key)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-[12px] font-semibold transition-colors",
                        metode === key
                          ? "border-brand-300 bg-brand-50 text-brand-600"
                          : "border-line bg-white text-ink-soft hover:bg-canvas",
                      )}
                    >
                      <Icon className="size-5" />
                      {label}
                    </button>
                  ))}
                </div>

                {metode === "cash" && (
                  <div className="mt-5">
                    <label className="text-sm font-semibold text-ink">
                      Uang diterima
                    </label>
                    <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-canvas px-4 focus-within:border-brand-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100">
                      <span className="text-sm font-semibold text-muted">Rp</span>
                      <input
                        autoFocus
                        type="number"
                        min={0}
                        value={uang || ""}
                        placeholder="0"
                        onChange={(e) => setUang(Number(e.target.value))}
                        className="tabular h-12 w-full bg-transparent text-right text-lg font-bold text-ink outline-none"
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {nominalCepat.map((n, idx) => (
                        <button
                          key={n}
                          onClick={() => setUang(n)}
                          className="tabular rounded-xl border border-line bg-white px-3 py-2 text-[13px] font-semibold text-ink-soft transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600"
                        >
                          {idx === 0 ? "Uang pas" : formatRupiah(n)}
                        </button>
                      ))}
                    </div>

                    <div
                      className={cn(
                        "mt-4 flex items-center justify-between rounded-2xl px-4 py-3",
                        kurang ? "bg-red-50" : "bg-emerald-50",
                      )}
                    >
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          kurang ? "text-danger" : "text-emerald-700",
                        )}
                      >
                        {kurang ? "Uang masih kurang" : "Kembalian"}
                      </span>
                      <span
                        className={cn(
                          "tabular text-lg font-extrabold",
                          kurang ? "text-danger" : "text-emerald-700",
                        )}
                      >
                        {formatRupiah(kurang ? total - uang : kembalian)}
                      </span>
                    </div>
                  </div>
                )}

                {(metode === "qris" || metode === "transfer") && (
                  <div className="mt-5 flex flex-col items-center rounded-2xl border border-line bg-canvas px-5 py-6">
                    {metode === "qris" ? (
                      <>
                        <KodeQr />
                        <p className="mt-4 text-sm font-semibold text-ink">
                          Minta pelanggan memindai QRIS
                        </p>
                        <p className="mt-1 text-center text-xs text-muted">
                          MVP memakai QRIS statis milik outlet. Tandai lunas
                          setelah notifikasi masuk.
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="grid size-14 place-items-center rounded-2xl bg-white text-brand-500 shadow-card">
                          <Landmark className="size-6" />
                        </span>
                        <p className="mt-3 text-sm font-semibold text-ink">
                          Transfer bank
                        </p>
                        <p className="mt-1 text-center text-xs text-muted">
                          Tandai lunas setelah dana masuk ke rekening outlet.
                        </p>
                      </>
                    )}
                  </div>
                )}

                {metode === "debt" && (
                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-ink">
                        Pelanggan
                      </label>
                      <select
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                        className="mt-2 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm font-medium text-ink outline-none focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100"
                      >
                        <option value="">— Pilih pelanggan —</option>
                        {pelanggan.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nama}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-ink">
                        Jatuh tempo
                      </label>
                      <input
                        type="date"
                        value={jatuhTempo}
                        onChange={(e) => setJatuhTempo(e.target.value)}
                        className="mt-2 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm font-medium text-ink outline-none focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100"
                      />
                    </div>

                    <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700">
                      Transaksi ini akan tercatat sebagai kasbon dan muncul di
                      halaman Utang beserta pengingat WhatsApp.
                    </p>
                  </div>
                )}

                {metode !== "debt" && pelanggan.length > 0 && (
                  <div className="mt-5">
                    <label className="text-sm font-semibold text-ink">
                      Pelanggan{" "}
                      <span className="font-normal text-muted">(opsional)</span>
                    </label>
                    <select
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="mt-2 h-11 w-full rounded-2xl border border-line bg-canvas px-4 text-sm font-medium text-ink outline-none focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100"
                    >
                      <option value="">— Tanpa pelanggan —</option>
                      {pelanggan.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {error && (
                  <p className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                    {error}
                  </p>
                )}
              </div>

              <div className="flex gap-3 border-t border-line px-6 py-4">
                <Dialog.Close className="h-12 flex-1 rounded-2xl border border-line text-sm font-bold text-ink-soft transition-colors hover:bg-canvas">
                  Batal
                </Dialog.Close>
                <button
                  onClick={bayar}
                  disabled={
                    pending ||
                    items.length === 0 ||
                    kurang ||
                    (metode === "debt" && !customerId)
                  }
                  className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none"
                >
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  {metode === "debt" ? "Simpan sebagai Utang" : "Tandai Lunas"}
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function LayarSukses({
  hasil,
  namaToko,
  telepon,
  setTelepon,
  onSelesai,
}: {
  hasil: Extract<HasilTransaksi, { ok: true }>;
  namaToko: string;
  telepon: string;
  setTelepon: (v: string) => void;
  onSelesai: () => void;
}) {
  const pesan = pesanStruk({
    nama: hasil.pelanggan?.nama ?? "kak",
    toko: namaToko,
    item: hasil.item,
    total: hasil.total,
    metode: "sudah dibayar",
  });

  return (
    <div className="px-6 py-8 text-center">
      <Dialog.Title className="sr-only">Transaksi tersimpan</Dialog.Title>

      <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-success">
        <CheckCircle2 className="size-9" />
      </span>

      <p className="mt-4 text-xl font-extrabold tracking-tight text-ink">
        Transaksi tersimpan
      </p>
      <p className="mt-1 text-sm text-muted">{hasil.invoiceNo}</p>

      <div className="mt-5 space-y-2 rounded-2xl bg-canvas px-5 py-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted">Total</span>
          <span className="tabular font-bold text-ink">
            {formatRupiah(hasil.total)}
          </span>
        </div>
        {hasil.kembalian > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted">Kembalian</span>
            <span className="tabular font-bold text-success">
              {formatRupiah(hasil.kembalian)}
            </span>
          </div>
        )}
      </div>

      <div className="mt-5 text-left">
        <label className="text-sm font-semibold text-ink">
          Kirim struk ke WhatsApp
        </label>
        <div className="mt-2 flex gap-2">
          <input
            value={telepon}
            onChange={(e) => setTelepon(e.target.value)}
            placeholder="08xxxxxxxxxx"
            className="h-12 flex-1 rounded-2xl border border-line bg-canvas px-4 text-sm text-ink outline-none placeholder:text-muted focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100"
          />
          <a
            href={telepon ? buildWaLink(telepon, pesan) : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!telepon}
            className={cn(
              "grid h-12 w-14 place-items-center rounded-2xl text-white transition-colors",
              telepon
                ? "bg-success hover:bg-emerald-600"
                : "pointer-events-none bg-line text-muted",
            )}
          >
            <WhatsAppIcon className="size-5" />
          </a>
        </div>
      </div>

      <button
        onClick={onSelesai}
        className="mt-6 h-12 w-full rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95"
      >
        Transaksi Baru
      </button>
    </div>
  );
}

/** QR dekoratif untuk placeholder QRIS statis (bukan kode yang bisa dipindai). */
function KodeQr() {
  const sel = 21;
  const kotak: boolean[] = [];
  let s = 7;
  for (let i = 0; i < sel * sel; i++) {
    s = (s * 1103515245 + 12345) % 2147483648;
    kotak.push(s % 100 < 46);
  }

  const penanda = (x: number, y: number) =>
    (x < 7 && y < 7) || (x > sel - 8 && y < 7) || (x < 7 && y > sel - 8);

  return (
    <div className="rounded-2xl bg-white p-3 shadow-card">
      <svg viewBox={`0 0 ${sel} ${sel}`} className="size-36">
        {kotak.map((isi, i) => {
          const x = i % sel;
          const y = Math.floor(i / sel);
          if (penanda(x, y)) return null;
          return isi ? (
            <rect key={i} x={x} y={y} width="1" height="1" fill="#1e2235" />
          ) : null;
        })}
        {[
          [0, 0],
          [sel - 7, 0],
          [0, sel - 7],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <rect x={x} y={y} width="7" height="7" fill="#1e2235" />
            <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
            <rect x={x + 2} y={y + 2} width="3" height="3" fill="#1e2235" />
          </g>
        ))}
      </svg>
    </div>
  );
}
