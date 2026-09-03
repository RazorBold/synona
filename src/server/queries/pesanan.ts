import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import type { SatuanLayanan, StatusPesanan } from "@/lib/usaha";

export type ItemPesanan = {
  nama: string;
  qtyMilli: number;
  satuan: SatuanLayanan | null;
  total: number;
  petugas: string | null;
};

export type BarisPesanan = {
  id: string;
  nomor: string;
  status: StatusPesanan;
  transactionId: string;
  invoiceNo: string;
  pelanggan: string | null;
  telepon: string | null;
  total: number;
  dibayar: number;
  sisa: number;
  debtId: string | null;
  janjiSelesai: string | null;
  tandaBarang: string | null;
  catatan: string | null;
  tanggal: string;
  waktu: number;
  diambilPada: number | null;
  rincian: string;
};

/**
 * Uang pesanan tidak disimpan di `service_orders` — ia hidup di
 * `transactions` (nilai pesanan) dan `debts` (sisa yang belum dibayar).
 * Query ini yang menyatukannya kembali untuk ditampilkan.
 */
export async function getDaftarPesanan(
  outletId: string,
  opsi: { status?: StatusPesanan | null; batas?: number } = {},
): Promise<BarisPesanan[]> {
  const { status = null, batas = 200 } = opsi;

  return db.all<BarisPesanan>(sql`
    SELECT o.id             AS id,
           o.order_no       AS nomor,
           o.status         AS status,
           o.transaction_id AS transactionId,
           t.invoice_no     AS invoiceNo,
           c.name           AS pelanggan,
           c.phone          AS telepon,
           t.total          AS total,
           t.total - COALESCE(d.remaining, 0)          AS dibayar,
           COALESCE(d.remaining, 0)                    AS sisa,
           d.id             AS debtId,
           o.janji_selesai  AS janjiSelesai,
           o.tanda_barang   AS tandaBarang,
           o.note           AS catatan,
           o.business_date  AS tanggal,
           o.occurred_at    AS waktu,
           o.diambil_pada   AS diambilPada,
           (SELECT GROUP_CONCAT(i.name_snapshot, ' · ')
              FROM transaction_items i
             WHERE i.transaction_id = t.id)            AS rincian
      FROM service_orders o
      JOIN transactions t ON t.id = o.transaction_id
      LEFT JOIN customers c ON c.id = t.customer_id
      LEFT JOIN debts d ON d.transaction_id = t.id AND d.status != 'paid'
     WHERE o.outlet_id = ${outletId}
       AND (${status} IS NULL OR o.status = ${status})
     ORDER BY
       CASE o.status WHEN 'masuk' THEN 0 WHEN 'dikerjakan' THEN 1
                     WHEN 'selesai' THEN 2 ELSE 3 END,
       o.occurred_at DESC
     LIMIT ${batas}
  `);
}

export async function getItemPesanan(
  transactionId: string,
): Promise<ItemPesanan[]> {
  return db.all<ItemPesanan>(sql`
    SELECT i.name_snapshot AS nama,
           COALESCE(i.qty_milli, i.qty * 1000) AS qtyMilli,
           i.unit          AS satuan,
           i.line_total    AS total,
           u.name          AS petugas
      FROM transaction_items i
      LEFT JOIN staff st ON st.id = i.petugas_staff_id
      LEFT JOIN users u ON u.id = st.user_id
     WHERE i.transaction_id = ${transactionId}
     ORDER BY i.rowid
  `);
}

export async function getStatistikPesanan(outletId: string, hariIni: string) {
  const row = db.get<{
    masuk: number;
    dikerjakan: number;
    selesai: number;
    telat: number;
  }>(sql`
    SELECT COALESCE(SUM(status = 'masuk'), 0)      AS masuk,
           COALESCE(SUM(status = 'dikerjakan'), 0) AS dikerjakan,
           COALESCE(SUM(status = 'selesai'), 0)    AS selesai,
           COALESCE(SUM(status IN ('masuk', 'dikerjakan')
                        AND janji_selesai IS NOT NULL
                        AND janji_selesai < ${hariIni}), 0) AS telat
      FROM service_orders
     WHERE outlet_id = ${outletId}
  `);

  const uang = db.get<{ omzetHari: number; belumLunas: number }>(sql`
    SELECT COALESCE((SELECT SUM(t.total) FROM service_orders o
                       JOIN transactions t ON t.id = o.transaction_id
                      WHERE o.outlet_id = ${outletId} AND t.status != 'void'
                        AND o.business_date = ${hariIni}), 0) AS omzetHari,
           COALESCE((SELECT SUM(d.remaining) FROM service_orders o
                       JOIN debts d ON d.transaction_id = o.transaction_id
                      WHERE o.outlet_id = ${outletId} AND d.status != 'paid'), 0)
                                                              AS belumLunas
  `);

  return {
    masuk: row?.masuk ?? 0,
    dikerjakan: row?.dikerjakan ?? 0,
    selesai: row?.selesai ?? 0,
    telat: row?.telat ?? 0,
    omzetHari: uang?.omzetHari ?? 0,
    belumLunas: uang?.belumLunas ?? 0,
  };
}

/** Staf yang bisa ditandai sebagai petugas pengerjaan. */
export async function getPetugas(outletId: string) {
  return db.all<{ id: string; nama: string; peran: string }>(sql`
    SELECT st.id AS id, u.name AS nama, st.role AS peran
      FROM staff st
      JOIN users u ON u.id = st.user_id
     WHERE st.outlet_id = ${outletId} AND st.is_active = 1
     ORDER BY u.name COLLATE NOCASE
  `);
}
