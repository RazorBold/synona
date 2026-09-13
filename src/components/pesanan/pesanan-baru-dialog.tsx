"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Plus, Trash2, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";

import { aman } from "@/lib/aksi";
import { businessDate, tambahHari } from "@/lib/date";
import { metodeAkun } from "@/lib/kas";
import { formatRupiah } from "@/lib/money";
import { labelSatuanLayanan } from "@/lib/usaha";
import { buildWaLink, pesanTandaTerima } from "@/lib/wa";
import { simpanPesanan } from "@/server/actions/pesanan";
import type { AkunKas } from "@/server/queries/kas";
import type { BarisLayanan } from "@/server/queries/layanan";

type Baris = {
  serviceId: string;
  /** Diketik dalam satuan asli (3,5 kg) lalu dikirim × 1.000. */
  jumlah: number;
  hargaOverride: number | null;
  petugasStaffId: string;
};

export function PesananBaruDialog({
  open,
  onOpenChange,
  layanan,
  pelanggan,
  petugas,
  akun,
  hariIni,
  namaToko,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  layanan: BarisLayanan[];
  pelanggan: { id: string; nama: string; phone: string | null }[];
  petugas: { id: string; nama: string; peran: string }[];
  akun: AkunKas[];
  hariIni: string;
  namaToko: string;
}) {
  const [customerId, setCustomerId] = useState("");
  const [baris, setBaris] = useState<Baris[]>([]);
  const [diskon, setDiskon] = useState(0);
  const [dp, setDp] = useState(0);
  const [akunKasId, setAkunKasId] = useState("");
  const [janjiSelesai, setJanjiSelesai] = useState(hariIni);
  const [tandaBarang, setTandaBarang] = useState("");
  const [catatan, setCatatan] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const barisBaru = (): Baris => ({
    serviceId: layanan[0]?.id ?? "",
    jumlah: 1,
    hargaOverride: null,
    petugasStaffId: "",
  });

  useEffect(() => {
    if (!open) return;
    setCustomerId("");
    setBaris(layanan[0] ? [barisBaru()] : []);
    setDiskon(0);
    setDp(0);
    setAkunKasId(akun[0]?.id ?? "");
    setJanjiSelesai(tambahHari(businessDate(), 1));
    setTandaBarang("");
    setCatatan("");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, layanan, akun, hariIni]);

  function ubah(i: number, patch: Partial<Baris>) {
    setBaris((s) => s.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }

  function hargaBaris(b: Baris) {
    const l = layanan.find((x) => x.id === b.serviceId);
    if (!l) return 0;
    return b.hargaOverride !== null && l.hargaBisaDiubah === 1
      ? b.hargaOverride
      : l.harga;
  }

  function totalBaris(b: Baris) {
    return Math.round((hargaBaris(b) * Math.round(b.jumlah * 1000)) / 1000);
  }

  const subtotal = baris.reduce((a, b) => a + totalBaris(b), 0);
  const total = Math.max(0, subtotal - diskon);
  const sisa = Math.max(0, total - dp);

  async function simpan() {
    setPending(true);
    setError(null);

    const hasil = await aman(
      simpanPesanan({
        customerId: customerId || null,
        item: baris
          .filter((b) => b.serviceId && b.jumlah > 0)
          .map((b) => ({
            serviceId: b.serviceId,
            qtyMilli: Math.round(b.jumlah * 1000),
            hargaOverride: b.hargaOverride,
            petugasStaffId: b.petugasStaffId || null,
          })),
        diskon,
        dp,
        akunKasId: dp > 0 ? akunKasId || null : null,
        metode: metodeAkun(akun.find((a) => a.id === akunKasId)?.jenis),
        janjiSelesai: janjiSelesai || null,
        tandaBarang: tandaBarang.trim() || null,
        catatan: catatan.trim() || null,
      }),
    );

    setPending(false);
    if (!hasil.ok) return setError(hasil.error);

    // Tanda terima langsung ditawarkan: pelanggan jasa menitipkan barang dan
    // butuh bukti, sementara struk kertas paling sering hilang duluan.
    const orang = pelanggan.find((p) => p.id === customerId);
    if (
      orang?.phone &&
      confirm("Pesanan tersimpan. Kirim tanda terima lewat WhatsApp?")
    ) {
      const pesan = pesanTandaTerima({
        nama: orang.nama,
        toko: namaToko,
        nomor: hasil.nomor,
        item: baris
          .filter((b) => b.serviceId && b.jumlah > 0)
          .map((b) => ({
            nama: layanan.find((l) => l.id === b.serviceId)?.nama ?? "Layanan",
            total: totalBaris(b),
          })),
        total: hasil.total,
        dibayar: hasil.total - hasil.sisa,
        sisa: hasil.sisa,
        janjiSelesai,
      });
      window.open(buildWaLink(orang.phone, pesan), "_blank", "noopener");
    }

    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[3px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100vw-2rem)] max-w-[640px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between border-b border-line px-6 py-5">
            <div>
              <Dialog.Title className="text-lg font-extrabold tracking-tight text-ink">
                Terima Pesanan
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-muted">
                Pekerjaan masuk antrean, dan nilainya langsung tercatat sebagai
                omzet hari ini.
              </Dialog.Description>
            </div>
            <Dialog.Close className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-canvas">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-ink">
                  Pelanggan
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className={inputKelas}
                >
                  <option value="">— tanpa nama —</option>
                  {pelanggan.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-ink">
                  Janji selesai
                </label>
                <input
                  type="date"
                  value={janjiSelesai}
                  onChange={(e) => setJanjiSelesai(e.target.value)}
                  className={inputKelas}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink">
                Pekerjaan yang diminta
              </label>

              {baris.map((b, i) => {
                const l = layanan.find((x) => x.id === b.serviceId);
                const bisaUbahHarga = l?.hargaBisaDiubah === 1;

                return (
                  <div
                    key={i}
                    className="rounded-2xl border border-line bg-canvas/60 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <select
                        value={b.serviceId}
                        onChange={(e) =>
                          ubah(i, { serviceId: e.target.value, hargaOverride: null })
                        }
                        className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink outline-none focus:border-brand-200 focus:ring-4 focus:ring-brand-100"
                      >
                        {layanan.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.nama}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() =>
                          setBaris((s) => s.filter((_, idx) => idx !== i))
                        }
                        aria-label="Hapus baris"
                        className="grid size-9 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-red-50 hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3">
                        <input
                          type="number"
                          min={0}
                          step="0.1"
                          value={b.jumlah || ""}
                          placeholder="0"
                          onChange={(e) =>
                            ubah(i, { jumlah: Number(e.target.value) })
                          }
                          className="tabular h-11 w-full bg-transparent text-right text-sm font-bold text-ink outline-none"
                        />
                        <span className="text-xs font-semibold text-muted">
                          {l ? labelSatuanLayanan(l.satuan) : ""}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3">
                        <span className="text-xs font-semibold text-muted">Rp</span>
                        <input
                          type="number"
                          min={0}
                          disabled={!bisaUbahHarga}
                          value={
                            b.hargaOverride !== null
                              ? b.hargaOverride || ""
                              : (l?.harga ?? 0) || ""
                          }
                          onChange={(e) =>
                            ubah(i, { hargaOverride: Number(e.target.value) })
                          }
                          className="tabular h-11 w-full bg-transparent text-right text-sm font-bold text-ink outline-none disabled:text-muted"
                        />
                      </div>
                    </div>

                    {petugas.length > 0 && (
                      <select
                        value={b.petugasStaffId}
                        onChange={(e) =>
                          ubah(i, { petugasStaffId: e.target.value })
                        }
                        className="mt-2 h-10 w-full rounded-xl border border-line bg-white px-3 text-[13px] font-medium text-ink-soft outline-none focus:border-brand-200"
                      >
                        <option value="">Petugas: belum ditentukan</option>
                        {petugas.map((s) => (
                          <option key={s.id} value={s.id}>
                            Dikerjakan {s.nama}
                          </option>
                        ))}
                      </select>
                    )}

                    <p className="tabular mt-2 text-right text-xs font-semibold text-ink-soft">
                      {!bisaUbahHarga && l && (
                        <span className="float-left font-normal text-muted">
                          harga tetap
                        </span>
                      )}
                      {formatRupiah(totalBaris(b))}
                    </p>
                  </div>
                );
              })}

              <button
                onClick={() => setBaris((s) => [...s, barisBaru()])}
                disabled={layanan.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-3 text-sm font-semibold text-ink-soft transition-colors hover:border-brand-300 hover:text-brand-600 disabled:opacity-50"
              >
                <Plus className="size-4" />
                Tambah pekerjaan
              </button>
            </div>

            <div>
              <label className="text-sm font-semibold text-ink">
                Ciri barang{" "}
                <span className="font-normal text-muted">(opsional)</span>
              </label>
              <input
                value={tandaBarang}
                onChange={(e) => setTandaBarang(e.target.value)}
                placeholder="Contoh: 2 kantong putih · Beat merah B 1234 XY"
                className={inputKelas}
              />
            </div>

            <div className="rounded-2xl bg-gradient-to-r from-brand-50 to-violet-50 px-5 py-4 text-center">
              <p className="text-sm font-medium text-muted">Total pesanan</p>
              <p className="tabular mt-1 text-[28px] font-extrabold tracking-tight text-ink">
                {formatRupiah(total)}
              </p>
              {diskon > 0 && (
                <p className="tabular text-xs text-muted">
                  dari {formatRupiah(subtotal)} setelah diskon
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-ink">Diskon</label>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-canvas px-4 focus-within:border-brand-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100">
                  <span className="text-sm font-semibold text-muted">Rp</span>
                  <input
                    type="number"
                    min={0}
                    value={diskon || ""}
                    placeholder="0"
                    onChange={(e) => setDiskon(Number(e.target.value))}
                    className="tabular h-12 w-full bg-transparent text-right text-sm font-bold text-ink outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-ink">
                  Uang muka diterima
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-canvas px-4 focus-within:border-brand-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100">
                  <span className="text-sm font-semibold text-muted">Rp</span>
                  <input
                    type="number"
                    min={0}
                    value={dp || ""}
                    placeholder="0"
                    onChange={(e) => setDp(Number(e.target.value))}
                    className="tabular h-12 w-full bg-transparent text-right text-sm font-bold text-ink outline-none"
                  />
                </div>
                <button
                  onClick={() => setDp(total)}
                  className="mt-2 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-brand-200 hover:text-brand-600"
                >
                  Bayar lunas di depan
                </button>
              </div>
            </div>

            {dp > 0 && (
              <div>
                <label className="text-sm font-semibold text-ink">
                  Uangnya masuk ke
                </label>
                <select
                  value={akunKasId}
                  onChange={(e) => setAkunKasId(e.target.value)}
                  className={inputKelas}
                >
                  {akun.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nama}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {sisa > 0 && (
              <p className="tabular flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                <span>Dilunasi saat diambil</span>
                <span className="text-base font-extrabold">
                  {formatRupiah(sisa)}
                </span>
              </p>
            )}

            {sisa > 0 && !customerId && (
              <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                Masih ada sisa bayar, jadi pelanggannya harus dipilih — kalau
                tidak, tidak ada yang bisa ditagih nanti.
              </p>
            )}

            <div>
              <label className="text-sm font-semibold text-ink">
                Catatan <span className="font-normal text-muted">(opsional)</span>
              </label>
              <input
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: noda di kerah, jangan disetrika panas"
                className={inputKelas}
              />
            </div>

            {error && (
              <p className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">
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
              onClick={simpan}
              disabled={pending || total <= 0}
              className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Simpan Pesanan
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const inputKelas =
  "mt-2 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm font-medium text-ink outline-none transition-shadow placeholder:font-normal placeholder:text-muted focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100";
