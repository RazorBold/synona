import "server-only";

import { nanoid } from "nanoid";
import { sql } from "drizzle-orm";
import type { SQLWrapper } from "drizzle-orm";

/**
 * Setiap outlet wajib punya minimal satu akun kas sejak menit pertama —
 * kalau tidak, penjualan pertama tidak punya tempat untuk dicatat dan
 * laporan arus kas berangkat dari nol yang keliru.
 *
 * Tiga akun ini menutup cara bayar yang dipakai warung: uang laci, transfer
 * bank, dan QRIS. Namanya boleh diganti pemilik; yang penting `metodeDefault`
 * tetap terisi supaya kasir bisa menutup transaksi tanpa memilih akun.
 */
type Tx = {
  run: (q: SQLWrapper) => unknown;
  get: <T>(q: SQLWrapper) => T | undefined;
};

export const AKUN_BAWAAN = [
  { nama: "Kas Laci", jenis: "kas", metode: "cash" },
  { nama: "Rekening Bank", jenis: "bank", metode: "transfer" },
  { nama: "QRIS", jenis: "ewallet", metode: "qris" },
] as const;

export function buatAkunKasBawaan(tx: Tx, outletId: string): void {
  AKUN_BAWAAN.forEach((a, i) => {
    tx.run(sql`
      INSERT INTO cash_accounts
        (id, outlet_id, name, type, metode_default, sort_order,
         opening_balance, is_active, created_at, updated_at)
      VALUES (${nanoid()}, ${outletId}, ${a.nama}, ${a.jenis}, ${a.metode},
              ${i}, 0, 1, ${Date.now()}, ${Date.now()})
    `);
  });
}

/**
 * Memastikan setiap perpindahan uang punya akun. Kalau pengguna tidak
 * memilih — kasir yang buru-buru, beban yang dicatat cepat — dipakai akun
 * default metodenya. Tanpa ini barisnya jadi yatim dan saldo per akun tidak
 * pernah cocok dengan uang yang sebenarnya ada.
 */
export function pilihAkunKas(
  tx: Pick<Tx, "get">,
  outletId: string,
  pilihan: string | null,
  metode: "cash" | "qris" | "transfer" | "other",
): string | null {
  if (pilihan) {
    const milik = tx.get<{ id: string }>(sql`
      SELECT id FROM cash_accounts
       WHERE id = ${pilihan} AND outlet_id = ${outletId} AND is_active = 1
    `);
    if (!milik) throw new Error("Akun kas tidak ditemukan di outlet ini");
    return milik.id;
  }

  const bawaan = tx.get<{ id: string }>(sql`
    SELECT id FROM cash_accounts
     WHERE outlet_id = ${outletId} AND is_active = 1
       AND metode_default = ${metode === "other" ? "cash" : metode}
     LIMIT 1
  `);
  return bawaan?.id ?? null;
}
