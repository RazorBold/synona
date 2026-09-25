/**
 * Sambungan langsung ke printer thermal lewat Web Bluetooth (BLE).
 *
 * Batasan platform yang perlu diketahui pemakai:
 * - Hanya Chrome/Edge (Android, Windows, macOS, ChromeOS). Safari/iPhone
 *   tidak punya Web Bluetooth sama sekali.
 * - Hanya di halaman HTTPS (atau localhost). Di http://alamat-ip browser
 *   menyembunyikan `navigator.bluetooth`.
 * - Printer yang hanya Bluetooth Classic (SPP) tidak terlihat; untuk itu
 *   pakai mode RawBT.
 */

/* Tipe minimal — lib DOM TypeScript belum memuat Web Bluetooth. */
type Karakteristik = {
  properties: { write: boolean; writeWithoutResponse: boolean };
  writeValueWithResponse(data: Uint8Array): Promise<void>;
  writeValueWithoutResponse(data: Uint8Array): Promise<void>;
};
type Layanan = { getCharacteristics(): Promise<Karakteristik[]> };
type Gatt = {
  connected: boolean;
  connect(): Promise<Gatt>;
  disconnect(): void;
  getPrimaryServices(): Promise<Layanan[]>;
};
type Perangkat = {
  id: string;
  name?: string;
  gatt?: Gatt;
  addEventListener(t: "gattserverdisconnected", f: () => void): void;
};
type ApiBluetooth = {
  requestDevice(o: {
    acceptAllDevices?: boolean;
    filters?: { services: string[] }[];
    optionalServices?: string[];
  }): Promise<Perangkat>;
  getDevices?: () => Promise<Perangkat[]>;
};

/** Layanan GATT yang dipakai printer thermal BLE yang beredar di pasaran. */
const LAYANAN_PRINTER = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "0000fff0-0000-1000-8000-00805f9b34fb",
  "0000ae30-0000-1000-8000-00805f9b34fb",
];

function api(): ApiBluetooth | null {
  if (typeof navigator === "undefined") return null;
  return (navigator as unknown as { bluetooth?: ApiBluetooth }).bluetooth ?? null;
}

export type DukunganBluetooth = "ok" | "butuh-https" | "tidak-didukung";

export function dukunganBluetooth(): DukunganBluetooth {
  if (typeof window === "undefined") return "tidak-didukung";
  if (!window.isSecureContext) return "butuh-https";
  return api() ? "ok" : "tidak-didukung";
}

let aktif: { perangkat: Perangkat; kar: Karakteristik; ukuran: number } | null = null;
const pendengar = new Set<() => void>();

function kabari() {
  for (const f of pendengar) f();
}

export function dengarSambungan(f: () => void) {
  pendengar.add(f);
  return () => pendengar.delete(f);
}

export function printerTersambung(): { id: string; nama: string } | null {
  if (!aktif?.perangkat.gatt?.connected) return null;
  return { id: aktif.perangkat.id, nama: aktif.perangkat.name ?? "Printer" };
}

async function sambung(perangkat: Perangkat) {
  if (!perangkat.gatt) throw new Error("Perangkat ini tidak mendukung BLE");
  const gatt = await perangkat.gatt.connect();
  const semua = await gatt.getPrimaryServices();

  let kar: Karakteristik | null = null;
  for (const l of semua) {
    for (const k of await l.getCharacteristics().catch(() => [])) {
      if (k.properties.writeWithoutResponse || k.properties.write) {
        kar = k;
        break;
      }
    }
    if (kar) break;
  }
  if (!kar) {
    gatt.disconnect();
    throw new Error("Tidak ditemukan saluran cetak di perangkat ini. Pastikan yang dipilih printer thermal.");
  }

  perangkat.addEventListener("gattserverdisconnected", () => {
    if (aktif?.perangkat === perangkat) aktif = null;
    kabari();
  });
  aktif = { perangkat, kar, ukuran: 100 };
  kabari();
  return { id: perangkat.id, nama: perangkat.name ?? "Printer" };
}

/** Membuka pemilih perangkat bawaan browser. Harus dipanggil dari klik. */
export async function pilihPrinter() {
  const bt = api();
  if (!bt) throw new Error("Browser ini tidak mendukung Bluetooth");
  const perangkat = await bt.requestDevice({
    acceptAllDevices: true,
    optionalServices: LAYANAN_PRINTER,
  });
  return sambung(perangkat);
}

/**
 * Menyambung ulang tanpa pemilih perangkat, untuk printer yang sudah pernah
 * diizinkan. Tidak semua versi Chrome punya `getDevices`; kalau tidak ada,
 * pengguna cukup menekan "Sambungkan" lagi.
 */
export async function sambungUlang(id: string): Promise<boolean> {
  if (printerTersambung()?.id === id) return true;
  const bt = api();
  if (!bt?.getDevices) return false;
  const p = (await bt.getDevices()).find((d) => d.id === id);
  if (!p) return false;
  try {
    await sambung(p);
    return true;
  } catch {
    return false;
  }
}

export function putuskan() {
  aktif?.perangkat.gatt?.disconnect();
  aktif = null;
  kabari();
}

const jeda = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Mengirim data dalam potongan kecil. Printer murah punya MTU dan buffer
 * kecil — potongan 100 byte dengan jeda singkat aman untuk kebanyakan; kalau
 * potongan pertama ditolak, turun ke 20 byte (MTU BLE minimum).
 */
export async function kirimKePrinter(data: Uint8Array) {
  if (!aktif?.perangkat.gatt?.connected) throw new Error("Printer belum tersambung");
  const { kar } = aktif;
  const tulis = (b: Uint8Array) =>
    kar.properties.writeWithoutResponse
      ? kar.writeValueWithoutResponse(b)
      : kar.writeValueWithResponse(b);

  for (let i = 0; i < data.length; ) {
    const potong = data.slice(i, i + aktif.ukuran);
    try {
      await tulis(potong);
    } catch (e) {
      if (i === 0 && aktif.ukuran > 20) {
        aktif.ukuran = 20;
        continue;
      }
      throw e;
    }
    i += potong.length;
    await jeda(kar.properties.writeWithoutResponse ? 15 : 0);
  }
}
