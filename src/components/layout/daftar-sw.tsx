"use client";

import { useEffect } from "react";

/**
 * Mendaftarkan service worker. Hanya jalan di konteks aman (HTTPS atau
 * localhost) — browser memang menolak service worker di HTTP biasa, jadi di
 * deployment LAN saat ini ini tidak melakukan apa-apa sampai TLS dipasang.
 */
export function DaftarSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Pendaftaran gagal tidak boleh mengganggu apa pun: aplikasinya tetap
      // berfungsi penuh tanpa service worker.
    });
  }, []);

  return null;
}
