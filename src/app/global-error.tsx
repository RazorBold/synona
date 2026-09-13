"use client";

/**
 * Jaring terakhir: dipakai kalau root layout sendiri yang gagal, sehingga
 * error.tsx tidak sempat dirender. Wajib membawa <html> dan <body> sendiri,
 * dan tidak boleh bergantung pada komponen lain yang mungkin ikut rusak.
 */
export default function GalatGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f7f8fc",
          color: "#1e2235",
          padding: "1rem",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Synona gagal dimuat</h1>
          <p style={{ color: "#4a5069", fontSize: "0.9rem" }}>
            Terjadi galat yang tidak terduga. Coba muat ulang halaman ini.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1rem",
              height: 48,
              width: "100%",
              borderRadius: 16,
              border: "none",
              background: "#6d5df6",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Coba Lagi
          </button>
          {error.digest && (
            <p style={{ color: "#8a90a6", fontSize: "0.75rem" }}>
              Kode galat: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
