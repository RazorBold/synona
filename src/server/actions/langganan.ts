"use server";

import { addMonths } from "date-fns";
import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { pembayaranLangganan, pengguna, users } from "@/db/schema";
import { hargaPaket } from "@/lib/paket";
import { wajibSesi } from "@/server/auth";
import {
  adminPlatform,
  simpanBerkasLangganan,
  tulisPengaturan,
} from "@/server/langganan";
import { getOutletAktif } from "@/server/queries/dashboard";

type HasilAksi = { ok: true } | { ok: false; error: string };

function gagal(e: unknown, bawaan: string): HasilAksi {
  return { ok: false, error: e instanceof Error ? e.message : bawaan };
}

/**
 * Hanya pemilik usaha yang membayar langganan — kasir tidak boleh membuat
 * tagihan atas nama pemiliknya. Pemilik = akun login yang tertaut ke baris
 * `users` pemilik outlet aktif.
 */
async function wajibPemilik() {
  const sesi = await wajibSesi();
  const outlet = await getOutletAktif();
  const akun = db
    .select({ userId: pengguna.userId, peran: pengguna.peran })
    .from(pengguna)
    .where(eq(pengguna.id, sesi.penggunaId))
    .get();
  if (!akun || akun.peran !== "pemilik" || akun.userId !== outlet.ownerId) {
    throw new Error("Hanya pemilik usaha yang bisa mengurus langganan");
  }
  return { sesi, outlet };
}

const TagihanInput = z.object({
  paket: z.enum(["mulai", "tumbuh", "juara"]),
  periode: z.enum(["bulan", "tahun"]),
});

export async function buatTagihan(input: unknown): Promise<HasilAksi> {
  const parsed = TagihanInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pilih paket dan periode dulu" };
  const { paket, periode } = parsed.data;

  try {
    const { outlet } = await wajibPemilik();
    const harga = hargaPaket(paket, periode);

    db.transaction((tx) => {
      const diperiksa = tx
        .select({ id: pembayaranLangganan.id })
        .from(pembayaranLangganan)
        .where(
          and(
            eq(pembayaranLangganan.userId, outlet.ownerId),
            eq(pembayaranLangganan.status, "diperiksa"),
          ),
        )
        .get();
      if (diperiksa) {
        throw new Error("Pembayaran sebelumnya masih diperiksa. Tunggu hasilnya dulu.");
      }

      // Tagihan lama yang belum dibayar diganti yang baru.
      tx.update(pembayaranLangganan)
        .set({ status: "batal" })
        .where(
          and(
            eq(pembayaranLangganan.userId, outlet.ownerId),
            eq(pembayaranLangganan.status, "menunggu"),
          ),
        )
        .run();

      // Kode unik yang belum dipakai tagihan terbuka lain dengan harga sama,
      // supaya dua pembayaran tidak pernah bernominal persis sama.
      const terpakai = new Set(
        tx
          .select({ kode: pembayaranLangganan.kodeUnik })
          .from(pembayaranLangganan)
          .where(
            and(
              eq(pembayaranLangganan.harga, harga),
              inArray(pembayaranLangganan.status, ["menunggu", "diperiksa"]),
            ),
          )
          .all()
          .map((r) => r.kode),
      );
      let kodeUnik = 0;
      for (let i = 0; i < 50 && (kodeUnik === 0 || terpakai.has(kodeUnik)); i++) {
        kodeUnik = 1 + Math.floor(Math.random() * 499);
      }
      if (terpakai.has(kodeUnik)) throw new Error("Coba lagi sebentar lagi");

      tx.insert(pembayaranLangganan)
        .values({
          id: nanoid(),
          userId: outlet.ownerId,
          paket,
          periode,
          harga,
          kodeUnik,
          nominal: harga + kodeUnik,
        })
        .run();
    });
  } catch (e) {
    return gagal(e, "Tagihan gagal dibuat");
  }

  revalidatePath("/langganan");
  return { ok: true };
}

/** "Saya sudah bayar" — bukti bayar opsional. */
export async function konfirmasiBayar(formData: FormData): Promise<HasilAksi> {
  try {
    const { outlet } = await wajibPemilik();
    const id = String(formData.get("id") ?? "");
    const berkas = formData.get("bukti");

    const tagihan = db
      .select()
      .from(pembayaranLangganan)
      .where(and(eq(pembayaranLangganan.id, id), eq(pembayaranLangganan.userId, outlet.ownerId)))
      .get();
    if (!tagihan || tagihan.status !== "menunggu") {
      throw new Error("Tagihan ini sudah tidak menunggu pembayaran");
    }

    const bukti =
      berkas instanceof File && berkas.size > 0 ? await simpanBerkasLangganan(berkas) : null;

    db.update(pembayaranLangganan)
      .set({ status: "diperiksa", dibayarPada: Date.now(), bukti })
      .where(and(eq(pembayaranLangganan.id, id), eq(pembayaranLangganan.status, "menunggu")))
      .run();
  } catch (e) {
    return gagal(e, "Konfirmasi gagal dikirim");
  }
  revalidatePath("/langganan");
  return { ok: true };
}

