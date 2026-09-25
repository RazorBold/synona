import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import { statusLangganan, type Paket, type StatusLangganan } from "@/lib/paket";
import { daftarAdminTrafik } from "@/server/trafik";

export type BarisUsaha = {
  userId: string;
  pemilik: string;
  telepon: string | null;
  terdaftar: number;
  usaha: string | null;
  jenis: "dagang" | "jasa" | "campuran" | null;
  namaPengguna: string | null;
  loginAktif: boolean;
  jumlahKasir: number;
  transaksi30: number;
  transaksiTerakhir: number | null;
  paket: Paket;
  berakhir: number | null;
  masaCobaSampai: number | null;
  status: StatusLangganan;
};

/**
 * Semua usaha yang terdaftar, satu baris per pemilik (outlet pertamanya).
 * Akun pengelola platform sendiri tidak ikut — ia bukan pelanggan.
 */
export function daftarUsaha(): BarisUsaha[] {
  const sebulan = Date.now() - 30 * 86_400_000;
  const rows = db.all<{
    userId: string;
    pemilik: string;
    telepon: string | null;
    terdaftar: number;
    wajibBayar: number;
    paket: Paket;
    berakhir: number | null;
    masaCobaSampai: number | null;
    usaha: string | null;
    jenis: BarisUsaha["jenis"];
    namaPengguna: string | null;
    loginAktif: number | null;
    jumlahKasir: number;
    transaksi30: number;
    transaksiTerakhir: number | null;
  }>(sql`
    SELECT u.id AS userId, u.name AS pemilik, u.phone AS telepon,
           u.created_at AS terdaftar, u.wajib_bayar AS wajibBayar,
           u.plan AS paket, u.plan_ends_at AS berakhir,
           u.trial_ends_at AS masaCobaSampai,
           o.name AS usaha, o.jenis_usaha AS jenis,
           p.nama_pengguna AS namaPengguna, p.aktif AS loginAktif,
           (SELECT COUNT(*) FROM staff s WHERE s.outlet_id = o.id AND s.role = 'kasir'
                                          AND s.is_active = 1) AS jumlahKasir,
           (SELECT COUNT(*) FROM transactions t WHERE t.outlet_id = o.id
                                                 AND t.occurred_at > ${sebulan}) AS transaksi30,
           (SELECT MAX(t.occurred_at) FROM transactions t WHERE t.outlet_id = o.id) AS transaksiTerakhir
      FROM users u
      JOIN outlets o ON o.id = (SELECT id FROM outlets WHERE owner_id = u.id
                                 ORDER BY created_at LIMIT 1)
      LEFT JOIN pengguna p ON p.user_id = u.id
     ORDER BY u.created_at DESC
  `);

  const admin = new Set(daftarAdminTrafik());
  return rows
    .filter((r) => !(r.namaPengguna && admin.has(r.namaPengguna)))
    .map((r) => ({
      userId: r.userId,
      pemilik: r.pemilik,
      telepon: r.telepon,
      terdaftar: r.terdaftar,
      usaha: r.usaha,
      jenis: r.jenis,
      namaPengguna: r.namaPengguna,
      loginAktif: r.loginAktif === 1,
      jumlahKasir: r.jumlahKasir,
      transaksi30: r.transaksi30,
      transaksiTerakhir: r.transaksiTerakhir,
      paket: r.paket,
      berakhir: r.berakhir,
      masaCobaSampai: r.masaCobaSampai,
      status: statusLangganan({
        wajibBayar: r.wajibBayar,
        planEndsAt: r.berakhir,
        trialEndsAt: r.masaCobaSampai,
      }),
    }));
}

/** Jumlah tagihan yang menunggu keputusan — untuk lencana di menu admin. */
export function jumlahPerluDiperiksa(): number {
  return (
    db.get<{ n: number }>(sql`
      SELECT COUNT(*) AS n FROM pembayaran_langganan WHERE status IN ('menunggu', 'diperiksa')
    `)?.n ?? 0
  );
}
