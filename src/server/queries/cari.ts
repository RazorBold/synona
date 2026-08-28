import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";

export type HasilProduk = {
  id: string;
  nama: string;
  sku: string | null;
  harga: number;
  stok: number;
  satuan: string;
};

export type HasilPelanggan = {
  id: string;
  nama: string;
  phone: string | null;
  sisaUtang: number;
};

export type HasilTransaksi = {
  id: string;
  invoiceNo: string;
  total: number;
  tanggal: string;
  status: string;
  namaPelanggan: string | null;
};

export type HasilPencarian = {
  produk: HasilProduk[];
  pelanggan: HasilPelanggan[];
  transaksi: HasilTransaksi[];
  total: number;
};

const KOSONG: HasilPencarian = { produk: [], pelanggan: [], transaksi: [], total: 0 };
const BATAS = 8;

/**
 * Pencarian lintas produk, pelanggan, dan transaksi.
 *
 * Memakai LIKE, bukan FTS5: datanya ribuan baris untuk satu warung, dan LIKE
 * menghindari tabel bayangan FTS yang harus dijaga tetap sinkron di setiap
 * tulis. Kalau nanti datanya jutaan baris, ini titik yang perlu diganti.
 */
export async function cariSemua(
  outletId: string,
  kueri: string,
): Promise<HasilPencarian> {
  const q = kueri.trim();
  if (q.length < 2) return KOSONG;

  // Escape wildcard LIKE supaya "%" yang diketik pengguna dicari apa adanya,
  // bukan mencocokkan segalanya.
  const pola = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

  const produk = db.all<HasilProduk>(sql`
    SELECT id, name AS nama, sku, price AS harga, stock AS stok, unit AS satuan
      FROM products
     WHERE outlet_id = ${outletId} AND is_active = 1
       AND (name LIKE ${pola} ESCAPE '\\' OR sku LIKE ${pola} ESCAPE '\\')
     ORDER BY name
     LIMIT ${BATAS}
  `);

  const pelanggan = db.all<HasilPelanggan>(sql`
    SELECT c.id, c.name AS nama, c.phone,
           COALESCE((SELECT SUM(d.remaining) FROM debts d
                      WHERE d.customer_id = c.id AND d.status != 'paid'), 0) AS sisaUtang
      FROM customers c
     WHERE c.outlet_id = ${outletId} AND c.is_active = 1
       AND (c.name LIKE ${pola} ESCAPE '\\' OR c.phone LIKE ${pola} ESCAPE '\\')
     ORDER BY c.name
     LIMIT ${BATAS}
  `);

  const transaksi = db.all<HasilTransaksi>(sql`
    SELECT t.id, t.invoice_no AS invoiceNo, t.total,
           t.business_date AS tanggal, t.status,
           c.name AS namaPelanggan
      FROM transactions t
      LEFT JOIN customers c ON c.id = t.customer_id
     WHERE t.outlet_id = ${outletId}
       AND (t.invoice_no LIKE ${pola} ESCAPE '\\' OR c.name LIKE ${pola} ESCAPE '\\')
     ORDER BY t.occurred_at DESC
     LIMIT ${BATAS}
  `);

  return {
    produk,
    pelanggan,
    transaksi,
    total: produk.length + pelanggan.length + transaksi.length,
  };
}
