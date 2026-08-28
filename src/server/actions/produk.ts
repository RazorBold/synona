"use server";

import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { db } from "@/db";
import { products, stockMovements } from "@/db/schema";
import { JENIS_GAMBAR, MAKS_UKURAN_BYTE } from "@/lib/gambar";
import { wajibSesi } from "@/server/auth";
import { getOutletAktif } from "@/server/queries/dashboard";
import { getRiwayatStok } from "@/server/queries/produk";

export type HasilAksi = { ok: true } | { ok: false; error: string };

/**
 * Foto disimpan di disk (satu volume dengan file SQLite), bukan sebagai BLOB.
 * Alasannya: penulisan blob besar ikut menggemukkan WAL dan memperberat
 * penulis tunggal SQLite — sementara POS punya target < 2 detik per transaksi.
 */
const DIR_GAMBAR = process.env.UPLOAD_DIR ?? "./data/uploads/produk";

const EKSTENSI: Record<string, string> = {
  "image/webp": ".webp",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

async function tulisGambar(file: File): Promise<string> {
  if (!JENIS_GAMBAR.includes(file.type)) {
    throw new Error("Format foto harus WebP, JPG, atau PNG");
  }
  if (file.size > MAKS_UKURAN_BYTE) {
    throw new Error("Ukuran foto maksimal 2 MB");
  }

  await fs.mkdir(DIR_GAMBAR, { recursive: true });
  const nama = `${nanoid()}${EKSTENSI[file.type]}`;
  await fs.writeFile(
    path.join(DIR_GAMBAR, nama),
    Buffer.from(await file.arrayBuffer()),
  );
  return nama;
}

async function hapusBerkasGambar(nama: string | null) {
  if (!nama) return;
  // Foto yatim tidak fatal, jadi kegagalan hapus cukup diabaikan.
  await fs.unlink(path.join(DIR_GAMBAR, nama)).catch(() => {});
}

const ProdukInput = z.object({
  id: z.string().nullable().default(null),
  nama: z.string().trim().min(2, "Nama produk minimal 2 huruf").max(80),
  emoji: z.string().max(8).nullable().default(null),
  sku: z.string().trim().max(40).nullable().default(null),
  kategoriId: z.string().nullable().default(null),
  harga: z.coerce.number().int().min(0, "Harga tidak boleh negatif"),
  modal: z.coerce.number().int().min(0, "Modal tidak boleh negatif"),
  stokAwal: z.coerce.number().int().min(0).default(0),
  lacakStok: z.coerce.number().int().min(0).max(1).default(1),
  batasStok: z.coerce.number().int().min(0).default(5),
  unit: z.string().trim().min(1).max(12).default("pcs"),
});

/**
 * Membuat atau memperbarui produk, termasuk fotonya.
 *
 * Stok TIDAK diubah lewat form ini — perubahan stok hanya boleh lewat
 * sesuaikanStok() agar setiap pergerakan punya jejak di stock_movements.
 */
export async function simpanProduk(formData: FormData): Promise<HasilAksi> {
  await wajibSesi();
  const ambil = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v !== "" ? v : null;
  };

  const parsed = ProdukInput.safeParse({
    id: ambil("id"),
    nama: formData.get("nama") ?? "",
    emoji: ambil("emoji"),
    sku: ambil("sku"),
    kategoriId: ambil("kategoriId"),
    harga: formData.get("harga") ?? 0,
    modal: formData.get("modal") ?? 0,
    stokAwal: formData.get("stokAwal") ?? 0,
    lacakStok: formData.get("lacakStok") ?? 1,
    batasStok: formData.get("batasStok") ?? 5,
    unit: ambil("unit") ?? "pcs",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }
  const d = parsed.data;

  if (d.modal > d.harga) {
    return {
      ok: false,
      error: "Modal lebih besar dari harga jual — cek lagi ya",
    };
  }

  // TODO(langkah 5): ganti dengan requireOutlet() berbasis sesi.
  const outlet = await getOutletAktif();

  const berkas = formData.get("gambar");
  const adaFotoBaru = berkas instanceof File && berkas.size > 0;
  const hapusFoto = formData.get("hapusGambar") === "1";

  const lama = d.id
    ? db
        .select({ id: products.id, gambar: products.imageUrl })
        .from(products)
        .where(and(eq(products.id, d.id), eq(products.outletId, outlet.id)))
        .get()
    : null;

  if (d.id && !lama) {
    return { ok: false, error: "Produk tidak ditemukan di outlet ini" };
  }

  // Berkas ditulis lebih dulu; kalau penulisan database gagal, berkas baru
  // dihapus lagi supaya tidak meninggalkan foto yatim.
  let namaBaru: string | null = null;
  try {
    if (adaFotoBaru) namaBaru = await tulisGambar(berkas);
  } catch (e) {
    return { ok: false, error: pesanGagal(e) };
  }

  const gambarFinal = namaBaru ?? (hapusFoto ? null : (lama?.gambar ?? null));

  try {
    db.transaction((tx) => {
      if (d.id) {
        tx.update(products)
          .set({
            name: d.nama,
            emoji: d.emoji,
            sku: d.sku,
            categoryId: d.kategoriId,
            price: d.harga,
            cost: d.modal,
            lowStockThreshold: d.batasStok,
            lacakStok: d.lacakStok,
            unit: d.unit,
            imageUrl: gambarFinal,
          })
          .where(eq(products.id, d.id))
          .run();
        return;
      }

      const id = nanoid();
      tx.insert(products)
        .values({
          id,
          outletId: outlet.id,
          categoryId: d.kategoriId,
          name: d.nama,
          emoji: d.emoji,
          sku: d.sku,
          price: d.harga,
          cost: d.modal,
          stock: d.lacakStok === 1 ? d.stokAwal : 0,
          lowStockThreshold: d.batasStok,
          lacakStok: d.lacakStok,
          unit: d.unit,
          imageUrl: gambarFinal,
        })
        .run();

      if (d.lacakStok === 1 && d.stokAwal > 0) {
        tx.insert(stockMovements)
          .values({
            id: nanoid(),
            outletId: outlet.id,
            productId: id,
            type: "purchase",
            qtyChange: d.stokAwal,
            stockAfter: d.stokAwal,
            note: "Stok awal",
          })
          .run();
      }
    });
  } catch (e) {
    await hapusBerkasGambar(namaBaru);
    return { ok: false, error: pesanGagal(e) };
  }

  // Foto lama baru dibuang setelah database benar-benar tersimpan.
  if (lama?.gambar && lama.gambar !== gambarFinal) {
    await hapusBerkasGambar(lama.gambar);
  }

  revalidatePath("/produk");
  revalidatePath("/kasir");
  revalidatePath("/");
  return { ok: true };
}

const StokInput = z.object({
  productId: z.string().min(1),
  mode: z.enum(["masuk", "keluar", "opname"]),
  jumlah: z.number().int().min(0),
  catatan: z.string().trim().max(120).nullable().default(null),
});

/**
 * Satu-satunya pintu perubahan stok di luar penjualan.
 * - masuk  : barang datang (+jumlah)
 * - keluar : rusak/terpakai sendiri (-jumlah)
 * - opname : hasil hitung fisik, stok diset ke `jumlah`
 */
export async function sesuaikanStok(input: unknown): Promise<HasilAksi> {
  await wajibSesi();
  const parsed = StokInput.safeParse(input);
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
        .from(products)
        .where(
          and(eq(products.id, d.productId), eq(products.outletId, outlet.id)),
        )
        .get();
      if (!p) throw new Error("Produk tidak ditemukan di outlet ini");

      const stokBaru =
        d.mode === "opname"
          ? d.jumlah
          : d.mode === "masuk"
            ? p.stock + d.jumlah
            : p.stock - d.jumlah;

      if (stokBaru < 0) {
        throw new Error(`Stok ${p.name} hanya ${p.stock} ${p.unit}`);
      }

      const selisih = stokBaru - p.stock;
      if (selisih === 0) throw new Error("Tidak ada perubahan stok");

      tx.update(products)
        .set({ stock: stokBaru })
        .where(eq(products.id, p.id))
        .run();

      tx.insert(stockMovements)
        .values({
          id: nanoid(),
          outletId: outlet.id,
          productId: p.id,
          type: d.mode === "masuk" ? "purchase" : "adjustment",
          qtyChange: selisih,
          stockAfter: stokBaru,
          note:
            d.catatan ??
            (d.mode === "masuk"
              ? "Barang masuk"
              : d.mode === "keluar"
                ? "Barang keluar"
                : "Hasil opname"),
        })
        .run();
    });
  } catch (e) {
    return { ok: false, error: pesanGagal(e) };
  }

  revalidatePath("/produk");
  revalidatePath("/kasir");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Produk diarsipkan (is_active = 0), bukan dihapus — transaksi lama harus
 * tetap bisa menampilkan produknya. Fotonya sengaja ikut dipertahankan.
 */
export async function arsipkanProduk(id: string): Promise<HasilAksi> {
  await wajibSesi();
  const outlet = await getOutletAktif();

  try {
    db.update(products)
      .set({ isActive: 0 })
      .where(and(eq(products.id, id), eq(products.outletId, outlet.id)))
      .run();
  } catch (e) {
    return { ok: false, error: pesanGagal(e) };
  }

  revalidatePath("/produk");
  revalidatePath("/kasir");
  return { ok: true };
}

/** Riwayat pergerakan stok satu produk (dipakai di dialog penyesuaian stok). */
export async function ambilRiwayatStok(productId: string) {
  await wajibSesi();
  const outlet = await getOutletAktif();

  const milikOutlet = db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.outletId, outlet.id)))
    .get();

  if (!milikOutlet) return [];
  return getRiwayatStok(productId, 6);
}

function pesanGagal(e: unknown): string {
  const pesan = e instanceof Error ? e.message : "Gagal menyimpan";
  if (pesan.includes("UNIQUE") && pesan.includes("sku")) {
    return "SKU itu sudah dipakai produk lain di outlet ini";
  }
  return pesan;
}
