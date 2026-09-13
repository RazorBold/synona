"use client";

import { Check, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { aman } from "@/lib/aksi";
import { cn } from "@/lib/utils";
import { tambahKategori } from "@/server/actions/kategori";

const TAMBAH = "__tambah__";

/**
 * Pilihan kategori yang bisa ditambah langsung dari formulir, tanpa harus
 * pindah ke halaman pengaturan. Kategori baru tersimpan ke database saat
 * dikonfirmasi, lalu langsung terpilih.
 */
export function PilihKategori({
  nilai,
  onUbah,
  kategori,
  kelas,
  labelKosong = "— Tanpa kategori —",
}: {
  nilai: string;
  onUbah: (id: string) => void;
  kategori: { id: string; nama: string }[];
  kelas: string;
  labelKosong?: string;
}) {
  // Salinan lokal supaya kategori yang baru dibuat langsung muncul di daftar,
  // tanpa menunggu halaman dimuat ulang.
  const [daftar, setDaftar] = useState(kategori);
  useEffect(() => setDaftar(kategori), [kategori]);

  const [mengetik, setMengetik] = useState(false);
  const [baru, setBaru] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function simpanBaru() {
    if (baru.trim().length < 2) return;
    setPending(true);
    setError(null);
    const hasil = await aman(tambahKategori({ nama: baru }));
    setPending(false);
    if (!hasil.ok) return setError(hasil.error);

    setDaftar((d) => (d.some((k) => k.id === hasil.id) ? d : [...d, { id: hasil.id, nama: hasil.nama }]));
    onUbah(hasil.id);
    setBaru("");
    setMengetik(false);
  }

  if (mengetik) {
    return (
      <div>
        <div className="flex gap-2">
          <input
            autoFocus
            value={baru}
            maxLength={40}
            onChange={(e) => setBaru(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void simpanBaru();
              }
              if (e.key === "Escape") setMengetik(false);
            }}
            placeholder="Nama kategori baru"
            className={cn(kelas, "min-w-0 flex-1")}
          />
          <button
            type="button"
            onClick={() => void simpanBaru()}
            disabled={pending || baru.trim().length < 2}
            aria-label="Simpan kategori"
            className="grid size-11 shrink-0 place-items-center self-end rounded-2xl bg-brand-500 text-white transition-opacity disabled:opacity-40"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setMengetik(false);
              setError(null);
            }}
            aria-label="Batal"
            className="grid size-11 shrink-0 place-items-center self-end rounded-2xl border border-line text-muted hover:bg-canvas"
          >
            <X className="size-4" />
          </button>
        </div>
        {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <select
      value={nilai}
      onChange={(e) => {
        if (e.target.value === TAMBAH) setMengetik(true);
        else onUbah(e.target.value);
      }}
      className={kelas}
    >
      <option value="">{labelKosong}</option>
      {daftar.map((k) => (
        <option key={k.id} value={k.id}>
          {k.nama}
        </option>
      ))}
      <option value={TAMBAH}>＋ Tambah kategori baru…</option>
    </select>
  );
}
