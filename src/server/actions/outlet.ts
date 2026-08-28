"use server";

import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { outlets, staff, users } from "@/db/schema";
import { PAKET, type Paket } from "@/lib/paket";
import { normalisasiNomorHp } from "@/lib/wa";
import { wajibSesi } from "@/server/auth";
import { getOutletAktif } from "@/server/queries/dashboard";

export type HasilAksi = { ok: true } | { ok: false; error: string };

const OutletInput = z.object({
  id: z.string().nullable().default(null),
  nama: z.string().trim().min(2, "Nama outlet minimal 2 huruf").max(80),
  alamat: z.string().trim().max(200).nullable().default(null),
  telepon: z.string().trim().max(24).nullable().default(null),
});

/**
 * Menambah atau mengubah outlet.
 *
 * Batas jumlah outlet per paket dicek **di server** — menyembunyikan tombol
 * di UI saja tidak cukup, karena Server Action bisa dipanggil langsung.
 */
export async function simpanOutlet(input: unknown): Promise<HasilAksi> {
  await wajibSesi();
  const parsed = OutletInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }
  const d = parsed.data;
  const aktif = await getOutletAktif();

  try {
    db.transaction((tx) => {
      const pemilik = tx
        .select({ plan: users.plan })
        .from(users)
        .where(eq(users.id, aktif.ownerId))
        .get();
      const batas = PAKET[(pemilik?.plan ?? "mulai") as Paket];

      if (d.id) {
        const ada = tx
          .select({ id: outlets.id })
          .from(outlets)
          .where(
            and(eq(outlets.id, d.id), eq(outlets.ownerId, aktif.ownerId)),
          )
          .get();
        if (!ada) throw new Error("Outlet tidak ditemukan");

        tx.update(outlets)
          .set({
            name: d.nama,
            address: d.alamat,
            phone: d.telepon ? normalisasiNomorHp(d.telepon) : null,
          })
          .where(eq(outlets.id, d.id))
          .run();
        return;
      }

      const jumlah = tx.get<{ n: number }>(
        sql`SELECT COUNT(*) AS n FROM outlets
             WHERE owner_id = ${aktif.ownerId} AND is_active = 1`,
      );

      if (batas.maksOutlet !== null && (jumlah?.n ?? 0) >= batas.maksOutlet) {
        throw new Error(
          `Paket ${batas.label} hanya boleh ${batas.maksOutlet} outlet. Naikkan paket untuk menambah outlet.`,
        );
      }

      const id = nanoid();
      tx.insert(outlets)
        .values({
          id,
          ownerId: aktif.ownerId,
          name: d.nama,
          address: d.alamat,
          phone: d.telepon ? normalisasiNomorHp(d.telepon) : null,
        })
        .run();

      // Pemilik otomatis jadi staf di outlet barunya.
      tx.insert(staff)
        .values({
          id: nanoid(),
          outletId: id,
          userId: aktif.ownerId,
          role: "owner",
        })
        .run();
    });
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidatePath("/outlet");
  revalidatePath("/");
  return { ok: true };
}

const StafInput = z.object({
  id: z.string().nullable().default(null),
  outletId: z.string().min(1, "Pilih outlet dulu"),
  nama: z.string().trim().min(2, "Nama staf minimal 2 huruf").max(80),
  email: z.string().trim().email("Email tidak valid").max(120),
  telepon: z.string().trim().max(24).nullable().default(null),
  peran: z.enum(["owner", "kasir"]),
});

/**
 * Menambah staf. Karena autentikasi belum terpasang (langkah 5), baris `users`
 * dibuat tanpa kata sandi — nanti tinggal ditautkan ke Auth.js lewat email.
 */
