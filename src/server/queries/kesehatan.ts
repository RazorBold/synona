import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";

export type Status = "sehat" | "waspada" | "bahaya";

/* --------------------------------------------------------- arus kas */

export type ArusKas = {
  penjualanTunai: number;
  cicilanPiutang: number;
  /** Modal, pinjaman, hibah — menambah kas, tapi BUKAN omzet atau laba. */
  pemasukanLain: number;
  masuk: number;
  pembelianDibayar: number;
  pelunasanHutang: number;
  beban: number;
  keluar: number;
  bersih: number;
};

/**
 * Buku kas dirakit dari tabel kejadian, bukan dari tabel ledger terpisah
 * (ADR-002). Satu kejadian tetap hanya ditulis di satu tempat, jadi buku kas
 * tidak mungkin berbeda dengan penjualan.
 */
export async function getArusKas(
  outletId: string,
  dari: string,
  sampai: string,
): Promise<ArusKas> {
  const batasAwal = new Date(`${dari}T00:00:00`).getTime();
  const batasAkhir = new Date(`${sampai}T23:59:59`).getTime();

  const row = db.get<{
    penjualan: number;
    cicilan: number;
    pembelian: number;
    pelunasan: number;
    beban: number;
    lain: number;
  }>(sql`
    SELECT
      COALESCE((SELECT SUM(total) FROM transactions
                 WHERE outlet_id = ${outletId} AND status = 'paid'
                   AND business_date BETWEEN ${dari} AND ${sampai}), 0) AS penjualan,
      COALESCE((SELECT SUM(p.amount) FROM debt_payments p
                  JOIN debts d ON d.id = p.debt_id
                 WHERE d.outlet_id = ${outletId}
                   AND p.paid_at BETWEEN ${batasAwal} AND ${batasAkhir}), 0) AS cicilan,
      COALESCE((SELECT SUM(paid_amount) FROM purchases
                 WHERE outlet_id = ${outletId}
                   AND business_date BETWEEN ${dari} AND ${sampai}), 0) AS pembelian,
      COALESCE((SELECT SUM(pp.amount) FROM payable_payments pp
                  JOIN purchases pu ON pu.id = pp.purchase_id
                 WHERE pu.outlet_id = ${outletId}
                   AND pp.paid_at BETWEEN ${batasAwal} AND ${batasAkhir}), 0) AS pelunasan,
      COALESCE((SELECT SUM(amount) FROM expenses
                 WHERE outlet_id = ${outletId}
                   AND business_date BETWEEN ${dari} AND ${sampai}), 0) AS beban,
      COALESCE((SELECT SUM(amount) FROM other_incomes
                 WHERE outlet_id = ${outletId}
                   AND business_date BETWEEN ${dari} AND ${sampai}), 0) AS lain
  `);

  const masuk = (row?.penjualan ?? 0) + (row?.cicilan ?? 0) + (row?.lain ?? 0);
  const keluar =
    (row?.pembelian ?? 0) + (row?.pelunasan ?? 0) + (row?.beban ?? 0);

  return {
    penjualanTunai: row?.penjualan ?? 0,
    cicilanPiutang: row?.cicilan ?? 0,
    pemasukanLain: row?.lain ?? 0,
    masuk,
    pembelianDibayar: row?.pembelian ?? 0,
    pelunasanHutang: row?.pelunasan ?? 0,
    beban: row?.beban ?? 0,
    keluar,
    bersih: masuk - keluar,
  };
}

/* ------------------------------------------------ kesehatan keuangan */

export type KesehatanKeuangan = {
  omzet: number;
  hpp: number;
  labaKotor: number;
  beban: number;
  bebanRutin: number;
  labaBersih: number;
  marginKotor: number;
  marginBersih: number;
  piutang: number;
  hutangSupplier: number;
  bepHarian: number;
  omzetHarian: number;
  jumlahHari: number;
  status: Status;
  alasan: string;
};

