"use client";

import { useState } from "react";
import Link from "next/link";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed || !email) return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error || "Bir hata olustu.");
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage("Baglanti hatasi. Lutfen tekrar deneyin.");
    }
  };

  if (status === "success") {
    return (
      <p className="text-sm text-[#7AC143]">
        E-bültene başarıyla kayıt oldunuz!
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-3">
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="E-posta adresiniz"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11 flex-1 border-b border-gray-300 bg-transparent px-2 text-sm placeholder:text-gray-400 focus:border-[#1A1A1A] focus:outline-none"
        />
        <button
          type="submit"
          disabled={!agreed || status === "loading"}
          className="h-11 bg-[#1A1A1A] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? "Kaydediliyor..." : "Kayıt Ol"}
        </button>
      </div>
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          required
          className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#7AC143]"
        />
        <span className="text-xs text-gray-400">
          <Link href="/kvkk" className="underline hover:text-gray-600">
            KVKK Aydınlatma Metni
          </Link>
          &apos;ni okudum, e-posta ile bilgilendirme yapılmasını kabul ediyorum.
        </span>
      </label>
      {status === "error" && (
        <p className="text-sm text-red-500">{errorMessage}</p>
      )}
    </form>
  );
}
