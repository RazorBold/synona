"use server";

import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import fs from "node:fs/promises";
import path from "node:path";

import { db } from "@/db";
import { outlets, pengguna, staff, users } from "@/db/schema";
import { JENIS_GAMBAR, MAKS_UKURAN_BYTE } from "@/lib/gambar";
import { BP_MAKS } from "@/lib/pajak";
import { PAKET, type Paket } from "@/lib/paket";
import { normalisasiNomorHp } from "@/lib/wa";
import {
  buatSalt,
  hashSandi,
  periksaKekuatanSandi,
  wajibSesi,
} from "@/server/auth";
import { buatAkunKasBawaan } from "@/server/kas";
import { getOutletAktif, getOutletMenulis } from "@/server/queries/dashboard";

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
  const aktif = await getOutletMenulis();

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
          // Cabang baru mengikuti jenis usaha yang sudah dipilih — kalau
          // dibiarkan kosong, membuka cabang justru melempar pemilik kembali
          // ke layar onboarding.
          jenisUsaha: aktif.jenisUsaha,
        })
        .run();

      // Outlet baru langsung punya kas, bank, dan QRIS — lihat src/server/kas.ts.
      buatAkunKasBawaan(tx as never, id);

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
  /**
   * Kredensial masuk. Keduanya OPSIONAL: staf boleh dicatat hanya sebagai
   * nama untuk atribusi transaksi, tanpa diberi akses aplikasi. Kalau diisi,
   * barulah akun `pengguna` dibuat — inilah jalur yang menyatukan halaman ini
   * dengan /register, yang membuat akun dengan cara yang sama.
   */
  namaPengguna: z
    .string()
    .trim()
    .max(64)
    .regex(
      /^[a-z0-9._-]*$/i,
      "Nama pengguna hanya boleh huruf, angka, titik, garis bawah, dan strip",
    )
    .nullable()
    .default(null),
  sandi: z.string().max(200).nullable().default(null),
});

/**
 * Menambah atau mengubah staf, sekalian akun masuknya.
 *
 * Dulu fungsi ini hanya menulis `users` + `staff`, sementara autentikasi
 * hidup di tabel `pengguna` yang terpisah — akibatnya staf yang ditambahkan
 * di sini TIDAK PERNAH bisa masuk. Sekarang keduanya ditulis bersama lewat
 * `pengguna.user_id`, memakai fungsi hash yang sama dengan /register.
 *
 * Sandi yang diberikan pemilik selalu ditandai `harusGantiSandi` — pemilik
 * mengetahui sandi awal itu, jadi ia harus berhenti berlaku begitu stafnya
 * masuk pertama kali (ditegakkan di src/app/(app)/layout.tsx).
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
  const aktif = await getOutletMenulis();
  const telepon = d.telepon ? normalisasiNomorHp(d.telepon) : null;

  const namaPengguna = d.namaPengguna?.trim().toLowerCase() || null;
  const sandi = d.sandi?.trim() || null;

  if (sandi && !namaPengguna) {
    return { ok: false, error: "Isi juga nama penggunanya supaya staf bisa masuk" };
  }
  if (namaPengguna && namaPengguna.length < 3) {
    return { ok: false, error: "Nama pengguna minimal 3 huruf" };
  }
  // Akun baru wajib punya sandi; pada mode ubah, sandi kosong berarti
  // "biarkan sandi yang sekarang".
  if (namaPengguna && !d.id && !sandi) {
    return { ok: false, error: "Isi sandi awal untuk staf ini" };
  }
  if (sandi) {
    const lemah = periksaKekuatanSandi(sandi);
    if (lemah) return { ok: false, error: lemah };
  }

  // scrypt async, sementara transaksi better-sqlite3 sinkron — hash dulu di
  // luar, sama seperti di daftar().
  const salt = sandi ? buatSalt() : null;
  const hash = sandi && salt ? await hashSandi(sandi, salt) : null;
  const peranAkun = d.peran === "owner" ? "pemilik" : "kasir";

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
        const barisStaf = tx
          .select({ userId: staff.userId })
          .from(staff)
          .where(eq(staff.id, d.id))
          .get();
        if (!barisStaf) throw new Error("Staf tidak ditemukan");

        tx.update(staff)
          .set({ role: d.peran })
          .where(eq(staff.id, d.id))
          .run();
        tx.run(
          sql`UPDATE users SET name = ${d.nama}, phone = ${telepon}
               WHERE id = ${barisStaf.userId}`,
        );

        sinkronkanAkun(tx, {
          userId: barisStaf.userId,
          nama: d.nama,
          namaPengguna,
          peranAkun,
          hash,
          salt,
        });
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

      sinkronkanAkun(tx, {
        userId,
        nama: d.nama,
        namaPengguna,
        peranAkun,
        hash,
        salt,
      });
    });
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidatePath("/outlet");
  return { ok: true };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Menyelaraskan akun masuk milik satu orang dengan data stafnya.
 *
 * Tidak melakukan apa pun kalau nama pengguna dikosongkan — itu cara pemilik
 * mencatat staf yang tidak diberi akses aplikasi. Begitu diisi, akunnya
 * dibuat (atau disegarkan) dan langsung terikat lewat `pengguna.user_id`.
 */
