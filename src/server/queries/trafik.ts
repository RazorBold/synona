import "server-only";

import { sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { businessDate, rentangHari } from "@/lib/date";

/**
 * Laporan trafik halaman publik. Semua angka "orang" dihitung dari
 * `COUNT(DISTINCT pengunjung)` — satu orang yang membuka halaman lima kali
 * tetap satu orang. Angka "klik" dihitung apa adanya.
 *
 * Tidak ada filter outlet: ini data platform. Pemanggilnya WAJIB sudah lolos
 * `bolehLihatTrafik()` — lihat src/app/(app)/trafik/page.tsx.
 *
 * PELANGGAN LAMA vs CALON PELANGGAN
 * Pelanggan lama = pengunjung yang pernah login berhasil (jejak "masuk",
 * kapan pun), KECUALI yang mendaftar di periode yang sedang dilihat — orang
 * itu datang sebagai calon pelanggan, dan login sesudah mendaftar tidak boleh
 * menghapusnya dari corong. Penandaannya berlaku mundur: kunjungan beranda
 * dan klik "Masuk" sebelum login ikut pindah ke pelanggan lama.
 * Sisanya calon pelanggan.
 */

export type Segmen = "calon" | "lama";

export type TahapCorong = {
  kunci: string;
  label: string;
  keterangan: string;
  orang: number;
};

export type TitikTrafik = {
  tanggal: string;
  calon: number;
  lama: number;
  tertarik: number;
  daftar: number;
};

export type BarisTombol = {
  target: string;
  halaman: string;
  klik: number;
  orang: number;
};

export type BarisBagian = { target: string; orang: number };
export type BarisSumber = { sumber: string; orang: number };
export type BarisPerangkat = { perangkat: string; orang: number };

export type LaporanTrafik = {
  dari: string;
  sampai: string;
  segmen: Segmen;
  /** Jumlah orang per segmen — untuk label pilihan segmen. */
  jumlah: Record<Segmen, number>;
  corong: TahapCorong[];
  kunjungan: number;
  totalKlik: number;
  pengunjungBeranda: number;
  harian: TitikTrafik[];
  tombol: BarisTombol[];
  bagian: BarisBagian[];
  sumber: BarisSumber[];
  perangkat: BarisPerangkat[];
};

export async function getLaporanTrafik(
  hari: number,
  segmen: Segmen,
): Promise<LaporanTrafik> {
  const sampai = businessDate();
  const tanggal = rentangHari(sampai, hari);
  const dari = tanggal[0];
  const rentang = sql`tanggal BETWEEN ${dari} AND ${sampai}`;

  const lama = sql`(
    SELECT pengunjung FROM jejak_pengunjung WHERE jenis = 'masuk'
    EXCEPT
    SELECT pengunjung FROM jejak_pengunjung WHERE jenis = 'daftar' AND ${rentang}
  )`;
  const saring: SQL =
    segmen === "lama"
      ? sql`pengunjung IN ${lama}`
      : sql`pengunjung NOT IN ${lama}`;
  const di = sql`${rentang} AND ${saring}`;

  /**
   * Tahap corong dihitung BERTINGKAT: "sampai di tahap ini ATAU lebih jauh".
   * Orang bisa langsung membuka /register tanpa mengklik apa pun (tautan
   * dibagikan di WhatsApp); kalau tiap tahap dihitung lepas, tahap bawah
   * bisa lebih besar dari tahap atasnya ("200% lanjut").
   */
  const bukaDaftar = sql`((jenis = 'lihat' AND halaman = '/register') OR jenis = 'daftar')`;
  const tertarik = sql`(jenis = 'klik' OR ${bukaDaftar})`;
  const bukaMasuk = sql`((jenis = 'lihat' AND halaman = '/masuk') OR jenis = 'masuk')`;

  const jumlahRow = db.get<{ calon: number; lama: number }>(sql`
    SELECT
      COUNT(DISTINCT CASE WHEN pengunjung NOT IN ${lama} THEN pengunjung END) AS calon,
      COUNT(DISTINCT CASE WHEN pengunjung IN ${lama} THEN pengunjung END)     AS lama
    FROM jejak_pengunjung
    WHERE ${rentang}
  `);
  const jumlah = { calon: jumlahRow?.calon ?? 0, lama: jumlahRow?.lama ?? 0 };

  const r =
    db.get<{
      datang: number;
      tertarik: number;
      bukaDaftar: number;
      daftar: number;
      masuk: number;
      bukaMasuk: number;
      kunjungan: number;
      totalKlik: number;
      pengunjungBeranda: number;
    }>(sql`
      SELECT
        COUNT(DISTINCT pengunjung)                                             AS datang,
        COUNT(DISTINCT CASE WHEN ${tertarik} THEN pengunjung END)              AS tertarik,
        COUNT(DISTINCT CASE WHEN ${bukaDaftar} THEN pengunjung END)            AS bukaDaftar,
        COUNT(DISTINCT CASE WHEN jenis = 'daftar' THEN pengunjung END)         AS daftar,
        COUNT(DISTINCT CASE WHEN jenis = 'masuk' THEN pengunjung END)          AS masuk,
        COUNT(DISTINCT CASE WHEN ${bukaMasuk} THEN pengunjung END)             AS bukaMasuk,
        COUNT(DISTINCT CASE WHEN jenis IN ('lihat', 'klik', 'baca')
                            THEN kunjungan END)                                AS kunjungan,
        COUNT(CASE WHEN jenis = 'klik' THEN 1 END)                             AS totalKlik,
        COUNT(DISTINCT CASE WHEN jenis = 'lihat' AND halaman = '/beranda'
                            THEN pengunjung END)                               AS pengunjungBeranda
      FROM jejak_pengunjung
      WHERE ${di}
    `) ?? {
      datang: 0,
      tertarik: 0,
      bukaDaftar: 0,
      daftar: 0,
      masuk: 0,
      bukaMasuk: 0,
      kunjungan: 0,
      totalKlik: 0,
      pengunjungBeranda: 0,
    };

  // Grafik harian selalu menampilkan KEDUA segmen, supaya perbandingannya
  // terlihat apa pun segmen yang sedang dipilih.
  const perHari = db.all<TitikTrafik>(sql`
    SELECT
      tanggal,
      COUNT(DISTINCT CASE WHEN pengunjung NOT IN ${lama} THEN pengunjung END) AS calon,
      COUNT(DISTINCT CASE WHEN pengunjung IN ${lama} THEN pengunjung END)     AS lama,
      COUNT(DISTINCT CASE WHEN ${tertarik} AND pengunjung NOT IN ${lama}
                          THEN pengunjung END)                               AS tertarik,
      COUNT(CASE WHEN jenis = 'daftar' THEN 1 END)                           AS daftar
    FROM jejak_pengunjung
    WHERE ${rentang}
    GROUP BY tanggal
  `);
  const peta = new Map(perHari.map((t) => [t.tanggal, t]));
  const harian = tanggal.map(
    (t) => peta.get(t) ?? { tanggal: t, calon: 0, lama: 0, tertarik: 0, daftar: 0 },
  );

  const tombol = db.all<BarisTombol>(sql`
    SELECT target, halaman, COUNT(*) AS klik, COUNT(DISTINCT pengunjung) AS orang
    FROM jejak_pengunjung
    WHERE ${di} AND jenis = 'klik' AND target IS NOT NULL
    GROUP BY target, halaman
    ORDER BY orang DESC, klik DESC
    LIMIT 15
  `);

  const bagian = db.all<BarisBagian>(sql`
    SELECT target, COUNT(DISTINCT pengunjung) AS orang
    FROM jejak_pengunjung
    WHERE ${di} AND jenis = 'baca' AND target IS NOT NULL
    GROUP BY target
    ORDER BY orang DESC
  `);

  // Sumber diambil dari kunjungan pertama tiap pengunjung di rentang ini,
  // supaya orang yang datang dari Instagram lalu pindah ke /register tidak
  // ikut terhitung "Langsung" di halaman keduanya.
  const sumber = db.all<BarisSumber>(sql`
    WITH pertama AS (
      SELECT pengunjung,
             COALESCE(NULLIF(utm_source, ''), NULLIF(rujukan, ''), 'Langsung') AS sumber,
             ROW_NUMBER() OVER (PARTITION BY pengunjung ORDER BY dibuat_pada) AS urut
      FROM jejak_pengunjung
      WHERE ${di} AND jenis = 'lihat'
    )
    SELECT sumber, COUNT(*) AS orang
    FROM pertama
    WHERE urut = 1
    GROUP BY sumber
    ORDER BY orang DESC
    LIMIT 10
  `);

  const perangkat = db.all<BarisPerangkat>(sql`
    SELECT COALESCE(perangkat, 'lainnya') AS perangkat,
           COUNT(DISTINCT pengunjung) AS orang
    FROM jejak_pengunjung
    WHERE ${di} AND jenis = 'lihat'
    GROUP BY 1
    ORDER BY orang DESC
  `);

  const corong: TahapCorong[] =
    segmen === "calon"
      ? [
          {
            kunci: "datang",
            label: "Calon pelanggan",
            keterangan: "Orang baru yang membuka halaman depan, daftar, atau masuk",
            orang: r.datang,
          },
          {
            kunci: "tertarik",
            label: "Tertarik",
            keterangan: "Mengklik tombol/menu, atau langsung membuka form daftar",
            orang: r.tertarik,
          },
          {
            kunci: "bukaDaftar",
            label: "Buka form daftar",
            keterangan: "Sampai di halaman /register (atau sudah mendaftar)",
            orang: r.bukaDaftar,
          },
          {
            kunci: "daftar",
            label: "Berhasil daftar",
            keterangan: "Usaha baru yang benar-benar terdaftar",
            orang: r.daftar,
          },
        ]
      : [
          {
            kunci: "datang",
            label: "Pelanggan lama",
            keterangan: "Pemilik akun yang membuka halaman depan atau masuk",
            orang: r.datang,
          },
          {
            kunci: "bukaMasuk",
            label: "Buka halaman masuk",
            keterangan: "Sampai di halaman /masuk (atau sudah login)",
            orang: r.bukaMasuk,
          },
          {
            kunci: "masuk",
            label: "Berhasil masuk",
            keterangan: "Login berhasil di periode ini",
            orang: r.masuk,
          },
        ];

  return {
    dari,
    sampai,
    segmen,
    jumlah,
    corong,
    kunjungan: r.kunjungan,
    totalKlik: r.totalKlik,
    pengunjungBeranda: r.pengunjungBeranda,
    harian,
    tombol,
    bagian,
    sumber,
    perangkat,
  };
}