export async function getKesehatanKeuangan(
  outletId: string,
  dari: string,
  sampai: string,
): Promise<KesehatanKeuangan> {
  const row = db.get<{
    omzet: number;
    laba: number;
    hpp: number;
  }>(sql`
    SELECT COALESCE(SUM(tx.total), 0) AS omzet,
           COALESCE(SUM(
             (SELECT COALESCE(SUM(i.line_total - i.cost_snapshot * i.qty), 0)
                FROM transaction_items i WHERE i.transaction_id = tx.id) - tx.discount
           ), 0) AS laba,
           COALESCE(SUM(
             (SELECT COALESCE(SUM(i.cost_snapshot * i.qty), 0)
                FROM transaction_items i WHERE i.transaction_id = tx.id)
           ), 0) AS hpp
      FROM transactions tx
     WHERE tx.outlet_id = ${outletId} AND tx.status != 'void'
       AND tx.business_date BETWEEN ${dari} AND ${sampai}
  `);

  const bebanRow = db.get<{ total: number; rutin: number }>(sql`
    SELECT COALESCE(SUM(amount), 0) AS total,
           COALESCE(SUM(CASE WHEN berulang = 1 THEN amount ELSE 0 END), 0) AS rutin
      FROM expenses
     WHERE outlet_id = ${outletId} AND business_date BETWEEN ${dari} AND ${sampai}
  `);

  const posisi = db.get<{ piutang: number; hutang: number }>(sql`
    SELECT COALESCE((SELECT SUM(remaining) FROM debts
                      WHERE outlet_id = ${outletId} AND status != 'paid'), 0) AS piutang,
           COALESCE((SELECT SUM(remaining) FROM purchases
                      WHERE outlet_id = ${outletId} AND status != 'paid'), 0) AS hutang
  `);

  const omzet = row?.omzet ?? 0;
  const labaKotor = row?.laba ?? 0;
  const beban = bebanRow?.total ?? 0;
  const bebanRutin = bebanRow?.rutin ?? 0;
  const labaBersih = labaKotor - beban;

  const jumlahHari =
    Math.round(
      (new Date(`${sampai}T00:00:00`).getTime() -
        new Date(`${dari}T00:00:00`).getTime()) /
        86_400_000,
    ) + 1;

  const marginKotor = omzet > 0 ? Math.round((labaKotor / omzet) * 100) : 0;
  const marginBersih = omzet > 0 ? Math.round((labaBersih / omzet) * 100) : 0;
  const omzetHarian = jumlahHari > 0 ? Math.round(omzet / jumlahHari) : 0;

  // BEP = beban tetap per hari dibagi margin kotor (PRD-TEKNIS.md §16.5).
  // Tanpa margin positif, titik impas tidak bisa dicapai berapa pun omzetnya.
  const bebanRutinHarian = jumlahHari > 0 ? bebanRutin / jumlahHari : 0;
  const bepHarian =
    marginKotor > 0 ? Math.round(bebanRutinHarian / (marginKotor / 100)) : 0;

  let status: Status = "sehat";
  let alasan = "Laba bersih positif dan omzet di atas titik impas";

  if (labaBersih < 0) {
    status = "bahaya";
    alasan = "Beban lebih besar daripada laba kotor";
  } else if (bepHarian > 0 && omzetHarian < bepHarian) {
    status = "waspada";
    alasan = "Omzet harian masih di bawah titik impas";
  } else if (marginKotor > 0 && marginKotor < 15) {
    status = "waspada";
    alasan = "Margin kotor tipis, sensitif terhadap kenaikan harga bahan";
  } else if (omzet === 0) {
    status = "waspada";
    alasan = "Belum ada penjualan pada periode ini";
  }

  return {
    omzet,
    hpp: row?.hpp ?? 0,
    labaKotor,
    beban,
    bebanRutin,
    labaBersih,
    marginKotor,
    marginBersih,
    piutang: posisi?.piutang ?? 0,
    hutangSupplier: posisi?.hutang ?? 0,
    bepHarian,
    omzetHarian,
    jumlahHari,
    status,
    alasan,
  };
}

