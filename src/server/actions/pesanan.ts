"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  customers,
  debtPayments,
  debts,
  serviceOrders,
  services,
  transactionItems,
  transactions,
} from "@/db/schema";
import { businessDate } from "@/lib/date";
import { wajibSesi } from "@/server/auth";
import { pilihAkunKas } from "@/server/kas";
import { getItemPesanan } from "@/server/queries/pesanan";
import { getOutletMenulis } from "@/server/queries/dashboard";

export type HasilAksi = { ok: true } | { ok: false; error: string };

const ItemInput = z.object({
  serviceId: z.string().min(1),
  /** Jumlah × 1.000 — 3,5 kg dikirim sebagai 3500. */
  qtyMilli: z.coerce.number().int().positive().max(100_000_000),
  /** Harga per satuan, hanya dipakai bila layanannya mengizinkan. */
  hargaOverride: z.coerce.number().int().min(0).nullable().default(null),
  petugasStaffId: z.string().nullable().default(null),
});

const PesananInput = z.object({
  customerId: z.string().nullable().default(null),
  item: z.array(ItemInput).min(1, "Belum ada layanan yang dipilih"),
  diskon: z.coerce.number().int().min(0).default(0),
  /** Uang muka yang diterima sekarang. 0 = belum bayar sama sekali. */
  dp: z.coerce.number().int().min(0).default(0),
  akunKasId: z.string().nullable().default(null),
  metode: z.enum(["cash", "qris", "transfer", "other"]).default("cash"),
  janjiSelesai: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .default(null),
  tandaBarang: z.string().trim().max(120).nullable().default(null),
  catatan: z.string().trim().max(200).nullable().default(null),
});

export type HasilPesanan =
  | { ok: true; id: string; nomor: string; total: number; sisa: number }
  | { ok: false; error: string };

/**
 * Menerima satu pesanan jasa.
 *
 * Uangnya sengaja TIDAK disimpan di tabel pesanan. Satu pesanan menulis:
 * - `transactions` + `transaction_items` — omzet, item, dan snapshot modalnya,
 *   sama persis seperti penjualan barang, sehingga seluruh laporan yang sudah
 *   ada langsung ikut benar tanpa diubah;
 * - `debts` + `debt_payments` bila belum lunas — DP dicatat sebagai cicilan
 *   pertama, jadi uangnya muncul di arus kas dan sisanya di menu Kasbon;
 * - `service_orders` — hanya yang belum punya rumah: status pengerjaan,
 *   janji selesai, dan ciri barang titipan.
 *
 * Omzet diakui saat pesanan DITERIMA, bukan saat diambil: di titik itu harga
 * sudah disepakati dan barangnya sudah di tangan kita. Menundanya sampai
 * pengambilan membuat pekerjaan yang menyeberang bulan hilang dari laporan
 * bulan berjalan.
 */
