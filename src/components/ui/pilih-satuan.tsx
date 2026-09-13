"use client";

import { Check, X } from "lucide-react";
import { useMemo, useState } from "react";

import { rapikanSatuan } from "@/lib/satuan";
import { cn } from "@/lib/utils";

const TAMBAH = "__tambah__";

/**
 * Pilihan satuan yang bisa ditambah sendiri oleh pemilik.
 *
 * Isinya gabungan tiga sumber: satuan bawaan, satuan yang SUDAH pernah
 * dipakai di outlet ini (supaya "karung" yang dibuat kemarin muncul lagi hari
 * ini tanpa tabel tambahan), dan nilai yang sedang terpilih. Satuan baru tidak
 * perlu disimpan terpisah — ia ikut tersimpan bersama baris yang memakainya.
 */
export function PilihSatuan({
  nilai,
  onUbah,
  bawaan,
  terpakai = [],
  kelas,
  disabled = false,
}: {
  nilai: string;
  onUbah: (v: string) => void;
  bawaan: { nilai: string; label: string }[];
  terpakai?: string[];
  kelas: string;
  disabled?: boolean;
}) {
  const pilihan = useMemo(() => {
    const peta = new Map(bawaan.map((b) => [b.nilai, b.label]));
    for (const t of terpakai) if (t && !peta.has(t)) peta.set(t, t);
    if (nilai && !peta.has(nilai)) peta.set(nilai, nilai);
    return [...peta.entries()].map(([v, label]) => ({ nilai: v, label }));
  }, [bawaan, terpakai, nilai]);

  const [mengetik, setMengetik] = useState(false);
  const [baru, setBaru] = useState("");

  function simpanBaru() {
    const bersih = rapikanSatuan(baru);
    if (!bersih) return;
    onUbah(bersih);
    setBaru("");
    setMengetik(false);
  }

  if (mengetik) {
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          value={baru}
          maxLength={20}
          onChange={(e) => setBaru(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              simpanBaru();
            }
            if (e.key === "Escape") setMengetik(false);
          }}
          placeholder="mis. karung, ikat, set"
          className={cn(kelas, "min-w-0 flex-1")}
        />
        <button
          type="button"
          onClick={simpanBaru}
          disabled={!rapikanSatuan(baru)}
          aria-label="Pakai satuan ini"
          className="grid size-11 shrink-0 place-items-center self-end rounded-2xl bg-brand-500 text-white transition-opacity disabled:opacity-40"
        >
          <Check className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setMengetik(false)}
          aria-label="Batal"
          className="grid size-11 shrink-0 place-items-center self-end rounded-2xl border border-line text-muted hover:bg-canvas"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <select
      value={nilai}
      disabled={disabled}
      onChange={(e) => {
        if (e.target.value === TAMBAH) setMengetik(true);
        else onUbah(e.target.value);
      }}
      className={kelas}
    >
      {pilihan.map((p) => (
        <option key={p.nilai} value={p.nilai}>
          {p.label}
        </option>
      ))}
      <option value={TAMBAH}>＋ Tambah satuan lain…</option>
    </select>
  );
}

