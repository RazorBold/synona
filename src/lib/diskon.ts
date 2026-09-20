/**
 * Aturan diskon otomatis: promo (event) dan diskon member.
 *
 * Satu aturan yang tidak boleh dilanggar: diskon TIDAK PERNAH menumpuk.
 * Kalau promo dan diskon member sama-sama berlaku, yang dipakai hanya yang
 * paling besar. Menumpuk diskon terdengar murah hati, tapi potongannya jadi
 * sulit dijelaskan ke pembeli dan margin bisa tergerus tanpa disadari.
 *
 * Diskon yang diketik kasir juga tidak ditumpuk: yang menang tetap yang
 * paling besar, sehingga baris mana pun tidak pernah dipotong dua kali.
 */
export const BP_DISKON_MAKS = 9_000; // 90% — pagar terhadap salah ketik

export type AsalDiskon = "manual" | "promo" | "member" | null;

export type HasilDiskonBaris = {
  nilai: number;
  asal: AsalDiskon;
  /** Basis poin diskon otomatis yang menang (promo/member). */
  bp: number;
};

export function diskonOtomatisBp(promoBp: number, memberBp: number): number {
  return Math.max(promoBp || 0, memberBp || 0);
}

/**
 * Diskon final satu baris keranjang.
 * @param kotor harga × jumlah, sebelum diskon
 * @param manual potongan rupiah yang diketik kasir (0 kalau tidak ada)
 */
export function diskonBarisFinal(
  kotor: number,
  manual: number,
  promoBp: number,
  memberBp: number,
): HasilDiskonBaris {
  const bp = diskonOtomatisBp(promoBp, memberBp);
  const otomatis = Math.round((kotor * bp) / 10_000);
  const manualBersih = Math.min(Math.max(0, manual), kotor);

  if (manualBersih >= otomatis) {
    return { nilai: manualBersih, asal: manualBersih > 0 ? "manual" : null, bp: 0 };
  }
  return {
    nilai: Math.min(otomatis, kotor),
    asal: promoBp >= memberBp ? "promo" : "member",
    bp,
  };
}

/** 500 → "5%" ; 250 → "2,5%" */
export function persenDiskon(bp: number): string {
  return `${(bp / 100).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;
}

export type StatusPromo = "berjalan" | "terjadwal" | "berakhir" | "nonaktif";

export function statusPromo(
  p: { aktif: number; mulai: string; selesai: string | null },
  hariIni: string,
): StatusPromo {
  if (p.aktif !== 1) return "nonaktif";
  if (p.mulai > hariIni) return "terjadwal";
  if (p.selesai && p.selesai < hariIni) return "berakhir";
  return "berjalan";
}
