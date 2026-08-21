"use client";

import {
  Archive,
  Eye,
  Pencil,
  Plus,
  Search,
  Sparkles,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";

import { WhatsAppIcon } from "@/components/icons/whatsapp";
import { DetailPelangganDialog } from "@/components/pelanggan/detail-dialog";
import { PelangganDialog } from "@/components/pelanggan/pelanggan-dialog";
import { AvatarInisial } from "@/components/ui/avatar-inisial";
import { Chip } from "@/components/ui/chip";
import { IconButton } from "@/components/ui/icon-button";
import { waktuRelatif } from "@/lib/date";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import { buildWaLink, pesanPengingatUtang } from "@/lib/wa";
import { arsipkanPelanggan } from "@/server/actions/pelanggan";
import type { BarisPelanggan } from "@/server/queries/pelanggan";

type Statistik = {
  jumlah: number;
  berutang: number;
  piutang: number;
  baru: number;
};

type Saring = "semua" | "berutang" | "baru" | "belum";

export function PelangganClient({
  pelanggan,
  statistik,
  hariIni,
  namaToko,
}: {
  pelanggan: BarisPelanggan[];
  statistik: Statistik;
  hariIni: string;
  namaToko: string;
}) {
  const [cari, setCari] = useState("");
  const [saring, setSaring] = useState<Saring>("semua");

  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [terpilih, setTerpilih] = useState<BarisPelanggan | null>(null);

  const batasBaru = Date.now() - 30 * 86_400_000;

  const hasil = useMemo(() => {
    const kunci = cari.trim().toLowerCase();
    return pelanggan.filter((p) => {
      if (saring === "berutang" && p.sisaUtang <= 0) return false;
      if (saring === "baru" && p.dibuat < batasBaru) return false;
      if (saring === "belum" && p.jumlahTransaksi > 0) return false;
      if (
        kunci &&
        !p.nama.toLowerCase().includes(kunci) &&
        !(p.phone ?? "").includes(kunci)
      )
        return false;
      return true;
    });
  }, [pelanggan, cari, saring, batasBaru]);

  function bukaTambah() {
    setTerpilih(null);
    setFormOpen(true);
  }

  function bukaEdit(p: BarisPelanggan) {
    setTerpilih(p);
    setFormOpen(true);
  }

  function bukaDetail(p: BarisPelanggan) {
    setTerpilih(p);
    setDetailOpen(true);
  }

  async function arsipkan(p: BarisPelanggan) {
    if (
      !confirm(
        `Arsipkan "${p.nama}"? Riwayat belanjanya tetap tersimpan, tetapi namanya tidak muncul lagi saat transaksi.`,
      )
    )
      return;
    const hasil = await arsipkanPelanggan(p.id);
    if (!hasil.ok) alert(hasil.error);
  }

  function linkWa(p: BarisPelanggan) {
    return buildWaLink(
      p.phone!,
      p.sisaUtang > 0
        ? pesanPengingatUtang({
            nama: p.nama,
            toko: namaToko,
            sisa: p.sisaUtang,
          })
        : `Halo kak ${p.nama} 🙏 Terima kasih sudah berlangganan di ${namaToko}.`,
    );
  }

  return (
    <div className="relative z-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">
            Pelanggan
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            Data pelanggan, riwayat belanja, dan sisa utangnya.
          </p>
        </div>

        <button
          onClick={bukaTambah}
          className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 px-5 text-sm font-bold text-white shadow-pop transition-opacity hover:opacity-95"
        >
          <Plus className="size-4" strokeWidth={2.6} />
          Tambah Pelanggan
        </button>
      </div>

      <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        <Kartu
          label="Total Pelanggan"
          nilai={String(statistik.jumlah)}
          icon={Users}
          tone="brand"
        />
        <Kartu
          label="Punya Utang"
          nilai={String(statistik.berutang)}
          icon={WalletCards}
          tone="warning"
          onClick={() => setSaring("berutang")}
        />
        <Kartu
          label="Total Piutang"
          nilai={formatRupiah(statistik.piutang)}
          icon={UserRound}
          tone="danger"
        />
        <Kartu
          label="Baru 30 Hari"
          nilai={String(statistik.baru)}
          icon={Sparkles}
          tone="success"
          onClick={() => setSaring("baru")}
        />
      </div>

      <section className="card min-w-0 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative lg:w-[320px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              type="search"
              placeholder="Cari nama atau nomor..."
              className="h-12 w-full rounded-2xl border border-line bg-canvas pl-11 pr-4 text-sm text-ink outline-none placeholder:text-muted focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100"
            />
          </div>

          <div className="thin-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:ml-auto">
            {(
              [
                ["semua", "Semua"],
                ["berutang", "Berutang"],
                ["baru", "Baru"],
                ["belum", "Belum belanja"],
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

        {/* Tabel (layar lebar) */}
        <div className="mt-4 hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="pb-3 pl-2 pr-3">Pelanggan</th>
                <th className="pb-3 pr-3">WhatsApp</th>
                <th className="pb-3 pr-3 text-right">Total Belanja</th>
                <th className="pb-3 pr-3 text-right">Transaksi</th>
                <th className="pb-3 pr-3">Terakhir</th>
                <th className="pb-3 pr-3 text-right">Sisa Utang</th>
                <th className="pb-3 pr-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {hasil.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-line/70 transition-colors hover:bg-canvas/70"
                >
                  <td className="py-3 pl-2 pr-3">
                    <div className="flex items-center gap-3">
                      <AvatarInisial nama={p.nama} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {p.nama}
                        </p>
                        {p.catatan && (
                          <p className="truncate text-xs text-muted">
                            {p.catatan}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="tabular py-3 pr-3 text-sm text-ink-soft">
                    {p.phone ?? <span className="text-muted">—</span>}
                  </td>
                  <td className="tabular py-3 pr-3 text-right text-sm font-bold text-ink">
                    {formatRupiah(p.totalBelanja)}
                  </td>
                  <td className="tabular py-3 pr-3 text-right text-sm text-muted">
                    {p.jumlahTransaksi}
                  </td>
                  <td className="py-3 pr-3 text-sm text-muted">
                    {waktuRelatif(p.terakhirBelanja)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {p.sisaUtang > 0 ? (
                      <span className="tabular inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-warning">
                        {formatRupiah(p.sisaUtang)}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-success">
                        Lunas
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-2">
                    <div className="flex items-center justify-end gap-1.5">
                      {p.phone && (
                        <a
                          href={linkWa(p)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Chat WhatsApp"
                          aria-label={`Chat ${p.nama} via WhatsApp`}
                          className="grid size-9 place-items-center rounded-xl bg-success text-white transition-colors hover:bg-emerald-600"
                        >
                          <WhatsAppIcon className="size-4" />
                        </a>
                      )}
                      <IconButton
                        label="Lihat detail"
                        onClick={() => bukaDetail(p)}
                        icon={Eye}
                      />
                      <IconButton
                        label="Ubah pelanggan"
                        onClick={() => bukaEdit(p)}
                        icon={Pencil}
                      />
                      <IconButton
                        label="Arsipkan"
                        onClick={() => arsipkan(p)}
                        icon={Archive}
                        bahaya
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Kartu (layar kecil) */}
        <ul className="mt-4 space-y-3 lg:hidden">
          {hasil.map((p) => (
            <li key={p.id} className="rounded-2xl border border-line p-3.5">
              <div className="flex items-start gap-3">
                <AvatarInisial nama={p.nama} className="size-11" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {p.nama}
                  </p>
                  <p className="tabular truncate text-xs text-muted">
                    {p.phone ?? "Tanpa nomor"} · {waktuRelatif(p.terakhirBelanja)}
                  </p>
                </div>
                {p.sisaUtang > 0 && (
                  <span className="tabular shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-warning">
                    {formatRupiah(p.sisaUtang)}
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <div>
                  <p className="tabular text-sm font-bold text-ink">
                    {formatRupiah(p.totalBelanja)}
                  </p>
                  <p className="text-xs text-muted">
                    {p.jumlahTransaksi} transaksi
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {p.phone && (
                    <a
                      href={linkWa(p)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Chat ${p.nama} via WhatsApp`}
                      className="grid size-9 place-items-center rounded-xl bg-success text-white"
                    >
                      <WhatsAppIcon className="size-4" />
                    </a>
                  )}
                  <IconButton
                    label="Lihat detail"
                    onClick={() => bukaDetail(p)}
                    icon={Eye}
                  />
                  <IconButton
                    label="Ubah pelanggan"
                    onClick={() => bukaEdit(p)}
                    icon={Pencil}
                  />
                  <IconButton
                    label="Arsipkan"
                    onClick={() => arsipkan(p)}
                    icon={Archive}
                    bahaya
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>

        {hasil.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-canvas text-muted">
              <Users className="size-6" />
            </span>
            <p className="mt-3 text-sm font-semibold text-ink">
              Tidak ada pelanggan yang cocok
            </p>
            <p className="mt-1 text-sm text-muted">
              Ubah kata kunci atau penyaringnya.
            </p>
          </div>
        )}

        {hasil.length > 0 && (
          <p className="mt-4 text-xs text-muted">
            Menampilkan {hasil.length} dari {pelanggan.length} pelanggan.
          </p>
        )}
      </section>

      <PelangganDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        pelanggan={terpilih}
      />
      <DetailPelangganDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        pelanggan={terpilih}
        hariIni={hariIni}
        namaToko={namaToko}
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
  icon: Icon,
  tone,
  onClick,
}: {
  label: string;
  nilai: string;
  icon: typeof Users;
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
      </span>
    </Tag>
  );
}