/* ----------------------------------------------- kesehatan inventory */

export type BarisStokKritis = {
  nama: string;
  jenis: "produk" | "bahan";
  stok: number;
  satuan: string;
  hariTersisa: number | null;
};

export type KesehatanInventory = {
  nilaiProduk: number;
  nilaiBahan: number;
  nilaiTotal: number;
  perputaran: number;
  produkKritis: number;
  bahanKritis: number;
  stokMati: number;
  kritis: BarisStokKritis[];
  status: Status;
  alasan: string;
};

export async function getKesehatanInventory(
  outletId: string,
  dari: string,
  sampai: string,
): Promise<KesehatanInventory> {
  const nilai = db.get<{ produk: number; bahan: number }>(sql`
    SELECT COALESCE((SELECT SUM(cost * stock) FROM products
                      WHERE outlet_id = ${outletId} AND is_active = 1), 0) AS produk,
           COALESCE((SELECT CAST(ROUND(SUM(stock * cost_per_unit_milli) / 1000.0) AS INTEGER)
                       FROM materials
                      WHERE outlet_id = ${outletId} AND is_active = 1), 0) AS bahan
  `);

  const hppTerjual = db.get<{ total: number }>(sql`
    SELECT COALESCE(SUM(i.cost_snapshot * i.qty), 0) AS total
      FROM transaction_items i
      JOIN transactions tx ON tx.id = i.transaction_id
     WHERE tx.outlet_id = ${outletId} AND tx.status != 'void'
       AND tx.business_date BETWEEN ${dari} AND ${sampai}
  `);

  const kritisRow = db.get<{ produk: number; bahan: number }>(sql`
    SELECT COALESCE((SELECT COUNT(*) FROM products
                      WHERE outlet_id = ${outletId} AND is_active = 1
                        AND stock <= low_stock_threshold), 0) AS produk,
           COALESCE((SELECT COUNT(*) FROM materials
                      WHERE outlet_id = ${outletId} AND is_active = 1
                        AND stock <= low_stock_threshold), 0) AS bahan
  `);

  // Stok mati: masih ada barangnya tapi tidak bergerak lebih dari 30 hari.
  const batasMati = Date.now() - 30 * 86_400_000;
  const mati = db.get<{ n: number }>(sql`
    SELECT COUNT(*) AS n FROM products p
     WHERE p.outlet_id = ${outletId} AND p.is_active = 1 AND p.stock > 0
       AND COALESCE((SELECT MAX(sm.created_at) FROM stock_movements sm
                      WHERE sm.product_id = p.id), 0) < ${batasMati}
  `);

  const jumlahHari =
    Math.round(
      (new Date(`${sampai}T00:00:00`).getTime() -
        new Date(`${dari}T00:00:00`).getTime()) /
        86_400_000,
    ) + 1;

  // Estimasi hari tersisa = stok sekarang / rata-rata pemakaian per hari.
  const kritis = db.all<BarisStokKritis>(sql`
    SELECT nama, jenis, stok, satuan, hariTersisa FROM (
      SELECT p.name AS nama, 'produk' AS jenis, p.stock AS stok, p.unit AS satuan,
             CASE WHEN terjual.qty > 0
                  THEN CAST(p.stock / (terjual.qty * 1.0 / ${jumlahHari}) AS INTEGER)
                  ELSE NULL END AS hariTersisa,
             p.stock * 1.0 / NULLIF(p.low_stock_threshold, 0) AS rasio
        FROM products p
        LEFT JOIN (
          SELECT i.product_id AS pid, SUM(i.qty) AS qty
            FROM transaction_items i
            JOIN transactions tx ON tx.id = i.transaction_id
           WHERE tx.outlet_id = ${outletId} AND tx.status != 'void'
             AND tx.business_date BETWEEN ${dari} AND ${sampai}
           GROUP BY i.product_id
        ) terjual ON terjual.pid = p.id
       WHERE p.outlet_id = ${outletId} AND p.is_active = 1
         AND p.stock <= p.low_stock_threshold

      UNION ALL

      SELECT m.name AS nama, 'bahan' AS jenis, m.stock AS stok, m.unit AS satuan,
             CASE WHEN dipakai.qty > 0
                  THEN CAST(m.stock / (dipakai.qty * 1.0 / ${jumlahHari}) AS INTEGER)
                  ELSE NULL END AS hariTersisa,
             m.stock * 1.0 / NULLIF(m.low_stock_threshold, 0) AS rasio
        FROM materials m
        LEFT JOIN (
          SELECT material_id AS mid, SUM(-qty_change) AS qty
            FROM material_movements
           WHERE outlet_id = ${outletId} AND type = 'production'
           GROUP BY material_id
        ) dipakai ON dipakai.mid = m.id
       WHERE m.outlet_id = ${outletId} AND m.is_active = 1
         AND m.stock <= m.low_stock_threshold
    )
    ORDER BY rasio
    LIMIT 8
  `);

  const nilaiTotal = (nilai?.produk ?? 0) + (nilai?.bahan ?? 0);
  const perputaran =
    nilaiTotal > 0
      ? Math.round(((hppTerjual?.total ?? 0) / nilaiTotal) * 10) / 10
      : 0;

  const produkKritis = kritisRow?.produk ?? 0;
  const bahanKritis = kritisRow?.bahan ?? 0;
  const stokMati = mati?.n ?? 0;

  let status: Status = "sehat";
  let alasan = "Stok terkendali dan berputar wajar";

  if (kritis.some((k) => k.stok <= 0)) {
    status = "bahaya";
    alasan = "Ada barang yang sudah habis";
  } else if (produkKritis + bahanKritis > 0) {
    status = "waspada";
    alasan = `${produkKritis + bahanKritis} barang menipis, segera pesan ulang`;
  } else if (stokMati > 0) {
    status = "waspada";
    alasan = `${stokMati} barang tidak bergerak lebih dari 30 hari`;
  }

  return {
    nilaiProduk: nilai?.produk ?? 0,
    nilaiBahan: nilai?.bahan ?? 0,
    nilaiTotal,
    perputaran,
    produkKritis,
    bahanKritis,
    stokMati,
    kritis,
    status,
    alasan,
  };
}

