import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import { tambahHari } from "@/lib/date";
import { formatRupiah } from "@/lib/money";
import { punyaBarang, punyaJasa, type JenisUsaha } from "@/lib/usaha";

/**
 * "Yang mungkin Anda tanyakan" — jawaban berkalimat yang dirakit dari data
 * outlet sendiri, tanpa model bahasa.
 *
 * Bedanya dengan Radar (queries/radar.ts): Radar selalu enam kartu yang sama
 * berisi satu angka. Modul ini memilih pertanyaan MANA yang layak muncul hari
 * ini. Tiap pendeteksi hanya bersuara kalau kondisinya memang terjadi, lalu
 * memberi skor mendesak. Akibatnya dua outlet yang berbeda — dan outlet yang
 * sama di hari yang berbeda — mendapat daftar yang berlainan.
 *
 * Kalimatnya template, tapi angka, nama, dan pilihan pertanyaannya dari
 * database. Itu sengaja: jawaban yang salah karena "dikarang" jauh lebih
 * berbahaya daripada jawaban yang kaku, karena ini uang orang.
 */

export type NadaTanya = "baik" | "netral" | "waspada" | "bahaya";

export type ButirTanya = {
  kunci: string;
  pertanyaan: string;
  jawaban: string;
  /** Baris pendukung: rincian, nama, atau perbandingan. Boleh kosong. */
  rincian: string | null;
  nada: NadaTanya;
  aksi: string | null;
  href: string | null;
};

type Kandidat = ButirTanya & { skor: number };

const JUMLAH_TAMPIL = 6;

const rupiah = (n: number) => formatRupiah(Math.round(n));
const persenBulat = (bagian: number, dari: number) =>
  dari === 0 ? 0 : Math.round((bagian / dari) * 100);

