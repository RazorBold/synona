"use server";

import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { reminders } from "@/db/schema";
import { businessDate, tambahHari } from "@/lib/date";
import { getOutletAktif } from "@/server/queries/dashboard";

export type HasilAksi = { ok: true; jumlah?: number } | { ok: false; error: string };

/**
 * Menyusun ulang pengingat dari keadaan usaha saat ini.
 *
 * Pengingat sengaja **diturunkan dari data**, bukan diketik manual: kalau
 * kasbon sudah lunas atau stok sudah diisi, pengingatnya hilang sendiri.
 * Yang sudah ditandai selesai tidak dibuat ulang pada hari yang sama.
 */
export async function segarkanPengingat(): Promise<HasilAksi> {
  const outlet = await getOutletAktif();
  const hariIni = businessDate(new Date(), outlet.timezone);
  const besok = tambahHari(hariIni, 1);
  const sekarang = Date.now();

  try {
    const jumlah = db.transaction((tx) => {
      // Pengingat lama yang masih menunggu dibuang dulu supaya tidak menumpuk;
      // yang sudah dikerjakan atau terkirim tetap disimpan sebagai jejak.
      tx.run(sql`
        DELETE FROM reminders
         WHERE outlet_id = ${outlet.id} AND status = 'pending'
      `);

      const baris: (typeof reminders.$inferInsert)[] = [];

      const kasbon = tx.all<{
        id: string;
        nama: string;
        sisa: number;
        jatuhTempo: string | null;
      }>(sql`
        SELECT d.id AS id, c.name AS nama, d.remaining AS sisa,
               d.due_date AS jatuhTempo
          FROM debts d JOIN customers c ON c.id = d.customer_id
         WHERE d.outlet_id = ${outlet.id} AND d.status != 'paid'
           AND d.due_date IS NOT NULL AND d.due_date < ${besok}
         ORDER BY d.due_date
      `);

      for (const k of kasbon) {
        baris.push({
          id: nanoid(),
          outletId: outlet.id,
          type: "debt_due",
          refId: k.id,
          title: `Tagih ${k.nama}`,
          body: `Kasbon Rp ${k.sisa.toLocaleString("id-ID")} jatuh tempo ${k.jatuhTempo}`,
          scheduledAt: sekarang,
        });
      }

      const stok = tx.all<{ id: string; nama: string; stok: number; unit: string }>(sql`
        SELECT id, name AS nama, stock AS stok, unit
          FROM products
         WHERE outlet_id = ${outlet.id} AND is_active = 1
           AND stock <= low_stock_threshold
         ORDER BY stock
         LIMIT 20
      `);

      for (const s of stok) {
        baris.push({
          id: nanoid(),
          outletId: outlet.id,
          type: "low_stock",
          refId: s.id,
          title: `Pesan ulang ${s.nama}`,
          body:
            s.stok <= 0
              ? "Stok habis"
              : `Sisa ${s.stok} ${s.unit}, sudah di bawah batas`,
          scheduledAt: sekarang,
        });
      }

      const bahan = tx.all<{ id: string; nama: string; stok: number; unit: string }>(sql`
        SELECT id, name AS nama, stock AS stok, unit
          FROM materials
         WHERE outlet_id = ${outlet.id} AND is_active = 1
           AND stock <= low_stock_threshold
         ORDER BY stock
         LIMIT 20
      `);

      for (const b of bahan) {
        baris.push({
          id: nanoid(),
          outletId: outlet.id,
          type: "low_stock",
          refId: b.id,
          title: `Beli bahan ${b.nama}`,
          body:
            b.stok <= 0
              ? "Bahan habis, produksi akan berhenti"
              : `Sisa ${b.stok} ${b.unit}`,
          scheduledAt: sekarang,
        });
      }

      // Tutup buku hari ini belum dibuat?
      const rekon = tx.get<{ n: number }>(sql`
        SELECT COUNT(*) AS n FROM reconciliations
         WHERE outlet_id = ${outlet.id} AND business_date = ${hariIni}
      `);
      const adaTransaksi = tx.get<{ n: number }>(sql`
        SELECT COUNT(*) AS n FROM transactions
         WHERE outlet_id = ${outlet.id} AND business_date = ${hariIni}
      `);

      if (!rekon?.n && (adaTransaksi?.n ?? 0) > 0) {
        baris.push({
          id: nanoid(),
          outletId: outlet.id,
          type: "daily_report",
          title: "Tutup buku hari ini",
          body: "Cocokkan kas laci dengan catatan sistem sebelum tutup toko",
          scheduledAt: sekarang,
        });
      }

      // Beban rutin bulan berjalan belum dicatat?
      const bebanRutin = tx.get<{ n: number }>(sql`
        SELECT COUNT(*) AS n FROM expenses
         WHERE outlet_id = ${outlet.id} AND berulang = 1
           AND substr(business_date, 1, 7) = ${hariIni.slice(0, 7)}
      `);

      if (!bebanRutin?.n) {
        baris.push({
          id: nanoid(),
          outletId: outlet.id,
          type: "daily_report",
          title: "Catat beban rutin bulan ini",
          body: "Listrik, gaji, dan sewa belum dicatat — laba bersih & BEP belum akurat",
          scheduledAt: sekarang,
        });
      }

      if (baris.length > 0) tx.insert(reminders).values(baris).run();
      return baris.length;
    });

    revalidatePath("/pengingat");
    revalidatePath("/");
    return { ok: true, jumlah };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal menyusun pengingat",
    };
  }
}

const UbahStatus = z.object({
  id: z.string().min(1),
  status: z.enum(["pending", "sent", "dismissed"]),
});

export async function ubahStatusPengingat(input: unknown): Promise<HasilAksi> {
  const parsed = UbahStatus.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Data tidak valid" };
  const d = parsed.data;
  const outlet = await getOutletAktif();

  try {
    db.update(reminders)
      .set({
        status: d.status,
        sentAt: d.status === "sent" ? Date.now() : null,
      })
      .where(
        and(eq(reminders.id, d.id), eq(reminders.outletId, outlet.id)),
      )
      .run();
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal memperbarui pengingat",
    };
  }

  revalidatePath("/pengingat");
  revalidatePath("/");
  return { ok: true };
}
