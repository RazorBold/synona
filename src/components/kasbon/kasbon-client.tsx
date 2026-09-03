"use client";

import {
  CalendarClock,
  CheckCircle2,
  HandCoins,
  Plus,
  Search,
  TrendingUp,
  TriangleAlert,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";

import { WhatsAppIcon } from "@/components/icons/whatsapp";
import { BayarDialog } from "@/components/kasbon/bayar-dialog";
import type { AkunKas } from "@/server/queries/kas";
import { UtangDialog } from "@/components/kasbon/utang-dialog";
import { AvatarInisial } from "@/components/ui/avatar-inisial";
import { Chip } from "@/components/ui/chip";
import { labelJatuhTempo, selisihHari, waktuRelatif } from "@/lib/date";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import { buildWaLink, pesanPengingatUtang } from "@/lib/wa";
import type { BarisUtangKasbon } from "@/server/queries/kasbon";

type Statistik = {
  piutang: number;
  pelanggan: number;
  lewat: number;
  hariIni: number;
  terkumpul: number;
};

type Saring = "aktif" | "lewat" | "hariIni" | "lunas";

const TONE_TEMPO = {
  danger: "text-danger",
  warning: "text-warning",
  muted: "text-muted",
} as const;

export function KasbonClient({
  utang,
  statistik,
  pelanggan,
  akun,
  hariIni,
  namaToko,
}: {
  utang: BarisUtangKasbon[];
  statistik: Statistik;
  pelanggan: { id: string; nama: string }[];
  akun: AkunKas[];
  hariIni: string;
  namaToko: string;
}) {
  const [cari, setCari] = useState("");
  const [saring, setSaring] = useState<Saring>("aktif");

  const [bayarOpen, setBayarOpen] = useState(false);
  const [tambahOpen, setTambahOpen] = useState(false);
  const [terpilih, setTerpilih] = useState<BarisUtangKasbon | null>(null);

  const hasil = useMemo(() => {
    const kunci = cari.trim().toLowerCase();
    return utang.filter((u) => {
      const lunas = u.status === "paid";
      if (saring === "lunas" && !lunas) return false;
      if (saring !== "lunas" && lunas) return false;
      if (
        saring === "lewat" &&
        !(u.jatuhTempo && selisihHari(u.jatuhTempo, hariIni) < 0)
      )
        return false;
      if (saring === "hariIni" && u.jatuhTempo !== hariIni) return false;
      if (kunci && !u.nama.toLowerCase().includes(kunci)) return false;
      return true;
    });
  }, [utang, cari, saring, hariIni]);

  const totalTampil = hasil.reduce(
    (a, u) => a + (u.status === "paid" ? u.jumlah : u.sisa),
    0,
  );

  function bukaBayar(u: BarisUtangKasbon) {
    setTerpilih(u);
    setBayarOpen(true);
  }

  function linkIngatkan(u: BarisUtangKasbon) {
    const tempo = labelJatuhTempo(u.jatuhTempo, hariIni);
    return buildWaLink(
      u.phone!,
      pesanPengingatUtang({
        nama: u.nama,
        toko: namaToko,
        sisa: u.sisa,
        jatuhTempo: u.jatuhTempo,
        tegas: tempo.tone === "danger",
      }),
    );
  }

  return (
    <div className="relative z-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">
            Utang (Kasbon)
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            Catat cicilan dan ingatkan pelanggan lewat WhatsApp.
          </p>
        </div>

        <button
          onClick={() => setTambahOpen(true)}
          className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 px-5 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95"
        >
          <Plus className="size-4" strokeWidth={2.6} />
          Catat Utang
        </button>
      </div>

      <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        <Kartu
          label="Total Piutang"
          nilai={formatRupiah(statistik.piutang)}
          catatan={`${statistik.pelanggan} pelanggan`}
          icon={WalletCards}
          tone="warning"
        />
        <Kartu
          label="Lewat Tempo"
          nilai={String(statistik.lewat)}
          catatan="perlu ditagih"
          icon={TriangleAlert}
          tone="danger"
          onClick={() => setSaring("lewat")}
        />
        <Kartu
          label="Jatuh Tempo Hari Ini"
          nilai={String(statistik.hariIni)}
          icon={CalendarClock}
          tone="brand"
          onClick={() => setSaring("hariIni")}
        />
        <Kartu
          label="Terkumpul Bulan Ini"
          nilai={formatRupiah(statistik.terkumpul)}
          icon={TrendingUp}
          tone="success"
        />
      </div>

      <section className="card min-w-0 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative lg:w-[300px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              type="search"
              placeholder="Cari nama pelanggan..."
              className="h-12 w-full rounded-2xl border border-line bg-canvas pl-11 pr-4 text-sm text-ink outline-none placeholder:text-muted focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100"
            />
          </div>

          <div className="thin-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:ml-auto">
            {(
              [
                ["aktif", "Belum lunas"],
                ["lewat", "Lewat tempo"],
                ["hariIni", "Hari ini"],
                ["lunas", "Sudah lunas"],
              ] as [Saring, string][]
            ).map(([key, label]) => (
              <Chip
                key={key}
                aktif={saring === key}
                onClick={() => setSaring(key)}
              >
                {label}
              </Chip>
            ))}
          </div>
        </div>

        <ul className="mt-4 space-y-3">
          {hasil.map((u) => {
            const tempo = labelJatuhTempo(u.jatuhTempo, hariIni);
            const lunas = u.status === "paid";

            return (
              <li
                key={u.id}
                className={cn(
                  "rounded-2xl border p-4 transition-colors",
                  lunas
                    ? "border-line bg-canvas/50"
                    : tempo.tone === "danger"
                      ? "border-red-100 bg-red-50/40"
                      : "border-line hover:border-brand-200",
                )}
              >
                <div className="flex flex-wrap items-center gap-4">
                  <AvatarInisial nama={u.nama} className="size-11" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">
                      {u.nama}
                    </p>
                    <p className="truncate text-xs">
                      {lunas ? (
                        <span className="inline-flex items-center gap-1 font-medium text-success">
                          <CheckCircle2 className="size-3.5" />
                          Lunas
                        </span>
                      ) : (
                        <span
                          className={cn("font-medium", TONE_TEMPO[tempo.tone])}
                        >
                          {tempo.text}
                        </span>
                      )}
                      <span className="text-muted">
                        {" · "}
                        {u.invoiceNo ?? "Kasbon manual"}
                        {" · dicatat "}
                        {waktuRelatif(u.dibuat)}
                      </span>
                    </p>
                  </div>

                  <div className="text-right">
                    <p
                      className={cn(
                        "tabular text-lg font-extrabold",
                        lunas ? "text-muted line-through" : "text-ink",
                      )}
                    >
                      {formatRupiah(lunas ? u.jumlah : u.sisa)}
                    </p>
                    {!lunas && u.dibayar > 0 && (
                      <p className="tabular text-[11px] text-muted">
                        dibayar {formatRupiah(u.dibayar)} dari{" "}
                        {formatRupiah(u.jumlah)}
                      </p>
                    )}
                  </div>

                  {!lunas && (
                    <div className="flex shrink-0 items-center gap-2">
                      {u.phone && (
                        <a
                          href={linkIngatkan(u)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-10 items-center gap-2 rounded-xl bg-success px-3.5 text-[13px] font-bold text-white transition-colors hover:bg-emerald-600"
                        >
                          <WhatsAppIcon className="size-4" />
                          <span className="hidden sm:inline">Ingatkan</span>
                        </a>
                      )}
                      <button
                        onClick={() => bukaBayar(u)}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-400 px-4 text-[13px] font-bold text-white shadow-pop transition-opacity hover:opacity-95"
                      >
                        <HandCoins className="size-4" />
                        Bayar
                      </button>
                    </div>
                  )}
                </div>

                {!lunas && u.dibayar > 0 && (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400"
                      style={{
                        width: `${Math.round((u.dibayar / u.jumlah) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {hasil.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-canvas text-muted">
              <WalletCards className="size-6" />
            </span>
            <p className="mt-3 text-sm font-semibold text-ink">
              {saring === "lunas"
                ? "Belum ada utang yang lunas"
                : "Tidak ada utang di sini"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {saring === "aktif"
                ? "Semua pelanggan sedang tidak berutang. 🎉"
                : "Coba ganti penyaring atau kata kuncinya."}
            </p>
          </div>
        )}

        {hasil.length > 0 && (
          <p className="tabular mt-4 text-xs text-muted">
            {hasil.length} kasbon · total {formatRupiah(totalTampil)}
          </p>
        )}
      </section>

      <BayarDialog
        akun={akun}
        open={bayarOpen}
        onOpenChange={setBayarOpen}
        utang={terpilih}
        hariIni={hariIni}
      />
      <UtangDialog
        open={tambahOpen}
        onOpenChange={setTambahOpen}
        pelanggan={pelanggan}
      />
    </div>
  );
}

const TONE = {
  brand: "from-brand-400 to-brand-600",
  success: "from-emerald-400 to-emerald-600",
  warning: "from-amber-400 to-orange-500",
  danger: "from-rose-400 to-red-500",
} as const;

function Kartu({
  label,
  nilai,
  catatan,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string;
  nilai: string;
  catatan?: string;
  icon: typeof WalletCards;
  tone: keyof typeof TONE;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "card flex items-center gap-3.5 p-4 text-left",
        onClick && "transition-colors hover:border-brand-200",
      )}
    >
      <span
        className={cn(
          "grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white",
          TONE[tone],
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-muted">{label}</span>
        <span className="tabular block text-[15px] font-extrabold leading-tight tracking-tight text-ink sm:text-lg">
          {nilai}
        </span>
        {catatan && (
          <span className="block text-[11px] leading-tight text-muted">
            {catatan}
          </span>
        )}
      </span>
    </Tag>
  );
}
