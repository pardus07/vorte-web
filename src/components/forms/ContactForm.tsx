"use client";

import { useState } from "react";

interface FormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export function ContactForm() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error || "Bir hata olustu. Lutfen tekrar deneyin.");
        return;
      }

      setStatus("success");
      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch {
      setStatus("error");
      setErrorMessage("Baglanti hatasi. Lutfen tekrar deneyin.");
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-sm font-medium text-green-700">
          Mesajiniz basariyla gonderildi! En kisa surede size donecegiz.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-3 text-sm text-[#7AC143] underline hover:text-green-700"
        >
          Yeni mesaj gonder
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        name="name"
        placeholder="Ad Soyad"
        required
        value={formData.name}
        onChange={handleChange}
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
      />
      <input
        type="email"
        name="email"
        placeholder="E-posta"
        required
        value={formData.email}
        onChange={handleChange}
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
      />
      <input
        type="tel"
        name="phone"
        placeholder="Telefon"
        value={formData.phone}
        onChange={handleChange}
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
      />
      <textarea
        name="message"
        rows={4}
        placeholder="Mesajiniz"
        required
        value={formData.message}
        onChange={handleChange}
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
      />

      {status === "error" && (
        <p className="text-sm text-red-500">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-lg bg-[#1A1A1A] px-6 py-2.5 text-sm font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "loading" ? "Gonderiliyor..." : "Gonder"}
      </button>
    </form>
  );
}
