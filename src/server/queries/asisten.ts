import "server-only";

import { sql } from "drizzle-orm";

import { tambahHari } from "@/lib/date";
import { db } from "@/db";
import { persenDiskon } from "@/lib/diskon";
import { formatRupiah } from "@/lib/money";
import { punyaBarang, punyaJasa, type JenisUsaha } from "@/lib/usaha";
import { getSaldoAkun } from "@/server/queries/kas";

/**
 * Asisten tanya-jawab: pertanyaan yang sering ditanyakan pemilik usaha,
 * dijawab dari data outletnya sendiri.
 *
 * TIDAK ada model bahasa di sini. Kalimatnya template; angka, nama, dan
 * tanggalnya dari database. Itu disengaja: jawaban yang terdengar pintar
 * tapi salah jauh lebih berbahaya daripada jawaban kaku yang benar, karena
 * yang dibicarakan adalah uang orang.
 */

export type NadaJawaban = "baik" | "netral" | "waspada" | "bahaya";

export type Jawaban = {
  kode: string;
  pertanyaan: string;
  jawaban: string;
  /** Baris pendukung: rincian, nama, atau perbandingan. Boleh kosong. */
  rincian: string | null;
  nada: NadaJawaban;
  aksi: string | null;
  href: string | null;
};

export type ButirPertanyaan = { kode: string; teks: string; grup: string };

const rupiah = (n: number) => formatRupiah(Math.round(n));
const persen = (bagian: number, dari: number) =>
  dari === 0 ? 0 : Math.round((bagian / dari) * 100);

/** Laba per transaksi: sesudah diskon baris, diskon nota, dan pajak yang ditanggung usaha. */
const LABA = sql`
  (SELECT COALESCE(SUM(i.line_total - i.cost_snapshot * i.qty), 0)
     FROM transaction_items i WHERE i.transaction_id = t.id)
  - t.discount
  - CASE WHEN t.tax_mode = 'termasuk' THEN t.tax_amount ELSE 0 END
`;

/* ------------------------------------------------ daftar pertanyaan */

const SEMUA: { kode: string; teks: string; grup: string; butuh?: "barang" | "jasa" }[] = [
  { kode: "omzet-hari-ini", teks: "Hari ini sudah laku berapa?", grup: "Penjualan" },
  { kode: "untung-hari-ini", teks: "Untungnya berapa hari ini?", grup: "Penjualan" },
  { kode: "bulan-ini", teks: "Bulan ini lebih baik dari bulan lalu?", grup: "Penjualan" },
  { kode: "jam-ramai", teks: "Jam berapa paling ramai?", grup: "Penjualan" },
  { kode: "terlaris", teks: "Apa yang paling laku?", grup: "Penjualan" },
  { kode: "stok-menipis", teks: "Apa yang harus saya kulakan?", grup: "Stok", butuh: "barang" },
  { kode: "stok-mati", teks: "Ada barang yang tidak laku-laku?", grup: "Stok", butuh: "barang" },
  { kode: "nilai-stok", teks: "Berapa modal yang mengendap di stok?", grup: "Stok", butuh: "barang" },
  { kode: "kasbon", teks: "Siapa yang masih punya kasbon?", grup: "Utang" },
  { kode: "hutang-supplier", teks: "Saya masih punya utang ke supplier?", grup: "Utang" },
  { kode: "kas", teks: "Uang saya sekarang berapa?", grup: "Kas" },
  { kode: "beban-bulan", teks: "Beban bulan ini berapa?", grup: "Kas" },
  { kode: "pelanggan-setia", teks: "Siapa pelanggan paling sering belanja?", grup: "Pelanggan" },
  { kode: "promo-jalan", teks: "Promo apa yang sedang berjalan?", grup: "Pelanggan" },
  { kode: "antrean", teks: "Pekerjaan apa yang belum selesai?", grup: "Pesanan", butuh: "jasa" },
];

export function daftarPertanyaan(jenisUsaha: JenisUsaha | null): ButirPertanyaan[] {
  return SEMUA.filter(
    (p) =>
      !p.butuh ||
      (p.butuh === "barang" ? punyaBarang(jenisUsaha) : punyaJasa(jenisUsaha)),
  ).map(({ kode, teks, grup }) => ({ kode, teks, grup }));
}

