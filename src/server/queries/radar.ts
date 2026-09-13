import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import { tambahHari } from "@/lib/date";
import { punyaBarang, type JenisUsaha } from "@/lib/usaha";
import type { Status } from "@/server/queries/kesehatan";

export type ButirRadar = {
  kunci: string;
  pertanyaan: string;
  jawaban: string;
  keterangan: string;
  status: Status;
  aksi: string | null;
  href: string;
};

/**
 * Radar 6 Pertanyaan (Tahap 4 flowchart): tiap pertanyaan dijawab satu angka,
 * diberi status, lalu diterjemahkan jadi satu aksi yang bisa langsung
 * dikerjakan. Aksi memicu pencatatan baru, dan alurnya berputar lagi.
 */
export async function getRadar(
  outletId: string,
  hariIni: string,
  jenisUsaha: JenisUsaha | null = "dagang",
): Promise<ButirRadar[]> {
  const denganBarang = punyaBarang(jenisUsaha);
  const awal7 = tambahHari(hariIni, -6);
  const awalBulan = `${hariIni.slice(0, 7)}-01`;
  const besok = tambahHari(hariIni, 1);
  const batasAwal = new Date(`${hariIni}T00:00:00`).getTime();
  const batasAkhir = new Date(`${hariIni}T23:59:59`).getTime();

  const r = db.get<{
    omzetHariIni: number;
    omzet7: number;
    hari7: number;
    labaHariIni: number;
    bebanHariIni: number;
    bebanRutinBulan: number;
    kasMasuk: number;
    kasKeluar: number;
    produkKritis: number;
    bahanKritis: number;
    piutangLewat: number;
    piutangJumlah: number;
    hutangLewat: number;
  }>(sql`
    SELECT
      COALESCE((SELECT SUM(total) FROM transactions
                 WHERE outlet_id = ${outletId} AND status != 'void'
                   AND business_date = ${hariIni}), 0) AS omzetHariIni,
      COALESCE((SELECT SUM(total) FROM transactions
                 WHERE outlet_id = ${outletId} AND status != 'void'
                   AND business_date BETWEEN ${awal7} AND ${hariIni}), 0) AS omzet7,
      COALESCE((SELECT COUNT(DISTINCT business_date) FROM transactions
                 WHERE outlet_id = ${outletId} AND status != 'void'
                   AND business_date BETWEEN ${awal7} AND ${hariIni}), 0) AS hari7,
      COALESCE((SELECT SUM(
                  (SELECT COALESCE(SUM(i.line_total - i.cost_snapshot * i.qty), 0)
                     FROM transaction_items i WHERE i.transaction_id = tx.id) - tx.discount)
                  FROM transactions tx
                 WHERE tx.outlet_id = ${outletId} AND tx.status != 'void'
                   AND tx.business_date = ${hariIni}), 0) AS labaHariIni,
      COALESCE((SELECT SUM(amount) FROM expenses
                 WHERE outlet_id = ${outletId} AND business_date = ${hariIni}), 0) AS bebanHariIni,
      COALESCE((SELECT SUM(amount) FROM expenses
                 WHERE outlet_id = ${outletId} AND berulang = 1
                   AND business_date >= ${awalBulan}), 0) AS bebanRutinBulan,
      COALESCE((SELECT SUM(total) FROM transactions
                 WHERE outlet_id = ${outletId} AND status = 'paid'
                   AND business_date = ${hariIni}), 0)
        + COALESCE((SELECT SUM(p.amount) FROM debt_payments p
                      JOIN debts d ON d.id = p.debt_id
                     WHERE d.outlet_id = ${outletId}
                       AND p.paid_at BETWEEN ${batasAwal} AND ${batasAkhir}), 0)
        + COALESCE((SELECT SUM(amount) FROM other_incomes
                     WHERE outlet_id = ${outletId} AND business_date = ${hariIni}), 0) AS kasMasuk,
      COALESCE((SELECT SUM(paid_amount) FROM purchases
                 WHERE outlet_id = ${outletId} AND business_date = ${hariIni}), 0)
        + COALESCE((SELECT SUM(amount) FROM expenses
                     WHERE outlet_id = ${outletId} AND business_date = ${hariIni}), 0) AS kasKeluar,
      COALESCE((SELECT COUNT(*) FROM products
                 WHERE outlet_id = ${outletId} AND is_active = 1
                   AND stock <= low_stock_threshold), 0) AS produkKritis,
      COALESCE((SELECT COUNT(*) FROM materials
                 WHERE outlet_id = ${outletId} AND is_active = 1
                   AND stock <= low_stock_threshold), 0) AS bahanKritis,
      COALESCE((SELECT SUM(remaining) FROM debts
                 WHERE outlet_id = ${outletId} AND status != 'paid'
                   AND due_date IS NOT NULL AND due_date < ${besok}), 0) AS piutangLewat,
      COALESCE((SELECT COUNT(*) FROM debts
                 WHERE outlet_id = ${outletId} AND status != 'paid'
                   AND due_date IS NOT NULL AND due_date < ${besok}), 0) AS piutangJumlah,
      COALESCE((SELECT SUM(remaining) FROM purchases
                 WHERE outlet_id = ${outletId} AND status != 'paid'
                   AND due_date IS NOT NULL AND due_date < ${besok}), 0) AS hutangLewat
  `);

  const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

  const omzetHariIni = r?.omzetHariIni ?? 0;
  const rata7 = r?.hari7 ? Math.round((r.omzet7 ?? 0) / r.hari7) : 0;
  const bebanRutinHarian = Math.round((r?.bebanRutinBulan ?? 0) / 30);
  const labaBersih =
    (r?.labaHariIni ?? 0) - (r?.bebanHariIni ?? 0) - bebanRutinHarian;
  const kasBersih = (r?.kasMasuk ?? 0) - (r?.kasKeluar ?? 0);
  const kritis = (r?.produkKritis ?? 0) + (r?.bahanKritis ?? 0);
  const piutangLewat = r?.piutangLewat ?? 0;
  const hutangLewat = r?.hutangLewat ?? 0;

  const a = denganBarang
    ? null
    : db.get<{ berjalan: number; siap: number; telat: number }>(sql`
        SELECT COALESCE(SUM(status IN ('masuk', 'dikerjakan')), 0) AS berjalan,
               COALESCE(SUM(status = 'selesai'), 0)                AS siap,
               COALESCE(SUM(status IN ('masuk', 'dikerjakan')
                            AND janji_selesai IS NOT NULL
                            AND janji_selesai < ${hariIni}), 0)    AS telat
          FROM service_orders
         WHERE outlet_id = ${outletId}
      `);
  const antreanBerjalan = a?.berjalan ?? 0;
  const antreanSiap = a?.siap ?? 0;
  const antreanTelat = a?.telat ?? 0;

  const agenda: string[] = [];
  if (r?.piutangJumlah) agenda.push(`${r.piutangJumlah} kasbon jatuh tempo`);
  if (denganBarang && kritis > 0) agenda.push(`${kritis} barang menipis`);
  if (antreanTelat > 0) agenda.push(`${antreanTelat} pekerjaan lewat janji`);
  if (hutangLewat > 0) agenda.push("hutang supplier jatuh tempo");
  if ((r?.bebanRutinBulan ?? 0) === 0) agenda.push("beban rutin belum dicatat");

  return [
    {
      kunci: "Q1",
      pertanyaan: "Omzet",
      jawaban: rupiah(omzetHariIni),
      keterangan:
        rata7 > 0 ? `rata-rata 7 hari ${rupiah(rata7)}` : "belum ada pembanding",
      status:
        omzetHariIni === 0
          ? "bahaya"
          : rata7 > 0 && omzetHariIni < rata7 * 0.7
            ? "waspada"
            : "sehat",
      aksi: omzetHariIni === 0 ? (denganBarang ? "Buka POS" : "Terima pesanan") : null,
      href: denganBarang ? "/kasir" : "/pesanan",
    },
    {
      kunci: "Q2",
      pertanyaan: "Untung",
      jawaban: rupiah(labaBersih),
      keterangan: `laba kotor ${rupiah(r?.labaHariIni ?? 0)}`,
      status: labaBersih > 0 ? "sehat" : labaBersih === 0 ? "waspada" : "bahaya",
      aksi: labaBersih <= 0 ? "Lihat margin produk" : null,
      href: "/laporan",
    },
    {
      kunci: "Q3",
      pertanyaan: "Kas",
      jawaban: rupiah(kasBersih),
      keterangan: `masuk ${rupiah(r?.kasMasuk ?? 0)} · keluar ${rupiah(
        r?.kasKeluar ?? 0,
      )}`,
      status: kasBersih > 0 ? "sehat" : kasBersih === 0 ? "waspada" : "bahaya",
      aksi: "Setor kas laci",
      href: "/rekonsiliasi",
    },
    denganBarang
      ? {
          kunci: "Q4",
          pertanyaan: "Stok",
          jawaban: `${kritis} item`,
          keterangan:
            kritis > 0
              ? `${r?.bahanKritis ?? 0} bahan · ${r?.produkKritis ?? 0} produk`
              : "semua stok aman",
          status: kritis === 0 ? "sehat" : kritis > 5 ? "bahaya" : "waspada",
          aksi: kritis > 0 ? "Pesan ulang" : null,
          href: (r?.bahanKritis ?? 0) > 0 ? "/persediaan" : "/produk",
        }
      : {
          // Usaha jasa tidak punya rak untuk kehabisan. Yang setara
          // gawatnya adalah pekerjaan yang lewat dari janji ke pelanggan.
          kunci: "Q4",
          pertanyaan: "Antrean",
          jawaban: `${antreanBerjalan} kerjaan`,
          keterangan:
            antreanTelat > 0
              ? `${antreanTelat} lewat janji · ${antreanSiap} siap diambil`
              : `${antreanSiap} siap diambil`,
          status:
            antreanTelat === 0 ? "sehat" : antreanTelat > 2 ? "bahaya" : "waspada",
          aksi: antreanTelat > 0 ? "Kabari pelanggan" : null,
          href: "/pesanan",
        },
    {
      kunci: "Q5",
      pertanyaan: "Tagihan",
      jawaban: rupiah(piutangLewat),
      keterangan:
        hutangLewat > 0
          ? `hutang supplier ${rupiah(hutangLewat)}`
          : `${r?.piutangJumlah ?? 0} kasbon jatuh tempo`,
      status:
        piutangLewat === 0 && hutangLewat === 0
          ? "sehat"
          : piutangLewat > 1_000_000
            ? "bahaya"
            : "waspada",
      aksi: piutangLewat > 0 ? "Tagih piutang" : null,
      href: "/kasbon",
    },
    {
      kunci: "Q6",
      pertanyaan: "Agenda",
      jawaban: `${agenda.length} hal`,
      keterangan: agenda.length ? agenda.join(" · ") : "tidak ada yang tertunda",
      status:
        agenda.length === 0 ? "sehat" : agenda.length > 2 ? "bahaya" : "waspada",
      aksi: agenda.length > 0 ? "Lihat kesehatan" : null,
      href: "/laporan",
    },
  ];
}
