import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";

export type BarisPelanggan = {
  id: string;
  nama: string;
  phone: string | null;
  catatan: string | null;
  diskonBp: number;
  totalBelanja: number;
  jumlahTransaksi: number;
  terakhirBelanja: number | null;
  sisaUtang: number;
  dibuat: number;
};

/**
 * Daftar pelanggan sekaligus ringkasan belanja dan piutangnya.
 * Dua subquery agregat digabung supaya tidak ada query per baris (N+1).
 */
export async function getDaftarPelanggan(
  outletId: string,
): Promise<BarisPelanggan[]> {
  return db.all<BarisPelanggan>(sql`
    SELECT c.id                                  AS id,
           c.name                                AS nama,
           c.phone                               AS phone,
           c.note                                AS catatan,
           c.diskon_bp                           AS diskonBp,
           c.created_at                          AS dibuat,
           COALESCE(t.total_belanja, 0)          AS totalBelanja,
           COALESCE(t.jumlah, 0)                 AS jumlahTransaksi,
           t.terakhir                            AS terakhirBelanja,
           COALESCE(d.sisa, 0)                   AS sisaUtang
      FROM customers c
      LEFT JOIN (
        SELECT customer_id,
               SUM(total)      AS total_belanja,
               COUNT(*)        AS jumlah,
               MAX(occurred_at) AS terakhir
          FROM transactions
         WHERE outlet_id = ${outletId} AND status != 'void'
         GROUP BY customer_id
      ) t ON t.customer_id = c.id
      LEFT JOIN (
        SELECT customer_id, SUM(remaining) AS sisa
          FROM debts
         WHERE outlet_id = ${outletId} AND status != 'paid'
         GROUP BY customer_id
      ) d ON d.customer_id = c.id
     WHERE c.outlet_id = ${outletId} AND c.is_active = 1
     ORDER BY c.name COLLATE NOCASE
  `);
}

export async function getStatistikPelanggan(outletId: string) {
  const row = db.get<{
    jumlah: number;
    berutang: number;
    piutang: number;
    baru: number;
  }>(sql`
    SELECT COUNT(*) AS jumlah,
           COALESCE((SELECT COUNT(DISTINCT customer_id) FROM debts
                      WHERE outlet_id = ${outletId} AND status != 'paid'), 0) AS berutang,
           COALESCE((SELECT SUM(remaining) FROM debts
                      WHERE outlet_id = ${outletId} AND status != 'paid'), 0) AS piutang,
           COALESCE(SUM(CASE WHEN created_at >= ${Date.now() - 30 * 86_400_000}
                             THEN 1 ELSE 0 END), 0) AS baru
      FROM customers
     WHERE outlet_id = ${outletId} AND is_active = 1
  `);

  return {
    jumlah: row?.jumlah ?? 0,
    berutang: row?.berutang ?? 0,
    piutang: row?.piutang ?? 0,
    baru: row?.baru ?? 0,
  };
}

export type TransaksiPelanggan = {
  id: string;
  invoiceNo: string;
  total: number;
  metode: string;
  status: string;
  waktu: number;
};

export type UtangPelanggan = {
  id: string;
  sisa: number;
  jumlah: number;
  jatuhTempo: string | null;
  status: string;
};

export async function getRiwayatPelanggan(
  outletId: string,
  customerId: string,
) {
  const transaksi = db.all<TransaksiPelanggan>(sql`
    SELECT id, invoice_no AS invoiceNo, total,
           payment_method AS metode, status, occurred_at AS waktu
      FROM transactions
     WHERE outlet_id = ${outletId} AND customer_id = ${customerId}
     ORDER BY occurred_at DESC
     LIMIT 8
  `);

  const utang = db.all<UtangPelanggan>(sql`
    SELECT id, remaining AS sisa, amount AS jumlah,
           due_date AS jatuhTempo, status
      FROM debts
     WHERE outlet_id = ${outletId} AND customer_id = ${customerId}
       AND status != 'paid'
     ORDER BY due_date
  `);

  return { transaksi, utang };
}
