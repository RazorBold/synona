import "server-only";

import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { db } from "@/db";
import type { JenisAkun, KategoriMutasi } from "@/lib/kas";

export type AkunKas = {
  id: string;
  nama: string;
  jenis: JenisAkun;
  namaBank: string | null;
  nomorRekening: string | null;
  saldoAwal: number;
  metodeDefault: "cash" | "qris" | "transfer" | null;
  urutan: number;
};

export async function getDaftarAkunKas(outletId: string): Promise<AkunKas[]> {
  return db.all<AkunKas>(sql`
    SELECT id                AS id,
           name              AS nama,
           type              AS jenis,
           bank_name         AS namaBank,
           account_number    AS nomorRekening,
           opening_balance   AS saldoAwal,
           metode_default    AS metodeDefault,
           sort_order        AS urutan
      FROM cash_accounts
     WHERE outlet_id = ${outletId} AND is_active = 1
     ORDER BY sort_order, name COLLATE NOCASE
  `);
}

/**
 * Buku kas per akun, dirakit dari tabel kejadian — bukan dari ledger
 * terpisah (ADR-002). Satu kejadian tetap hanya ditulis di satu tempat,
 * jadi mutasi kas tidak mungkin berbeda dengan penjualan atau beban.
 *
 * `nilai` bertanda: positif = uang masuk, negatif = uang keluar. Baris yang
 * belum menunjuk akun (data sebelum fitur ini ada, atau akun terlanjur
 * dihapus) jatuh ke akun default metodenya supaya tidak hilang dari laporan.
 */
function mutasi(outletId: string): SQL {
  const akun = (kolomAkun: SQL, kolomMetode: SQL) => sql`
    COALESCE(${kolomAkun}, (
      SELECT d.id FROM cash_accounts d
       WHERE d.outlet_id = ${outletId}
         AND d.metode_default = CASE ${kolomMetode}
               WHEN 'qris' THEN 'qris'
               WHEN 'transfer' THEN 'transfer'
               ELSE 'cash' END
       LIMIT 1))`;

  return sql`
    SELECT ${akun(sql`t.cash_account_id`, sql`t.payment_method`)} AS akunId,
           t.total + CASE WHEN t.tax_mode = 'tambah' THEN t.tax_amount ELSE 0 END AS nilai,
           'penjualan'                   AS kategori,
           'Penjualan ' || t.invoice_no  AS keterangan,
           t.id                          AS refId,
           t.occurred_at                 AS waktu,
           t.business_date               AS tanggal
      FROM transactions t
     WHERE t.outlet_id = ${outletId} AND t.status = 'paid'

    UNION ALL
    SELECT ${akun(sql`dp.cash_account_id`, sql`dp.method`)},
           dp.amount,
           'cicilan_piutang',
           'Cicilan kasbon ' || c.name,
           dp.id,
           dp.paid_at,
           date(dp.paid_at / 1000, 'unixepoch', 'localtime')
      FROM debt_payments dp
      JOIN debts d ON d.id = dp.debt_id
      JOIN customers c ON c.id = d.customer_id
     WHERE d.outlet_id = ${outletId}

    UNION ALL
    SELECT ct.to_account_id, ct.amount, 'transfer_masuk',
           'Terima dari ' || af.name, ct.id, ct.occurred_at, ct.business_date
      FROM cash_transfers ct
      JOIN cash_accounts af ON af.id = ct.from_account_id
     WHERE ct.outlet_id = ${outletId}

    UNION ALL
    SELECT ct.from_account_id, -ct.amount, 'transfer_keluar',
           'Pindah ke ' || at2.name, ct.id, ct.occurred_at, ct.business_date
      FROM cash_transfers ct
      JOIN cash_accounts at2 ON at2.id = ct.to_account_id
     WHERE ct.outlet_id = ${outletId}

    UNION ALL
    SELECT ${akun(sql`p.cash_account_id`, sql`p.method`)},
           -p.paid_amount,
           'pembelian',
           'Belanja ' || COALESCE(p.supplier_name, 'stok'),
           p.id, p.occurred_at, p.business_date
      FROM purchases p
     WHERE p.outlet_id = ${outletId} AND p.paid_amount > 0

    UNION ALL
    SELECT ${akun(sql`pp.cash_account_id`, sql`pp.method`)},
           -pp.amount,
           'pelunasan_hutang',
           'Bayar hutang ' || COALESCE(pu.supplier_name, 'supplier'),
           pp.id, pp.paid_at,
           date(pp.paid_at / 1000, 'unixepoch', 'localtime')
      FROM payable_payments pp
      JOIN purchases pu ON pu.id = pp.purchase_id
     WHERE pu.outlet_id = ${outletId}

    UNION ALL
    SELECT ${akun(sql`e.cash_account_id`, sql`e.method`)},
           -e.amount, 'beban', e.name, e.id, e.occurred_at, e.business_date
      FROM expenses e
     WHERE e.outlet_id = ${outletId}

    UNION ALL
    SELECT ${akun(sql`oi.cash_account_id`, sql`'cash'`)},
           oi.amount, 'pemasukan_lain', oi.name, oi.id, oi.occurred_at, oi.business_date
      FROM other_incomes oi
     WHERE oi.outlet_id = ${outletId}
  `;
}