export async function batalkanTagihan(id: string): Promise<HasilAksi> {
  try {
    const { outlet } = await wajibPemilik();
    db.update(pembayaranLangganan)
      .set({ status: "batal" })
      .where(
        and(
          eq(pembayaranLangganan.id, String(id)),
          eq(pembayaranLangganan.userId, outlet.ownerId),
          eq(pembayaranLangganan.status, "menunggu"),
        ),
      )
      .run();
  } catch (e) {
    return gagal(e, "Tagihan gagal dibatalkan");
  }
  revalidatePath("/langganan");
  return { ok: true };
}

/* --------------------------------------------------------- pengelola */

async function wajibAdmin() {
  const sesi = await wajibSesi();
  if (!adminPlatform(sesi)) throw new Error("Tidak berhak");
  return sesi;
}

/**
 * Menyetujui pembayaran: langganan diperpanjang dari tanggal berakhir yang
 * sekarang (kalau masih berjalan) atau dari hari ini (kalau baru / sudah
 * habis) — perpanjangan lebih awal tidak menghanguskan sisa hari.
 */
export async function setujuiPembayaran(id: string): Promise<HasilAksi> {
  try {
    const sesi = await wajibAdmin();
    const sekarang = Date.now();

    db.transaction((tx) => {
      const t = tx
        .select()
        .from(pembayaranLangganan)
        .where(eq(pembayaranLangganan.id, String(id)))
        .get();
      if (!t || (t.status !== "menunggu" && t.status !== "diperiksa")) {
        throw new Error("Tagihan ini sudah diputuskan");
      }
      const u = tx
        .select({ planEndsAt: users.planEndsAt })
        .from(users)
        .where(eq(users.id, t.userId))
        .get();
      if (!u) throw new Error("Pemilik tagihan tidak ditemukan");

      const dari = Math.max(sekarang, u.planEndsAt ?? 0);
      const sampai = addMonths(new Date(dari), t.periode === "tahun" ? 12 : 1).getTime();

      tx.update(users)
        .set({ plan: t.paket, planEndsAt: sampai })
        .where(eq(users.id, t.userId))
        .run();
      tx.update(pembayaranLangganan)
        .set({
          status: "disetujui",
          diputuskanPada: sekarang,
          diputuskanOleh: sesi.penggunaId,
          berlakuDari: dari,
          berlakuSampai: sampai,
          dibayarPada: t.dibayarPada ?? sekarang,
        })
        .where(eq(pembayaranLangganan.id, t.id))
        .run();
    });
  } catch (e) {
    return gagal(e, "Gagal menyetujui");
  }
  revalidatePath("/admin/langganan");
  return { ok: true };
}

export async function tolakPembayaran(id: string, alasan: string): Promise<HasilAksi> {
  const catatan = String(alasan ?? "").trim().slice(0, 200);
  if (!catatan) return { ok: false, error: "Tulis alasan penolakan untuk pendaftar" };
  try {
    const sesi = await wajibAdmin();
    const r = db
      .update(pembayaranLangganan)
      .set({
        status: "ditolak",
        catatan,
        diputuskanPada: Date.now(),
        diputuskanOleh: sesi.penggunaId,
      })
      .where(
        and(
          eq(pembayaranLangganan.id, String(id)),
          inArray(pembayaranLangganan.status, ["menunggu", "diperiksa"]),
        ),
      )
      .run();
    if (r.changes === 0) throw new Error("Tagihan ini sudah diputuskan");
  } catch (e) {
    return gagal(e, "Gagal menolak");
  }
  revalidatePath("/admin/langganan");
  return { ok: true };
}

export async function simpanQris(formData: FormData): Promise<HasilAksi> {
  try {
    await wajibAdmin();
    const nama = String(formData.get("namaPenerima") ?? "").trim().slice(0, 80);
    const berkas = formData.get("gambar");
    if (berkas instanceof File && berkas.size > 0) {
      tulisPengaturan("qris_gambar", await simpanBerkasLangganan(berkas));
    }
    tulisPengaturan("qris_nama", nama || null);
  } catch (e) {
    return gagal(e, "QRIS gagal disimpan");
  }
  revalidatePath("/admin/langganan");
  revalidatePath("/langganan");
  return { ok: true };
}
