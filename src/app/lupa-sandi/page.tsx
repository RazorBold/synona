import type { Metadata } from "next";
import Link from "next/link";

import { FormLupaSandi } from "@/components/auth/form-lupa-sandi";
import { KartuAuth } from "@/components/auth/kartu-auth";
import { RUTE_MASUK } from "@/lib/auth-const";

export const metadata: Metadata = { title: "Lupa Sandi — Synona" };

export const dynamic = "force-dynamic";

export default function HalamanLupaSandi() {
  return (
    <KartuAuth
      judul="Lupa sandi"
      keterangan="Masukkan kode pemulihan yang Anda catat saat membuatnya, lalu tentukan sandi baru."
    >
      <FormLupaSandi />

      <p className="mt-5 rounded-xl bg-canvas px-4 py-3 text-xs text-ink-soft">
        <span className="font-semibold">Tidak punya kode pemulihan?</span> Kode
        hanya bisa dibuat dari dalam aplikasi. Kalau Anda sudah tidak bisa masuk
        sama sekali, sandi harus direset dari server dengan perintah{" "}
        <code className="rounded bg-white px-1 py-0.5 font-semibold">
          npm run auth:reset
        </code>
        . Minta bantuan orang yang mengelola server Anda.
      </p>

      <Link
        href={RUTE_MASUK}
        className="mt-4 block text-center text-sm font-semibold text-brand-500 hover:text-brand-600"
      >
        Kembali ke halaman masuk
      </Link>
    </KartuAuth>
  );
}