export async function simpanPesanan(input: unknown): Promise<HasilPesanan> {
  await wajibSesi();
  const parsed = PesananInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }
  const d = parsed.data;
  const outlet = await getOutletMenulis();
  const tanggal = businessDate(new Date(), outlet.timezone);
  const waktu = Date.now();

  try {
    return db.transaction((tx): HasilPesanan => {
      const ids = d.item.map((i) => i.serviceId);
      const rows = tx
        .select()
        .from(services)
        .where(and(eq(services.outletId, outlet.id), inArray(services.id, ids)))
        .all();
      const byId = new Map(rows.map((r) => [r.id, r]));

      let subtotal = 0;
      const baris: (typeof transactionItems.$inferInsert)[] = [];

      for (const item of d.item) {
        const s = byId.get(item.serviceId);
        if (!s) throw new Error("Ada layanan yang tidak ditemukan di outlet ini");

        // Harga diambil ulang dari database. Menimpanya hanya boleh untuk
        // layanan yang memang ditandai harganya bisa berubah — kalau tidak,
        // harga bisa dimanipulasi dari browser.
        const harga =
          item.hargaOverride !== null && s.hargaBisaDiubah === 1
            ? item.hargaOverride
            : s.price;

        const lineTotal = Math.round((harga * item.qtyMilli) / 1000);
        const lineCost = Math.round((s.cost * item.qtyMilli) / 1000);
        const jumlah = item.qtyMilli / 1000;

        subtotal += lineTotal;

        baris.push({
          id: nanoid(),
          transactionId: "", // diisi setelah id transaksi dibuat
          serviceId: s.id,
          // Nama menyimpan jumlahnya supaya nota lama tetap terbaca utuh
          // walau layanannya kelak diubah atau diarsipkan.
          nameSnapshot:
            s.unit === "pcs" && jumlah === 1
              ? s.name
              : `${s.name} — ${jumlah.toLocaleString("id-ID", {
                  maximumFractionDigits: 3,
                })} ${s.unit === "m2" ? "m²" : s.unit}`,
          // Lihat catatan di src/db/schema.ts: baris jasa selalu qty 1 dan
          // price_snapshot berisi total baris, supaya jumlah pecahan tidak
          // membulatkan perhitungan laba.
          priceSnapshot: lineTotal,
          costSnapshot: lineCost,
          qty: 1,
          qtyMilli: item.qtyMilli,
          unit: s.unit,
          petugasStaffId: item.petugasStaffId,
          lineTotal,
        });
      }

      const diskon = Math.min(d.diskon, subtotal);
      const total = subtotal - diskon;
      if (d.dp > total) throw new Error("Uang muka melebihi total pesanan");

      const sisa = total - d.dp;
      if (sisa > 0 && !d.customerId) {
        throw new Error("Pesanan belum lunas — pilih pelanggannya dulu");
      }

      const urutTx = tx.get<{ n: number }>(sql`
        SELECT COALESCE(MAX(CAST(substr(invoice_no, -4) AS INTEGER)), 0) AS n
          FROM transactions
         WHERE outlet_id = ${outlet.id} AND business_date = ${tanggal}
      `);
      const invoiceNo = `INV-${tanggal.replace(/-/g, "")}-${String(
        (urutTx?.n ?? 0) + 1,
      ).padStart(4, "0")}`;

      const urutOrder = tx.get<{ n: number }>(sql`
        SELECT COALESCE(MAX(CAST(substr(order_no, -4) AS INTEGER)), 0) AS n
          FROM service_orders
         WHERE outlet_id = ${outlet.id} AND business_date = ${tanggal}
      `);
      const orderNo = `JSA-${tanggal.replace(/-/g, "")}-${String(
        (urutOrder?.n ?? 0) + 1,
      ).padStart(4, "0")}`;

      const txId = nanoid();
      const lunas = sisa === 0;

      tx.insert(transactions)
        .values({
          id: txId,
          outletId: outlet.id,
          customerId: d.customerId,
          invoiceNo,
          subtotal,
          discount: diskon,
          total,
          paymentMethod: lunas ? d.metode : "debt",
          // Pesanan yang belum lunas menerima uangnya lewat `debt_payments`,
          // jadi akun kasnya ditentukan di baris cicilan itu — bukan di sini.
          cashAccountId: lunas
            ? pilihAkunKas(tx, outlet.id, d.akunKasId, d.metode)
            : null,
          paidAmount: lunas ? total : 0,
          changeAmount: 0,
          status: lunas ? "paid" : "debt",
          occurredAt: waktu,
          businessDate: tanggal,
          note: d.catatan,
        })
        .run();

      tx.insert(transactionItems)
        .values(baris.map((b) => ({ ...b, transactionId: txId })))
        .run();

      if (!lunas) {
        const debtId = nanoid();
        tx.insert(debts)
          .values({
            id: debtId,
            outletId: outlet.id,
            customerId: d.customerId!,
            transactionId: txId,
            amount: total,
            paid: d.dp,
            remaining: sisa,
            dueDate: d.janjiSelesai,
            status: d.dp > 0 ? "partial" : "open",
          })
          .run();

        // DP dicatat sebagai cicilan pertama supaya uangnya masuk arus kas
        // lewat jalur yang sama dengan pelunasan nanti — bukan jalur kedua
        // yang bisa berselisih.
        if (d.dp > 0) {
          tx.insert(debtPayments)
            .values({
              id: nanoid(),
              debtId,
              amount: d.dp,
              method: d.metode,
              cashAccountId: pilihAkunKas(tx, outlet.id, d.akunKasId, d.metode),
              paidAt: waktu,
              note: "Uang muka",
              recordedBy: outlet.ownerId,
            })
            .run();
        }
      }

      const orderId = nanoid();
      tx.insert(serviceOrders)
        .values({
          id: orderId,
          outletId: outlet.id,
          transactionId: txId,
          orderNo,
          status: "masuk",
          janjiSelesai: d.janjiSelesai,
          tandaBarang: d.tandaBarang,
          note: d.catatan,
          occurredAt: waktu,
          businessDate: tanggal,
        })
        .run();

      return { ok: true, id: orderId, nomor: orderNo, total, sisa };
    });
  } catch (e) {
    return { ok: false, error: pesan(e) };
  } finally {
    revalidatePesanan();
  }
}

const StatusInput = z.object({
  id: z.string().min(1),
  status: z.enum(["masuk", "dikerjakan", "selesai", "diambil"]),
});