function sinkronkanAkun(
  tx: Tx,
  a: {
    userId: string;
    nama: string;
    namaPengguna: string | null;
    peranAkun: "pemilik" | "kasir";
    hash: string | null;
    salt: string | null;
  },
): void {
  if (!a.namaPengguna) return;

  const punya = tx
    .select({ id: pengguna.id })
    .from(pengguna)
    .where(eq(pengguna.userId, a.userId))
    .get();

  // Nama pengguna itu unik se-aplikasi, jadi bentrokannya dicek terhadap
  // SEMUA akun, bukan cuma staf outlet ini.
  const dipakaiOrangLain = tx
    .select({ id: pengguna.id })
    .from(pengguna)
    .where(eq(pengguna.namaPengguna, a.namaPengguna))
    .get();
  if (dipakaiOrangLain && dipakaiOrangLain.id !== punya?.id) {
    throw new Error(`Nama pengguna "${a.namaPengguna}" sudah dipakai akun lain`);
  }

  if (punya) {
    tx.update(pengguna)
      .set({
        nama: a.nama,
        namaPengguna: a.namaPengguna,
        peran: a.peranAkun,
        // Menyimpan staf lewat dialog ini berarti pemilik menghendaki orang
        // itu aktif kembali kalau sebelumnya dinonaktifkan.
        aktif: 1,
        // Sandi hanya disentuh kalau kolomnya memang diisi.
        ...(a.hash && a.salt
          ? { hashSandi: a.hash, salt: a.salt, harusGantiSandi: 1 }
          : {}),
      })
      .where(eq(pengguna.id, punya.id))
      .run();
    return;
  }

  if (!a.hash || !a.salt) {
    throw new Error("Isi sandi awal untuk membuatkan akun masuk staf ini");
  }

  tx.insert(pengguna)
    .values({
      id: nanoid(),
      nama: a.nama,
      namaPengguna: a.namaPengguna,
      hashSandi: a.hash,
      salt: a.salt,
      peran: a.peranAkun,
      userId: a.userId,
      // Sandi awal ini diketahui pemilik, jadi wajib diganti saat staf
      // pertama kali masuk — ditegakkan di src/app/(app)/layout.tsx.
      harusGantiSandi: 1,
    })
    .run();
}

