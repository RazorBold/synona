"use server";

import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  materialMovements,
  materials,
  payablePayments,
  purchaseItems,
  purchases,
} from "@/db/schema";
import { businessDate } from "@/lib/date";
import { perbaruiHppTerkaitBahan } from "@/server/hpp";
import { getOutletAktif } from "@/server/queries/dashboard";
import { getRiwayatBahan } from "@/server/queries/bahan";

export type HasilAksi = { ok: true } | { ok: false; error: string };

/* ----------------------------------------------------- bahan baku */

const BahanInput = z.object({
  id: z.string().nullable().default(null),
  nama: z.string().trim().min(2, "Nama bahan minimal 2 huruf").max(80),
  satuan: z.enum(["g", "ml", "pcs"]),
  batasStok: z.coerce.number().int().min(0).default(0),
  stokAwal: z.coerce.number().int().min(0).default(0),
  hargaAwal: z.coerce.number().int().min(0).default(0),
});

export async function simpanBahan(input: unknown): Promise<HasilAksi> {
  const parsed = BahanInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }
  const d = parsed.data;
  const outlet = await getOutletAktif();

  try {
    db.transaction((tx) => {
      if (d.id) {
        const ada = tx
          .select({ id: materials.id })
          .from(materials)
          .where(
            and(eq(materials.id, d.id), eq(materials.outletId, outlet.id)),
          )
          .get();
        if (!ada) throw new Error("Bahan tidak ditemukan di outlet ini");

        // Stok & harga bahan hanya berubah lewat pembelian/penyesuaian,
        // supaya setiap perubahan punya jejak di material_movements.
        tx.update(materials)
          .set({
            name: d.nama,
            unit: d.satuan,
            lowStockThreshold: d.batasStok,
          })
          .where(eq(materials.id, d.id))
          .run();
        return;
      }

      const id = nanoid();
      // hargaAwal diisi per satuan besar (kg/liter/pcs) -> rupiah x1000 per
      // satuan terkecil kebetulan bernilai sama untuk g/ml (1 kg = 1000 g).
      const hargaMilli = d.satuan === "pcs" ? d.hargaAwal * 1000 : d.hargaAwal;

      tx.insert(materials)
        .values({
          id,
          outletId: outlet.id,
          name: d.nama,
          unit: d.satuan,
          stock: d.stokAwal,
          costPerUnitMilli: hargaMilli,
          lowStockThreshold: d.batasStok,
        })
        .run();

      if (d.stokAwal > 0) {
        tx.insert(materialMovements)
          .values({
            id: nanoid(),
            outletId: outlet.id,
            materialId: id,
            type: "purchase",
            qtyChange: d.stokAwal,
            stockAfter: d.stokAwal,
            costPerUnitMilli: hargaMilli,
            note: "Stok awal",
          })
          .run();
      }
    });
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidatePath("/bahan");
  revalidatePath("/");
  return { ok: true };
}

const StokBahanInput = z.object({
  materialId: z.string().min(1),
  mode: z.enum(["masuk", "keluar", "opname"]),
  jumlah: z.coerce.number().int().min(0),
  catatan: z.string().trim().max(120).nullable().default(null),
});

export async function sesuaikanStokBahan(input: unknown): Promise<HasilAksi> {
  const parsed = StokBahanInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }
  const d = parsed.data;
  const outlet = await getOutletAktif();

  try {
    db.transaction((tx) => {
      const m = tx
        .select()
        .from(materials)
        .where(
          and(
            eq(materials.id, d.materialId),
            eq(materials.outletId, outlet.id),
          ),
        )
        .get();
      if (!m) throw new Error("Bahan tidak ditemukan di outlet ini");

      const stokBaru =
        d.mode === "opname"
          ? d.jumlah
          : d.mode === "masuk"
            ? m.stock + d.jumlah
            : m.stock - d.jumlah;

      if (stokBaru < 0) throw new Error(`Stok ${m.name} hanya ${m.stock}`);
      const selisih = stokBaru - m.stock;
      if (selisih === 0) throw new Error("Tidak ada perubahan stok");

      tx.update(materials)
        .set({ stock: stokBaru })
        .where(eq(materials.id, m.id))
        .run();

      tx.insert(materialMovements)
        .values({
          id: nanoid(),
          outletId: outlet.id,
          materialId: m.id,
          type: d.mode === "keluar" ? "waste" : "adjustment",
          qtyChange: selisih,
          stockAfter: stokBaru,
          costPerUnitMilli: m.costPerUnitMilli,
          note:
            d.catatan ??
            (d.mode === "masuk"
              ? "Penyesuaian tambah"
              : d.mode === "keluar"
                ? "Rusak / terbuang"
                : "Hasil opname"),
        })
        .run();
    });
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidatePath("/bahan");
  revalidatePath("/");
  return { ok: true };
}

