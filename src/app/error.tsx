"use client";

import { useEffect } from "react";

import { LayarPesan, tombolKedua, tombolUtama } from "@/components/layout/layar-pesan";

/**
 * Menangkap galat render di seluruh aplikasi. Tanpa berkas ini, Next
 * menampilkan layar bawaannya: "Application error: a client-side exception has
 * occurred" — bahasa Inggris, tanpa konteks, dan menakutkan bagi pemilik
 * warung yang cuma ingin mencatat penjualan.
 */
export default function GalatAplikasi({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Detailnya ke log server, bukan ke layar: pesan galat mentah sering
    // memuat nama tabel dan potongan query.
    console.error(error);
  }, [error]);

  return (
    <LayarPesan
      kode="Aduh"
      judul="Ada yang bermasalah"
      keterangan="Halaman ini gagal dimuat. Coba muat ulang dulu — kalau masih sama, catat kode di bawah dan hubungi bantuan."
      aksi={
        <>
          <button onClick={reset} className={tombolUtama}>
            Coba Lagi
          </button>
          <a href="/" className={tombolKedua}>
            Kembali ke Dashboard
          </a>
          {error.digest && (
            <p className="tabular pt-1 text-xs text-muted">Kode galat: {error.digest}</p>
          )}
        </>
      }
    />
  );
}
