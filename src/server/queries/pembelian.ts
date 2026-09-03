import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";

export type BarisPembelian = {
  id: string;
  supplier: string | null;
  total: number;
  dibayar: number;
  sisa: number;
  status: "paid" | "partial" | "debt";
  jatuhTempo: string | null;
  tanggal: string;
  waktu: number;
  namaAkun: string | null;
  jumlahItem: number;
  rincian: string;
};

export async function getDaftarPembelian(
  outletId: string,
  batas = 50,
): Promise<BarisPembelian[]> {
  return db.all<BarisPembelian>(sql`
    SELECT p.id            AS id,
           p.supplier_name AS supplier,
           p.total         AS total,
           p.paid_amount   AS dibayar,
           p.remaining     AS sisa,
           p.status        AS status,
           p.due_date      AS jatuhTempo,
           p.business_date AS tanggal,
           p.occurred_at   AS waktu,
           a.name          AS namaAkun,
           (SELECT COUNT(*) FROM purchase_items i WHERE i.purchase_id = p.id) AS jumlahItem,
           (SELECT GROUP_CONCAT(i.name_snapshot, ', ') FROM purchase_items i
             WHERE i.purchase_id = p.id)                                      AS rincian
      FROM purchases p
      LEFT JOIN cash_accounts a ON a.id = p.cash_account_id
     WHERE p.outlet_id = ${outletId}
     ORDER BY p.occurred_at DESC
     LIMIT ${batas}
  `);
}

/** Barang siap jual yang stoknya dilacak — bisa ikut masuk nota belanja. */
export type ProdukBelanja = {
  id: string;
  nama: string;
  stok: number;
  modal: number;
  satuan: string;
  hppResep: number;
};

export async function getProdukUntukBelanja(
  outletId: string,
): Promise<ProdukBelanja[]> {
  return db.all<ProdukBelanja>(sql`
    SELECT id                            AS id,
           name                          AS nama,
           stock                         AS stok,
           cost                          AS modal,
           unit                          AS satuan,
           CASE WHEN hpp_mode = 'resep' THEN 1 ELSE 0 END AS hppResep
      FROM products
     WHERE outlet_id = ${outletId} AND is_active = 1 AND lacak_stok = 1
     ORDER BY name COLLATE NOCASE
  `);
}

export async function getStatistikPembelian(outletId: string, dari: string) {
  const row = db.get<{ belanja: number; nota: number }>(sql`
    SELECT COALESCE(SUM(total), 0) AS belanja, COUNT(*) AS nota
      FROM purchases
     WHERE outlet_id = ${outletId} AND business_date >= ${dari}
  `);

  const hutang = db.get<{ sisa: number; jumlah: number; tempo: number }>(sql`
    SELECT COALESCE(SUM(remaining), 0) AS sisa,
           COUNT(*)                    AS jumlah,
           COALESCE(SUM(CASE WHEN due_date IS NOT NULL
                              AND due_date <= date('now', 'localtime')
                             THEN 1 ELSE 0 END), 0) AS tempo
      FROM purchases
     WHERE outlet_id = ${outletId} AND status != 'paid'
  `);

  return {
    belanja: row?.belanja ?? 0,
    nota: row?.nota ?? 0,
    hutangSupplier: hutang?.sisa ?? 0,
    jumlahHutang: hutang?.jumlah ?? 0,
    jatuhTempo: hutang?.tempo ?? 0,
  };
}
