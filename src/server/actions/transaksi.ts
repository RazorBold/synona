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
import { diskonBarisFinal } from "@/lib/diskon";
import { hitungPajak, labelPajak, pajakAktif } from "@/lib/pajak";
import { normalisasiNomorHp } from "@/lib/wa";
import { wajibSesi } from "@/server/auth";
import { pilihAkunKas } from "@/server/kas";
import { getOutletMenulis } from "@/server/queries/dashboard";
import { promoPerProduk } from "@/server/promo";

const ItemInput = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive().max(9999),
  /** Potongan rupiah untuk seluruh baris. Dijepit ulang di server. */
  diskon: z.number().int().min(0).default(0),
});

const TransaksiInput = z.object({
  items: z.array(ItemInput).min(1, "Keranjang masih kosong"),
  paymentMethod: z.enum(["cash", "qris", "transfer", "debt"]),
  akunKasId: z.string().nullable().default(null),
  paidAmount: z.number().int().min(0).default(0),
  customerId: z.string().nullable().default(null),
  /**
   * Nama pelanggan yang diketik kasir kalau belum ada di daftar. Server
   * mencocokkannya ke pelanggan yang sudah ada (nama atau nomor sama) dan
   * baru membuat baris baru kalau memang tidak ada — jadi satu orang tidak
   * pecah jadi beberapa pelanggan kembar.
   */
  namaPelanggan: z.string().trim().max(80).nullable().default(null),
  teleponPelanggan: z.string().trim().max(24).nullable().default(null),
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
      /** Yang dibayar pembeli (sudah termasuk pajak "tambah"). */
      total: number;
      kembalian: number;
      pajak: number;
      labelPajak: string | null;
      modePajak: "termasuk" | "tambah" | null;
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
  await wajibSesi();
  const parsed = TransaksiInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const data = parsed.data;

  // TODO(langkah 5): ganti dengan requireOutlet() berbasis sesi + tabel staff.
  const outlet = await getOutletMenulis();
  const tanggal = businessDate(new Date(), outlet.timezone);
  const waktu = Date.now();
  // Promo dibaca dari database, bukan dari klien: kalau tidak, harga bisa
  // "didiskon" dari browser persis seperti harga bisa dipalsukan.
  const promo = promoPerProduk(outlet.id, tanggal);

  try {
    return db.transaction((tx): HasilTransaksi => {
      const ids = data.items.map((i) => i.productId);
      const rows = tx
        .select()
        .from(products)
        .where(and(eq(products.outletId, outlet.id), inArray(products.id, ids)))
        .all();

      const byId = new Map(rows.map((r) => [r.id, r]));

      /**
       * Pelanggan diselesaikan SEBELUM baris dihitung: diskon membernya ikut
       * menentukan potongan tiap baris.
       */
      const customerId = pastikanPelanggan(tx, outlet.id, data);
      const memberBp = customerId
        ? tx
            .select({ bp: customers.diskonBp })
            .from(customers)
            .where(eq(customers.id, customerId))
            .get()?.bp ?? 0
        : 0;

      let subtotal = 0;
      const barisItem: (typeof transactionItems.$inferInsert)[] = [];
      const ringkasItem: { nama: string; qty: number; total: number }[] = [];

      for (const item of data.items) {
        const p = byId.get(item.productId);
        if (!p) throw new Error("Ada produk yang tidak ditemukan di outlet ini");
        // Produk tanpa lacak stok (mis. masak-saat-pesan) tidak pernah
        // kehabisan — penjualannya tidak boleh diblokir angka stok.
        if (p.lacakStok === 1 && p.stock < item.qty) {
          throw new Error(`Stok ${p.name} tinggal ${p.stock} ${p.unit}`);
        }

        /**
         * Diskon baris = yang TERBESAR di antara potongan manual kasir,
         * promo yang sedang berjalan, dan diskon member — tidak pernah
         * ditumpuk (lihat src/lib/diskon.ts). Semuanya dihitung di server;
         * nilai dari klien hanya dipakai untuk potongan manual, dan itu pun
         * dijepit agar tidak minus atau melebihi nilai barisnya.
         */
        const kotor = p.price * item.qty;
        const { nilai: diskon } = diskonBarisFinal(
          kotor,
          item.diskon,
          promo.get(p.id)?.diskonBp ?? 0,
          memberBp,
        );
        const lineTotal = kotor - diskon;
        subtotal += lineTotal;

        barisItem.push({
          id: nanoid(),
          transactionId: "", // diisi setelah id transaksi dibuat
          productId: p.id,
          nameSnapshot: p.name,
          priceSnapshot: p.price,
          costSnapshot: p.cost,
          qty: item.qty,
          discount: diskon,
          lineTotal,
        });
        ringkasItem.push({ nama: p.name, qty: item.qty, total: lineTotal });
      }

      // Diskon kini per baris dan sudah terpotong di `line_total`, jadi
      // diskon tingkat transaksi selalu 0. Mengisinya juga akan membuat
      // potongan terhitung dua kali di rumus laba (line_total − modal − diskon).
      const discount = 0;
      const total = subtotal;

      if (data.paymentMethod === "debt" && !customerId) {
        throw new Error("Isi nama pelanggan dulu untuk transaksi utang");
      }
      /**
       * Pajak dihitung ULANG di server dari pengaturan outlet — nilai dari
       * klien tidak dipercaya, sama seperti harga. Labelnya ikut disimpan
       * sebagai snapshot supaya nota lama tetap benar kalau tarifnya diubah.
       */
      const pajakOutlet = {
        nama: outlet.pajakNama,
        bp: outlet.pajakBp,
        mode: outlet.pajakMode,
      };
      const pajak = hitungPajak(total, pajakOutlet);
      // Hanya pajak "tambah" yang menambah tagihan pembeli.
      const tagihan = pajakOutlet.mode === "tambah" ? total + pajak : total;

      if (data.paymentMethod === "cash" && data.paidAmount < tagihan) {
        throw new Error("Uang diterima kurang dari total belanja");
      }

      const isUtang = data.paymentMethod === "debt";
      const dibayar = isUtang ? 0 : Math.max(data.paidAmount, tagihan);
      const kembalian = isUtang ? 0 : Math.max(0, dibayar - tagihan);

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
          customerId,
          invoiceNo,
          subtotal,
          discount,
          total,
          paymentMethod: data.paymentMethod,
          // Utang belum menggerakkan uang; akunnya baru ditentukan saat
          // cicilannya masuk.
          cashAccountId: isUtang
            ? null
            : pilihAkunKas(
                tx,
                outlet.id,
                data.akunKasId,
                data.paymentMethod as "cash" | "qris" | "transfer",
              ),
          paidAmount: dibayar,
          changeAmount: kembalian,
          taxAmount: pajak,
          taxLabel: pajakAktif(pajakOutlet) ? labelPajak(pajakOutlet) : null,
          taxMode: pajakAktif(pajakOutlet) ? pajakOutlet.mode : null,
          status: isUtang ? "debt" : "paid",
          occurredAt: waktu,
          businessDate: tanggal,
          note: data.note,
        })
        .run();

      tx.insert(transactionItems)
        .values(barisItem.map((b) => ({ ...b, transactionId: txId })))
        .run();

      // Stok berkurang + jejak di buku besar stok. Produk yang tidak dilacak
      // dilewati sepenuhnya: tidak ada angka stok yang bermakna untuk dikurangi,
      // dan buku besarnya akan penuh baris yang menyesatkan.
      for (const item of data.items) {
        const p = byId.get(item.productId)!;
        if (p.lacakStok !== 1) continue;
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
            customerId: customerId!,
            transactionId: txId,
            amount: tagihan,
            paid: 0,
            remaining: tagihan,
            dueDate: data.dueDate,
            status: "open",
          })
          .run();
      }

      const pelanggan = customerId
        ? tx
            .select({ nama: customers.name, phone: customers.phone })
            .from(customers)
            .where(eq(customers.id, customerId))
            .get() ?? null
        : null;

      return {
        ok: true,
        id: txId,
        invoiceNo,
        total: tagihan,
        kembalian,
        pajak,
        labelPajak: pajakAktif(pajakOutlet) ? labelPajak(pajakOutlet) : null,
        modePajak: pajakAktif(pajakOutlet) ? pajakOutlet.mode : null,
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

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Menentukan pelanggan transaksi, membuatnya kalau perlu.
 *
 * Urutan pencocokan sengaja begini:
 * 1. id yang dipilih dari daftar — tapi dicek benar-benar milik outlet ini,
 *    supaya id dari outlet lain tidak bisa diselundupkan lewat request;
 * 2. nomor HP yang sama — nomor lebih unik daripada nama ("Bu Sri" bisa dua);
 * 3. nama yang sama (tanpa peduli huruf besar);
 * 4. kalau semuanya tidak ada, pelanggan baru dibuat.
 */
function pastikanPelanggan(
  tx: Tx,
  outletId: string,
  data: { customerId: string | null; namaPelanggan: string | null; teleponPelanggan: string | null },
): string | null {
  if (data.customerId) {
    const milik = tx
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, data.customerId), eq(customers.outletId, outletId)))
      .get();
    if (!milik) throw new Error("Pelanggan tidak ditemukan di outlet ini");
    return milik.id;
  }

  const nama = data.namaPelanggan?.trim();
  if (!nama) return null;

  const telepon = data.teleponPelanggan?.trim()
    ? normalisasiNomorHp(data.teleponPelanggan)
    : null;

  if (telepon) {
    const samaNomor = tx.get<{ id: string }>(sql`
      SELECT id FROM customers
       WHERE outlet_id = ${outletId} AND phone = ${telepon} AND is_active = 1
       LIMIT 1
    `);
    if (samaNomor) return samaNomor.id;
  }

  const samaNama = tx.get<{ id: string }>(sql`
    SELECT id FROM customers
     WHERE outlet_id = ${outletId} AND is_active = 1
       AND lower(trim(name)) = lower(${nama})
     LIMIT 1
  `);
  if (samaNama) return samaNama.id;

  const id = nanoid();
  tx.insert(customers)
    .values({ id, outletId, name: nama, phone: telepon })
    .run();
  return id;
}
