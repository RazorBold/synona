import { redirect } from "next/navigation";

/** Menu "Bahan Baku" kini bernama Persediaan. Tautan lama & PWA terpasang
 *  masih menyimpan /bahan, jadi jangan biarkan berujung 404. */
export default function BahanPage() {
  redirect("/persediaan");
}
