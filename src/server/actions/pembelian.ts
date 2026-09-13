"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  materialMovements,
  materials,
  payablePayments,
  products,
  purchaseItems,
  purchases,
  stockMovements,
} from "@/db/schema";
import { businessDate } from "@/lib/date";
import { wajibSesi } from "@/server/auth";
import { perbaruiHppTerkaitBahan } from "@/server/hpp";
import { pilihAkunKas } from "@/server/kas";
import { getOutletAktif } from "@/server/queries/dashboard";

export type HasilAksi = { ok: true } | { ok: false; error: string };

const PembelianInput = z.object({
  supplier: z.string().trim().max(80).nullable().default(null),
  item: z
    .array(
      z.object({
        // Satu nota boleh mencampur bahan baku dan barang siap jual.
        jenis: z.enum(["bahan", "produk"]),
        refId: z.string().min(1),
        qty: z.coerce.number().int().positive(),
        total: z.coerce.number().int().min(0),
      }),
    )
    .min(1, "Belum ada barang yang dibeli"),
  dibayar: z.coerce.number().int().min(0).default(0),
  akunKasId: z.string().nullable().default(null),
  metode: z.enum(["cash", "qris", "transfer", "other"]).default("cash"),
  tanggal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .default(null),
  jatuhTempo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .default(null),
  catatan: z.string().trim().max(200).nullable().default(null),
});

/**
 * Mencatat pembelian stok — bahan baku maupun barang siap jual.
 *
 * Sengaja BUKAN beban: uang yang dipakai membeli stok belum jadi biaya,
 * ia berubah jadi persediaan dan baru menjadi HPP saat barangnya terjual.
 * Mencatatnya sebagai beban membuat laba bulan belanja terlihat anjlok lalu
 * bulan berikutnya terlihat melonjak.
 *
 * Harga modal memakai **rata-rata bergerak**: stok lama dan stok baru
 * dicampur, jadi HPP tidak melonjak hanya karena satu kali beli mahal.
 */
export async function simpanPembelian(input: unknown): Promise<HasilAksi> {
  await wajibSesi();
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
  const tanggal = d.tanggal ?? businessDate(new Date(), outlet.timezone);

  try {
    db.transaction((tx) => {
      const idBahan = d.item.filter((i) => i.jenis === "bahan").map((i) => i.refId);
      const idProduk = d.item.filter((i) => i.jenis === "produk").map((i) => i.refId);

      const bahanRows = idBahan.length
        ? tx
            .select()
            .from(materials)
            .where(
              and(
                eq(materials.outletId, outlet.id),
                inArray(materials.id, idBahan),
              ),
            )
            .all()
        : [];
      const produkRows = idProduk.length
        ? tx
            .select()
            .from(products)
            .where(
              and(
                eq(products.outletId, outlet.id),
                inArray(products.id, idProduk),
              ),
            )
            .all()
        : [];

      const bahanById = new Map(bahanRows.map((r) => [r.id, r]));
      const produkById = new Map(produkRows.map((r) => [r.id, r]));

      const total = d.item.reduce((a, i) => a + i.total, 0);
      if (d.dibayar > total) {
        throw new Error("Uang dibayar melebihi total belanja");
      }

      const akunKasId = d.dibayar > 0 ? pilihAkunKas(tx, outlet.id, d.akunKasId, d.metode) : null;

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
          cashAccountId: akunKasId,
          status: sisa === 0 ? "paid" : d.dibayar > 0 ? "partial" : "debt",
          dueDate: sisa > 0 ? d.jatuhTempo : null,
          note: d.catatan,
          occurredAt: waktu,
          businessDate: tanggal,
        })
        .run();

      for (const item of d.item) {
        // rupiah x1000 per satuan terkecil (ADR-003)
        const unitCostMilli = Math.round((item.total * 1000) / item.qty);

        if (item.jenis === "bahan") {
          const m = bahanById.get(item.refId);
          if (!m) throw new Error("Ada bahan yang tidak ditemukan di outlet ini");

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
          continue;
        }

        const p = produkById.get(item.refId);
        if (!p) throw new Error("Ada produk yang tidak ditemukan di outlet ini");

        tx.insert(purchaseItems)
          .values({
            id: nanoid(),
            purchaseId,
            productId: p.id,
            nameSnapshot: p.name,
            qty: item.qty,
            unitCostMilli,
            lineTotal: item.total,
          })
          .run();

        const stokBaru = p.stock + item.qty;
        const modalBaru = Math.round(unitCostMilli / 1000);

        tx.update(products)
          .set({
            stock: stokBaru,
            // HPP produk resep dihitung dari bahannya, jangan ditimpa harga
            // beli. Produk manual (barang dagang) ikut rata-rata bergerak.
            ...(p.hppMode === "manual"
              ? {
                  cost:
                    p.stock > 0
                      ? Math.round(
                          (p.stock * p.cost + item.qty * modalBaru) / stokBaru,
                        )
                      : modalBaru,
                }
              : {}),
          })
          .where(eq(products.id, p.id))
          .run();

        tx.insert(stockMovements)
          .values({
            id: nanoid(),
            outletId: outlet.id,
            productId: p.id,
            type: "purchase",
            qtyChange: item.qty,
            stockAfter: stokBaru,
            refId: purchaseId,
            note: d.supplier ? `Beli dari ${d.supplier}` : "Pembelian",
          })
          .run();
      }

      // Harga bahan berubah -> HPP produk yang memakainya ikut disesuaikan.
      if (idBahan.length) {
        perbaruiHppTerkaitBahan(tx as never, outlet.id, idBahan);
      }
    });
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidatePembelian();
  return { ok: true };
}

const BayarHutangInput = z.object({
  purchaseId: z.string().min(1),
  jumlah: z.coerce.number().int().positive("Jumlah bayar harus lebih dari 0"),
  akunKasId: z.string().nullable().default(null),
  metode: z.enum(["cash", "qris", "transfer", "other"]).default("cash"),
  catatan: z.string().trim().max(120).nullable().default(null),
});

/** Pelunasan hutang ke supplier — pola sama dengan kasbon pelanggan. */
export async function bayarHutangSupplier(input: unknown): Promise<HasilAksi> {
  await wajibSesi();
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
          cashAccountId: pilihAkunKas(tx, outlet.id, d.akunKasId, d.metode),
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

  revalidatePembelian();
  return { ok: true };
}

function revalidatePembelian() {
  revalidatePath("/pembelian");
  revalidatePath("/persediaan");
  revalidatePath("/produk");
  revalidatePath("/kas");
  revalidatePath("/laporan");
  revalidatePath("/");
}

function pesan(e: unknown): string {
  return e instanceof Error ? e.message : "Gagal menyimpan";
}
