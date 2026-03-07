"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Lock, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <Link href="/">
              <Image src="/logo.png" alt="Vorte" width={120} height={40} />
            </Link>
          </div>
          <div className="rounded-lg border p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mt-4 text-2xl font-bold text-gray-900">
              Geçersiz Bağlantı
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Bu şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.
            </p>
            <Link href="/sifremi-unuttum">
              <Button className="mt-6" variant="outline">
                Yeni Bağlantı İste
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Şifreler eşleşmiyor");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        setSuccess(true);
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

  if (success) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <Link href="/">
              <Image src="/logo.png" alt="Vorte" width={120} height={40} />
            </Link>
          </div>
          <div className="rounded-lg border p-8 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-[#7AC143]" />
            <h1 className="mt-4 text-2xl font-bold text-gray-900">
              Şifreniz Güncellendi
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Yeni şifreniz başarıyla ayarlandı. Şimdi giriş yapabilirsiniz.
            </p>
            <Link href="/giris">
              <Button className="mt-6">Giriş Yap</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Image src="/logo.png" alt="Vorte" width={120} height={40} />
          </Link>
        </div>
        <div className="rounded-lg border p-8">
          <h1 className="text-center text-2xl font-bold text-gray-900">
            Yeni Şifre Belirle
          </h1>
          <p className="mt-2 text-center text-sm text-gray-500">
            Hesabınız için yeni bir şifre belirleyin.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Yeni Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="En az 6 karakter"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Şifre Tekrar
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Şifrenizi tekrar girin"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Şifreyi Güncelle
            </Button>
          </form>
          <div className="mt-6 text-center">
            <Link
              href="/giris"
              className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-[#7AC143]"
            >
              <ArrowLeft className="h-4 w-4" /> Giriş sayfasına dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[#7AC143]" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
