"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  CircleAlert,
  CircleCheck,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Chip } from "@/components/ui/chip";
import { GambarProduk } from "@/components/ui/gambar-produk";
import { formatRupiah } from "@/lib/money";
import { formatJumlahBahan, type SatuanBahan } from "@/lib/satuan";
import { cn } from "@/lib/utils";
import type {
  ArusKas,
  BarisProfit,
  KesehatanInventory,
  KesehatanKeuangan,
  Status,
} from "@/server/queries/kesehatan";
import { LABEL_JENIS_AKUN } from "@/lib/kas";
import { punyaBarang, type JenisUsaha } from "@/lib/usaha";
import type { SaldoAkun } from "@/server/queries/kas";
import type { BarisPetugas } from "@/server/queries/layanan";

function jumlah(baris: SaldoAkun[], kunci: keyof SaldoAkun): number {
  return baris.reduce((a, b) => a + (b[kunci] as number), 0);
}

const PERIODE = [
  ["bulan", "Bulan ini"],
  ["30hari", "30 hari"],
  ["7hari", "7 hari"],
] as const;

const GAYA_STATUS: Record<
  Status,
  { label: string; kelas: string; icon: typeof CircleCheck }
> = {
  sehat: {
    label: "SEHAT",
    kelas: "bg-emerald-50 text-emerald-700",
    icon: CircleCheck,
  },
  waspada: {
    label: "WASPADA",
    kelas: "bg-amber-50 text-amber-700",
    icon: TriangleAlert,
  },
  bahaya: {
    label: "BAHAYA",
    kelas: "bg-red-50 text-danger",
    icon: CircleAlert,
  },
};

