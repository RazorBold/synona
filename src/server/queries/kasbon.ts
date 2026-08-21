import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";

export type BarisUtangKasbon = {
  id: string;
  customerId: string;
  nama: string;
  phone: string | null;
  jumlah: number;
  dibayar: number;
  sisa: number;
  jatuhTempo: string | null;
  status: "open" | "partial" | "paid";
  invoiceNo: string | null;
  dibuat: number;
};

/**
 * Semua utang yang belum lunas, ditambah yang baru lunas 60 hari terakhir
 * (untuk tab riwayat). Utang lunas lama sengaja tidak ikut supaya daftar
 * tidak membengkak seiring waktu.
 */
export async function getDaftarUtang(
  outletId: string,
): Promise<BarisUtangKasbon[]> {
  const batasLunas = Date.now() - 60 * 86_400_000;

  return db.all<BarisUtangKasbon>(sql`
    SELECT d.id            AS id,
           d.customer_id   AS customerId,
           c.name          AS nama,
           c.phone         AS phone,
           d.amount        AS jumlah,
           d.paid          AS dibayar,
           d.remaining     AS sisa,
           d.due_date      AS jatuhTempo,
           d.status        AS status,
           t.invoice_no    AS invoiceNo,
           d.created_at    AS dibuat
      FROM debts d
      JOIN customers c ON c.id = d.customer_id
      LEFT JOIN transactions t ON t.id = d.transaction_id
     WHERE d.outlet_id = ${outletId}
       AND (d.status != 'paid' OR d.updated_at >= ${batasLunas})
     ORDER BY d.status = 'paid',
              d.due_date IS NULL,
              d.due_date
  `);
}

export async function getStatistikUtang(outletId: string, hariIni: string) {
  const awalBulan = `${hariIni.slice(0, 7)}-01`;
  const awalBulanMs = new Date(`${awalBulan}T00:00:00`).getTime();

  const row = db.get<{
    piutang: number;
    pelanggan: number;
    lewat: number;
    hariIni: number;
    terkumpul: number;
  }>(sql`
    SELECT COALESCE(SUM(remaining), 0)                                   AS piutang,
           COUNT(DISTINCT customer_id)                                   AS pelanggan,
           COALESCE(SUM(CASE WHEN due_date IS NOT NULL AND due_date < ${hariIni}
                             THEN 1 ELSE 0 END), 0)                      AS lewat,
           COALESCE(SUM(CASE WHEN due_date = ${hariIni} THEN 1 ELSE 0 END), 0) AS hariIni,
           COALESCE((SELECT SUM(p.amount) FROM debt_payments p
                       JOIN debts dd ON dd.id = p.debt_id
                      WHERE dd.outlet_id = ${outletId}
                        AND p.paid_at >= ${awalBulanMs}), 0)             AS terkumpul
      FROM debts
     WHERE outlet_id = ${outletId} AND status != 'paid'
  `);

  return {
    piutang: row?.piutang ?? 0,
    pelanggan: row?.pelanggan ?? 0,
    lewat: row?.lewat ?? 0,
    hariIni: row?.hariIni ?? 0,
    terkumpul: row?.terkumpul ?? 0,
  };
}

export type Cicilan = {
  id: string;
  jumlah: number;
  metode: string;
  waktu: number;
  catatan: string | null;
};

export async function getRiwayatCicilan(debtId: string): Promise<Cicilan[]> {
  return db.all<Cicilan>(sql`
    SELECT id, amount AS jumlah, method AS metode,
           paid_at AS waktu, note AS catatan
      FROM debt_payments
     WHERE debt_id = ${debtId}
     ORDER BY paid_at DESC
  `);
}
