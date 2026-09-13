import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import type { Paket } from "@/lib/paket";

export type BarisOutlet = {
  id: string;
  nama: string;
  alamat: string | null;
  telepon: string | null;
  zona: string;
  aktif: number;
  jumlahStaf: number;
  jumlahProduk: number;
  omzetBulanIni: number;
};

export async function getDaftarOutlet(
  ownerId: string,
  bulan: string,
): Promise<BarisOutlet[]> {
  return db.all<BarisOutlet>(sql`
    SELECT o.id AS id, o.name AS nama, o.address AS alamat, o.phone AS telepon,
           o.timezone AS zona, o.is_active AS aktif,
           (SELECT COUNT(*) FROM staff s
             WHERE s.outlet_id = o.id AND s.is_active = 1) AS jumlahStaf,
           (SELECT COUNT(*) FROM products p
             WHERE p.outlet_id = o.id AND p.is_active = 1) AS jumlahProduk,
           COALESCE((SELECT SUM(t.total) FROM transactions t
                      WHERE t.outlet_id = o.id AND t.status != 'void'
                        AND substr(t.business_date, 1, 7) = ${bulan}), 0) AS omzetBulanIni
      FROM outlets o
     WHERE o.owner_id = ${ownerId}
     ORDER BY o.created_at
  `);
}

export type BarisStaf = {
  id: string;
  userId: string;
  nama: string;
  email: string;
  telepon: string | null;
  peran: "owner" | "kasir";
  aktif: number;
  outletId: string;
  namaOutlet: string;
  transaksiBulanIni: number;
  /** Nama pengguna untuk masuk, atau NULL kalau staf ini belum diberi akses. */
  namaPengguna: string | null;
  /** 1 kalau akunnya ada dan masih boleh dipakai masuk. */
  akunAktif: number | null;
};

export async function getDaftarStaf(
  ownerId: string,
  bulan: string,
): Promise<BarisStaf[]> {
  return db.all<BarisStaf>(sql`
    SELECT s.id AS id, u.id AS userId, u.name AS nama, u.email AS email,
           u.phone AS telepon, s.role AS peran, s.is_active AS aktif,
           o.id AS outletId, o.name AS namaOutlet,
           p.nama_pengguna AS namaPengguna, p.aktif AS akunAktif,
           COALESCE((SELECT COUNT(*) FROM transactions t
                      WHERE t.staff_id = s.id
                        AND substr(t.business_date, 1, 7) = ${bulan}), 0) AS transaksiBulanIni
      FROM staff s
      JOIN users u ON u.id = s.user_id
      JOIN outlets o ON o.id = s.outlet_id
      LEFT JOIN pengguna p ON p.user_id = u.id
     WHERE o.owner_id = ${ownerId}
     ORDER BY s.role, u.name COLLATE NOCASE
  `);
}

export async function getPemilik(ownerId: string) {
  return db.get<{
    id: string;
    nama: string;
    email: string;
    telepon: string | null;
    paket: Paket;
    berlakuSampai: number | null;
  }>(sql`
    SELECT id, name AS nama, email, phone AS telepon,
           plan AS paket, plan_ends_at AS berlakuSampai
      FROM users WHERE id = ${ownerId}
  `);
}
