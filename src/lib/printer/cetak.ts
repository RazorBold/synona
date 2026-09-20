"use client";

import { tautanNota, type DataNota } from "@/lib/nota";
import { kirimKePrinter, printerTersambung, sambungUlang } from "@/lib/printer/bluetooth";
import { susunNotaEscpos, type LebarKertas } from "@/lib/printer/escpos";
import type { ModePrinter } from "@/lib/printer/pengaturan";

type Opsi = {
  mode: ModePrinter;
  lebar: LebarKertas;
  catatanKaki: string;
  perangkat: { id: string } | null;
};

function keBase64(data: Uint8Array): string {
  let s = "";
  for (let i = 0; i < data.length; i += 0x8000) {
    s += String.fromCharCode(...data.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

/** Mengirim perintah ESC/POS mentah ke aplikasi RawBT (Android). */
export function kirimKeRawbt(data: Uint8Array) {
  window.location.href = `intent:base64,${keBase64(data)}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
}

export async function cetakNota(nota: DataNota, o: Opsi): Promise<void> {
  const tautan = tautanNota(window.location.origin, nota);

  if (o.mode === "browser") {
    window.open(`${tautan}&cetak=1&lebar=${o.lebar}`, "_blank", "noopener");
    return;
  }

  const data = susunNotaEscpos(nota, {
    lebar: o.lebar,
    tautan,
    catatanKaki: o.catatanKaki,
  });

  if (o.mode === "rawbt") {
    kirimKeRawbt(data);
    return;
  }

  if (!printerTersambung()) {
    const ok = o.perangkat ? await sambungUlang(o.perangkat.id) : false;
    if (!ok) {
      throw new Error("Printer belum tersambung. Tekan tombol Printer lalu Sambungkan.");
    }
  }
  await kirimKePrinter(data);
}
