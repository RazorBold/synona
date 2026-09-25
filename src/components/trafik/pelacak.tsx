"use client";

import { useEffect } from "react";

import {
  NAMA_COOKIE_PENGUNJUNG,
  RUTE_JEJAK,
  type HalamanDilacak,
} from "@/lib/trafik";

/**
 * Pelacak trafik halaman publik. Dipasang sekali per halaman:
 *
 *   <Pelacak halaman="/beranda" />
 *
 * Yang dicatat:
 * - "lihat" saat halaman dibuka,
 * - "klik" pada elemen apa pun yang punya atribut `data-jejak="nama"` —
 *   jadi tombol di server component cukup diberi atribut, tanpa onClick,
 * - "baca" sekali per kunjungan saat elemen `data-jejak-bagian="nama"`
 *   sudah digulir masuk ke layar.
 *
 * Anonim: id pengunjung dibuat acak di sini, tidak ada IP atau data pribadi.
 * Semua kegagalan ditelan — statistik tidak boleh merusak halaman depan.
 */

const KUNCI_KUNJUNGAN = "synona_kunjungan";
const SATU_TAHUN = 365 * 24 * 60 * 60;

function idAcak(): string {
  const b = new Uint8Array(12);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(36).padStart(2, "0")).join("").slice(0, 20);
}

function idPengunjung(): string {
  const ada = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${NAMA_COOKIE_PENGUNJUNG}=`))
    ?.split("=")[1];
  if (ada && /^[A-Za-z0-9_-]{8,64}$/.test(ada)) return ada;

  const baru = idAcak();
  // Cookie (bukan localStorage) supaya server action daftar() bisa
  // menyambungkan pendaftaran ke kunjungan ini — lihat catatPendaftaran().
  document.cookie = `${NAMA_COOKIE_PENGUNJUNG}=${baru}; Max-Age=${SATU_TAHUN}; Path=/; SameSite=Lax`;
  return baru;
}

function idKunjungan(): string {
  try {
    const ada = sessionStorage.getItem(KUNCI_KUNJUNGAN);
    if (ada) return ada;
    const baru = idAcak();
    sessionStorage.setItem(KUNCI_KUNJUNGAN, baru);
    return baru;
  } catch {
    return idAcak();
  }
}

function perangkat(): "hp" | "tablet" | "desktop" {
  const w = window.innerWidth;
  if (w < 768) return "hp";
  if (w < 1024) return "tablet";
  return "desktop";
}

/** Host perujuk dari luar situs ini saja; navigasi internal bukan "sumber". */
function rujukan(): string | null {
  try {
    if (!document.referrer) return null;
    const u = new URL(document.referrer);
    if (u.host === location.host) return null;
    return u.hostname.replace(/^www\./, "").slice(0, 100);
  } catch {
    return null;
  }
}

function kirim(isi: Record<string, unknown>): void {
  try {
    const badan = JSON.stringify(isi);
    // sendBeacon tetap terkirim walau halaman sedang ditinggalkan — penting
    // untuk klik yang langsung berpindah ke /masuk atau /register.
    if (navigator.sendBeacon?.(RUTE_JEJAK, badan)) return;
    void fetch(RUTE_JEJAK, { method: "POST", body: badan, keepalive: true }).catch(
      () => {},
    );
  } catch {
    /* diabaikan */
  }
}

export function Pelacak({ halaman }: { halaman: HalamanDilacak }) {
  useEffect(() => {
    if (navigator.webdriver) return;

    let dasar: Record<string, unknown>;
    try {
      const q = new URLSearchParams(location.search);
      dasar = {
        pengunjung: idPengunjung(),
        kunjungan: idKunjungan(),
        halaman,
        perangkat: perangkat(),
        rujukan: rujukan(),
        utmSource: q.get("utm_source")?.slice(0, 60) || null,
        utmCampaign: q.get("utm_campaign")?.slice(0, 60) || null,
      };
    } catch {
      return;
    }

    kirim({ ...dasar, jenis: "lihat" });

    function saatKlik(e: MouseEvent) {
      const el = (e.target as Element | null)?.closest?.("[data-jejak]");
      const target = el?.getAttribute("data-jejak");
      if (target) kirim({ ...dasar, jenis: "klik", target });
    }
    document.addEventListener("click", saatKlik, { capture: true });

    // "baca" sekali per kunjungan per bagian, meski digulir bolak-balik.
    const sudah = new Set<string>();
    const pengamat =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entri) => {
              for (const en of entri) {
                if (!en.isIntersecting) continue;
                const target = en.target.getAttribute("data-jejak-bagian");
                if (!target || sudah.has(target)) continue;
                sudah.add(target);
                kirim({ ...dasar, jenis: "baca", target });
                pengamat?.unobserve(en.target);
              }
            },
            // Bukan threshold 0.5: bagian yang lebih tinggi dari dua layar (umum
            // di HP) tidak akan pernah setengahnya terlihat. Cukup bagian itu
            // sudah naik melewati 60% atas layar.
            { threshold: 0, rootMargin: "0px 0px -40% 0px" },
          )
        : null;
    document
      .querySelectorAll("[data-jejak-bagian]")
      .forEach((el) => pengamat?.observe(el));

    return () => {
      document.removeEventListener("click", saatKlik, { capture: true });
      pengamat?.disconnect();
    };
  }, [halaman]);

  return null;
}
