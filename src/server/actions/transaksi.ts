"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  customers,
  debts,
  products,
  stockMovements,
  transactionItems,
  transactions,
} from "@/db/schema";
import { businessDate } from "@/lib/date";
import { getOutletAktif } from "@/server/queries/dashboard";

const ItemInput = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive().max(9999),
});

const TransaksiInput = z.object({
  items: z.array(ItemInput).min(1, "Keranjang masih kosong"),
  discount: z.number().int().min(0).default(0),
  paymentMethod: z.enum(["cash", "qris", "transfer", "debt"]),
  paidAmount: z.number().int().min(0).default(0),
  customerId: z.string().nullable().default(null),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .default(null),
  note: z.string().max(200).nullable().default(null),
});

export type HasilTransaksi =
  | {
      ok: true;
      id: string;
      invoiceNo: string;
      total: number;
      kembalian: number;
      pelanggan: { nama: string; phone: string | null } | null;
      item: { nama: string; qty: number; total: number }[];
    }
  | { ok: false; error: string };

/**
 * Menyimpan satu transaksi penjualan.
 *
 * Dua aturan yang tidak boleh dilanggar (PRD-TEKNIS.md §5):
 * 1. Harga & modal diambil ulang dari database — nilai dari klien TIDAK
 *    dipercaya, kalau tidak harga bisa dimanipulasi dari browser.
 * 2. Seluruh efek (transaksi, item, stok, buku besar stok, kasbon) berada
 *    dalam SATU db.transaction agar tidak ada stok berkurang tanpa penjualan.
 */
export async function simpanTransaksi(input: unknown): Promise<HasilTransaksi> {
  const parsed = TransaksiInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const data = parsed.data;

  // TODO(langkah 5): ganti dengan requireOutlet() berbasis sesi + tabel staff.
  const outlet = await getOutletAktif();
  const tanggal = businessDate(new Date(), outlet.timezone);
  const waktu = Date.now();

  try {
    return db.transaction((tx): HasilTransaksi => {
      const ids = data.items.map((i) => i.productId);
      const rows = tx
        .select()
        .from(products)
        .where(and(eq(products.outletId, outlet.id), inArray(products.id, ids)))
        .all();

      const byId = new Map(rows.map((r) => [r.id, r]));

      let subtotal = 0;
      const barisItem: (typeof transactionItems.$inferInsert)[] = [];
      const ringkasItem: { nama: string; qty: number; total: number }[] = [];

      for (const item of data.items) {
        const p = byId.get(item.productId);
        if (!p) throw new Error("Ada produk yang tidak ditemukan di outlet ini");
        if (p.stock < item.qty) {
          throw new Error(`Stok ${p.name} tinggal ${p.stock} ${p.unit}`);
        }

        const lineTotal = p.price * item.qty;
        subtotal += lineTotal;

        barisItem.push({
          id: nanoid(),
          transactionId: "", // diisi setelah id transaksi dibuat
          productId: p.id,
          nameSnapshot: p.name,
          priceSnapshot: p.price,
          costSnapshot: p.cost,
          qty: item.qty,
          lineTotal,
        });
        ringkasItem.push({ nama: p.name, qty: item.qty, total: lineTotal });
      }

      const discount = Math.min(data.discount, subtotal);
      const total = subtotal - discount;

      if (data.paymentMethod === "debt" && !data.customerId) {
        throw new Error("Pilih pelanggan dulu untuk transaksi utang");
      }
      if (data.paymentMethod === "cash" && data.paidAmount < total) {
        throw new Error("Uang diterima kurang dari total belanja");
      }

      const isUtang = data.paymentMethod === "debt";
      const dibayar = isUtang ? 0 : Math.max(data.paidAmount, total);
      const kembalian = isUtang ? 0 : Math.max(0, dibayar - total);

      // Ambil nomor terbesar hari ini, bukan COUNT(*): transaksi yang di-void
      // atau terhapus tidak boleh membuat nomor terpakai ulang — kolom
      // invoice_no punya unique index per outlet.
      const urutan = tx.get<{ n: number }>(sql`
        SELECT COALESCE(MAX(CAST(substr(invoice_no, -4) AS INTEGER)), 0) AS n
          FROM transactions
         WHERE outlet_id = ${outlet.id} AND business_date = ${tanggal}
      `);
      const invoiceNo = `INV-${tanggal.replace(/-/g, "")}-${String(
        (urutan?.n ?? 0) + 1,
      ).padStart(4, "0")}`;

      const txId = nanoid();
      tx.insert(transactions)
        .values({
          id: txId,
          outletId: outlet.id,
          customerId: data.customerId,
          invoiceNo,
          subtotal,
          discount,
          total,
          paymentMethod: data.paymentMethod,
          paidAmount: dibayar,
          changeAmount: kembalian,
          status: isUtang ? "debt" : "paid",
          occurredAt: waktu,
          businessDate: tanggal,
          note: data.note,
        })
        .run();

      tx.insert(transactionItems)
        .values(barisItem.map((b) => ({ ...b, transactionId: txId })))
        .run();

      // Stok berkurang + jejak di buku besar stok.
      for (const item of data.items) {
        const p = byId.get(item.productId)!;
        const stokBaru = p.stock - item.qty;

        tx.update(products)
          .set({ stock: stokBaru })
          .where(eq(products.id, p.id))
          .run();

        tx.insert(stockMovements)
          .values({
            id: nanoid(),
            outletId: outlet.id,
            productId: p.id,
            type: "sale",
            qtyChange: -item.qty,
            stockAfter: stokBaru,
            refId: txId,
            note: invoiceNo,
          })
          .run();
      }

      if (isUtang) {
        tx.insert(debts)
          .values({
            id: nanoid(),
            outletId: outlet.id,
            customerId: data.customerId!,
            transactionId: txId,
            amount: total,
            paid: 0,
            remaining: total,
            dueDate: data.dueDate,
            status: "open",
          })
          .run();
      }

      const pelanggan = data.customerId
        ? tx
            .select({ nama: customers.name, phone: customers.phone })
            .from(customers)
            .where(eq(customers.id, data.customerId))
            .get() ?? null
        : null;

      return {
        ok: true,
        id: txId,
        invoiceNo,
        total,
        kembalian,
        pelanggan,
        item: ringkasItem,
      };
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Transaksi gagal disimpan",
    };
  } finally {
    revalidatePath("/");
    revalidatePath("/kasir");
  }
}
