"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Menampilkan daftar panjang sedikit demi sedikit (seperti marketplace):
 * yang dirender hanya `batas` item pertama, lalu bertambah saat penanda di
 * bawah daftar mendekati layar.
 *
 * Kenapa bukan merender semuanya: tiap kartu produk adalah puluhan node DOM
 * plus satu permintaan gambar. Pada 500 produk, merender sekaligus membuat
 * HP kelas bawah membeku beberapa detik sebelum kasir bisa menekan apa pun —
 * padahal yang terlihat di layar cuma selusin kartu pertama.
 *
 * `kunci` adalah penanda "daftarnya berganti" (mis. kata pencarian atau
 * kategori aktif). Saat berubah, hitungannya kembali ke awal supaya hasil
 * pencarian baru tidak mewarisi posisi gulir daftar sebelumnya.
 */
export function useMuatBertahap(
  kunci: string,
  total: number,
  awal = 24,
  langkah = 24,
) {
  const [batas, setBatas] = useState(awal);
  const penanda = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setBatas(awal);
  }, [kunci, awal]);

  useEffect(() => {
    const el = penanda.current;
    if (!el || batas >= total) return;

    // rootMargin: mulai memuat sebelum penandanya benar-benar terlihat,
    // supaya baris berikutnya sudah siap saat gulirannya sampai.
    const pengamat = new IntersectionObserver(
      ([masuk]) => {
        if (masuk.isIntersecting) setBatas((b) => Math.min(total, b + langkah));
      },
      { rootMargin: "800px 0px" },
    );
    pengamat.observe(el);
    return () => pengamat.disconnect();
  }, [batas, total, langkah]);

  return { batas, penanda, selesai: batas >= total };
}