export function LaporanClient({
  keuangan,
  inventory,
  arusKas,
  saldoAkun,
  petugas,
  produk,
  jenisUsaha,
  periode,
  labelPeriode,
}: {
  keuangan: KesehatanKeuangan;
  inventory: KesehatanInventory;
  arusKas: ArusKas;
  saldoAkun: SaldoAkun[];
  petugas: BarisPetugas[];
  jenisUsaha: JenisUsaha | null;
  produk: BarisProfit[];
  periode: string;
  labelPeriode: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function ganti(nilai: string) {
    const next = new URLSearchParams(params.toString());
    next.set("periode", nilai);
    startTransition(() => router.push(`${pathname}?${next}`, { scroll: false }));
  }

  const terlaris = produk[0];
  const tertipis = [...produk]
    .filter((p) => p.omzet > 0)
    .sort((a, b) => a.margin - b.margin)[0];

  return (
    <div
      className="relative z-10 space-y-6 transition-opacity"
      style={{ opacity: pending ? 0.6 : 1 }}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">
            Laporan &amp; Kesehatan Usaha
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            Angka {labelPeriode.toLowerCase()} diterjemahkan jadi status: sehat,
            waspada, atau bahaya.
          </p>
        </div>

        <div className="thin-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {PERIODE.map(([key, label]) => (
            <Chip key={key} aktif={periode === key} onClick={() => ganti(key)}>
              {label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Kesehatan keuangan */}
        <PanelKesehatan
          judul="Kesehatan Keuangan"
          status={keuangan.status}
          alasan={keuangan.alasan}
        >
          <Baris label="Omzet" nilai={formatRupiah(keuangan.omzet)} />
          <Baris
            label="Margin kotor"
            nilai={`${keuangan.marginKotor}%`}
            tebal
            tone={keuangan.marginKotor >= 20 ? "success" : "warning"}
          />
          <Baris
            label="Margin bersih"
            nilai={`${keuangan.marginBersih}%`}
            tebal
            tone={keuangan.marginBersih > 0 ? "success" : "danger"}
          />
          <Baris
            label="Arus kas"
            nilai={formatRupiah(arusKas.bersih)}
            tone={arusKas.bersih >= 0 ? "success" : "danger"}
          />
          <Baris
            label="Piutang vs hutang"
            nilai={`${formatRupiah(keuangan.piutang)} / ${formatRupiah(keuangan.hutangSupplier)}`}
          />
          <Baris
            label="Titik impas (BEP)"
            nilai={
              keuangan.bepHarian > 0
                ? `${formatRupiah(keuangan.bepHarian)}/hari`
                : "belum bisa dihitung"
            }
          />
          <Baris
            label="Omzet harian"
            nilai={formatRupiah(keuangan.omzetHarian)}
            tone={
              keuangan.bepHarian > 0 && keuangan.omzetHarian < keuangan.bepHarian
                ? "danger"
                : "success"
            }
          />
        </PanelKesehatan>

        {/* Kesehatan inventory — hanya berarti kalau ada barang */}
        {punyaBarang(jenisUsaha) && (
        <PanelKesehatan
          judul="Kesehatan Inventory"
          status={inventory.status}
          alasan={inventory.alasan}
        >
          <Baris
            label="Nilai stok"
            nilai={formatRupiah(inventory.nilaiTotal)}
            tebal
          />
          <Baris
            label="— produk jadi"
            nilai={formatRupiah(inventory.nilaiProduk)}
          />
          <Baris
            label="— bahan baku"
            nilai={formatRupiah(inventory.nilaiBahan)}
          />
          <Baris
            label="Perputaran"
            nilai={`${inventory.perputaran}x / periode`}
          />
          <Baris
            label="Barang kritis"
            nilai={`${inventory.produkKritis + inventory.bahanKritis} item`}
            tone={
              inventory.produkKritis + inventory.bahanKritis > 0
                ? "warning"
                : "success"
            }
          />
          <Baris
            label="Stok mati (>30 hari)"
            nilai={`${inventory.stokMati} item`}
            tone={inventory.stokMati > 0 ? "warning" : "success"}
          />
        </PanelKesehatan>
        )}

        {/* Arus kas rinci */}
        <section className="card flex flex-col p-5">
          <h2 className="card-title text-[17px]">Arus Kas</h2>
          <p className="mt-1 text-xs text-muted">
            Dirakit dari penjualan, cicilan, pembelian, dan beban.
          </p>

          <div className="mt-4 space-y-2.5">
            <BarisKas
              label="Penjualan lunas"
              nilai={arusKas.penjualanTunai}
              masuk
            />
            <BarisKas label="Cicilan piutang" nilai={arusKas.cicilanPiutang} masuk />
            {arusKas.pemasukanLain > 0 && (
              <BarisKas
                label="Pemasukan lain (modal, pinjaman…)"
                nilai={arusKas.pemasukanLain}
                masuk
              />
            )}
            <div className="flex items-center justify-between border-t border-line pt-2.5">
              <span className="text-[13px] font-bold text-ink">Total masuk</span>
              <span className="tabular text-sm font-extrabold text-success">
                {formatRupiah(arusKas.masuk)}
              </span>
            </div>

            <BarisKas label="Beli bahan (dibayar)" nilai={arusKas.pembelianDibayar} />
            <BarisKas label="Bayar hutang supplier" nilai={arusKas.pelunasanHutang} />
            <BarisKas label="Beban & tagihan" nilai={arusKas.beban} />
            <div className="flex items-center justify-between border-t border-line pt-2.5">
              <span className="text-[13px] font-bold text-ink">Total keluar</span>
              <span className="tabular text-sm font-extrabold text-danger">
                {formatRupiah(arusKas.keluar)}
              </span>
            </div>
          </div>

          <div
            className={cn(
              "mt-4 flex items-center justify-between rounded-2xl px-4 py-3",
              arusKas.bersih >= 0 ? "bg-emerald-50" : "bg-red-50",
            )}
          >
            <span
              className={cn(
                "text-sm font-bold",
                arusKas.bersih >= 0 ? "text-emerald-700" : "text-danger",
              )}
            >
              Kas bersih
            </span>
            <span
              className={cn(
                "tabular text-lg font-extrabold",
                arusKas.bersih >= 0 ? "text-emerald-700" : "text-danger",
              )}
            >
              {formatRupiah(arusKas.bersih)}
            </span>
          </div>
        </section>
      </div>

      {petugas.length > 0 && (
        <section className="card min-w-0 p-5">
          <h2 className="card-title text-[17px]">Pendapatan per Petugas</h2>
          <p className="mt-1 text-xs text-muted">
            Dari layanan yang ditandai petugasnya. Baris &ldquo;Belum
            ditandai&rdquo; berarti pekerjaannya tidak dicatat siapa yang
            mengerjakan.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="pb-3 pl-2 pr-3">Petugas</th>
                  <th className="pb-3 pr-3 text-right">Pekerjaan</th>
                  <th className="pb-3 pr-3 text-right">Pendapatan</th>
                  <th className="pb-3 pr-2 text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {petugas.map((p) => (
                  <tr
                    key={p.staffId ?? "tanpa"}
                    className="border-b border-line/70"
                  >
                    <td className="py-3 pl-2 pr-3">
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          p.staffId ? "text-ink" : "text-muted",
                        )}
                      >
                        {p.nama}
                      </span>
                    </td>
                    <td className="tabular py-3 pr-3 text-right text-sm text-ink-soft">
                      {p.jumlahPekerjaan}
                    </td>
                    <td className="tabular py-3 pr-3 text-right text-sm font-bold text-ink">
                      {formatRupiah(p.omzet)}
                    </td>
                    <td className="tabular py-3 pr-2 text-right text-sm font-semibold text-success">
                      {formatRupiah(p.margin)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Arus kas per akun — jawaban untuk "uangnya sekarang ada di mana" */}
      <section className="card min-w-0 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="card-title text-[17px]">Arus Kas per Akun</h2>
            <p className="mt-1 text-xs text-muted">
              Total di atas tidak memberi tahu uangnya ada di laci atau di
              rekening. Tabel ini memisahkannya.
            </p>
          </div>
          <Link href="/kas" className="link-more">
            Lihat mutasi rinci <ArrowUpRight className="size-3.5" />
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="pb-3 pl-2 pr-3">Akun</th>
                <th className="pb-3 pr-3 text-right">Saldo Awal</th>
                <th className="pb-3 pr-3 text-right">Masuk</th>
                <th className="pb-3 pr-3 text-right">Keluar</th>
                <th className="pb-3 pr-2 text-right">Saldo Akhir</th>
              </tr>
            </thead>
            <tbody>
              {saldoAkun.map((s) => (
                <tr key={s.id} className="border-b border-line/70">
                  <td className="py-3 pl-2 pr-3">
                    <p className="text-sm font-semibold text-ink">{s.nama}</p>
                    <p className="text-xs text-muted">
                      {s.namaBank ?? LABEL_JENIS_AKUN[s.jenis]}
                    </p>
                  </td>
                  <td className="tabular py-3 pr-3 text-right text-sm text-ink-soft">
                    {formatRupiah(s.saldoAwal)}
                  </td>
                  <td className="tabular py-3 pr-3 text-right text-sm font-semibold text-success">
                    {formatRupiah(s.masuk)}
                  </td>
                  <td className="tabular py-3 pr-3 text-right text-sm font-semibold text-danger">
                    {formatRupiah(s.keluar)}
                  </td>
                  <td
                    className={cn(
                      "tabular py-3 pr-2 text-right text-sm font-extrabold",
                      s.saldoAkhir < 0 ? "text-danger" : "text-ink",
                    )}
                  >
                    {formatRupiah(s.saldoAkhir)}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="py-3 pl-2 pr-3 text-sm font-extrabold text-ink">
                  Total
                </td>
                <td className="tabular py-3 pr-3 text-right text-sm font-bold text-ink-soft">
                  {formatRupiah(jumlah(saldoAkun, "saldoAwal"))}
                </td>
                <td className="tabular py-3 pr-3 text-right text-sm font-extrabold text-success">
                  {formatRupiah(jumlah(saldoAkun, "masuk"))}
                </td>
                <td className="tabular py-3 pr-3 text-right text-sm font-extrabold text-danger">
                  {formatRupiah(jumlah(saldoAkun, "keluar"))}
                </td>
                <td className="tabular py-3 pr-2 text-right text-base font-extrabold text-ink">
                  {formatRupiah(jumlah(saldoAkun, "saldoAkhir"))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {saldoAkun.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            Belum ada akun kas. Buat dulu di menu Kas &amp; Bank.
          </p>
        )}
      </section>

      {/* Barang kritis */}
      {inventory.kritis.length > 0 && (
        <section className="card min-w-0 p-5">
          <h2 className="card-title text-[17px]">Perlu Dipesan Ulang</h2>
          <ul className="mt-3 divide-y divide-line/70">
            {inventory.kritis.map((k) => (
              <li key={`${k.jenis}-${k.nama}`} className="flex items-center gap-3 py-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-canvas text-sm">
                  {k.jenis === "bahan" ? "🌾" : "📦"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {k.nama}
                  </span>
                  <span className="block text-xs text-muted">
                    {k.jenis === "bahan" ? "bahan baku" : "produk jadi"}
                  </span>
                </span>
                <span
                  className={cn(
                    "tabular shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
                    k.stok <= 0
                      ? "bg-red-50 text-danger"
                      : "bg-amber-50 text-warning",
                  )}
                >
                  {k.stok <= 0
                    ? "Habis"
                    : k.jenis === "bahan"
                      ? formatJumlahBahan(k.stok, k.satuan as SatuanBahan)
                      : `${k.stok} ${k.satuan}`}
                </span>
                <span className="tabular w-28 shrink-0 text-right text-xs text-muted">
                  {k.hariTersisa !== null
                    ? `habis ~${k.hariTersisa} hari`
                    : "belum terpakai"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Profitabilitas per produk */}
      <section className="card min-w-0 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="card-title text-[17px]">Profitabilitas per Produk</h2>
          {terlaris && tertipis && (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">
                Paling untung: {terlaris.nama} ({terlaris.margin}%)
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-1.5 font-semibold text-amber-700">
                Untung tipis: {tertipis.nama} ({tertipis.margin}%)
              </span>
            </div>
          )}
        </div>

        {produk.length === 0 ? (
          <p className="mt-3 rounded-xl bg-canvas px-4 py-8 text-center text-sm text-muted">
            Belum ada penjualan pada periode ini.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="pb-3 pl-2 pr-3">Produk</th>
                  <th className="pb-3 pr-3 text-right">Terjual</th>
                  <th className="pb-3 pr-3 text-right">Omzet</th>
                  <th className="pb-3 pr-3 text-right">HPP</th>
                  <th className="pb-3 pr-3 text-right">Laba</th>
                  <th className="pb-3 pr-2 text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {produk.map((p) => (
                  <tr
                    key={p.nama}
                    className="border-b border-line/70 transition-colors hover:bg-canvas/70"
                  >
                    <td className="py-3 pl-2 pr-3">
                      <div className="flex items-center gap-3">
                        <GambarProduk
                          gambar={p.gambar}
                          emoji={p.emoji}
                          nama={p.nama}
                          className="size-9"
                          ukuranEmoji="text-sm"
                        />
                        <span className="truncate text-sm font-semibold text-ink">
                          {p.nama}
                        </span>
                      </div>
                    </td>
                    <td className="tabular py-3 pr-3 text-right text-sm text-muted">
                      {p.qty}
                    </td>
                    <td className="tabular py-3 pr-3 text-right text-sm text-ink">
                      {formatRupiah(p.omzet)}
                    </td>
                    <td className="tabular py-3 pr-3 text-right text-sm text-muted">
                      {formatRupiah(p.hpp)}
                    </td>
                    <td className="tabular py-3 pr-3 text-right text-sm font-bold text-ink">
                      {formatRupiah(p.laba)}
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <span
                        className={cn(
                          "tabular inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                          p.margin >= 40
                            ? "bg-emerald-50 text-emerald-600"
                            : p.margin >= 15
                              ? "bg-amber-50 text-warning"
                              : "bg-red-50 text-danger",
                        )}
                      >
                        {p.margin}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function PanelKesehatan({
  judul,
  status,
  alasan,
  children,
}: {
  judul: string;
  status: Status;
  alasan: string;
  children: React.ReactNode;
}) {
  const g = GAYA_STATUS[status];
  return (
    <section className="card flex flex-col p-5">
      <h2 className="card-title text-[17px]">{judul}</h2>
      <div className="mt-3 flex-1 space-y-1">{children}</div>
      <div
        className={cn(
          "mt-4 flex items-start gap-2 rounded-2xl px-4 py-3",
          g.kelas,
        )}
      >
        <g.icon className="mt-0.5 size-4 shrink-0" />
        <span className="min-w-0">
          <span className="block text-[13px] font-extrabold tracking-wide">
            {g.label}
          </span>
          <span className="block text-xs opacity-90">{alasan}</span>
        </span>
      </div>
    </section>
  );
}

function Baris({
  label,
  nilai,
  tebal = false,
  tone,
}: {
  label: string;
  nilai: string;
  tebal?: boolean;
  tone?: "success" | "warning" | "danger";
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-[13px] text-muted">{label}</span>
      <span
        className={cn(
          "tabular shrink-0 text-[13px]",
          tebal ? "font-extrabold" : "font-semibold",
          tone === "success"
            ? "text-success"
            : tone === "warning"
              ? "text-warning"
              : tone === "danger"
                ? "text-danger"
                : "text-ink",
        )}
      >
        {nilai}
      </span>
    </div>
  );
}

function BarisKas({
  label,
  nilai,
  masuk = false,
}: {
  label: string;
  nilai: number;
  masuk?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted">
        {masuk ? (
          <ArrowUpRight className="size-3.5 shrink-0 text-success" />
        ) : (
          <ArrowDownLeft className="size-3.5 shrink-0 text-danger" />
        )}
        <span className="truncate">{label}</span>
      </span>
      <span className="tabular shrink-0 text-[13px] font-semibold text-ink">
        {formatRupiah(nilai)}
      </span>
    </div>
  );
}
