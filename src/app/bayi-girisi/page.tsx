"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Lock, Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function DealerLoginPage() {
  const router = useRouter();
  const [dealerCode, setDealerCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/dealer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealerCode, password }),
      });

      if (res.ok) {
        router.push("/bayi");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Giriş başarısız");
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
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-[#7AC143]/10 p-3">
              <Building2 className="h-8 w-8 text-[#7AC143]" />
            </div>
          </div>

          <h1 className="text-center text-2xl font-bold text-gray-900">
            Bayi Girişi
          </h1>
          <p className="mt-2 text-center text-sm text-gray-500">
            Bayi kodunuz ve şifreniz ile giriş yapın
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Bayi Kodu
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={dealerCode}
                  onChange={(e) => setDealerCode(e.target.value.toUpperCase())}
                  required
                  placeholder="BAY-XXXXXX"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm uppercase focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Şifre
              </label>
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
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Giriş Yap
            </Button>
          </form>

          <div className="mt-6 rounded-lg bg-gray-50 p-4">
            <p className="text-center text-xs text-gray-500">
              Bayi olmak ister misiniz?{" "}
              <Link href="/toptan" className="font-medium text-[#7AC143] hover:underline">
                Bayilik Başvurusu
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link href="/giris" className="text-sm text-gray-500 hover:text-[#7AC143]">
            Müşteri Girişi →
          </Link>
        </div>
      </div>
    </div>
  );
}
