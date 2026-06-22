"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

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
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>Bir şeyler ters gitti</h1>
      <p style={{ color: "#aab2c0", margin: 0, maxWidth: "28rem" }}>
        Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.
      </p>
      <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            border: "1px solid #7AC143",
            background: "transparent",
            color: "#7AC143",
            padding: "0.6rem 1.4rem",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontSize: "0.95rem",
          }}
        >
          Tekrar Dene
        </button>
        <Link
          href="/"
          style={{
            border: "1px solid rgba(244,246,251,0.25)",
            color: "#f4f6fb",
            padding: "0.6rem 1.4rem",
            borderRadius: "0.5rem",
            textDecoration: "none",
            fontSize: "0.95rem",
          }}
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}