/**
 * Memajukan (atau memundurkan) status pengerjaan.
 *
 * Penyerahan barang ditahan selama masih ada sisa bayar. Menyerahkan cucian
 * yang belum dilunasi adalah keputusan bisnis yang boleh diambil pemilik,
 * tapi harus disengaja — bukan efek samping dari menekan tombol berikutnya.
 */
export async function ubahStatusPesanan(input: unknown): Promise<HasilAksi> {
  await wajibSesi();
  const parsed = StatusInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Status tidak valid" };
  const d = parsed.data;
  const outlet = await getOutletMenulis();

  try {
    db.transaction((tx) => {
      const o = tx
        .select()
        .from(serviceOrders)
        .where(
          and(
            eq(serviceOrders.id, d.id),
            eq(serviceOrders.outletId, outlet.id),
          ),
        )
        .get();
      if (!o) throw new Error("Pesanan tidak ditemukan di outlet ini");
      if (o.status === "batal") {
        throw new Error("Pesanan ini sudah dibatalkan");
      }

      if (d.status === "diambil") {
        const sisa = tx.get<{ sisa: number }>(sql`
          SELECT COALESCE(SUM(remaining), 0) AS sisa FROM debts
           WHERE transaction_id = ${o.transactionId} AND status != 'paid'
        `);
        if ((sisa?.sisa ?? 0) > 0) {
          throw new Error(
            `Masih ada sisa Rp ${(sisa?.sisa ?? 0).toLocaleString("id-ID")}. Terima pelunasannya dulu.`,
          );
        }
      }

      const sekarang = Date.now();
      tx.update(serviceOrders)
        .set({
          status: d.status,
          selesaiPada:
            d.status === "selesai" ? (o.selesaiPada ?? sekarang) : o.selesaiPada,
          diambilPada: d.status === "diambil" ? sekarang : null,
        })
        .where(eq(serviceOrders.id, o.id))
        .run();
    });
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidatePesanan();
  return { ok: true };
}

/**
 * Membatalkan pesanan: transaksinya di-void (bukan dihapus) dan sisa
 * tagihannya ditutup. Uang yang terlanjur diterima TIDAK ikut hilang —
 * pengembaliannya dicatat sendiri sebagai beban kalau memang dikembalikan,
 * supaya kas tidak berubah diam-diam.
 */
export async function batalkanPesanan(id: string): Promise<HasilAksi> {
  await wajibSesi();
  const outlet = await getOutletMenulis();

  try {
    db.transaction((tx) => {
      const o = tx
        .select()
        .from(serviceOrders)
        .where(
          and(eq(serviceOrders.id, id), eq(serviceOrders.outletId, outlet.id)),
        )
        .get();
      if (!o) throw new Error("Pesanan tidak ditemukan di outlet ini");
      if (o.status === "diambil") {
        throw new Error("Pesanan sudah diserahkan, tidak bisa dibatalkan");
      }

      tx.update(transactions)
        .set({ status: "void" })
        .where(eq(transactions.id, o.transactionId))
        .run();

      tx.update(debts)
        .set({ remaining: 0, status: "paid" })
        .where(eq(debts.transactionId, o.transactionId))
        .run();

      tx.update(serviceOrders)
        .set({ status: "batal" })
        .where(eq(serviceOrders.id, o.id))
        .run();
    });
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidatePesanan();
  return { ok: true };
}

/** Dipakai dialog rincian & nota WhatsApp. */
export async function ambilItemPesanan(transactionId: string) {
  await wajibSesi();
  const outlet = await getOutletMenulis();

  const milik = db.get<{ n: number }>(sql`
    SELECT COUNT(*) AS n FROM service_orders
     WHERE transaction_id = ${transactionId} AND outlet_id = ${outlet.id}
  `);
  if ((milik?.n ?? 0) === 0) return [];
  return getItemPesanan(transactionId);
}

/** Nama & nomor pelanggan untuk tombol kirim nota. */
export async function ambilPelangganPesanan(customerId: string) {
  await wajibSesi();
  const outlet = await getOutletMenulis();
  return (
    db
      .select({ nama: customers.name, phone: customers.phone })
      .from(customers)
      .where(
        and(eq(customers.id, customerId), eq(customers.outletId, outlet.id)),
      )
      .get() ?? null
  );
}

function revalidatePesanan() {
  revalidatePath("/pesanan");
  revalidatePath("/kasbon");
  revalidatePath("/kas");
  revalidatePath("/laporan");
  revalidatePath("/");
}

function pesan(e: unknown): string {
  return e instanceof Error ? e.message : "Pesanan gagal disimpan";
}
