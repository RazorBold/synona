"use server";

import { addDays } from "date-fns";
import { eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { pengguna, users } from "@/db/schema";
import { wajibSesi } from "@/server/auth";
import { adminPlatform } from "@/server/langganan";
import { daftarAdminTrafik } from "@/server/trafik";

type HasilAksi = { ok: true } | { ok: false; error: string };

async function wajibAdmin() {
  const sesi = await wajibSesi();
  if (!adminPlatform(sesi)) throw new Error("Tidak berhak");
  return sesi;
}

/** Semua akun login (pemilik + kasir) milik usaha seorang pemilik. */
function akunMilikUsaha(userId: string): { id: string; namaPengguna: string }[] {
  return db.all<{ id: string; namaPengguna: string }>(sql`
    SELECT DISTINCT p.id AS id, p.nama_pengguna AS namaPengguna
      FROM pengguna p
     WHERE p.user_id = ${userId}
        OR p.user_id IN (SELECT s.user_id FROM staff s
                           JOIN outlets o ON o.id = s.outlet_id
                          WHERE o.owner_id = ${userId})
  `);
}

/**
 * Menonaktifkan / mengaktifkan login seluruh usaha (pemilik dan kasirnya).
 * Datanya tidak disentuh sama sekali. Sesi yang masih hidup ikut terputus
 * karena `akunSesi()` memeriksa kolom `aktif` di setiap permintaan.
 */
export async function aturLoginUsaha(userId: string, aktif: boolean): Promise<HasilAksi> {
  try {
    await wajibAdmin();
    const akun = akunMilikUsaha(String(userId));
    if (akun.length === 0) throw new Error("Usaha ini tidak punya akun login");
    const admin = new Set(daftarAdminTrafik());
    if (akun.some((a) => admin.has(a.namaPengguna))) {
      throw new Error("Akun pengelola tidak bisa dinonaktifkan dari sini");
    }
    db.update(pengguna)
      .set({ aktif: aktif ? 1 : 0 })
      .where(inArray(pengguna.id, akun.map((a) => a.id)))
      .run();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal mengubah akun" };
  }
  revalidatePath("/admin/akun");
  return { ok: true };
}

/**
 * Menambah masa langganan tanpa pembayaran (masa coba, kompensasi gangguan).
 * Dihitung dari tanggal berakhir yang masih berjalan, atau dari hari ini.
 */
export async function tambahMasa(userId: string, hari: number): Promise<HasilAksi> {
  if (![7, 30].includes(hari)) return { ok: false, error: "Pilihan masa tidak sah" };
  try {
    await wajibAdmin();
    const u = db
      .select({ wajibBayar: users.wajibBayar, planEndsAt: users.planEndsAt })
      .from(users)
      .where(eq(users.id, String(userId)))
      .get();
    if (!u) throw new Error("Usaha tidak ditemukan");
    if (u.wajibBayar !== 1) throw new Error("Akun lama ini tidak memakai masa langganan");
    const dari = Math.max(Date.now(), u.planEndsAt ?? 0);
    db.update(users)
      .set({ planEndsAt: addDays(new Date(dari), hari).getTime() })
      .where(eq(users.id, String(userId)))
      .run();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal menambah masa" };
  }
  revalidatePath("/admin/akun");
  return { ok: true };
}
