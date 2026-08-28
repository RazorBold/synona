/**
 * Service worker Synona — SENGAJA konservatif.
 *
 * Yang di-cache HANYA aset build ber-hash di /_next/static/, yang isinya tidak
 * pernah berubah untuk URL yang sama. Halaman HTML, /api/, dan semua yang
 * bukan GET diteruskan apa adanya ke jaringan.
 *
 * Kenapa tidak ada mode offline penuh: ini aplikasi kasir. Menyimpan penjualan
 * ke antrean offline lalu menampilkan "tersimpan" adalah cara tercepat membuat
 * pemilik warung kehilangan uang — struk tercetak, stok berkurang di layar,
 * tapi servernya tidak pernah menerima apa pun. Menu offline sungguhan butuh
 * antrean tersinkron dengan penyelesaian konflik, dan itu keputusan produk,
 * bukan sesuatu yang boleh diselundupkan lewat service worker.
 *
 * Halaman HTML juga sengaja tidak di-cache: isinya bergantung pada sesi, dan
 * halaman ter-cache bisa menampilkan data outlet ke orang yang sudah logout.
 */
const CACHE = "synona-statis-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((k) => Promise.all(k.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith("/_next/static/")) return;

  e.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((res) => {
          if (res.ok) {
            const salinan = res.clone();
            caches.open(CACHE).then((c) => c.put(request, salinan));
          }
          return res;
        }),
    ),
  );
});
