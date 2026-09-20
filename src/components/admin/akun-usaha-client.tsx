"use client";

import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { StatusLanggananLencana } from "@/components/admin/status-langganan";
import { aman } from "@/lib/aksi";
import { PAKET, type StatusLangganan } from "@/lib/paket";
import { cn } from "@/lib/utils";
import { aturLoginUsaha, tambahMasa } from "@/server/actions/admin";
import type { BarisUsaha } from "@/server/admin";

const tgl = (ms: number | null) =>
  ms ? format(new Date(ms), "d MMM yyyy", { locale: localeId }) : "—";

const JENIS = { dagang: "Dagang", jasa: "Jasa", campuran: "Campuran" } as const;

const SARING: { key: "semua" | StatusLangganan; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "aktif", label: "Aktif" },
  { key: "belum-aktif", label: "Belum bayar" },
  { key: "habis", label: "Habis" },
  { key: "bebas", label: "Akun lama" },
];

export function AkunUsahaClient({ usaha }: { usaha: BarisUsaha[] }) {
  const [saring, setSaring] = useState<(typeof SARING)[number]["key"]>("semua");
  const [kueri, setKueri] = useState("");

  const tampil = useMemo(() => {
    const q = kueri.trim().toLowerCase();
    return usaha.filter(
      (u) =>
        (saring === "semua" || u.status === saring) &&
        (!q ||
          [u.usaha, u.pemilik, u.namaPengguna, u.telepon].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [usaha, saring, kueri]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight text-ink">Akun usaha</h1>
        <p className="mt-1 text-[15px] text-muted">
          Semua pelanggan Synona, status langganannya, dan seberapa aktif mereka memakai aplikasi.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {SARING.map((s) => (
            <button
              key={s.key}
              onClick={() => setSaring(s.key)}
              className={cn(
                "h-9 rounded-xl px-3.5 text-sm font-semibold",
                saring === s.key ? "bg-brand-500 text-white" : "bg-white text-ink-soft shadow-card hover:bg-canvas",
              )}
            >
              {s.label}
              <span className="ml-1.5 opacity-70">
                {s.key === "semua" ? usaha.length : usaha.filter((u) => u.status === s.key).length}
              </span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={kueri}
            onChange={(e) => setKueri(e.target.value)}
            placeholder="Cari usaha, pemilik, nomor…"
            className="h-10 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-sm outline-none focus:border-brand-200 focus:ring-4 focus:ring-brand-100"
          />
        </div>
      </div>

      <section className="card overflow-hidden">
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-canvas/70 text-left text-xs text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Usaha</th>
                <th className="px-3 py-3 font-semibold">Pemilik</th>
                <th className="px-3 py-3 font-semibold">Langganan</th>
                <th className="px-3 py-3 font-semibold">Pemakaian</th>
                <th className="px-3 py-3 font-semibold">Login</th>
                <th className="px-5 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {tampil.map((u) => (
                <Baris key={u.userId} u={u} />
              ))}
              {tampil.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted">
                    Tidak ada akun yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Baris({ u }: { u: BarisUsaha }) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function jalankan(f: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    mulai(async () => {
      const r = await aman(f());
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <tr className={cn(!u.loginAktif && "bg-red-50/40")}>
      <td className="px-5 py-3.5">
        <b className="text-ink">{u.usaha ?? "—"}</b>
        <span className="block text-xs text-muted">
          {u.jenis ? JENIS[u.jenis] : "—"} · daftar {tgl(u.terdaftar)}
        </span>
      </td>
      <td className="px-3 py-3.5">
        <span className="text-ink">{u.pemilik}</span>
        <span className="block text-xs text-muted">
          {u.namaPengguna ?? "tanpa akun"} · {u.telepon ?? "tanpa nomor"}
        </span>
      </td>
      <td className="px-3 py-3.5">
        <StatusLanggananLencana status={u.status} />
        <span className="mt-1 block text-xs text-muted">
          {PAKET[u.paket].label}
          {u.status !== "bebas" && u.berakhir && <> · s.d. {tgl(u.berakhir)}</>}
        </span>
      </td>
      <td className="px-3 py-3.5 text-xs text-ink-soft">
        <b className="text-sm text-ink">{u.transaksi30}</b> transaksi / 30 hari
        <span className="block text-muted">
          terakhir {tgl(u.transaksiTerakhir)}
          {u.jumlahKasir > 0 && <> · {u.jumlahKasir} kasir</>}
        </span>
      </td>
      <td className="px-3 py-3.5">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-bold",
            u.loginAktif ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-danger",
          )}
        >
          {u.loginAktif ? "Bisa masuk" : "Diblokir"}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex flex-wrap justify-end gap-1.5">
          {pending && <Loader2 className="size-4 animate-spin self-center text-muted" />}
          {u.status !== "bebas" && (
            <>
              <button
                onClick={() => jalankan(() => tambahMasa(u.userId, 7))}
                disabled={pending}
                className="h-8 rounded-lg border border-line px-2.5 text-xs font-semibold text-ink-soft hover:bg-canvas"
              >
                +7 hari
              </button>
              <button
                onClick={() => jalankan(() => tambahMasa(u.userId, 30))}
                disabled={pending}
                className="h-8 rounded-lg border border-line px-2.5 text-xs font-semibold text-ink-soft hover:bg-canvas"
              >
                +30 hari
              </button>
            </>
          )}
          <button
            onClick={() => {
              if (
                u.loginAktif &&
                !confirm(`Blokir login "${u.usaha}"? Pemilik dan kasirnya langsung keluar. Data tidak dihapus.`)
              )
                return;
              jalankan(() => aturLoginUsaha(u.userId, !u.loginAktif));
            }}
            disabled={pending}
            className={cn(
              "h-8 rounded-lg px-2.5 text-xs font-bold",
              u.loginAktif ? "text-danger hover:bg-red-50" : "bg-success text-white",
            )}
          >
            {u.loginAktif ? "Blokir" : "Buka blokir"}
          </button>
        </div>
        {error && <p className="mt-1 text-right text-xs text-danger">{error}</p>}
      </td>
    </tr>
  );
}
