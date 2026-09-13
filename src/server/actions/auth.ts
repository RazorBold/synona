"use server";

import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { outlets, pengguna, staff, users } from "@/db/schema";
import { RUTE_GANTI_SANDI, RUTE_MASUK } from "@/lib/auth-const";
import type { JenisUsaha } from "@/lib/usaha";
import { normalisasiNomorHp } from "@/lib/wa";
import { buatAkunKasBawaan } from "@/server/kas";
import {
  bolehCobaLogin,
  buatSalt,
  buatSesi,
  catatLoginGagal,
  cocokkanSandi,
  hapusSesi,
  hashSandi,
  periksaKekuatanSandi,
  normalisasiKodePemulihan,
  resetLoginGagal,
  simpanKodePemulihan,
  sisaMenitBlokir,
  wajibSesi,
} from "@/server/auth";

export type HasilAksi = { ok: true } | { ok: false; error: string };

const MasukInput = z.object({
  namaPengguna: z.string().trim().min(1, "Nama pengguna wajib diisi").max(64),
  sandi: z.string().min(1, "Sandi wajib diisi").max(200),
  lanjut: z.string().max(300).nullable().default(null),
  /**
   * Hanya terisi pada pemasangan baru: halaman masuk menampilkan pilihan
   * jenis usaha selama outletnya belum punya. Ikut dikirim bersama
   * kredensial supaya penyimpanannya terjadi SETELAH sandinya terbukti
   * benar — kalau disediakan sebagai aksi tersendiri, siapa pun yang bisa
   * membuka halaman masuk bisa menentukan jenis usaha orang lain.
   */
  jenisUsaha: z.enum(["dagang", "jasa", "campuran"]).nullable().default(null),
});

/**
 * Hanya menerima path relatif satu garis miring. Tanpa ini `?lanjut=` bisa
 * dipakai sebagai open redirect: "//situs-lain.com" dan "https://..." keduanya
 * diterima browser sebagai tujuan absolut.
 */
function tujuanAman(lanjut: string | null): string {
  if (!lanjut) return "/";
  if (!lanjut.startsWith("/") || lanjut.startsWith("//")) return "/";
  return lanjut;
}

/**
 * Pesan gagal sengaja seragam ("Nama pengguna atau sandi salah") supaya tidak
 * bisa dipakai menebak nama pengguna mana yang ada di database.
 */
