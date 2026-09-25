import { redirect } from "next/navigation";

/** Alamat lama; trafik kini bagian dari area pengelola. */
export default function TrafikLama() {
  redirect("/admin/trafik");
}