/** Staf dinonaktifkan, bukan dihapus — transaksi lama menunjuk ke barisnya. */
export async function nonaktifkanStaf(id: string): Promise<HasilAksi> {
  await wajibSesi();
  const aktif = await getOutletMenulis();

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

      /**
       * Akses masuknya ikut dicabut. Kalau hanya baris `staff` yang dimatikan,
       * mantan kasir tetap bisa login dan membuka seluruh aplikasi — sesi JWT
       * tidak punya daftar pencabutan, jadi penjagaannya harus di sini.
       */
      tx.update(pengguna)
        .set({ aktif: 0 })
        .where(eq(pengguna.userId, s.userId))
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
  const aktif = await getOutletMenulis();

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

const JenisUsahaInput = z.object({
  jenis: z.enum(["dagang", "jasa", "campuran"]),
});

/**
 * Menyimpan jenis usaha. Dipakai layar penyiapan dan Pengaturan → Outlet.
 * Pilihan pada halaman masuk memakai jalur lain (lihat `masuk()`), karena di
 * sana penggunanya belum punya sesi.
 *
 * Menggantinya tidak menghapus apa pun: menu yang disembunyikan hanya
 * disembunyikan. Pemilik yang tadinya "jasa" lalu pindah ke "campuran" akan
 * menemukan katalog produknya utuh seperti sebelumnya.
 */
export async function simpanJenisUsaha(input: unknown): Promise<HasilAksi> {
  await wajibSesi();
  const parsed = JenisUsahaInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Pilih dulu jenis usahanya" };
  }
  const aktif = await getOutletAktif();

  try {
    db.update(outlets)
      .set({ jenisUsaha: parsed.data.jenis })
      .where(eq(outlets.id, aktif.id))
      .run();
  } catch (e) {
    return { ok: false, error: pesan(e) };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/* ------------------------------------------------ QRIS & pajak outlet */

const DIR_GAMBAR = process.env.UPLOAD_DIR ?? "./data/uploads/produk";
const EKSTENSI_GAMBAR: Record<string, string> = {
  "image/webp": ".webp",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

/**
 * QRIS dan pajak outlet yang sedang aktif.
 *
 * QRIS disimpan apa adanya (tidak dikompres ulang): pola QR yang sudah
 * terlanjur buram tidak bisa dipindai, dan itu berarti pembeli gagal bayar.
 */
export async function simpanPembayaranOutlet(formData: FormData): Promise<HasilAksi> {
  try {
    const aktif = await getOutletMenulis();

    const pajakNama = String(formData.get("pajakNama") ?? "").trim().slice(0, 24);
    const pajakAktifDiminta = String(formData.get("pajakAktif") ?? "") === "1";
    // Persen datang sebagai teks ("0,5" / "11") lalu jadi basis poin.
    const persen = Number(String(formData.get("pajakPersen") ?? "0").replace(",", "."));
    if (pajakAktifDiminta) {
      if (!pajakNama) throw new Error("Isi nama pajaknya, misalnya PPh atau PPN");
      if (!Number.isFinite(persen) || persen <= 0) throw new Error("Isi tarif pajak lebih dari 0");
      if (Math.round(persen * 100) > BP_MAKS) throw new Error("Tarif pajak maksimal 50%");
    }
    const mode = String(formData.get("pajakMode") ?? "termasuk") === "tambah" ? "tambah" : "termasuk";

    const berkas = formData.get("qris");
    let qrisBaru: string | null = null;
    if (berkas instanceof File && berkas.size > 0) {
      if (!JENIS_GAMBAR.includes(berkas.type)) {
        throw new Error("Format QRIS harus WebP, JPG, atau PNG");
      }
      if (berkas.size > MAKS_UKURAN_BYTE) throw new Error("Ukuran gambar QRIS maksimal 2 MB");
      await fs.mkdir(DIR_GAMBAR, { recursive: true });
      qrisBaru = `${nanoid()}${EKSTENSI_GAMBAR[berkas.type]}`;
      await fs.writeFile(
        path.join(DIR_GAMBAR, qrisBaru),
        Buffer.from(await berkas.arrayBuffer()),
      );
    }
    const hapusQris = String(formData.get("hapusQris") ?? "") === "1";

    const lama = db
      .select({ qris: outlets.qrisGambar })
      .from(outlets)
      .where(eq(outlets.id, aktif.id))
      .get();

    db.update(outlets)
      .set({
        pajakNama: pajakAktifDiminta ? pajakNama : null,
        pajakBp: pajakAktifDiminta ? Math.round(persen * 100) : 0,
        pajakMode: mode,
        ...(qrisBaru || hapusQris ? { qrisGambar: qrisBaru } : {}),
      })
      .where(eq(outlets.id, aktif.id))
      .run();

    // Berkas lama dibuang setelah barisnya berhasil diubah, bukan sebelum:
    // kalau update gagal, gambarnya masih ada dan layar bayar tetap jalan.
    if ((qrisBaru || hapusQris) && lama?.qris) {
      await fs.unlink(path.join(DIR_GAMBAR, lama.qris)).catch(() => {});
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal menyimpan" };
  }

  revalidatePath("/outlet");
  revalidatePath("/kasir");
  return { ok: true };
}
