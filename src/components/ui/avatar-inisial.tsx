import { cn } from "@/lib/utils";

export function inisial(nama: string) {
  return nama
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Avatar huruf awal nama — dipakai untuk pelanggan yang tidak punya foto. */
export function AvatarInisial({
  nama,
  className,
}: {
  nama: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-[13px] font-bold text-brand-600",
        className,
      )}
    >
      {inisial(nama)}
    </span>
  );
}
