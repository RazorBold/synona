import { AkunUsahaClient } from "@/components/admin/akun-usaha-client";
import { daftarUsaha } from "@/server/admin";

export const dynamic = "force-dynamic";

export default function AkunUsahaPage() {
  return <AkunUsahaClient usaha={daftarUsaha()} />;
}