export async function masuk(input: unknown): Promise<HasilAksi> {
  const parsed = MasukInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { sandi, lanjut, jenisUsaha } = parsed.data;
  const namaPengguna = parsed.data.namaPengguna.toLowerCase();

  if (!bolehCobaLogin(namaPengguna)) {
    return {
      ok: false,
      error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${sisaMenitBlokir(namaPengguna)} menit.`,
    };
  }

  const akun = db
    .select()
    .from(pengguna)
    .where(eq(pengguna.namaPengguna, namaPengguna))
    .get();

  if (!akun || !(await cocokkanSandi(sandi, akun.salt, akun.hashSandi))) {
    catatLoginGagal(namaPengguna);
    return { ok: false, error: "Nama pengguna atau sandi salah" };
  }

  /**
   * Akun nonaktif ditolak dengan pesan yang SAMA seperti sandi salah. Pesan
   * khusus ("akun dinonaktifkan") akan memberi tahu penebak bahwa nama
   * penggunanya benar-benar ada — dan sandinya benar.
   */
  if (akun.aktif === 0) {
    catatLoginGagal(namaPengguna);
    return { ok: false, error: "Nama pengguna atau sandi salah" };
  }

  resetLoginGagal(namaPengguna);
  await buatSesi({
    penggunaId: akun.id,
    namaPengguna: akun.namaPengguna,
    peran: akun.peran,
  });

  if (jenisUsaha) simpanJenisUsahaAwal(jenisUsaha, akun);

  redirect(tujuanAman(lanjut));
}

/**
 * Menetapkan jenis usaha SEKALI, hanya selama outletnya masih kosong.
 *
 * Klausa `jenis_usaha IS NULL` itu penjaganya: setelah terisi, nilai dari
 * halaman masuk tidak bisa lagi menimpanya — penggantian berikutnya hanya
 * lewat Pengaturan → Outlet oleh pemilik yang sudah masuk.
 *
 * Sejak pendaftaran dibuka untuk banyak usaha, perubahannya WAJIB dibatasi ke
 * outlet milik yang login. Tanpa batasan itu, satu pemilik yang menjawab
 * pertanyaan di halaman masuk akan ikut menetapkan jenis usaha milik orang
 * lain yang kebetulan juga belum memilih.
 */
function simpanJenisUsahaAwal(
  jenis: JenisUsaha,
  akun: { id: string; peran: string; userId: string | null },
): void {
  if (akun.peran !== "pemilik") return;

  if (akun.userId) {
    db.run(sql`
      UPDATE outlets SET jenis_usaha = ${jenis}
       WHERE jenis_usaha IS NULL
         AND id IN (SELECT outlet_id FROM staff
                     WHERE user_id = ${akun.userId} AND is_active = 1)
    `);
    return;
  }

  // Akun warisan yang belum tertaut ke baris `users` mana pun memakai outlet
  // pertama — jalur yang sama dengan cadangan di `getOutletAktif()`.
  db.run(sql`
    UPDATE outlets SET jenis_usaha = ${jenis}
     WHERE jenis_usaha IS NULL
       AND id = (SELECT id FROM outlets ORDER BY created_at LIMIT 1)
  `);
}

/** Apakah pemasangan ini belum pernah memilih jenis usaha. */
export async function perluPilihJenisUsaha(): Promise<boolean> {
  const row = db
    .select({ jenisUsaha: outlets.jenisUsaha })
    .from(outlets)
    .limit(1)
    .get();
  return Boolean(row) && row!.jenisUsaha === null;
}

/* ------------------------------------------------------- pendaftaran */

/**
 * Apakah pemasangan ini belum punya akun sama sekali.
 *
 * Dipakai halaman /masuk untuk melempar pemasangan yang benar-benar kosong ke
 * /register — bukan lagi untuk menutup pendaftaran. Pendaftaran sekarang
 * terbuka: setiap yang mendaftar mendapat outletnya sendiri, dan
 * `getOutletAktif()` memilih outlet dari sesi, jadi usaha yang satu tidak
 * pernah melihat data usaha yang lain.
 */
export async function belumAdaAkunSamaSekali(): Promise<boolean> {
  const ada = db.select({ id: pengguna.id }).from(pengguna).limit(1).get();
  return !ada;
}

const DaftarInput = z.object({
  namaOutlet: z.string().trim().min(2, "Nama outlet minimal 2 huruf").max(80),
  namaPemilik: z.string().trim().min(2, "Nama pemilik minimal 2 huruf").max(80),
  jenisUsaha: z.enum(["dagang", "jasa", "campuran"], {
    message: "Pilih jenis usaha dulu",
  }),
  namaPengguna: z
    .string()
    .trim()
    .min(3, "Nama pengguna minimal 3 huruf")
    .max(64)
    .regex(
      /^[a-z0-9._-]+$/i,
      "Nama pengguna hanya boleh huruf, angka, titik, garis bawah, dan strip",
    ),
  /**
   * Opsional, dan hanya disimpan sebagai keterangan pemilik. Synona tidak
   * mengirim email atau SMS ke mana pun (tidak ada SMTP di pemasangan ini),
   * jadi keduanya tidak dipakai untuk memulihkan sandi — itu lewat kode
   * pemulihan di /lupa-sandi.
   */
  email: z.string().trim().max(120).nullable().default(null),
  telepon: z.string().trim().max(24).nullable().default(null),
  sandi: z.string().min(1, "Sandi wajib diisi").max(200),
  ulangiSandi: z.string().min(1, "Ulangi sandi wajib diisi").max(200),
});

/**
 * Mendaftarkan satu usaha baru: satu outlet, satu pemilik, satu akun masuk —
 * dibuat sekaligus dalam satu transaksi, lalu langsung disesikan.
 *
 * Boleh dipanggil berkali-kali: tiap pendaftaran menghasilkan outlet DAN
 * baris `staff` sendiri, dan `getOutletAktif()` memilih outlet lewat
 * keanggotaan staf milik sesi. Dua syarat itu yang membuat pendaftaran
 * terbuka tidak membocorkan data usaha yang satu ke yang lain — jangan
 * melonggarkan salah satunya tanpa yang lain.
 *
 * Yang tetap dijaga: nama pengguna unik se-aplikasi.
 */
export async function daftar(input: unknown): Promise<HasilAksi> {
  const parsed = DaftarInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const d = parsed.data;

  if (d.sandi !== d.ulangiSandi) {
    return { ok: false, error: "Sandi dan ulangannya tidak sama" };
  }
  const lemah = periksaKekuatanSandi(d.sandi);
  if (lemah) return { ok: false, error: lemah };

  const namaPengguna = d.namaPengguna.toLowerCase();

  const email = d.email?.trim().toLowerCase() || null;
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "Email tidak valid" };
  }
  const telepon = d.telepon?.trim() ? normalisasiNomorHp(d.telepon) : null;

  // scrypt di luar transaksi: transaksi better-sqlite3 berjalan sinkron dan
  // tidak boleh diberi callback async di tengahnya.
  const salt = buatSalt();
  const hash = await hashSandi(d.sandi, salt);

  const penggunaId = nanoid();

  try {
    db.transaction((tx) => {
      const dobel = tx
        .select({ id: pengguna.id })
        .from(pengguna)
        .where(eq(pengguna.namaPengguna, namaPengguna))
        .get();
      if (dobel) throw new Error("Nama pengguna itu sudah dipakai");

      const userId = nanoid();
      tx.insert(users)
        .values({
          id: userId,
          // Email boleh dikosongkan. Kolomnya NOT NULL + unik, jadi yang
          // kosong diisi turunan nama pengguna — nilai itu tidak pernah
          // dikirimi apa pun, hanya menjaga keunikan baris.
          email: email ?? `${namaPengguna}@synona.local`,
          name: d.namaPemilik,
          phone: telepon,
          plan: "mulai",
        })
        .run();

      const outletId = nanoid();
      tx.insert(outlets)
        .values({
          id: outletId,
          ownerId: userId,
          name: d.namaOutlet,
          jenisUsaha: d.jenisUsaha,
        })
        .run();

      // Kas laci, rekening bank, dan QRIS — sama seperti outlet yang dibuat
      // dari Pengaturan (lihat simpanOutlet). Tanpa ini penjualan pertama
      // tidak punya akun kas untuk dicatat.
      buatAkunKasBawaan(tx as never, outletId);

      tx.insert(staff)
        .values({ id: nanoid(), outletId, userId, role: "owner" })
        .run();

      tx.insert(pengguna)
        .values({
          id: penggunaId,
          nama: d.namaPemilik,
          namaPengguna,
          hashSandi: hash,
          salt,
          peran: "pemilik",
          // Ditautkan ke baris `users` yang baru dibuat di atas — jalur yang
          // sama dipakai `simpanStaf()` saat membuatkan akun untuk kasir,
          // sehingga pemilik dan staf hidup di model yang sama.
          userId,
          harusGantiSandi: 0,
        })
        .run();
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal mendaftar" };
  }

  await buatSesi({ penggunaId, namaPengguna, peran: "pemilik" });
  redirect("/");
}

export async function keluar(): Promise<never> {
  await hapusSesi();
  redirect(RUTE_MASUK);
}

const GantiSandiInput = z.object({
  sandiLama: z.string().min(1, "Sandi lama wajib diisi").max(200),
  sandiBaru: z.string().min(1, "Sandi baru wajib diisi").max(200),
  ulangiSandi: z.string().min(1, "Ulangi sandi baru").max(200),
});

export async function gantiSandi(input: unknown): Promise<HasilAksi> {
  const s = await wajibSesi();

  const parsed = GantiSandiInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const { sandiLama, sandiBaru, ulangiSandi } = parsed.data;

  if (sandiBaru !== ulangiSandi) {
    return { ok: false, error: "Sandi baru dan ulangannya tidak sama" };
  }
  const lemah = periksaKekuatanSandi(sandiBaru);
  if (lemah) return { ok: false, error: lemah };

  const akun = db.select().from(pengguna).where(eq(pengguna.id, s.penggunaId)).get();
  if (!akun) return { ok: false, error: "Akun tidak ditemukan" };

  if (!(await cocokkanSandi(sandiLama, akun.salt, akun.hashSandi))) {
    return { ok: false, error: "Sandi lama salah" };
  }
  if (await cocokkanSandi(sandiBaru, akun.salt, akun.hashSandi)) {
    return { ok: false, error: "Sandi baru harus berbeda dari sandi lama" };
  }

  const salt = buatSalt();
  db.update(pengguna)
    .set({
      salt,
      hashSandi: await hashSandi(sandiBaru, salt),
      harusGantiSandi: 0,
    })
    .where(eq(pengguna.id, akun.id))
    .run();

  /**
   * Sesi lama TIDAK bisa dicabut: JWT tetap sah sampai `exp`-nya lewat, dan
   * tidak ada daftar sesi di DB untuk dihapus. Mencabut akses semua perangkat
   * berarti mengganti SYNONA_JWT_SECRET — lihat README.md. Yang bisa
   * dilakukan di sini hanya menyegarkan token perangkat ini sendiri.
   */
  await buatSesi({
    penggunaId: akun.id,
    namaPengguna: akun.namaPengguna,
    peran: akun.peran,
  });

  redirect("/");
}

/* ------------------------------------------------- pemulihan sandi */

/**
 * Membuat kode pemulihan baru dan mengembalikannya SEKALI.
 *
 * Setelah ini hanya hash-nya yang tersimpan; kalau pemilik tidak mencatatnya,
 * satu-satunya jalan adalah membuat kode baru lagi (selama masih bisa masuk)
 * atau `npm run auth:reset` di server.
 */
export async function buatKodePemulihanBaru(): Promise<
  { ok: true; kode: string } | { ok: false; error: string }
> {
  const s = await wajibSesi();
  const kode = await simpanKodePemulihan(s.penggunaId);
  return { ok: true, kode };
}

const PulihInput = z.object({
  namaPengguna: z.string().trim().min(1, "Nama pengguna wajib diisi").max(64),
  kode: z.string().trim().min(1, "Kode pemulihan wajib diisi").max(64),
  sandiBaru: z.string().min(1, "Sandi baru wajib diisi").max(200),
  ulangiSandi: z.string().min(1, "Ulangi sandi baru").max(200),
});

/**
 * Memulihkan akses dengan kode pemulihan, tanpa perlu sandi lama.
 *
 * Kodenya sekali pakai: begitu terpakai, kolomnya dikosongkan supaya kode yang
 * sama tidak bisa diputar ulang oleh orang lain yang sempat melihatnya.
 */
export async function pulihkanSandi(input: unknown): Promise<HasilAksi> {
  const parsed = PulihInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { sandiBaru, ulangiSandi } = parsed.data;
  const namaPengguna = parsed.data.namaPengguna.toLowerCase();
  const kunciBatas = `pulih:${namaPengguna}`;

  if (!bolehCobaLogin(kunciBatas)) {
    return {
      ok: false,
      error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${sisaMenitBlokir(kunciBatas)} menit.`,
    };
  }

  if (sandiBaru !== ulangiSandi) {
    return { ok: false, error: "Sandi baru dan ulangannya tidak sama" };
  }
  const lemah = periksaKekuatanSandi(sandiBaru);
  if (lemah) return { ok: false, error: lemah };

  const akun = db
    .select()
    .from(pengguna)
    .where(eq(pengguna.namaPengguna, namaPengguna))
    .get();

  /**
   * Satu pesan seragam untuk semua kegagalan — nama pengguna tidak ada, belum
   * punya kode, atau kodenya salah. Membedakannya akan memberi tahu penebak
   * nama pengguna mana yang nyata.
   */
  const GAGAL = {
    ok: false as const,
    error: "Nama pengguna atau kode pemulihan salah",
  };

  if (!akun?.kodePemulihanHash || !akun.kodePemulihanSalt) {
    catatLoginGagal(kunciBatas);
    return GAGAL;
  }

  const kode = normalisasiKodePemulihan(parsed.data.kode);
  if (!(await cocokkanSandi(kode, akun.kodePemulihanSalt, akun.kodePemulihanHash))) {
    catatLoginGagal(kunciBatas);
    return GAGAL;
  }

  const salt = buatSalt();
  db.update(pengguna)
    .set({
      salt,
      hashSandi: await hashSandi(sandiBaru, salt),
      harusGantiSandi: 0,
      // Sekali pakai.
      kodePemulihanHash: null,
      kodePemulihanSalt: null,
      kodePemulihanDibuatPada: null,
    })
    .where(eq(pengguna.id, akun.id))
    .run();

  resetLoginGagal(kunciBatas);
  resetLoginGagal(namaPengguna);

  await buatSesi({
    penggunaId: akun.id,
    namaPengguna: akun.namaPengguna,
    peran: akun.peran,
  });

  // Ke halaman ganti sandi: kodenya sudah terpakai, dan di sana pemilik
  // langsung diminta membuat kode pemulihan yang baru.
  redirect(RUTE_GANTI_SANDI);
}