export async function getPertanyaanCerdas(
  outletId: string,
  hariIni: string,
  jenisUsaha: JenisUsaha | null,
): Promise<ButirTanya[]> {
  const denganBarang = punyaBarang(jenisUsaha);
  const denganJasa = punyaJasa(jenisUsaha);
  const awal7 = tambahHari(hariIni, -6);
  const awal30 = tambahHari(hariIni, -29);
  const kemarin = tambahHari(hariIni, -1);
  const awalBulan = `${hariIni.slice(0, 7)}-01`;

  const kandidat: Kandidat[] = [];
  const tambah = (k: Kandidat) => kandidat.push(k);

  /* ------------------------------------------------ angka pokok */

  const inti = db.get<{
    omzetHariIni: number;
    txHariIni: number;
    labaHariIni: number;
    omzetKemarin: number;
    omzet7: number;
    hariAda7: number;
    omzetBulan: number;
  }>(sql`
    SELECT
      COALESCE((SELECT SUM(total) FROM transactions
                 WHERE outlet_id = ${outletId} AND status != 'void'
                   AND business_date = ${hariIni}), 0) AS omzetHariIni,
      COALESCE((SELECT COUNT(*) FROM transactions
                 WHERE outlet_id = ${outletId} AND status != 'void'
                   AND business_date = ${hariIni}), 0) AS txHariIni,
      COALESCE((SELECT SUM(
                  (SELECT COALESCE(SUM(i.line_total - i.cost_snapshot * i.qty), 0)
                     FROM transaction_items i WHERE i.transaction_id = t.id)
                  - t.discount)
                  FROM transactions t
                 WHERE t.outlet_id = ${outletId} AND t.status != 'void'
                   AND t.business_date = ${hariIni}), 0) AS labaHariIni,
      COALESCE((SELECT SUM(total) FROM transactions
                 WHERE outlet_id = ${outletId} AND status != 'void'
                   AND business_date = ${kemarin}), 0) AS omzetKemarin,
      COALESCE((SELECT SUM(total) FROM transactions
                 WHERE outlet_id = ${outletId} AND status != 'void'
                   AND business_date BETWEEN ${awal7} AND ${kemarin}), 0) AS omzet7,
      COALESCE((SELECT COUNT(DISTINCT business_date) FROM transactions
                 WHERE outlet_id = ${outletId} AND status != 'void'
                   AND business_date BETWEEN ${awal7} AND ${kemarin}), 0) AS hariAda7,
      COALESCE((SELECT SUM(total) FROM transactions
                 WHERE outlet_id = ${outletId} AND status != 'void'
                   AND business_date BETWEEN ${awalBulan} AND ${hariIni}), 0) AS omzetBulan
  `)!;

  const rata7 = inti.hariAda7 > 0 ? inti.omzet7 / inti.hariAda7 : 0;

  /* 1. Penjualan hari ini — selalu muncul, nadanya ikut pencapaian. */
  {
    const selisih = rata7 > 0 ? Math.round(((inti.omzetHariIni - rata7) / rata7) * 100) : 0;
    const bandingan =
      rata7 === 0
        ? "Belum ada pembanding sepekan terakhir."
        : selisih >= 10
          ? `${selisih}% di atas rata-rata sepekan (${rupiah(rata7)}/hari).`
          : selisih <= -10
            ? `${Math.abs(selisih)}% di bawah rata-rata sepekan (${rupiah(rata7)}/hari).`
            : `Setara rata-rata sepekan (${rupiah(rata7)}/hari).`;

    tambah({
      kunci: "penjualan-hari-ini",
      pertanyaan: denganBarang
        ? "Hari ini sudah laku berapa?"
        : "Hari ini masuk berapa pesanan?",
      jawaban:
        inti.txHariIni === 0
          ? "Belum ada satu pun tercatat hari ini."
          : `${rupiah(inti.omzetHariIni)} dari ${inti.txHariIni} ${denganBarang ? "transaksi" : "pesanan"}.`,
      rincian: inti.txHariIni === 0 ? null : bandingan,
      nada:
        inti.txHariIni === 0 ? "netral" : selisih <= -25 ? "waspada" : selisih >= 10 ? "baik" : "netral",
      aksi: inti.txHariIni === 0 ? (denganBarang ? "Buka kasir" : "Terima pesanan") : null,
      href: denganBarang ? "/kasir" : "/pesanan",
      skor: inti.txHariIni === 0 ? 72 : Math.abs(selisih) >= 25 ? 80 : 60,
    });
  }

  /* 2. Untung hari ini — pertanyaan yang paling sering ditanya pemilik. */
  if (inti.txHariIni > 0) {
    const margin = persenBulat(inti.labaHariIni, inti.omzetHariIni);
    tambah({
      kunci: "untung-hari-ini",
      pertanyaan: "Untungnya berapa?",
      jawaban: `${rupiah(inti.labaHariIni)} dari omzet ${rupiah(inti.omzetHariIni)}.`,
      rincian:
        inti.labaHariIni <= 0
          ? "Belum menutup modal — periksa harga jual atau diskon hari ini."
          : `Margin kotor ${margin}%. Belum dikurangi beban rutin.`,
      nada: inti.labaHariIni <= 0 ? "bahaya" : margin < 10 ? "waspada" : "baik",
      aksi: "Lihat laporan",
      href: "/laporan",
      skor: inti.labaHariIni <= 0 ? 95 : margin < 10 ? 78 : 62,
    });
  }

  /* ------------------------------------------------ khusus barang */

  if (denganBarang) {
    /* 3. Barang yang harus dikulakan. */
    const stok = db.get<{ habis: number; menipis: number }>(sql`
      SELECT
        COALESCE(SUM(stock <= 0), 0) AS habis,
        COALESCE(SUM(stock > 0 AND stock <= low_stock_threshold), 0) AS menipis
        FROM products
       WHERE outlet_id = ${outletId} AND is_active = 1 AND lacak_stok = 1
    `)!;

    if (stok.habis + stok.menipis > 0) {
      const contoh = db.all<{ name: string; stock: number }>(sql`
        SELECT name, stock FROM products
         WHERE outlet_id = ${outletId} AND is_active = 1 AND lacak_stok = 1
           AND stock <= low_stock_threshold
         ORDER BY stock ASC, name COLLATE NOCASE
         LIMIT 3
      `);
      tambah({
        kunci: "harus-kulakan",
        pertanyaan: "Apa yang harus saya kulakan?",
        jawaban:
          stok.habis > 0
            ? `${stok.habis} barang sudah habis, ${stok.menipis} menipis.`
            : `${stok.menipis} barang sudah menyentuh batas minimum.`,
        rincian: contoh
          .map((p) => `${p.name} (sisa ${p.stock})`)
          .join(" · "),
        nada: stok.habis > 0 ? "bahaya" : "waspada",
        aksi: "Catat pembelian",
        href: "/pembelian",
        skor: stok.habis > 0 ? 92 : 74,
      });
    }

    /* 4. Barang terlaris sepekan. */
    const laris = db.get<{ nama: string; qty: number; nilai: number }>(sql`
      SELECT i.name_snapshot AS nama, SUM(i.qty) AS qty, SUM(i.line_total) AS nilai
        FROM transaction_items i
        JOIN transactions t ON t.id = i.transaction_id
       WHERE t.outlet_id = ${outletId} AND t.status != 'void'
         AND t.business_date BETWEEN ${awal7} AND ${hariIni}
         AND i.product_id IS NOT NULL
       GROUP BY i.name_snapshot
       ORDER BY qty DESC
       LIMIT 1
    `);
    if (laris) {
      tambah({
        kunci: "terlaris",
        pertanyaan: "Barang apa yang paling laku minggu ini?",
        jawaban: `${laris.nama} — ${laris.qty} terjual.`,
        rincian: `Menyumbang ${rupiah(laris.nilai)} sepekan terakhir.`,
        nada: "baik",
        aksi: "Lihat produk",
        href: "/produk",
        skor: 52,
      });
    }

    /* 5. Barang yang tidak bergerak — modal yang diam. */
    const mati = db.get<{ jumlah: number; nilai: number }>(sql`
      SELECT COUNT(*) AS jumlah, COALESCE(SUM(p.stock * p.cost), 0) AS nilai
        FROM products p
       WHERE p.outlet_id = ${outletId} AND p.is_active = 1 AND p.stock > 0
         AND NOT EXISTS (
           SELECT 1 FROM transaction_items i
             JOIN transactions t ON t.id = i.transaction_id
            WHERE i.product_id = p.id AND t.status != 'void'
              AND t.business_date >= ${awal30})
    `)!;
    if (mati.jumlah > 0 && mati.nilai > 0) {
      tambah({
        kunci: "stok-mati",
        pertanyaan: "Ada barang yang tidak laku-laku?",
        jawaban: `${mati.jumlah} barang belum terjual sama sekali dalam 30 hari.`,
        rincian: `Modal yang mengendap di situ ${rupiah(mati.nilai)}.`,
        nada: "waspada",
        aksi: "Lihat persediaan",
        href: "/persediaan",
        skor: 66,
      });
    }
  }

  /* -------------------------------------------------- khusus jasa */

  if (denganJasa) {
    const antre = db.get<{
      masuk: number;
      dikerjakan: number;
      selesai: number;
      telat: number;
      lamaTelat: number;
    }>(sql`
      SELECT
        COALESCE(SUM(status = 'masuk'), 0)       AS masuk,
        COALESCE(SUM(status = 'dikerjakan'), 0)  AS dikerjakan,
        COALESCE(SUM(status = 'selesai'), 0)     AS selesai,
        COALESCE(SUM(status IN ('masuk','dikerjakan')
                     AND janji_selesai IS NOT NULL
                     AND janji_selesai < ${hariIni}), 0) AS telat,
        COALESCE(MAX(CASE WHEN status IN ('masuk','dikerjakan')
                            AND janji_selesai IS NOT NULL
                            AND janji_selesai < ${hariIni}
                          THEN julianday(${hariIni}) - julianday(janji_selesai)
                     END), 0) AS lamaTelat
        FROM service_orders
       WHERE outlet_id = ${outletId}
    `)!;

    /* 6. Pekerjaan yang lewat janji — paling mendesak di usaha jasa. */
    if (antre.telat > 0) {
      tambah({
        kunci: "pesanan-telat",
        pertanyaan: "Ada pesanan yang lewat janji?",
        jawaban: `${antre.telat} pesanan sudah lewat tanggal janji selesai.`,
        rincian: `Yang paling lama telat ${Math.round(antre.lamaTelat)} hari. Kabari pelanggannya sebelum ditanya.`,
        nada: "bahaya",
        aksi: "Buka papan antrean",
        href: "/pesanan",
        skor: 98,
      });
    }

    /* 7. Beban kerja yang sedang berjalan. */
    if (antre.masuk + antre.dikerjakan > 0) {
      tambah({
        kunci: "antrean-berjalan",
        pertanyaan: "Berapa pekerjaan yang belum selesai?",
        jawaban: `${antre.dikerjakan} sedang dikerjakan, ${antre.masuk} baru masuk.`,
        rincian: "Papan antrean menampilkan urutannya beserta janji selesainya.",
        nada: antre.masuk + antre.dikerjakan > 10 ? "waspada" : "netral",
        aksi: "Buka papan antrean",
        href: "/pesanan",
        skor: 70,
      });
    }

    /* 8. Sudah selesai tapi belum diambil — uang yang tertahan di rak. */
    if (antre.selesai > 0) {
      const nilai = db.get<{ n: number }>(sql`
        SELECT COALESCE(SUM(d.remaining), 0) AS n
          FROM service_orders o
          JOIN debts d ON d.transaction_id = o.transaction_id
         WHERE o.outlet_id = ${outletId} AND o.status = 'selesai'
      `)!;
      tambah({
        kunci: "siap-diambil",
        pertanyaan: "Mana yang sudah bisa diambil pelanggan?",
        jawaban: `${antre.selesai} pesanan selesai tapi belum diambil.`,
        rincian:
          nilai.n > 0
            ? `Masih ada ${rupiah(nilai.n)} yang belum dilunasi di pesanan itu.`
            : "Semuanya sudah lunas, tinggal diserahkan.",
        nada: nilai.n > 0 ? "waspada" : "netral",
        aksi: "Hubungi pelanggan",
        href: "/pesanan",
        skor: nilai.n > 0 ? 82 : 58,
      });
    }

    /* 9. Layanan yang paling dicari. */
    const layananLaris = db.get<{ nama: string; n: number; nilai: number }>(sql`
      SELECT i.name_snapshot AS nama, COUNT(*) AS n, SUM(i.line_total) AS nilai
        FROM transaction_items i
        JOIN transactions t ON t.id = i.transaction_id
       WHERE t.outlet_id = ${outletId} AND t.status != 'void'
         AND t.business_date >= ${awal30} AND i.service_id IS NOT NULL
       GROUP BY i.name_snapshot
       ORDER BY nilai DESC
       LIMIT 1
    `);
    if (layananLaris) {
      tambah({
        kunci: "layanan-laris",
        pertanyaan: "Layanan apa yang paling menghasilkan?",
        jawaban: `${layananLaris.nama} — ${layananLaris.n}× dipesan sebulan terakhir.`,
        rincian: `Menyumbang ${rupiah(layananLaris.nilai)}.`,
        nada: "baik",
        aksi: "Lihat layanan",
        href: "/layanan",
        skor: 50,
      });
    }
  }

  /* -------------------------------------------- piutang & hutang */

  const piutang = db.get<{ jumlah: number; sisa: number; tempo: number; sisaTempo: number }>(sql`
    SELECT COUNT(*) AS jumlah, COALESCE(SUM(remaining), 0) AS sisa,
           COALESCE(SUM(due_date IS NOT NULL AND due_date < ${hariIni}), 0) AS tempo,
           COALESCE(SUM(CASE WHEN due_date IS NOT NULL AND due_date < ${hariIni}
                             THEN remaining ELSE 0 END), 0) AS sisaTempo
      FROM debts
     WHERE outlet_id = ${outletId} AND status != 'paid'
  `)!;

  /* 10. Kasbon yang lewat tempo. */
  if (piutang.tempo > 0) {
    const teratas = db.get<{ nama: string; sisa: number }>(sql`
      SELECT c.name AS nama, SUM(d.remaining) AS sisa
        FROM debts d JOIN customers c ON c.id = d.customer_id
       WHERE d.outlet_id = ${outletId} AND d.status != 'paid'
         AND d.due_date IS NOT NULL AND d.due_date < ${hariIni}
       GROUP BY c.id ORDER BY sisa DESC LIMIT 1
    `);
    tambah({
      kunci: "piutang-tempo",
      pertanyaan: "Ada utang pelanggan yang lewat tempo?",
      jawaban: `${piutang.tempo} kasbon lewat jatuh tempo, total ${rupiah(piutang.sisaTempo)}.`,
      rincian: teratas
        ? `Terbesar atas nama ${teratas.nama} — ${rupiah(teratas.sisa)}.`
        : null,
      nada: "bahaya",
      aksi: "Ingatkan lewat WhatsApp",
      href: "/kasbon",
      skor: 94,
    });
  } else if (piutang.jumlah > 0) {
    /* 11. Piutang yang masih sehat. */
    const teratas = db.get<{ nama: string; sisa: number }>(sql`
      SELECT c.name AS nama, SUM(d.remaining) AS sisa
        FROM debts d JOIN customers c ON c.id = d.customer_id
       WHERE d.outlet_id = ${outletId} AND d.status != 'paid'
       GROUP BY c.id ORDER BY sisa DESC LIMIT 1
    `);
    tambah({
      kunci: "piutang",
      pertanyaan: "Uang saya yang masih di orang berapa?",
      jawaban: `${rupiah(piutang.sisa)} tersebar di ${piutang.jumlah} kasbon.`,
      rincian: teratas ? `Paling besar ${teratas.nama} — ${rupiah(teratas.sisa)}.` : null,
      nada: "netral",
      aksi: "Lihat kasbon",
      href: "/kasbon",
      skor: 64,
    });
  }

  /* 12. Hutang ke supplier. */
  const hutang = db.get<{ jumlah: number; sisa: number; tempo: number }>(sql`
    SELECT COUNT(*) AS jumlah, COALESCE(SUM(remaining), 0) AS sisa,
           COALESCE(SUM(due_date IS NOT NULL AND due_date < ${hariIni}), 0) AS tempo
      FROM purchases
     WHERE outlet_id = ${outletId} AND status != 'paid'
  `)!;
  if (hutang.jumlah > 0) {
    tambah({
      kunci: "hutang-supplier",
      pertanyaan: "Saya masih punya hutang ke supplier?",
      jawaban: `${hutang.jumlah} nota belum lunas, sisa ${rupiah(hutang.sisa)}.`,
      rincian:
        hutang.tempo > 0
          ? `${hutang.tempo} di antaranya sudah lewat jatuh tempo.`
          : "Belum ada yang lewat jatuh tempo.",
      nada: hutang.tempo > 0 ? "bahaya" : "waspada",
      aksi: "Lihat pembelian",
      href: "/pembelian",
      skor: hutang.tempo > 0 ? 90 : 68,
    });
  }

  /* 13. Jam paling ramai — hanya berarti kalau datanya cukup. */
  const jam = db.get<{ jam: number; n: number }>(sql`
    SELECT CAST(strftime('%H', occurred_at / 1000, 'unixepoch', '+7 hours') AS INTEGER) AS jam,
           COUNT(*) AS n
      FROM transactions
     WHERE outlet_id = ${outletId} AND status != 'void'
       AND business_date >= ${awal30}
     GROUP BY jam ORDER BY n DESC LIMIT 1
  `);
  if (jam && jam.n >= 10) {
    tambah({
      kunci: "jam-ramai",
      pertanyaan: "Jam berapa paling ramai?",
      jawaban: `Paling padat sekitar pukul ${String(jam.jam).padStart(2, "0")}.00.`,
      rincian: `${jam.n} ${denganBarang ? "transaksi" : "pesanan"} terjadi di jam itu sebulan terakhir.`,
      nada: "netral",
      aksi: null,
      href: null,
      skor: 40,
    });
  }

  /* 14. Perbandingan bulan berjalan. */
  if (inti.omzetBulan > 0) {
    const tglBulanLalu = tambahHari(`${hariIni.slice(0, 7)}-01`, -1);
    const bulanLalu = db.get<{ n: number }>(sql`
      SELECT COALESCE(SUM(total), 0) AS n FROM transactions
       WHERE outlet_id = ${outletId} AND status != 'void'
         AND business_date BETWEEN ${`${tglBulanLalu.slice(0, 7)}-01`}
                               AND ${`${tglBulanLalu.slice(0, 7)}-${hariIni.slice(8, 10)}`}
    `)!;
    if (bulanLalu.n > 0) {
      const beda = Math.round(((inti.omzetBulan - bulanLalu.n) / bulanLalu.n) * 100);
      tambah({
        kunci: "banding-bulan",
        pertanyaan: "Bulan ini lebih baik dari bulan lalu?",
        jawaban:
          beda >= 0
            ? `Naik ${beda}% dibanding periode yang sama bulan lalu.`
            : `Turun ${Math.abs(beda)}% dibanding periode yang sama bulan lalu.`,
        rincian: `${rupiah(inti.omzetBulan)} bulan ini, ${rupiah(bulanLalu.n)} bulan lalu.`,
        nada: beda >= 0 ? "baik" : beda <= -20 ? "bahaya" : "waspada",
        aksi: "Lihat laporan",
        href: "/laporan",
        skor: Math.abs(beda) >= 20 ? 76 : 48,
      });
    }
  }

  return kandidat
    .sort((a, b) => b.skor - a.skor)
    .slice(0, JUMLAH_TAMPIL)
    .map(({ skor: _skor, ...butir }) => butir);
}