/* --------------------------------------------- profitabilitas produk */

export type BarisProfit = {
  id: string;
  nama: string;
  emoji: string | null;
  gambar: string | null;
  qty: number;
  omzet: number;
  hpp: number;
  laba: number;
  margin: number;
};

export async function getProfitabilitasProduk(
  outletId: string,
  dari: string,
  sampai: string,
  batas = 12,
): Promise<BarisProfit[]> {
  return db.all<BarisProfit>(sql`
    SELECT p.id AS id, i.name_snapshot AS nama, p.emoji AS emoji,
           p.image_url AS gambar,
           SUM(i.qty) AS qty,
           SUM(i.line_total) AS omzet,
           SUM(i.cost_snapshot * i.qty) AS hpp,
           SUM(i.line_total - i.cost_snapshot * i.qty) AS laba,
           CAST(ROUND(
             SUM(i.line_total - i.cost_snapshot * i.qty) * 100.0 /
             NULLIF(SUM(i.line_total), 0)
           ) AS INTEGER) AS margin
      FROM transaction_items i
      JOIN transactions tx ON tx.id = i.transaction_id
      LEFT JOIN products p ON p.id = i.product_id
     WHERE tx.outlet_id = ${outletId} AND tx.status != 'void'
       AND tx.business_date BETWEEN ${dari} AND ${sampai}
     GROUP BY i.name_snapshot
     ORDER BY laba DESC
     LIMIT ${batas}
  `);
}