export function adaPertanyaan(kode: string, jenisUsaha: JenisUsaha | null): boolean {
  return daftarPertanyaan(jenisUsaha).some((p) => p.kode === kode);
}

/* ------------------------------------------------------- jawaban */

export async function jawab(
  kode: string,
  outletId: string,
  hariIni: string,
  jenisUsaha: JenisUsaha | null,
): Promise<Jawaban> {
  const teks = SEMUA.find((p) => p.kode === kode)?.teks ?? "Pertanyaan";
  const dasar = { kode, pertanyaan: teks };
  const barang = punyaBarang(jenisUsaha);
  const awal7 = tambahHari(hariIni, -6);
  const awal30 = tambahHari(hariIni, -29);
  const kemarin = tambahHari(hariIni, -1);
  const awalBulan = `${hariIni.slice(0, 7)}-01`;

  switch (kode) {
    case "omzet-hari-ini": {
      const r = db.get<{ omzet: number; tx: number; omzet7: number; hari7: number }>(sql`
        SELECT
          COALESCE((SELECT SUM(total) FROM transactions
                     WHERE outlet_id = ${outletId} AND status != 'void'
                       AND business_date = ${hariIni}), 0) AS omzet,
          COALESCE((SELECT COUNT(*) FROM transactions
                     WHERE outlet_id = ${outletId} AND status != 'void'
                       AND business_date = ${hariIni}), 0) AS tx,
          COALESCE((SELECT SUM(total) FROM transactions
                     WHERE outlet_id = ${outletId} AND status != 'void'
                       AND business_date BETWEEN ${awal7} AND ${kemarin}), 0) AS omzet7,
          COALESCE((SELECT COUNT(DISTINCT business_date) FROM transactions
                     WHERE outlet_id = ${outletId} AND status != 'void'
                       AND business_date BETWEEN ${awal7} AND ${kemarin}), 0) AS hari7
      `)!;
      if (r.tx === 0) {
        return {
          ...dasar,
          jawaban: "Belum ada satu pun penjualan tercatat hari ini.",
          rincian: null,
          nada: "netral",
          aksi: barang ? "Buka kasir" : "Terima pesanan",
          href: barang ? "/kasir" : "/pesanan",
        };
      }
      const rata = r.hari7 > 0 ? r.omzet7 / r.hari7 : 0;
      const beda = rata > 0 ? Math.round(((r.omzet - rata) / rata) * 100) : 0;
      return {
        ...dasar,
        jawaban: `${rupiah(r.omzet)} dari ${r.tx} transaksi.`,
        rincian:
          rata === 0
            ? "Belum ada pembanding sepekan terakhir."
            : beda >= 10
              ? `${beda}% di atas rata-rata sepekan (${rupiah(rata)}/hari).`
              : beda <= -10
                ? `${Math.abs(beda)}% di bawah rata-rata sepekan (${rupiah(rata)}/hari).`
                : `Setara rata-rata sepekan (${rupiah(rata)}/hari).`,
        nada: beda <= -25 ? "waspada" : beda >= 10 ? "baik" : "netral",
        aksi: "Lihat laporan",
        href: "/laporan",
      };
    }

    case "untung-hari-ini": {
      const r = db.get<{ omzet: number; laba: number; beban: number }>(sql`
        SELECT
          COALESCE((SELECT SUM(total) FROM transactions
                     WHERE outlet_id = ${outletId} AND status != 'void'
                       AND business_date = ${hariIni}), 0) AS omzet,
          COALESCE((SELECT SUM(${LABA}) FROM transactions t
                     WHERE t.outlet_id = ${outletId} AND t.status != 'void'
                       AND t.business_date = ${hariIni}), 0) AS laba,
          COALESCE((SELECT SUM(amount) FROM expenses
                     WHERE outlet_id = ${outletId} AND business_date = ${hariIni}), 0) AS beban
      `)!;
      if (r.omzet === 0) {
        return {
          ...dasar,
          jawaban: "Belum ada penjualan hari ini, jadi belum ada untung.",
          rincian: r.beban > 0 ? `Beban yang sudah dicatat hari ini ${rupiah(r.beban)}.` : null,
          nada: "netral",
          aksi: barang ? "Buka kasir" : "Terima pesanan",
          href: barang ? "/kasir" : "/pesanan",
        };
      }
      const bersih = r.laba - r.beban;
      return {
        ...dasar,
        jawaban: `Laba kotor ${rupiah(r.laba)} dari omzet ${rupiah(r.omzet)}.`,
        rincian:
          r.beban > 0
            ? `Setelah beban hari ini ${rupiah(r.beban)}, sisa ${rupiah(bersih)}. Margin kotor ${persen(r.laba, r.omzet)}%.`
            : `Margin kotor ${persen(r.laba, r.omzet)}%. Beban rutin hari ini belum dicatat.`,
        nada: bersih <= 0 ? "bahaya" : persen(r.laba, r.omzet) < 10 ? "waspada" : "baik",
        aksi: "Lihat laporan",
        href: "/laporan",
      };
    }

    case "bulan-ini": {
      const bulanLalu = `${tambahHari(awalBulan, -1).slice(0, 7)}`;
      const sampaiLalu = `${bulanLalu}-${hariIni.slice(8, 10)}`;
      const r = db.get<{ ini: number; lalu: number }>(sql`
        SELECT
          COALESCE((SELECT SUM(total) FROM transactions
                     WHERE outlet_id = ${outletId} AND status != 'void'
                       AND business_date BETWEEN ${awalBulan} AND ${hariIni}), 0) AS ini,
          COALESCE((SELECT SUM(total) FROM transactions
                     WHERE outlet_id = ${outletId} AND status != 'void'
                       AND business_date BETWEEN ${bulanLalu + "-01"} AND ${sampaiLalu}), 0) AS lalu
      `)!;
      if (r.lalu === 0) {
        return {
          ...dasar,
          jawaban: `Bulan ini ${rupiah(r.ini)}.`,
          rincian: "Belum ada catatan di periode yang sama bulan lalu untuk dibandingkan.",
          nada: "netral",
          aksi: "Lihat laporan",
          href: "/laporan",
        };
      }
      const beda = Math.round(((r.ini - r.lalu) / r.lalu) * 100);
      return {
        ...dasar,
        jawaban:
          beda >= 0
            ? `Naik ${beda}% dibanding periode yang sama bulan lalu.`
            : `Turun ${Math.abs(beda)}% dibanding periode yang sama bulan lalu.`,
        rincian: `${rupiah(r.ini)} bulan ini, ${rupiah(r.lalu)} bulan lalu (sampai tanggal yang sama).`,
        nada: beda >= 10 ? "baik" : beda <= -10 ? "waspada" : "netral",
        aksi: "Lihat laporan",
        href: "/laporan",
      };
    }

    case "jam-ramai": {
      const rows = db.all<{ jam: string; n: number; nilai: number }>(sql`
        SELECT strftime('%H', occurred_at / 1000, 'unixepoch', 'localtime') AS jam,
               COUNT(*) AS n, SUM(total) AS nilai
          FROM transactions
         WHERE outlet_id = ${outletId} AND status != 'void'
           AND business_date BETWEEN ${awal30} AND ${hariIni}
         GROUP BY jam ORDER BY n DESC LIMIT 3
      `);
      if (rows.length === 0) {
        return {
          ...dasar,
          jawaban: "Belum ada transaksi dalam 30 hari terakhir.",
          rincian: null,
          nada: "netral",
          aksi: null,
          href: null,
        };
      }
      const [satu, ...sisa] = rows;
      return {
        ...dasar,
        jawaban: `Paling ramai jam ${satu.jam}.00 — ${satu.n} transaksi dalam 30 hari terakhir.`,
        rincian:
          sisa.length > 0
            ? `Ramai berikutnya: ${sisa.map((r) => `jam ${r.jam}.00 (${r.n}×)`).join(" · ")}.`
            : `Nilainya ${rupiah(satu.nilai)}.`,
        nada: "netral",
        aksi: "Lihat laporan",
        href: "/laporan",
      };
    }

    case "terlaris": {
      const rows = db.all<{ nama: string; qty: number; nilai: number }>(sql`
        SELECT i.name_snapshot AS nama, SUM(i.qty) AS qty, SUM(i.line_total) AS nilai
          FROM transaction_items i
          JOIN transactions t ON t.id = i.transaction_id
         WHERE t.outlet_id = ${outletId} AND t.status != 'void'
           AND t.business_date BETWEEN ${awal30} AND ${hariIni}
         GROUP BY i.name_snapshot
         ORDER BY nilai DESC LIMIT 3
      `);
      if (rows.length === 0) {
        return {
          ...dasar,
          jawaban: "Belum ada penjualan dalam 30 hari terakhir.",
          rincian: null,
          nada: "netral",
          aksi: null,
          href: null,
        };
      }
      const [satu, ...sisa] = rows;
      return {
        ...dasar,
        jawaban: `${satu.nama} — ${satu.qty} terjual, ${rupiah(satu.nilai)} dalam 30 hari.`,
        rincian:
          sisa.length > 0
            ? `Berikutnya: ${sisa.map((r) => `${r.nama} (${rupiah(r.nilai)})`).join(" · ")}.`
            : null,
        nada: "baik",
        aksi: barang ? "Lihat produk" : "Lihat layanan",
        href: barang ? "/produk" : "/layanan",
      };
    }

    case "stok-menipis": {
      const r = db.get<{ habis: number; menipis: number }>(sql`
        SELECT COALESCE(SUM(stock <= 0), 0) AS habis,
               COALESCE(SUM(stock > 0 AND stock <= low_stock_threshold), 0) AS menipis
          FROM products
         WHERE outlet_id = ${outletId} AND is_active = 1 AND lacak_stok = 1
      `)!;
      if (r.habis + r.menipis === 0) {
        return {
          ...dasar,
          jawaban: "Tidak ada yang perlu dikulakan — semua stok masih di atas batas minimum.",
          rincian: null,
          nada: "baik",
          aksi: null,
          href: null,
        };
      }
      const contoh = db.all<{ name: string; stock: number; unit: string }>(sql`
        SELECT name, stock, unit FROM products
         WHERE outlet_id = ${outletId} AND is_active = 1 AND lacak_stok = 1
           AND stock <= low_stock_threshold
         ORDER BY stock ASC, name COLLATE NOCASE LIMIT 5
      `);
      return {
        ...dasar,
        jawaban:
          r.habis > 0
            ? `${r.habis} barang sudah habis, ${r.menipis} menipis.`
            : `${r.menipis} barang sudah menyentuh batas minimum.`,
        rincian: contoh.map((p) => `${p.name} (sisa ${p.stock} ${p.unit})`).join(" · "),
        nada: r.habis > 0 ? "bahaya" : "waspada",
        aksi: "Catat pembelian",
        href: "/pembelian",
      };
    }

    case "stok-mati": {
      const r = db.get<{ jumlah: number; nilai: number }>(sql`
        SELECT COUNT(*) AS jumlah, COALESCE(SUM(p.stock * p.cost), 0) AS nilai
          FROM products p
         WHERE p.outlet_id = ${outletId} AND p.is_active = 1 AND p.stock > 0
           AND NOT EXISTS (
             SELECT 1 FROM transaction_items i
               JOIN transactions t ON t.id = i.transaction_id
              WHERE i.product_id = p.id AND t.status != 'void'
                AND t.business_date >= ${awal30})
      `)!;
      if (r.jumlah === 0) {
        return {
          ...dasar,
          jawaban: "Semua barang yang ada stoknya pernah terjual dalam 30 hari terakhir.",
          rincian: null,
          nada: "baik",
          aksi: null,
          href: null,
        };
      }
      const contoh = db.all<{ name: string; nilai: number }>(sql`
        SELECT p.name AS name, p.stock * p.cost AS nilai FROM products p
         WHERE p.outlet_id = ${outletId} AND p.is_active = 1 AND p.stock > 0
           AND NOT EXISTS (
             SELECT 1 FROM transaction_items i
               JOIN transactions t ON t.id = i.transaction_id
              WHERE i.product_id = p.id AND t.status != 'void'
                AND t.business_date >= ${awal30})
         ORDER BY nilai DESC LIMIT 3
      `);
      return {
        ...dasar,
        jawaban: `${r.jumlah} barang belum terjual sama sekali dalam 30 hari.`,
        rincian: `Modal mengendap ${rupiah(r.nilai)} — ${contoh
          .map((c) => `${c.name} (${rupiah(c.nilai)})`)
          .join(" · ")}.`,
        nada: "waspada",
        aksi: "Lihat produk",
        href: "/produk",
      };
    }

    case "nilai-stok": {
      const r = db.get<{ produk: number; nilaiProduk: number; bahan: number }>(sql`
        SELECT
          (SELECT COUNT(*) FROM products
            WHERE outlet_id = ${outletId} AND is_active = 1 AND stock > 0) AS produk,
          COALESCE((SELECT SUM(stock * cost) FROM products
                     WHERE outlet_id = ${outletId} AND is_active = 1), 0) AS nilaiProduk,
          COALESCE((SELECT SUM(stock * cost_per_unit_milli) / 1000
                      FROM materials WHERE outlet_id = ${outletId} AND is_active = 1), 0) AS bahan
      `)!;
      return {
        ...dasar,
        jawaban: `${rupiah(r.nilaiProduk + r.bahan)} tertanam di persediaan.`,
        rincian:
          r.bahan > 0
            ? `${rupiah(r.nilaiProduk)} di ${r.produk} produk siap jual, ${rupiah(r.bahan)} di bahan baku.`
            : `Tersebar di ${r.produk} produk yang masih ada stoknya.`,
        nada: "netral",
        aksi: "Lihat persediaan",
        href: "/persediaan",
      };
    }

    case "kasbon": {
      const r = db.get<{ sisa: number; orang: number; telat: number; nilaiTelat: number }>(sql`
        SELECT
          COALESCE(SUM(remaining), 0) AS sisa,
          COUNT(DISTINCT customer_id) AS orang,
          COALESCE(SUM(due_date IS NOT NULL AND due_date < ${hariIni}), 0) AS telat,
          COALESCE(SUM(CASE WHEN due_date IS NOT NULL AND due_date < ${hariIni}
                            THEN remaining ELSE 0 END), 0) AS nilaiTelat
          FROM debts
         WHERE outlet_id = ${outletId} AND status IN ('open', 'partial')
      `)!;
      if (r.sisa === 0) {
        return {
          ...dasar,
          jawaban: "Tidak ada kasbon yang belum lunas. Bersih.",
          rincian: null,
          nada: "baik",
          aksi: null,
          href: null,
        };
      }
      const teratas = db.all<{ nama: string; sisa: number }>(sql`
        SELECT c.name AS nama, SUM(d.remaining) AS sisa
          FROM debts d JOIN customers c ON c.id = d.customer_id
         WHERE d.outlet_id = ${outletId} AND d.status IN ('open', 'partial')
         GROUP BY c.id ORDER BY sisa DESC LIMIT 3
      `);
      return {
        ...dasar,
        jawaban: `${rupiah(r.sisa)} tersebar di ${r.orang} pelanggan.`,
        rincian: `${
          r.telat > 0 ? `${r.telat} kasbon sudah lewat jatuh tempo (${rupiah(r.nilaiTelat)}). ` : ""
        }Terbesar: ${teratas.map((t) => `${t.nama} ${rupiah(t.sisa)}`).join(" · ")}.`,
        nada: r.telat > 0 ? "bahaya" : "waspada",
        aksi: "Tagih lewat WhatsApp",
        href: "/kasbon",
      };
    }

    case "hutang-supplier": {
      const r = db.get<{ sisa: number; nota: number; telat: number }>(sql`
        SELECT COALESCE(SUM(total - paid_amount), 0) AS sisa,
               COUNT(*) AS nota,
               COALESCE(SUM(due_date IS NOT NULL AND due_date < ${hariIni}), 0) AS telat
          FROM purchases
         WHERE outlet_id = ${outletId} AND total > paid_amount
      `)!;
      if (r.sisa === 0) {
        return {
          ...dasar,
          jawaban: "Tidak ada nota pembelian yang belum lunas.",
          rincian: null,
          nada: "baik",
          aksi: null,
          href: null,
        };
      }
      return {
        ...dasar,
        jawaban: `${r.nota} nota belum lunas, sisa ${rupiah(r.sisa)}.`,
        rincian:
          r.telat > 0
            ? `${r.telat} di antaranya sudah lewat jatuh tempo.`
            : "Semuanya masih dalam tenggat.",
        nada: r.telat > 0 ? "bahaya" : "waspada",
        aksi: "Lihat pembelian",
        href: "/pembelian",
      };
    }

    case "kas": {
      /**
       * Saldo TIDAK disimpan sebagai kolom — dirakit dari saldo awal plus
       * seluruh mutasi (ADR-002), sama seperti halaman Kas & Bank. Dipakai
       * ulang di sini supaya angkanya tidak mungkin berbeda.
       */
      const akun = await getSaldoAkun(outletId, hariIni, hariIni);
      const total = akun.reduce((a, b) => a + b.saldoAkhir, 0);
      const minus = akun.filter((a) => a.saldoAkhir < 0);
      return {
        ...dasar,
        jawaban: `${rupiah(total)} di ${akun.length} akun kas.`,
        rincian:
          akun.map((a) => `${a.nama} ${rupiah(a.saldoAkhir)}`).join(" · ") +
          (minus.length > 0 ? " — ada saldo minus, periksa pencatatannya." : ""),
        nada: minus.length > 0 ? "waspada" : total > 0 ? "baik" : "netral",
        aksi: "Lihat kas & bank",
        href: "/kas",
      };
    }

    case "beban-bulan": {
      const r = db.get<{ bulan: number; jumlah: number; lalu: number }>(sql`
        SELECT
          COALESCE((SELECT SUM(amount) FROM expenses
                     WHERE outlet_id = ${outletId}
                       AND business_date BETWEEN ${awalBulan} AND ${hariIni}), 0) AS bulan,
          COALESCE((SELECT COUNT(*) FROM expenses
                     WHERE outlet_id = ${outletId}
                       AND business_date BETWEEN ${awalBulan} AND ${hariIni}), 0) AS jumlah,
          COALESCE((SELECT SUM(${LABA}) FROM transactions t
                     WHERE t.outlet_id = ${outletId} AND t.status != 'void'
                       AND t.business_date BETWEEN ${awalBulan} AND ${hariIni}), 0) AS lalu
      `)!;
      const teratas = db.all<{ kategori: string; nilai: number }>(sql`
        SELECT category AS kategori, SUM(amount) AS nilai FROM expenses
         WHERE outlet_id = ${outletId} AND business_date BETWEEN ${awalBulan} AND ${hariIni}
         GROUP BY category ORDER BY nilai DESC LIMIT 3
      `);
      if (r.jumlah === 0) {
        return {
          ...dasar,
          jawaban: "Belum ada beban yang dicatat bulan ini.",
          rincian: "Sewa, listrik, dan gaji yang belum dicatat membuat laba terlihat lebih besar dari yang sebenarnya.",
          nada: "waspada",
          aksi: "Catat beban",
          href: "/beban",
        };
      }
      return {
        ...dasar,
        jawaban: `${rupiah(r.bulan)} dari ${r.jumlah} catatan beban bulan ini.`,
        rincian: `Terbesar: ${teratas
          .map((t) => `${t.kategori} ${rupiah(t.nilai)}`)
          .join(" · ")}. Laba kotor bulan ini ${rupiah(r.lalu)}.`,
        nada: r.bulan > r.lalu ? "bahaya" : r.bulan > r.lalu * 0.7 ? "waspada" : "netral",
        aksi: "Lihat beban",
        href: "/beban",
      };
    }

    case "pelanggan-setia": {
      const rows = db.all<{ nama: string; n: number; nilai: number }>(sql`
        SELECT c.name AS nama, COUNT(*) AS n, SUM(t.total) AS nilai
          FROM transactions t JOIN customers c ON c.id = t.customer_id
         WHERE t.outlet_id = ${outletId} AND t.status != 'void'
           AND t.business_date BETWEEN ${awal30} AND ${hariIni}
         GROUP BY c.id ORDER BY n DESC, nilai DESC LIMIT 3
      `);
      if (rows.length === 0) {
        return {
          ...dasar,
          jawaban: "Belum ada transaksi yang tercatat atas nama pelanggan dalam 30 hari.",
          rincian: "Isi nama pembeli di layar bayar supaya riwayat belanjanya terkumpul.",
          nada: "netral",
          aksi: "Lihat pelanggan",
          href: "/pelanggan",
        };
      }
      const [satu, ...sisa] = rows;
      return {
        ...dasar,
        jawaban: `${satu.nama} — ${satu.n}× belanja, total ${rupiah(satu.nilai)} dalam 30 hari.`,
        rincian:
          sisa.length > 0
            ? `Berikutnya: ${sisa.map((r) => `${r.nama} (${r.n}×)`).join(" · ")}.`
            : "Pertimbangkan memberinya diskon langganan.",
        nada: "baik",
        aksi: "Lihat pelanggan",
        href: "/pelanggan",
      };
    }

    case "promo-jalan": {
      const rows = db.all<{ nama: string; diskonBp: number; tipe: string; selesai: string | null }>(sql`
        SELECT nama, diskon_bp AS diskonBp, tipe, selesai FROM promos
         WHERE outlet_id = ${outletId} AND aktif = 1
           AND mulai <= ${hariIni} AND (selesai IS NULL OR selesai >= ${hariIni})
         ORDER BY diskon_bp DESC
      `);
      if (rows.length === 0) {
        return {
          ...dasar,
          jawaban: "Tidak ada promo yang sedang berjalan hari ini.",
          rincian: null,
          nada: "netral",
          aksi: "Buat promo",
          href: "/promo",
        };
      }
      return {
        ...dasar,
        jawaban: `${rows.length} promo sedang berjalan.`,
        rincian: rows
          .map(
            (r) =>
              `${r.nama} −${persenDiskon(r.diskonBp)} (${
                r.tipe === "semua" ? "semua barang" : r.tipe === "kategori" ? "per kategori" : "produk pilihan"
              }${r.selesai ? `, sampai ${r.selesai.split("-").reverse().join("/")}` : ""})`,
          )
          .join(" · "),
        nada: "netral",
        aksi: "Atur promo",
        href: "/promo",
      };
    }

    case "antrean": {
      const r = db.get<{ masuk: number; dikerjakan: number; selesai: number; telat: number }>(sql`
        SELECT
          COALESCE(SUM(status = 'masuk'), 0) AS masuk,
          COALESCE(SUM(status = 'dikerjakan'), 0) AS dikerjakan,
          COALESCE(SUM(status = 'selesai'), 0) AS selesai,
          COALESCE(SUM(status IN ('masuk','dikerjakan') AND janji_selesai IS NOT NULL
                       AND janji_selesai < ${hariIni}), 0) AS telat
          FROM service_orders WHERE outlet_id = ${outletId}
      `)!;
      if (r.masuk + r.dikerjakan + r.selesai === 0) {
        return {
          ...dasar,
          jawaban: "Tidak ada pekerjaan yang menggantung.",
          rincian: null,
          nada: "baik",
          aksi: null,
          href: null,
        };
      }
      return {
        ...dasar,
        jawaban: `${r.dikerjakan} sedang dikerjakan, ${r.masuk} baru masuk, ${r.selesai} selesai belum diambil.`,
        rincian:
          r.telat > 0
            ? `${r.telat} pesanan sudah lewat tanggal janji — kabari pelanggannya sebelum ditanya.`
            : "Semuanya masih dalam tenggat janji.",
        nada: r.telat > 0 ? "bahaya" : "netral",
        aksi: "Buka papan antrean",
        href: "/pesanan",
      };
    }

    default:
      return {
        ...dasar,
        jawaban: "Pertanyaan itu belum saya kenali.",
        rincian: null,
        nada: "netral",
        aksi: null,
        href: null,
      };
  }
}