export async function arsipkanBahan(id: string): Promise<HasilAksi> {
  const outlet = await getOutletAktif();

  try {
    db.update(materials)
      .set({ isActive: 0 })
      .where(and(eq(materials.id, id), eq(materials.outletId, outlet.id)))
      .run();
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidatePath("/bahan");
  return { ok: true };
}

/* ------------------------------------------------------ pembelian */

const PembelianInput = z.object({
  supplier: z.string().trim().max(80).nullable().default(null),
  item: z
    .array(
      z.object({
        materialId: z.string().min(1),
        qty: z.coerce.number().int().positive(),
        total: z.coerce.number().int().min(0),
      }),
    )
    .min(1, "Belum ada bahan yang dibeli"),
  dibayar: z.coerce.number().int().min(0).default(0),
  metode: z.enum(["cash", "qris", "transfer", "other"]).default("cash"),
  jatuhTempo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .default(null),
  catatan: z.string().trim().max(200).nullable().default(null),
});

/**
 * Mencatat pembelian bahan baku.
 *
 * Harga bahan memakai **rata-rata bergerak**: stok lama dan stok baru
 * dicampur, jadi HPP tidak melonjak hanya karena satu kali beli mahal.
 */
export async function simpanPembelian(input: unknown): Promise<HasilAksi> {
  const parsed = PembelianInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }
  const d = parsed.data;
  const outlet = await getOutletAktif();
  const waktu = Date.now();
  const tanggal = businessDate(new Date(), outlet.timezone);

  try {
    db.transaction((tx) => {
      const ids = d.item.map((i) => i.materialId);
      const rows = tx
        .select()
        .from(materials)
        .where(
          and(
            eq(materials.outletId, outlet.id),
            inArray(materials.id, ids),
          ),
        )
        .all();
      const byId = new Map(rows.map((r) => [r.id, r]));

      const total = d.item.reduce((a, i) => a + i.total, 0);
      if (d.dibayar > total) {
        throw new Error("Uang dibayar melebihi total belanja");
      }

      const sisa = total - d.dibayar;
      const purchaseId = nanoid();

      tx.insert(purchases)
        .values({
          id: purchaseId,
          outletId: outlet.id,
          supplierName: d.supplier,
          total,
          paidAmount: d.dibayar,
          remaining: sisa,
          method: d.metode,
          status: sisa === 0 ? "paid" : d.dibayar > 0 ? "partial" : "debt",
          dueDate: sisa > 0 ? d.jatuhTempo : null,
          note: d.catatan,
          occurredAt: waktu,
          businessDate: tanggal,
        })
        .run();

      for (const item of d.item) {
        const m = byId.get(item.materialId);
        if (!m) throw new Error("Ada bahan yang tidak ditemukan di outlet ini");

        // rupiah x1000 per satuan terkecil
        const unitCostMilli = Math.round((item.total * 1000) / item.qty);

        tx.insert(purchaseItems)
          .values({
            id: nanoid(),
            purchaseId,
            materialId: m.id,
            nameSnapshot: m.name,
            qty: item.qty,
            unitCostMilli,
            lineTotal: item.total,
          })
          .run();

        const stokBaru = m.stock + item.qty;
        // Rata-rata bergerak; kalau stok lama minus/nol, pakai harga baru.
        const hargaBaru =
          m.stock > 0
            ? Math.round(
                (m.stock * m.costPerUnitMilli + item.qty * unitCostMilli) /
                  stokBaru,
              )
            : unitCostMilli;

        tx.update(materials)
          .set({ stock: stokBaru, costPerUnitMilli: hargaBaru })
          .where(eq(materials.id, m.id))
          .run();

        tx.insert(materialMovements)
          .values({
            id: nanoid(),
            outletId: outlet.id,
            materialId: m.id,
            type: "purchase",
            qtyChange: item.qty,
            stockAfter: stokBaru,
            costPerUnitMilli: unitCostMilli,
            refId: purchaseId,
            note: d.supplier ? `Beli dari ${d.supplier}` : "Pembelian",
          })
          .run();
      }

      // Harga bahan berubah -> HPP produk yang memakainya ikut disesuaikan.
      perbaruiHppTerkaitBahan(tx as never, outlet.id, ids);
    });
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidatePath("/bahan");
  revalidatePath("/produk");
  revalidatePath("/");
  return { ok: true };
}

const BayarHutangInput = z.object({
  purchaseId: z.string().min(1),
  jumlah: z.coerce.number().int().positive("Jumlah bayar harus lebih dari 0"),
  metode: z.enum(["cash", "qris", "transfer", "other"]).default("cash"),
  catatan: z.string().trim().max(120).nullable().default(null),
});

/** Pelunasan hutang ke supplier — pola sama dengan kasbon pelanggan. */
export async function bayarHutangSupplier(input: unknown): Promise<HasilAksi> {
  const parsed = BayarHutangInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }
  const d = parsed.data;
  const outlet = await getOutletAktif();

  try {
    db.transaction((tx) => {
      const p = tx
        .select()
        .from(purchases)
        .where(
          and(
            eq(purchases.id, d.purchaseId),
            eq(purchases.outletId, outlet.id),
          ),
        )
        .get();
      if (!p) throw new Error("Pembelian tidak ditemukan di outlet ini");
      if (p.status === "paid") throw new Error("Hutang ini sudah lunas");
      if (d.jumlah > p.remaining) {
        throw new Error(
          `Melebihi sisa hutang (sisa Rp ${p.remaining.toLocaleString("id-ID")})`,
        );
      }

      const dibayar = p.paidAmount + d.jumlah;
      const sisa = p.total - dibayar;

      tx.insert(payablePayments)
        .values({
          id: nanoid(),
          purchaseId: p.id,
          amount: d.jumlah,
          method: d.metode,
          paidAt: Date.now(),
          note: d.catatan,
          recordedBy: outlet.ownerId,
        })
        .run();

      tx.update(purchases)
        .set({
          paidAmount: dibayar,
          remaining: sisa,
          status: sisa === 0 ? "paid" : "partial",
        })
        .where(eq(purchases.id, p.id))
        .run();
    });
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidatePath("/bahan");
  revalidatePath("/");
  return { ok: true };
}

export async function ambilRiwayatBahan(materialId: string) {
  const outlet = await getOutletAktif();
  const milik = db
    .select({ id: materials.id })
    .from(materials)
    .where(
      and(eq(materials.id, materialId), eq(materials.outletId, outlet.id)),
    )
    .get();
  if (!milik) return [];
  return getRiwayatBahan(materialId, 6);
}

function pesan(e: unknown): string {
  return e instanceof Error ? e.message : "Gagal menyimpan";
}
