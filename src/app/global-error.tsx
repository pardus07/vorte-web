"use client";

// Next.js 16: global-error.tsx kök layout'u dahi saran son hata sınırıdır.
// Kendi <html>/<body>'sini render etmek ZORUNDADIR. Yoksa /_global-error
// prerender adımı build'i çökertebilir.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          background: "#05060a",
          color: "#f4f6fb",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
          Bir şeyler ters gitti
        </h1>
        <p style={{ color: "#aab2c0", margin: 0, maxWidth: "28rem" }}>
          Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: "0.5rem",
            border: "1px solid #7AC143",
            background: "transparent",
            color: "#7AC143",
            padding: "0.6rem 1.4rem",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontSize: "0.95rem",
          }}
        >
          Tekrar dene
        </button>
      </body>
    </html>
  );
}
