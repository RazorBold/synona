import Link from "next/link";

import { LayarPesan, tombolUtama } from "@/components/layout/layar-pesan";

export default function TidakDitemukan() {
  return (
    <LayarPesan
      kode="404"
      judul="Halaman tidak ditemukan"
      keterangan="Alamat yang Anda buka tidak ada di situs ini."
      aksi={
        <Link href="/" className={tombolUtama}>
          Kembali ke halaman depan
        </Link>
      }
    />
  );
}
