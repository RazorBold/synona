import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { customers, debts, outlets, transactionItems, transactions } from "@/db/schema";
import type { DataNota } from "@/lib/nota";
import { formatJumlahLayanan } from "@/lib/usaha";

/**
 * Tautan nota digital di QR code bisa dibuka siapa saja tanpa masuk — itu
 * intinya, seperti struk minimarket. Supaya id transaksi lain tidak bisa
 * ditebak-tebak, tautannya membawa HMAC dari id itu. Kuncinya diturunkan dari
 * secret sesi dengan label tersendiri, jadi tanda tangan nota tidak pernah
 * bisa dipakai sebagai apa pun yang lain.
 */
function tanda(id: string): string {
  const secret = process.env.SYNONA_JWT_SECRET;
  if (!secret) throw new Error("SYNONA_JWT_SECRET belum diisi");
  return createHmac("sha256", secret)
    .update(`synona:nota:v1:${id}`)
    .digest("base64url")
    .slice(0, 22);
}

export function kunciNotaSah(id: string, kunci: string | undefined): boolean {
  if (!kunci) return false;
  const a = Buffer.from(tanda(id));
  const b = Buffer.from(kunci);
  return a.length === b.length && timingSafeEqual(a, b);
}

function formatWaktu(ms: number, timezone: string): string {
  const b = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date(ms))
      .map((p) => [p.type, p.value]),
  );
  return `${b.day}/${b.month}/${b.year} ${b.hour}:${b.minute}`;
}

/**
 * Nota satu transaksi. `outletId` diisi untuk pemanggil yang sudah masuk
 * (transaksi harus milik outletnya); null hanya untuk halaman publik yang
 * sudah memeriksa `kunciNotaSah` lebih dulu.
 */
export function getNota(id: string, outletId: string | null): DataNota | null {
  const tx = db
    .select({
      id: transactions.id,
      invoiceNo: transactions.invoiceNo,
      discount: transactions.discount,
      total: transactions.total,
      metode: transactions.paymentMethod,
      dibayar: transactions.paidAmount,
      kembalian: transactions.changeAmount,
      status: transactions.status,
      pajak: transactions.taxAmount,
      labelPajak: transactions.taxLabel,
      modePajak: transactions.taxMode,
      occurredAt: transactions.occurredAt,
      pelanggan: customers.name,
      tokoNama: outlets.name,
      tokoAlamat: outlets.address,
      tokoTelepon: outlets.phone,
      timezone: outlets.timezone,
    })
    .from(transactions)
    .innerJoin(outlets, eq(outlets.id, transactions.outletId))
    .leftJoin(customers, eq(customers.id, transactions.customerId))
    .where(
      outletId
        ? and(eq(transactions.id, id), eq(transactions.outletId, outletId))
        : eq(transactions.id, id),
    )
    .get();
  if (!tx) return null;

  const items = db
    .select({
      nama: transactionItems.nameSnapshot,
      harga: transactionItems.priceSnapshot,
      qty: transactionItems.qty,
      qtyMilli: transactionItems.qtyMilli,
      unit: transactionItems.unit,
      serviceId: transactionItems.serviceId,
      diskon: transactionItems.discount,
      total: transactionItems.lineTotal,
    })
    .from(transactionItems)
    .where(eq(transactionItems.transactionId, id))
    .orderBy(sql`rowid`)
    .all();

  const baris = items.map((i) => {
    // Baris jasa: qty selalu 1 dan harganya sudah per baris (lihat schema).
    const jasa = i.serviceId !== null || i.qtyMilli !== null;
    const kotor = i.total + i.diskon;
    return {
      nama: i.nama,
      jumlah:
        jasa && i.qtyMilli !== null
          ? formatJumlahLayanan(i.qtyMilli, i.unit)
          : String(i.qty),
      harga: jasa ? null : i.harga,
      kotor,
      diskon: i.diskon,
      total: i.total,
    };
  });

  const subtotal = baris.reduce((a, b) => a + b.kotor, 0);
  const due =
    tx.status === "debt"
      ? db
          .select({ due: debts.dueDate })
          .from(debts)
          .where(eq(debts.transactionId, id))
          .get()?.due ?? null
      : null;
  // "2026-09-20" → "20/09/2026", sama dengan format kolom Waktu.
  const jatuhTempo = due ? due.split("-").reverse().join("/") : null;

  return {
    id: tx.id,
    invoiceNo: tx.invoiceNo,
    toko: { nama: tx.tokoNama, alamat: tx.tokoAlamat, telepon: tx.tokoTelepon },
    waktu: formatWaktu(tx.occurredAt, tx.timezone),
    pelanggan: tx.pelanggan ?? null,
    baris,
    subtotal,
    diskon: subtotal - tx.total,
    total: tx.total,
    pajak: tx.pajak,
    labelPajak: tx.labelPajak,
    modePajak: tx.modePajak,
    tagihan: tx.total + (tx.modePajak === "tambah" ? tx.pajak : 0),
    metode: tx.metode,
    dibayar: tx.dibayar,
    kembalian: tx.kembalian,
    status: tx.status,
    jatuhTempo,
    kunci: tanda(tx.id),
  };
}
