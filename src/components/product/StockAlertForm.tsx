"use client";

import { useState } from "react";
import { Bell } from "lucide-react";

interface StockAlertFormProps {
  variantId: string;
  variantLabel: string; // "Siyah / M" gibi
}

export function StockAlertForm({ variantId, variantLabel }: StockAlertFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/stock-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, variantId }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage("Stok bildirimi kaydınız alındı!");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Bir hata oluştu.");
      }
    } catch {
      setStatus("error");
      setMessage("Bağlantı hatası. Lütfen tekrar deneyin.");
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
        <Bell className="mx-auto h-5 w-5 text-emerald-600" />
        <p className="mt-2 text-sm font-medium text-emerald-700">{message}</p>
        <p className="mt-1 text-xs text-emerald-500">
          {variantLabel} stoğa girince e-posta ile bilgilendireceğiz.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-amber-600" />
        <p className="text-sm font-medium text-amber-700">Stok Bildirimi</p>
      </div>
      <p className="mt-1 text-xs text-amber-600">
        {variantLabel} şu anda stokta yok. Gelince haber verelim.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          type="email"
          placeholder="E-posta adresiniz"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
        >
          {status === "loading" ? "..." : "Bildir"}
        </button>
      </div>
      {status === "error" && (
        <p className="mt-2 text-xs text-red-500">{message}</p>
      )}
    </form>
  );
}
