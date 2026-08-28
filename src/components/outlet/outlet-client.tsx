"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Crown,
  Loader2,
  Pencil,
  Plus,
  Store,
  TriangleAlert,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { AvatarInisial } from "@/components/ui/avatar-inisial";
import { IconButton } from "@/components/ui/icon-button";
import { formatRupiah } from "@/lib/money";
import { PAKET, type Paket } from "@/lib/paket";
import { cn } from "@/lib/utils";
import {
  nonaktifkanStaf,
  simpanOutlet,
  simpanProfilPemilik,
  simpanStaf,
} from "@/server/actions/outlet";
import type { BarisOutlet, BarisStaf } from "@/server/queries/outlet";
import { aman } from "@/lib/aksi";

export function OutletClient({
  outlet,
  staf,
  pemilik,
  berlakuSampai,
}: {
  outlet: BarisOutlet[];
  staf: BarisStaf[];
  pemilik: { id: string; nama: string; email: string; telepon: string | null; paket: Paket };
  berlakuSampai: string;
}) {
  const batas = PAKET[pemilik.paket];
  const outletAktif = outlet.filter((o) => o.aktif === 1).length;
  const sisaOutlet =
    batas.maksOutlet === null ? null : batas.maksOutlet - outletAktif;

  const [outletOpen, setOutletOpen] = useState(false);
  const [stafOpen, setStafOpen] = useState(false);
  const [profilOpen, setProfilOpen] = useState(false);
  const [pilihOutlet, setPilihOutlet] = useState<BarisOutlet | null>(null);
  const [pilihStaf, setPilihStaf] = useState<BarisStaf | null>(null);

  async function nonaktifkan(s: BarisStaf) {
    if (!confirm(`Nonaktifkan ${s.nama} dari ${s.namaOutlet}?`)) return;
    const hasil = await aman(nonaktifkanStaf(s.id));
    if (!hasil.ok) alert(hasil.error);
  }

  return (
    <div className="relative z-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">
            Outlet &amp; Staf
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            Kelola cabang, orang yang boleh mencatat, dan paket langganan.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setPilihStaf(null);
              setStafOpen(true);
            }}
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-line bg-white px-4 text-sm font-bold text-ink-soft shadow-card transition-colors hover:bg-canvas"
          >
            <Users className="size-4" />
            Tambah Staf
          </button>
          <button
            onClick={() => {
              setPilihOutlet(null);
              setOutletOpen(true);
            }}
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 px-5 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95"
          >
            <Plus className="size-4" strokeWidth={2.6} />
            Tambah Outlet
          </button>
        </div>
      </div>

      {/* Paket langganan */}
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 border-b border-line bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white shadow-card">
            <Crown className="size-6 fill-amber-400 text-amber-500" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-ink">
              Paket {batas.label} · {formatRupiah(batas.harga)}/bulan
            </p>
            <p className="text-xs text-muted">Berakhir {berlakuSampai}</p>
          </div>
          <div className="tabular text-right">
            <p className="text-sm font-bold text-ink">
              {outletAktif}
              {batas.maksOutlet !== null && ` / ${batas.maksOutlet}`} outlet
            </p>
            <p className="text-xs text-muted">
              {sisaOutlet === null
                ? "tanpa batas"
                : sisaOutlet > 0
                  ? `sisa ${sisaOutlet} slot`
                  : "kuota penuh"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 px-5 py-4">
          {batas.fitur.map((f) => (
            <span
              key={f}
              className="rounded-full bg-canvas px-3 py-1.5 text-xs font-semibold text-ink-soft"
            >
              {f}
            </span>
          ))}
        </div>
      </section>

      {/* Daftar outlet */}
      <section className="card min-w-0 p-5">
        <h2 className="card-title text-[17px]">Outlet</h2>
        <ul className="mt-3 space-y-3">
          {outlet.map((o) => (
            <li
              key={o.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-line p-4"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white">
                <Store className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">{o.nama}</p>
                <p className="truncate text-xs text-muted">
                  {o.alamat ?? "Tanpa alamat"}
                  {o.telepon && ` · ${o.telepon}`}
                </p>
              </div>
              <div className="tabular text-right text-xs text-muted">
                <p className="text-sm font-bold text-ink">
                  {formatRupiah(o.omzetBulanIni)}
                </p>
                <p>
                  {o.jumlahStaf} staf · {o.jumlahProduk} produk
                </p>
              </div>
              <IconButton
                label="Ubah outlet"
                onClick={() => {
                  setPilihOutlet(o);
                  setOutletOpen(true);
                }}
                icon={Pencil}
              />
            </li>
          ))}
        </ul>
      </section>

      {/* Daftar staf */}
      <section className="card min-w-0 p-5">
        <h2 className="card-title text-[17px]">Staf</h2>
        {!batas.bolehMultiStaf && (
          <p className="mt-2 rounded-xl bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">
            Paket {batas.label} hanya untuk satu pengguna. Naikkan ke paket
            Tumbuh untuk menambah kasir.
          </p>
        )}

        <ul className="mt-3 divide-y divide-line/70">
          {staf.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-3">
              <AvatarInisial nama={s.nama} className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {s.nama}
                  {s.aktif === 0 && (
                    <span className="ml-2 rounded-full bg-canvas px-2 py-0.5 text-[10px] font-bold text-muted">
                      nonaktif
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted">
                  {s.email} · {s.namaOutlet}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
                  s.peran === "owner"
                    ? "bg-brand-50 text-brand-600"
                    : "bg-canvas text-ink-soft",
                )}
              >
                {s.peran === "owner" ? "Pemilik" : "Kasir"}
              </span>
              <span className="tabular w-24 shrink-0 text-right text-xs text-muted">
                {s.transaksiBulanIni} transaksi
              </span>
              <div className="flex shrink-0 gap-1.5">
                <IconButton
                  label="Ubah staf"
                  onClick={() => {
                    setPilihStaf(s);
                    setStafOpen(true);
                  }}
                  icon={Pencil}
                />
                {s.aktif === 1 && (
                  <IconButton
                    label="Nonaktifkan"
                    onClick={() => nonaktifkan(s)}
                    icon={UserMinus}
                    bahaya
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Profil pemilik */}
      <section className="card flex flex-wrap items-center gap-4 p-5">
        <AvatarInisial nama={pemilik.nama} className="size-12 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">{pemilik.nama}</p>
          <p className="truncate text-xs text-muted">
            {pemilik.email}
            {pemilik.telepon && ` · ${pemilik.telepon}`}
          </p>
        </div>
        <button
          onClick={() => setProfilOpen(true)}
          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-line bg-white px-4 text-sm font-bold text-ink-soft transition-colors hover:bg-canvas"
        >
          <Pencil className="size-4" />
          Ubah Profil
        </button>
      </section>

      <OutletDialog
        open={outletOpen}
        onOpenChange={setOutletOpen}
        outlet={pilihOutlet}
      />
      <StafDialog
        open={stafOpen}
        onOpenChange={setStafOpen}
        staf={pilihStaf}
        daftarOutlet={outlet}
      />
      <ProfilDialog
        open={profilOpen}
        onOpenChange={setProfilOpen}
        pemilik={pemilik}
      />
    </div>
  );
}

/* ------------------------------------------------------- dialog-dialog */

function Bingkai({
  judul,
  deskripsi,
  children,
  onSimpan,
  pending,
  error,
  labelSimpan,
  nonaktif,
}: {
  judul: string;
  deskripsi: string;
  children: React.ReactNode;
  onSimpan: () => void;
  pending: boolean;
  error: string | null;
  labelSimpan: string;
  nonaktif?: boolean;
}) {
  return (
    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100vw-2rem)] max-w-[500px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl focus:outline-none">
      <div className="flex items-start justify-between border-b border-line px-6 py-5">
        <div>
          <Dialog.Title className="text-lg font-extrabold tracking-tight text-ink">
            {judul}
          </Dialog.Title>
          <Dialog.Description className="mt-0.5 text-sm text-muted">
            {deskripsi}
          </Dialog.Description>
        </div>
        <Dialog.Close className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-canvas">
          <X className="size-4" />
        </Dialog.Close>
      </div>

      <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {children}
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
          onClick={onSimpan}
          disabled={pending || nonaktif}
          className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {labelSimpan}
        </button>
      </div>
    </Dialog.Content>
  );
}

const inputKelas =
  "mt-2 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm font-medium text-ink outline-none transition-shadow placeholder:font-normal placeholder:text-muted focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100";

function OutletDialog({
  open,
  onOpenChange,
  outlet,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  outlet: BarisOutlet | null;
}) {
  const [nama, setNama] = useState("");
  const [alamat, setAlamat] = useState("");
  const [telepon, setTelepon] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNama(outlet?.nama ?? "");
    setAlamat(outlet?.alamat ?? "");
    setTelepon(outlet?.telepon ?? "");
    setError(null);
  }, [open, outlet]);

  async function simpan() {
    setPending(true);
    setError(null);
    const hasil = await aman(simpanOutlet({
      id: outlet?.id ?? null,
      nama,
      alamat: alamat.trim() || null,
      telepon: telepon.trim() || null,
    }));
    setPending(false);
    if (!hasil.ok) return setError(hasil.error);
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[3px]" />
        <Bingkai
          judul={outlet ? "Ubah Outlet" : "Tambah Outlet"}
          deskripsi="Setiap outlet punya produk, stok, dan laporannya sendiri."
          onSimpan={simpan}
          pending={pending}
          error={error}
          labelSimpan={outlet ? "Simpan Perubahan" : "Tambah Outlet"}
          nonaktif={nama.trim().length < 2}
        >
          <div>
            <label className="text-sm font-semibold text-ink">Nama outlet</label>
            <input
              autoFocus
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Cabang Dago"
              className={inputKelas}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-ink">Alamat</label>
            <input
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              placeholder="Jl. ..."
              className={inputKelas}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-ink">
              Nomor WhatsApp outlet
            </label>
            <input
              value={telepon}
              onChange={(e) => setTelepon(e.target.value)}
              placeholder="08xxxxxxxxxx"
              className={inputKelas}
            />
          </div>
        </Bingkai>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function StafDialog({
  open,
  onOpenChange,
  staf,
  daftarOutlet,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  staf: BarisStaf | null;
  daftarOutlet: BarisOutlet[];
}) {
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [telepon, setTelepon] = useState("");
  const [peran, setPeran] = useState<"owner" | "kasir">("kasir");
  const [outletId, setOutletId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNama(staf?.nama ?? "");
    setEmail(staf?.email ?? "");
    setTelepon(staf?.telepon ?? "");
    setPeran(staf?.peran ?? "kasir");
    setOutletId(staf?.outletId ?? daftarOutlet[0]?.id ?? "");
    setError(null);
  }, [open, staf, daftarOutlet]);

  async function simpan() {
    setPending(true);
    setError(null);
    const hasil = await aman(simpanStaf({
      id: staf?.id ?? null,
      outletId,
      nama,
      email,
      telepon: telepon.trim() || null,
      peran,
    }));
    setPending(false);
    if (!hasil.ok) return setError(hasil.error);
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[3px]" />
        <Bingkai
          judul={staf ? "Ubah Staf" : "Tambah Staf"}
          deskripsi="Kasir hanya bisa membuka POS dan kasbon, tidak melihat laporan."
          onSimpan={simpan}
          pending={pending}
          error={error}
          labelSimpan={staf ? "Simpan Perubahan" : "Tambah Staf"}
          nonaktif={nama.trim().length < 2 || !email.trim() || !outletId}
        >
          <div>
            <label className="text-sm font-semibold text-ink">Nama</label>
            <input
              autoFocus
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Budi Kasir"
              className={inputKelas}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-ink">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={Boolean(staf)}
              placeholder="budi@contoh.com"
              className={cn(inputKelas, staf && "opacity-60")}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-ink">
              Nomor WhatsApp
            </label>
            <input
              value={telepon}
              onChange={(e) => setTelepon(e.target.value)}
              placeholder="08xxxxxxxxxx"
              className={inputKelas}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-ink">Outlet</label>
              <select
                value={outletId}
                onChange={(e) => setOutletId(e.target.value)}
                disabled={Boolean(staf)}
                className={cn(inputKelas, staf && "opacity-60")}
              >
                {daftarOutlet.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-ink">Peran</label>
              <select
                value={peran}
                onChange={(e) => setPeran(e.target.value as "owner" | "kasir")}
                className={inputKelas}
              >
                <option value="kasir">Kasir</option>
                <option value="owner">Pemilik</option>
              </select>
            </div>
          </div>
        </Bingkai>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ProfilDialog({
  open,
  onOpenChange,
  pemilik,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pemilik: { nama: string; telepon: string | null };
}) {
  const [nama, setNama] = useState("");
  const [telepon, setTelepon] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNama(pemilik.nama);
    setTelepon(pemilik.telepon ?? "");
    setError(null);
  }, [open, pemilik]);

  async function simpan() {
    setPending(true);
    setError(null);
    const hasil = await aman(simpanProfilPemilik({
      nama,
      telepon: telepon.trim() || null,
    }));
    setPending(false);
    if (!hasil.ok) return setError(hasil.error);
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[3px]" />
        <Bingkai
          judul="Ubah Profil"
          deskripsi="Nama ini yang muncul di sapaan dashboard dan pesan WhatsApp."
          onSimpan={simpan}
          pending={pending}
          error={error}
          labelSimpan="Simpan Perubahan"
          nonaktif={nama.trim().length < 2}
        >
          <div>
            <label className="text-sm font-semibold text-ink">Nama</label>
            <input
              autoFocus
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className={inputKelas}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-ink">
              Nomor WhatsApp
            </label>
            <input
              value={telepon}
              onChange={(e) => setTelepon(e.target.value)}
              placeholder="08xxxxxxxxxx"
              className={inputKelas}
            />
          </div>
        </Bingkai>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
