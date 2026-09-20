"use server";

import { sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { categories } from "@/db/schema";
import { wajibSesi } from "@/server/auth";
import { getOutletMenulis } from "@/server/queries/dashboard";

const KategoriInput = z.object({
  nama: z.string().trim().min(2, "Nama kategori minimal 2 huruf").max(40),
});

export type HasilKategori =
  | { ok: true; id: string; nama: string }
  | { ok: false; error: string };

/**
 * Menambah kategori dari dalam formulir produk atau layanan.
 *
 * Kalau namanya sudah ada (tanpa peduli huruf besar), yang lama dikembalikan
 * alih-alih membuat kembaran — pemilik yang mengetik "Minuman" dua kali tidak
 * bermaksud punya dua kategori Minuman.
 */
export async function tambahKategori(input: unknown): Promise<HasilKategori> {
  await wajibSesi();
  const parsed = KategoriInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const nama = parsed.data.nama.replace(/\s+/g, " ");
  const outlet = await getOutletMenulis();

  try {
    const hasil = db.transaction((tx) => {
      const ada = tx.get<{ id: string; nama: string }>(sql`
        SELECT id, name AS nama FROM categories
         WHERE outlet_id = ${outlet.id} AND lower(name) = lower(${nama})
         LIMIT 1
      `);
      if (ada) return ada;

      const urutan = tx.get<{ n: number }>(sql`
        SELECT COALESCE(MAX(sort_order), -1) + 1 AS n
          FROM categories WHERE outlet_id = ${outlet.id}
      `);
      const id = nanoid();
      tx.insert(categories)
        .values({ id, outletId: outlet.id, name: nama, sortOrder: urutan?.n ?? 0 })
        .run();
      return { id, nama };
    });

    revalidatePath("/produk");
    revalidatePath("/layanan");
    revalidatePath("/kasir");
    return { ok: true, ...hasil };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal menyimpan kategori" };
  }
}
