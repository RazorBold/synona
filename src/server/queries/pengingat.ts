import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";

export type JenisPengingat = "debt_due" | "low_stock" | "daily_report";

export type BarisPengingat = {
  id: string;
  jenis: JenisPengingat;
  refId: string | null;
  judul: string;
  isi: string | null;
  status: "pending" | "sent" | "dismissed";
  dijadwalkan: number;
  dikirimPada: number | null;
  telepon: string | null;
  nama: string | null;
  sisa: number | null;
};

/**
 * Pengingat beserta data yang dibutuhkan untuk aksinya — nomor WhatsApp dan
 * sisa utang ikut diambil supaya tombol "Ingatkan" bisa langsung menyusun
 * pesan tanpa query tambahan.
 */
export async function getDaftarPengingat(
  outletId: string,
): Promise<BarisPengingat[]> {
  return db.all<BarisPengingat>(sql`
    SELECT r.id AS id, r.type AS jenis, r.ref_id AS refId, r.title AS judul,
           r.body AS isi, r.status AS status, r.scheduled_at AS dijadwalkan,
           r.sent_at AS dikirimPada,
           c.phone AS telepon, c.name AS nama, d.remaining AS sisa
      FROM reminders r
      LEFT JOIN debts d ON d.id = r.ref_id AND r.type = 'debt_due'
      LEFT JOIN customers c ON c.id = d.customer_id
     WHERE r.outlet_id = ${outletId}
     ORDER BY r.status = 'dismissed', r.status = 'sent',
              r.type, r.scheduled_at DESC
     LIMIT 80
  `);
}

export async function getStatistikPengingat(outletId: string) {
  const row = db.get<{
    menunggu: number;
    terkirim: number;
    selesai: number;
    kasbon: number;
    stok: number;
  }>(sql`
    SELECT COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS menunggu,
           COALESCE(SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END), 0) AS terkirim,
           COALESCE(SUM(CASE WHEN status = 'dismissed' THEN 1 ELSE 0 END), 0) AS selesai,
           COALESCE(SUM(CASE WHEN type = 'debt_due' AND status = 'pending' THEN 1 ELSE 0 END), 0) AS kasbon,
           COALESCE(SUM(CASE WHEN type = 'low_stock' AND status = 'pending' THEN 1 ELSE 0 END), 0) AS stok
      FROM reminders
     WHERE outlet_id = ${outletId}
  `);

  return {
    menunggu: row?.menunggu ?? 0,
    terkirim: row?.terkirim ?? 0,
    selesai: row?.selesai ?? 0,
    kasbon: row?.kasbon ?? 0,
    stok: row?.stok ?? 0,
  };
}
