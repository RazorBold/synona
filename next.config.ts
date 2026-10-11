import type { NextConfig } from "next";

/**
 * Konfigurasi branch `vercel-landing` — halaman depan saja, di-host Vercel.
 *
 * Sengaja TIDAK memakai `output: "standalone"`, `serverExternalPackages`, atau
 * `outputFileTracingRoot` seperti di `main`: ketiganya ada di sana untuk
 * pemasangan sendiri lewat nginx + pm2 dengan better-sqlite3, dan tidak ada
 * yang relevan di platform serverless. Branch ini juga tidak punya server
 * action, jadi batas bodySizeLimit pun tak diperlukan.
 */
const nextConfig: NextConfig = {
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
