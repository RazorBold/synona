"use client";

import { useEffect } from "react";

/** Mode "printer biasa": atur ukuran kertas lalu buka dialog cetak. */
export function CetakOtomatis({ lebarMm }: { lebarMm: number }) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, []);
  return <style>{`@page { size: ${lebarMm}mm auto; margin: 2mm; }`}</style>;
}
