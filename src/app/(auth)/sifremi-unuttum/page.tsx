"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.error || "Bir hata oluştu");
      }
    } catch {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Image src="/logo.png" alt="Vorte" width={120} height={40} />
          </Link>
        </div>

        <div className="rounded-lg border p-8">
          {sent ? (
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-[#7AC143]" />
              <h1 className="mt-4 text-2xl font-bold text-gray-900">
                E-posta Gönderildi
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Şifre sıfırlama bağlantısı <strong>{email}</strong> adresine
                gönderildi. Lütfen gelen kutunuzu kontrol edin.
              </p>
              <Link href="/giris">
                <Button className="mt-6" variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Giriş Sayfasına Dön
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-center text-2xl font-bold text-gray-900">
                Şifremi Unuttum
              </h1>
              <p className="mt-2 text-center text-sm text-gray-500">
                E-posta adresinizi girin, size şifre sıfırlama bağlantısı
                gönderelim.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    E-posta
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="ornek@email.com"
                      className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" loading={loading}>
                  Bağlantı Gönder
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/giris"
                  className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-[#7AC143]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Giriş sayfasına dön
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
