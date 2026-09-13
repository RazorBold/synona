import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";

export type RingkasanKas = {
  tanggal: string;
  penjualanTunai: number;
  cicilanTunai: number;
  /** Pemasukan lain yang masuk ke akun berjenis kas (uang laci). */
  pemasukanTunai: number;
  pembelianTunai: number;
  bebanTunai: number;
  hutangTunai: number;
  kasSistem: number;
  qrisSistem: number;
  transferSistem: number;
  jumlahTransaksi: number;
};

/**
 * Kas versi sistem untuk satu hari: semua uang tunai yang seharusnya ada di
 * laci. QRIS dipisah karena uangnya baru masuk saat settlement.
 */
export async function getRingkasanKas(
  outletId: string,
  tanggal: string,
): Promise<RingkasanKas> {
  const awal = new Date(`${tanggal}T00:00:00`).getTime();
  const akhir = new Date(`${tanggal}T23:59:59`).getTime();

  const r = db.get<{
    tunai: number;
    qris: number;
    transfer: number;
    jumlah: number;
    cicilan: number;
    pembelian: number;
    beban: number;
    hutang: number;
    lain: number;
  }>(sql`
    SELECT
      COALESCE((SELECT SUM(total) FROM transactions
                 WHERE outlet_id = ${outletId} AND status = 'paid'
                   AND payment_method = 'cash' AND business_date = ${tanggal}), 0) AS tunai,
      COALESCE((SELECT SUM(total) FROM transactions
                 WHERE outlet_id = ${outletId} AND status = 'paid'
                   AND payment_method = 'qris' AND business_date = ${tanggal}), 0) AS qris,
      COALESCE((SELECT SUM(total) FROM transactions
                 WHERE outlet_id = ${outletId} AND status = 'paid'
                   AND payment_method = 'transfer' AND business_date = ${tanggal}), 0) AS transfer,
      COALESCE((SELECT COUNT(*) FROM transactions
                 WHERE outlet_id = ${outletId} AND status != 'void'
                   AND business_date = ${tanggal}), 0) AS jumlah,
      COALESCE((SELECT SUM(p.amount) FROM debt_payments p
                  JOIN debts d ON d.id = p.debt_id
                 WHERE d.outlet_id = ${outletId} AND p.method = 'cash'
                   AND p.paid_at BETWEEN ${awal} AND ${akhir}), 0) AS cicilan,
      COALESCE((SELECT SUM(paid_amount) FROM purchases
                 WHERE outlet_id = ${outletId} AND method = 'cash'
                   AND business_date = ${tanggal}), 0) AS pembelian,
      COALESCE((SELECT SUM(amount) FROM expenses
                 WHERE outlet_id = ${outletId} AND method = 'cash'
                   AND business_date = ${tanggal}), 0) AS beban,
      COALESCE((SELECT SUM(pp.amount) FROM payable_payments pp
                  JOIN purchases pu ON pu.id = pp.purchase_id
                 WHERE pu.outlet_id = ${outletId} AND pp.method = 'cash'
                   AND pp.paid_at BETWEEN ${awal} AND ${akhir}), 0) AS hutang,
      COALESCE((SELECT SUM(oi.amount) FROM other_incomes oi
                  JOIN cash_accounts a ON a.id = oi.cash_account_id
                 WHERE oi.outlet_id = ${outletId} AND a.type = 'kas'
                   AND oi.business_date = ${tanggal}), 0) AS lain
  `);

  const penjualanTunai = r?.tunai ?? 0;
  const cicilanTunai = r?.cicilan ?? 0;
  const pembelianTunai = r?.pembelian ?? 0;
  const bebanTunai = r?.beban ?? 0;
  const hutangTunai = r?.hutang ?? 0;
  const pemasukanTunai = r?.lain ?? 0;

  return {
    tanggal,
    penjualanTunai,
    cicilanTunai,
    pemasukanTunai,
    pembelianTunai,
    bebanTunai,
    hutangTunai,
    kasSistem:
      penjualanTunai +
      cicilanTunai +
      pemasukanTunai -
      pembelianTunai -
      bebanTunai -
      hutangTunai,
    qrisSistem: r?.qris ?? 0,
    transferSistem: r?.transfer ?? 0,
    jumlahTransaksi: r?.jumlah ?? 0,
  };
}

export type BarisRekonsiliasi = {
  id: string;
  tanggal: string;
  kasSistem: number;
  kasFisik: number;
  selisihKas: number;
  qrisSistem: number;
  qrisSettled: number;
  selisihQris: number;
  catatan: string | null;
  disetujuiPada: number | null;
};

export async function getRekonsiliasiTanggal(
  outletId: string,
  tanggal: string,
): Promise<BarisRekonsiliasi | null> {
  return (
    db.get<BarisRekonsiliasi>(sql`
      SELECT id, business_date AS tanggal, cash_system AS kasSistem,
             cash_physical AS kasFisik, cash_diff AS selisihKas,
             qris_system AS qrisSistem, qris_settled AS qrisSettled,
             qris_diff AS selisihQris, note AS catatan,
             approved_at AS disetujuiPada
        FROM reconciliations
       WHERE outlet_id = ${outletId} AND business_date = ${tanggal}
    `) ?? null
  );
}

export async function getRiwayatRekonsiliasi(
  outletId: string,
  batas = 14,
): Promise<BarisRekonsiliasi[]> {
  return db.all<BarisRekonsiliasi>(sql`
    SELECT id, business_date AS tanggal, cash_system AS kasSistem,
           cash_physical AS kasFisik, cash_diff AS selisihKas,
           qris_system AS qrisSistem, qris_settled AS qrisSettled,
           qris_diff AS selisihQris, note AS catatan,
           approved_at AS disetujuiPada
      FROM reconciliations
     WHERE outlet_id = ${outletId}
     ORDER BY business_date DESC
     LIMIT ${batas}
  `);
}
