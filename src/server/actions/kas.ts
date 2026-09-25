"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { cashAccounts, cashTransfers, otherIncomes } from "@/db/schema";
import { businessDate } from "@/lib/date";
import { wajibSesi } from "@/server/auth";
import { getOutletMenulis } from "@/server/queries/dashboard";

export type HasilAksi = { ok: true } | { ok: false; error: string };

const AkunInput = z.object({
  id: z.string().nullable().default(null),
  nama: z.string().trim().min(2, "Nama akun minimal 2 huruf").max(60),
  jenis: z.enum(["kas", "bank", "ewallet"]),
  namaBank: z.string().trim().max(40).nullable().default(null),
  nomorRekening: z.string().trim().max(40).nullable().default(null),
  saldoAwal: z.coerce.number().int().min(0).default(0),
  metodeDefault: z.enum(["cash", "qris", "transfer"]).nullable().default(null),
});

export async function simpanAkunKas(input: unknown): Promise<HasilAksi> {
  await wajibSesi();
  const parsed = AkunInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const d = parsed.data;
  const outlet = await getOutletMenulis();

  try {
    db.transaction((tx) => {
      // Satu metode hanya boleh punya satu akun default. Alih-alih menolak
      // dengan galat unique index, akun lama yang memegang metode itu
      // dilepas — pemilik memang sedang memindahkannya ke akun ini.
      if (d.metodeDefault) {
        tx.update(cashAccounts)
          .set({ metodeDefault: null })
          .where(
            and(
              eq(cashAccounts.outletId, outlet.id),
              eq(cashAccounts.metodeDefault, d.metodeDefault),
              d.id ? ne(cashAccounts.id, d.id) : sql`1 = 1`,
            ),
          )
          .run();
      }

      if (d.id) {
        const ada = tx
          .select({ id: cashAccounts.id })
          .from(cashAccounts)
          .where(
            and(eq(cashAccounts.id, d.id), eq(cashAccounts.outletId, outlet.id)),
          )
          .get();
        if (!ada) throw new Error("Akun tidak ditemukan di outlet ini");

        tx.update(cashAccounts)
          .set({
            name: d.nama,
            type: d.jenis,
            bankName: d.jenis === "kas" ? null : d.namaBank,
            accountNumber: d.jenis === "kas" ? null : d.nomorRekening,
            openingBalance: d.saldoAwal,
            metodeDefault: d.metodeDefault,
          })
          .where(eq(cashAccounts.id, d.id))
          .run();
        return;
      }

      const urutan = tx
        .get<{ n: number }>(
          sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM cash_accounts
               WHERE outlet_id = ${outlet.id}`,
        );

      tx.insert(cashAccounts)
        .values({
          id: nanoid(),
          outletId: outlet.id,
          name: d.nama,
          type: d.jenis,
          bankName: d.jenis === "kas" ? null : d.namaBank,
          accountNumber: d.jenis === "kas" ? null : d.nomorRekening,
          openingBalance: d.saldoAwal,
          metodeDefault: d.metodeDefault,
          sortOrder: urutan?.n ?? 0,
        })
        .run();
    });
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidateKas();
  return { ok: true };
}

/**
 * Akun diarsipkan, bukan dihapus: mutasi lama masih menunjuk ke sana, dan
 * menghapusnya akan membuat riwayat arus kas berlubang.
 */
export async function arsipkanAkunKas(id: string): Promise<HasilAksi> {
  await wajibSesi();
  const outlet = await getOutletMenulis();

  try {
    const sisa = db.get<{ n: number }>(sql`
      SELECT COUNT(*) AS n FROM cash_accounts
       WHERE outlet_id = ${outlet.id} AND is_active = 1 AND id != ${id}
    `);
    if ((sisa?.n ?? 0) === 0) {
      throw new Error("Minimal satu akun kas harus tetap aktif");
    }

    db.update(cashAccounts)
      .set({ isActive: 0, metodeDefault: null })
      .where(and(eq(cashAccounts.id, id), eq(cashAccounts.outletId, outlet.id)))
      .run();
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidateKas();
  return { ok: true };
}

const TransferInput = z.object({
  dariAkunId: z.string().min(1, "Pilih akun asal"),
  keAkunId: z.string().min(1, "Pilih akun tujuan"),
  jumlah: z.coerce.number().int().positive("Jumlah harus lebih dari 0"),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
  catatan: z.string().trim().max(160).nullable().default(null),
});

/** Setor tunai ke bank, tarik tunai, pindah saldo — bukan untung/rugi. */
export async function simpanTransferKas(input: unknown): Promise<HasilAksi> {
  await wajibSesi();
  const parsed = TransferInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const d = parsed.data;
  const outlet = await getOutletMenulis();

  if (d.dariAkunId === d.keAkunId) {
    return { ok: false, error: "Akun asal dan tujuan tidak boleh sama" };
  }

  try {
    const milik = db.get<{ n: number }>(sql`
      SELECT COUNT(*) AS n FROM cash_accounts
       WHERE outlet_id = ${outlet.id}
         AND id IN (${d.dariAkunId}, ${d.keAkunId})
    `);
    if ((milik?.n ?? 0) !== 2) throw new Error("Akun tidak ditemukan di outlet ini");

    db.insert(cashTransfers)
      .values({
        id: nanoid(),
        outletId: outlet.id,
        fromAccountId: d.dariAkunId,
        toAccountId: d.keAkunId,
        amount: d.jumlah,
        note: d.catatan,
        occurredAt: Date.now(),
        businessDate: d.tanggal,
        recordedBy: outlet.ownerId,
      })
      .run();
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidateKas();
  return { ok: true };
}

export async function hapusTransferKas(id: string): Promise<HasilAksi> {
  await wajibSesi();
  const outlet = await getOutletMenulis();

  try {
    db.delete(cashTransfers)
      .where(
        and(eq(cashTransfers.id, id), eq(cashTransfers.outletId, outlet.id)),
      )
      .run();
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidateKas();
  return { ok: true };
}

/* ------------------------------------------------- pemasukan lain */

const PemasukanInput = z.object({
  kategori: z.enum(["modal", "pinjaman", "hibah", "lainnya"]),
  nama: z.string().trim().min(2, "Keterangan minimal 2 huruf").max(80),
  jumlah: z.coerce.number().int().positive("Jumlah harus lebih dari 0").max(10_000_000_000),
  akunId: z.string().min(1, "Pilih akun tujuan uangnya"),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
  catatan: z.string().trim().max(200).nullable().default(null),
});

/**
 * Mencatat uang masuk yang bukan penjualan (modal, pinjaman, hibah).
 *
 * Hanya menambah saldo akun kas — sengaja tidak menyentuh omzet atau laba,
 * karena modal dan pinjaman bukan pendapatan usaha. Kalau dicampur dengan
 * penjualan, laporan "untung" akan melonjak palsu setiap pemilik menyetor
 * uang pribadinya.
 */
export async function simpanPemasukanLain(input: unknown): Promise<HasilAksi> {
  await wajibSesi();
  const parsed = PemasukanInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const d = parsed.data;
  const outlet = await getOutletMenulis();

  try {
    const milik = db.get<{ id: string }>(sql`
      SELECT id FROM cash_accounts
       WHERE id = ${d.akunId} AND outlet_id = ${outlet.id} AND is_active = 1
    `);
    if (!milik) throw new Error("Akun tidak ditemukan di outlet ini");

    db.insert(otherIncomes)
      .values({
        id: nanoid(),
        outletId: outlet.id,
        category: d.kategori,
        name: d.nama,
        amount: d.jumlah,
        cashAccountId: d.akunId,
        note: d.catatan,
        occurredAt: Date.now(),
        businessDate: d.tanggal,
        recordedBy: outlet.ownerId,
      })
      .run();
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidateKas();
  return { ok: true };
}

export async function hapusPemasukanLain(id: string): Promise<HasilAksi> {
  await wajibSesi();
  const outlet = await getOutletMenulis();

  try {
    db.delete(otherIncomes)
      .where(and(eq(otherIncomes.id, id), eq(otherIncomes.outletId, outlet.id)))
      .run();
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidateKas();
  return { ok: true };
}

function revalidateKas() {
  revalidatePath("/kas");
  revalidatePath("/laporan");
  revalidatePath("/");
}

function pesan(e: unknown): string {
  return e instanceof Error ? e.message : "Gagal menyimpan";
}

/** Dipakai halaman/dialog yang butuh daftar akun tanpa memuat ulang server. */
export async function ambilAkunKas() {
  await wajibSesi();
  const outlet = await getOutletMenulis();
  return db.all<{ id: string; nama: string; jenis: string }>(sql`
    SELECT id, name AS nama, type AS jenis FROM cash_accounts
     WHERE outlet_id = ${outlet.id} AND is_active = 1
     ORDER BY sort_order, name COLLATE NOCASE
  `);
}
