import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import type { SatuanBahan } from "@/lib/satuan";

export type BarisBahan = {
  id: string;
  nama: string;
  satuan: SatuanBahan;
  stok: number;
  hargaMilli: number;
  batasStok: number;
  nilaiStok: number;
  dipakaiOleh: number;
  pergerakanTerakhir: number | null;
};

export async function getDaftarBahan(outletId: string): Promise<BarisBahan[]> {
  return db.all<BarisBahan>(sql`
    SELECT m.id                                        AS id,
           m.name                                      AS nama,
           m.unit                                      AS satuan,
           m.stock                                     AS stok,
           m.cost_per_unit_milli                       AS hargaMilli,
           m.low_stock_threshold                       AS batasStok,
           CAST(ROUND(m.stock * m.cost_per_unit_milli / 1000.0) AS INTEGER) AS nilaiStok,
           (SELECT COUNT(*) FROM recipe_items r WHERE r.material_id = m.id)  AS dipakaiOleh,
           (SELECT MAX(mv.created_at) FROM material_movements mv
             WHERE mv.material_id = m.id)              AS pergerakanTerakhir
      FROM materials m
     WHERE m.outlet_id = ${outletId} AND m.is_active = 1
     ORDER BY m.name COLLATE NOCASE
  `);
}

export async function getStatistikBahan(outletId: string) {
  const row = db.get<{
    jumlah: number;
    nilai: number;
    menipis: number;
    habis: number;
  }>(sql`
    SELECT COUNT(*) AS jumlah,
           COALESCE(CAST(ROUND(SUM(stock * cost_per_unit_milli) / 1000.0) AS INTEGER), 0) AS nilai,
           COALESCE(SUM(CASE WHEN stock > 0 AND stock <= low_stock_threshold THEN 1 ELSE 0 END), 0) AS menipis,
           COALESCE(SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END), 0) AS habis
      FROM materials
     WHERE outlet_id = ${outletId} AND is_active = 1
  `);

  const hutang = db.get<{ sisa: number; jumlah: number }>(sql`
    SELECT COALESCE(SUM(remaining), 0) AS sisa, COUNT(*) AS jumlah
      FROM purchases
     WHERE outlet_id = ${outletId} AND status != 'paid'
  `);

  return {
    jumlah: row?.jumlah ?? 0,
    nilai: row?.nilai ?? 0,
    menipis: row?.menipis ?? 0,
    habis: row?.habis ?? 0,
    hutangSupplier: hutang?.sisa ?? 0,
    jumlahHutang: hutang?.jumlah ?? 0,
  };
}

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
  jumlahItem: number;
  rincian: string;
};

export async function getDaftarPembelian(
  outletId: string,
  batas = 30,
): Promise<BarisPembelian[]> {
  return db.all<BarisPembelian>(sql`
    SELECT p.id           AS id,
           p.supplier_name AS supplier,
           p.total        AS total,
           p.paid_amount  AS dibayar,
           p.remaining    AS sisa,
           p.status       AS status,
           p.due_date     AS jatuhTempo,
           p.business_date AS tanggal,
           p.occurred_at  AS waktu,
           (SELECT COUNT(*) FROM purchase_items i WHERE i.purchase_id = p.id) AS jumlahItem,
           (SELECT GROUP_CONCAT(i.name_snapshot, ', ') FROM purchase_items i
             WHERE i.purchase_id = p.id)                                      AS rincian
      FROM purchases p
     WHERE p.outlet_id = ${outletId}
     ORDER BY p.occurred_at DESC
     LIMIT ${batas}
  `);
}

export type PergerakanBahan = {
  id: string;
  tipe: "purchase" | "production" | "adjustment" | "waste";
  perubahan: number;
  stokAkhir: number;
  catatan: string | null;
  waktu: number;
};

export async function getRiwayatBahan(
  materialId: string,
  batas = 8,
): Promise<PergerakanBahan[]> {
  return db.all<PergerakanBahan>(sql`
    SELECT id, type AS tipe, qty_change AS perubahan,
           stock_after AS stokAkhir, note AS catatan, created_at AS waktu
      FROM material_movements
     WHERE material_id = ${materialId}
     ORDER BY created_at DESC
     LIMIT ${batas}
  `);
}
