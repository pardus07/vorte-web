"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, User, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    passwordConfirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır");
      return;
    }

    if (form.password !== form.passwordConfirm) {
      setError("Şifreler eşleşmiyor");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Kayıt işlemi başarısız");
        return;
      }

      router.push("/giris?registered=true");
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
            Hesap Oluştur
          </h1>
          <p className="mt-2 text-center text-sm text-gray-500">
            Alışverişe başlamak için kayıt olun
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Ad Soyad
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Ad Soyad"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                E-posta
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="ornek@email.com"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Telefon
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="05XX XXX XX XX"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
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
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="En az 6 karakter"
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

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Şifre Tekrar
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  name="passwordConfirm"
                  value={form.passwordConfirm}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                />
              </div>
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                required
                id="terms"
                className="mt-1 h-4 w-4 rounded border-gray-300 accent-[#7AC143]"
              />
              <label htmlFor="terms" className="text-xs text-gray-500">
                <Link href="/kullanim-kosullari" className="text-[#7AC143] hover:underline">
                  Kullanım Koşulları
                </Link>{" "}
                ve{" "}
                <Link href="/gizlilik-politikasi" className="text-[#7AC143] hover:underline">
                  Gizlilik Politikası
                </Link>
                &apos;nı okudum ve kabul ediyorum.
              </label>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Kayıt Ol
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Zaten hesabınız var mı?{" "}
            <Link href="/giris" className="font-medium text-[#7AC143] hover:underline">
              Giriş Yap
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