export async function simpanStaf(input: unknown): Promise<HasilAksi> {
  await wajibSesi();
  const parsed = StafInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }
  const d = parsed.data;
  const aktif = await getOutletAktif();
  const telepon = d.telepon ? normalisasiNomorHp(d.telepon) : null;

  try {
    db.transaction((tx) => {
      const pemilik = tx
        .select({ plan: users.plan })
        .from(users)
        .where(eq(users.id, aktif.ownerId))
        .get();
      const batas = PAKET[(pemilik?.plan ?? "mulai") as Paket];

      const milik = tx
        .select({ id: outlets.id })
        .from(outlets)
        .where(
          and(
            eq(outlets.id, d.outletId),
            eq(outlets.ownerId, aktif.ownerId),
          ),
        )
        .get();
      if (!milik) throw new Error("Outlet tidak ditemukan");

      if (d.id) {
        tx.update(staff)
          .set({ role: d.peran })
          .where(eq(staff.id, d.id))
          .run();
        tx.run(
          sql`UPDATE users SET name = ${d.nama}, phone = ${telepon}
               WHERE id = (SELECT user_id FROM staff WHERE id = ${d.id})`,
        );
        return;
      }

      if (!batas.bolehMultiStaf) {
        const jumlah = tx.get<{ n: number }>(
          sql`SELECT COUNT(*) AS n FROM staff s
                JOIN outlets o ON o.id = s.outlet_id
               WHERE o.owner_id = ${aktif.ownerId} AND s.is_active = 1`,
        );
        if ((jumlah?.n ?? 0) >= 1) {
          throw new Error(
            `Paket ${batas.label} belum bisa menambah kasir. Naikkan ke paket Tumbuh.`,
          );
        }
      }

      let userId = tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, d.email))
        .get()?.id;

      if (!userId) {
        userId = nanoid();
        tx.insert(users)
          .values({
            id: userId,
            email: d.email,
            name: d.nama,
            phone: telepon,
            plan: "mulai",
          })
          .run();
      }

      const sudahAda = tx
        .select({ id: staff.id })
        .from(staff)
        .where(
          and(eq(staff.outletId, d.outletId), eq(staff.userId, userId)),
        )
        .get();
      if (sudahAda) throw new Error("Orang ini sudah terdaftar di outlet itu");

      tx.insert(staff)
        .values({
          id: nanoid(),
          outletId: d.outletId,
          userId,
          role: d.peran,
        })
        .run();
    });
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidatePath("/outlet");
  return { ok: true };
}

/** Staf dinonaktifkan, bukan dihapus — transaksi lama menunjuk ke barisnya. */
export async function nonaktifkanStaf(id: string): Promise<HasilAksi> {
  await wajibSesi();
  const aktif = await getOutletAktif();

  try {
    db.transaction((tx) => {
      const s = tx
        .select({ role: staff.role, userId: staff.userId })
        .from(staff)
        .where(eq(staff.id, id))
        .get();
      if (!s) throw new Error("Staf tidak ditemukan");
      if (s.userId === aktif.ownerId) {
        throw new Error("Pemilik tidak bisa menonaktifkan dirinya sendiri");
      }

      tx.update(staff)
        .set({ isActive: 0 })
        .where(eq(staff.id, id))
        .run();
    });
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidatePath("/outlet");
  return { ok: true };
}

const ProfilInput = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 huruf").max(80),
  telepon: z.string().trim().max(24).nullable().default(null),
});

export async function simpanProfilPemilik(input: unknown): Promise<HasilAksi> {
  await wajibSesi();
  const parsed = ProfilInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }
  const d = parsed.data;
  const aktif = await getOutletAktif();

  try {
    db.update(users)
      .set({
        name: d.nama,
        phone: d.telepon ? normalisasiNomorHp(d.telepon) : null,
      })
      .where(eq(users.id, aktif.ownerId))
      .run();
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidatePath("/outlet");
  revalidatePath("/");
  return { ok: true };
}

function pesan(e: unknown): string {
  const p = e instanceof Error ? e.message : "Gagal menyimpan";
  if (p.includes("UNIQUE") && p.includes("email")) {
    return "Email itu sudah dipakai pengguna lain";
  }
  return p;
}
