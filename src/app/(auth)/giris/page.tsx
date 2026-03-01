"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email veya şifre hatalı");
      } else {
        router.push("/hesabim");
        router.refresh();
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
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Image src="/logo.png" alt="Vorte" width={120} height={40} />
          </Link>
        </div>

        <div className="rounded-lg border p-8">
          <h1 className="text-center text-2xl font-bold text-gray-900">
            Giriş Yap
          </h1>
          <p className="mt-2 text-center text-sm text-gray-500">
            Hesabınıza giriş yapın
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

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Şifre
                </label>
                <Link
                  href="/sifremi-unuttum"
                  className="text-xs text-[#7AC143] hover:underline"
                >
                  Şifremi Unuttum
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-10 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Giriş Yap
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Hesabınız yok mu?{" "}
            <Link href="/kayit" className="font-medium text-[#7AC143] hover:underline">
              Kayıt Ol
            </Link>
          </div>
        </div>

        {/* Dealer login link */}
        <div className="mt-4 text-center">
          <Link
            href="/bayi-girisi"
            className="text-sm text-gray-500 hover:text-[#7AC143]"
          >
            Bayi Girişi →
          </Link>
        </div>
      </div>
    </div>
  );
}