export type SaldoAkun = {
  id: string;
  nama: string;
  jenis: JenisAkun;
  namaBank: string | null;
  saldoAwal: number;
  masuk: number;
  keluar: number;
  saldoAkhir: number;
};

/**
 * Saldo tiap akun: posisi di awal periode, mutasi selama periode, lalu
 * posisi akhir. Saldo awal dihitung dari seluruh riwayat sebelum `dari`
 * ditambah `opening_balance` — supaya angka akhirnya sama dengan uang yang
 * benar-benar ada di laci dan di rekening.
 */
export async function getSaldoAkun(
  outletId: string,
  dari: string,
  sampai: string,
): Promise<SaldoAkun[]> {
  return db.all<SaldoAkun>(sql`
    WITH m AS (${mutasi(outletId)})
    SELECT a.id        AS id,
           a.name      AS nama,
           a.type      AS jenis,
           a.bank_name AS namaBank,
           a.opening_balance
             + COALESCE(SUM(CASE WHEN m.tanggal < ${dari}
                                 THEN m.nilai ELSE 0 END), 0)     AS saldoAwal,
           COALESCE(SUM(CASE WHEN m.tanggal BETWEEN ${dari} AND ${sampai}
                              AND m.nilai > 0 THEN m.nilai ELSE 0 END), 0) AS masuk,
           COALESCE(-SUM(CASE WHEN m.tanggal BETWEEN ${dari} AND ${sampai}
                               AND m.nilai < 0 THEN m.nilai ELSE 0 END), 0) AS keluar,
           a.opening_balance
             + COALESCE(SUM(CASE WHEN m.tanggal <= ${sampai}
                                 THEN m.nilai ELSE 0 END), 0)     AS saldoAkhir
      FROM cash_accounts a
      LEFT JOIN m ON m.akunId = a.id
     WHERE a.outlet_id = ${outletId} AND a.is_active = 1
     GROUP BY a.id
     ORDER BY a.sort_order, a.name COLLATE NOCASE
  `);
}

export type BarisMutasi = {
  akunId: string;
  namaAkun: string;
  jenisAkun: JenisAkun;
  nilai: number;
  kategori: KategoriMutasi;
  keterangan: string;
  refId: string;
  waktu: number;
  tanggal: string;
};

export async function getMutasiKas(
  outletId: string,
  dari: string,
  sampai: string,
  opsi: { akunId?: string | null; batas?: number } = {},
): Promise<BarisMutasi[]> {
  const { akunId = null, batas = 120 } = opsi;

  return db.all<BarisMutasi>(sql`
    WITH m AS (${mutasi(outletId)})
    SELECT m.akunId       AS akunId,
           a.name         AS namaAkun,
           a.type         AS jenisAkun,
           m.nilai        AS nilai,
           m.kategori     AS kategori,
           m.keterangan   AS keterangan,
           m.refId        AS refId,
           m.waktu        AS waktu,
           m.tanggal      AS tanggal
      FROM m
      JOIN cash_accounts a ON a.id = m.akunId
     WHERE m.tanggal BETWEEN ${dari} AND ${sampai}
       AND (${akunId} IS NULL OR m.akunId = ${akunId})
     ORDER BY m.waktu DESC
     LIMIT ${batas}
  `);
}

/** Akun yang dipakai kalau pengguna tidak memilih apa pun (kasir cepat). */
export async function getAkunDefault(
  outletId: string,
  metode: "cash" | "qris" | "transfer" | "other",
): Promise<string | null> {
  const row = db.get<{ id: string }>(sql`
    SELECT id FROM cash_accounts
     WHERE outlet_id = ${outletId} AND is_active = 1
       AND metode_default = ${metode === "other" ? "cash" : metode}
     LIMIT 1
  `);
  return row?.id ?? null;
}
