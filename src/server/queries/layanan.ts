import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import type { SatuanLayanan } from "@/lib/usaha";

export type BarisLayanan = {
  id: string;
  nama: string;
  emoji: string | null;
  kategoriId: string | null;
  namaKategori: string | null;
  harga: number;
  modal: number;
  satuan: SatuanLayanan;
  hargaBisaDiubah: number;
  estimasiJam: number;
  dipakai: number;
  omzet30: number;
};

export async function getDaftarLayanan(
  outletId: string,
): Promise<BarisLayanan[]> {
  return db.all<BarisLayanan>(sql`
    SELECT s.id                 AS id,
           s.name               AS nama,
           s.emoji              AS emoji,
           s.category_id        AS kategoriId,
           k.name               AS namaKategori,
           s.price              AS harga,
           s.cost               AS modal,
           s.unit               AS satuan,
           s.harga_bisa_diubah  AS hargaBisaDiubah,
           s.estimasi_jam       AS estimasiJam,
           (SELECT COUNT(*) FROM transaction_items i
             WHERE i.service_id = s.id)                        AS dipakai,
           COALESCE((SELECT SUM(i.line_total)
                       FROM transaction_items i
                       JOIN transactions t ON t.id = i.transaction_id
                      WHERE i.service_id = s.id AND t.status != 'void'
                        AND t.business_date >= date('now', 'localtime', '-30 day')), 0)
                                                               AS omzet30
      FROM services s
      LEFT JOIN categories k ON k.id = s.category_id
     WHERE s.outlet_id = ${outletId} AND s.is_active = 1
     ORDER BY s.name COLLATE NOCASE
  `);
}

export async function getStatistikLayanan(outletId: string, dari: string) {
  const row = db.get<{ jumlah: number; hargaRata: number }>(sql`
    SELECT COUNT(*) AS jumlah, COALESCE(CAST(AVG(price) AS INTEGER), 0) AS hargaRata
      FROM services
     WHERE outlet_id = ${outletId} AND is_active = 1
  `);

  const pakai = db.get<{ omzet: number; baris: number }>(sql`
    SELECT COALESCE(SUM(i.line_total), 0) AS omzet, COUNT(*) AS baris
      FROM transaction_items i
      JOIN transactions t ON t.id = i.transaction_id
     WHERE t.outlet_id = ${outletId} AND t.status != 'void'
       AND i.service_id IS NOT NULL
       AND t.business_date >= ${dari}
  `);

  return {
    jumlah: row?.jumlah ?? 0,
    hargaRata: row?.hargaRata ?? 0,
    omzet: pakai?.omzet ?? 0,
    baris: pakai?.baris ?? 0,
  };
}

/** Pendapatan per petugas — dasar pembagian komisi. */
export type BarisPetugas = {
  staffId: string | null;
  nama: string;
  jumlahPekerjaan: number;
  omzet: number;
  margin: number;
};

export async function getPendapatanPetugas(
  outletId: string,
  dari: string,
  sampai: string,
): Promise<BarisPetugas[]> {
  return db.all<BarisPetugas>(sql`
    SELECT i.petugas_staff_id                       AS staffId,
           COALESCE(u.name, 'Belum ditandai')       AS nama,
           COUNT(*)                                 AS jumlahPekerjaan,
           COALESCE(SUM(i.line_total), 0)           AS omzet,
           COALESCE(SUM(i.price_snapshot - i.cost_snapshot), 0) AS margin
      FROM transaction_items i
      JOIN transactions t ON t.id = i.transaction_id
      LEFT JOIN staff st ON st.id = i.petugas_staff_id
      LEFT JOIN users u ON u.id = st.user_id
     WHERE t.outlet_id = ${outletId} AND t.status != 'void'
       AND i.service_id IS NOT NULL
       AND t.business_date BETWEEN ${dari} AND ${sampai}
     GROUP BY i.petugas_staff_id
     ORDER BY omzet DESC
  `);
}
