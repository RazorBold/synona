import { Package, Receipt, SearchX, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { formatRupiah } from "@/lib/money";
import { cariSemua } from "@/server/queries/cari";
import { getOutletAktif } from "@/server/queries/dashboard";

export const metadata: Metadata = { title: "Hasil Pencarian — Synona" };
export const dynamic = "force-dynamic";

export default async function HalamanCari({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const kueri = (q ?? "").trim();
  const outlet = await getOutletAktif();
  const hasil = await cariSemua(outlet.id, kueri);

  return (
    <>
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Pencarian</h1>
        <p className="mt-1 text-sm text-muted">
          {kueri.length < 2
            ? "Ketik minimal 2 huruf di kolom pencarian di atas."
            : `${hasil.total} hasil untuk “${kueri}”`}
        </p>
      </header>

      {kueri.length >= 2 && hasil.total === 0 && (
        <div className="mt-6 rounded-2xl border border-line bg-white p-10 text-center shadow-card">
          <SearchX className="mx-auto size-10 text-muted" />
          <p className="mt-3 text-sm font-bold text-ink">Tidak ada yang cocok</p>
          <p className="mt-1 text-sm text-muted">
            Coba kata lain, atau sebagian namanya saja.
          </p>
        </div>
      )}

      {hasil.produk.length > 0 && (
        <Bagian judul="Produk" ikon={<Package className="size-4" />} tautan="/produk">
          {hasil.produk.map((p) => (
            <Baris
              key={p.id}
              href="/produk"
              utama={p.nama}
              kedua={p.sku ? `SKU ${p.sku}` : `Stok ${p.stok} ${p.satuan}`}
              kanan={formatRupiah(p.harga)}
            />
          ))}
        </Bagian>
      )}

      {hasil.pelanggan.length > 0 && (
        <Bagian judul="Pelanggan" ikon={<Users className="size-4" />} tautan="/pelanggan">
          {hasil.pelanggan.map((c) => (
            <Baris
              key={c.id}
              href="/pelanggan"
              utama={c.nama}
              kedua={c.phone ?? "Tanpa nomor WhatsApp"}
              kanan={c.sisaUtang > 0 ? `Utang ${formatRupiah(c.sisaUtang)}` : ""}
              kananBahaya={c.sisaUtang > 0}
            />
          ))}
        </Bagian>
      )}

      {hasil.transaksi.length > 0 && (
        <Bagian judul="Transaksi" ikon={<Receipt className="size-4" />} tautan="/laporan">
          {hasil.transaksi.map((t) => (
            <Baris
              key={t.id}
              href="/laporan"
              utama={t.invoiceNo}
              kedua={`${t.tanggal}${t.namaPelanggan ? ` · ${t.namaPelanggan}` : ""}${t.status === "void" ? " · dibatalkan" : ""}`}
              kanan={formatRupiah(t.total)}
            />
          ))}
        </Bagian>
      )}
    </>
  );
}

function Bagian({
  judul,
  ikon,
  tautan,
  children,
}: {
  judul: string;
  ikon: React.ReactNode;
  tautan: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted">
          {ikon}
          {judul}
        </h2>
        <Link href={tautan} className="text-xs font-semibold text-brand-500 hover:text-brand-600">
          Buka semua
        </Link>
      </div>
      <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        {children}
      </ul>
    </section>
  );
}

function Baris({
  href,
  utama,
  kedua,
  kanan,
  kananBahaya = false,
}: {
  href: string;
  utama: string;
  kedua: string;
  kanan: string;
  kananBahaya?: boolean;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-canvas">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-ink">{utama}</span>
          <span className="block truncate text-xs text-muted">{kedua}</span>
        </span>
        {kanan && (
          <span
            className={`tabular shrink-0 text-sm font-bold ${kananBahaya ? "text-danger" : "text-ink"}`}
          >
            {kanan}
          </span>
        )}
      </Link>
    </li>
  );
}
