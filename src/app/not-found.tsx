import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        background: "#05060a",
        color: "#f4f6fb",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
        textAlign: "center",
        padding: "1.5rem",
      }}
    >
      <h1 style={{ fontSize: "clamp(3rem,12vw,5rem)", fontWeight: 800, margin: 0 }}>404</h1>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>Sayfa Bulunamadı</h2>
      <p style={{ color: "#aab2c0", margin: 0, maxWidth: "28rem" }}>
        Aradığınız sayfa bulunamadı.
      </p>
      <Link
        href="/"
        style={{
          marginTop: "0.75rem",
          border: "1px solid #7AC143",
          color: "#7AC143",
          padding: "0.6rem 1.4rem",
          borderRadius: "0.5rem",
          textDecoration: "none",
          fontSize: "0.95rem",
        }}
      >
        Ana Sayfaya Dön
      </Link>
    </div>
  );
}
