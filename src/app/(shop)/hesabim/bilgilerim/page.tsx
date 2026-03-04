"use client";

import { useEffect, useState, useCallback } from "react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { User, Lock, Bell, Trash2, Save, Eye, EyeOff } from "lucide-react";

interface UserInfo {
  name: string;
  email: string;
  phone: string;
}

export default function AccountSettingsPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Profile form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/hesabim");
      if (!res.ok) {
        window.location.href = "/giris";
        return;
      }
      const data = await res.json();
      setUser(data);
      setName(data.name || "");
      setPhone(data.phone || "");
    } catch {
      window.location.href = "/giris";
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/hesabim", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Bilgileriniz güncellendi." });
        fetchUser();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Bir hata oluştu." });
      }
    } catch {
      setMessage({ type: "error", text: "Bir hata oluştu." });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Yeni şifreler eşleşmiyor." });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Yeni şifre en az 6 karakter olmalıdır." });
      return;
    }
    setChangingPassword(true);
    setMessage(null);
    try {
      const res = await fetch("/api/hesabim/sifre", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Şifreniz başarıyla değiştirildi." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Şifre değiştirilemedi." });
      }
    } catch {
      setMessage({ type: "error", text: "Bir hata oluştu." });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Breadcrumb
        items={[
          { label: "Ana Sayfa", href: "/" },
          { label: "Hesabım", href: "/hesabim" },
          { label: "Hesap Bilgilerim" },
        ]}
      />
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Hesap Bilgilerim</h1>

      {/* Feedback */}
      {message && (
        <div
          className={`mt-4 rounded-lg border p-3 text-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Personal Info */}
      <form onSubmit={handleProfileSave} className="mt-6 rounded-lg border bg-white p-6">
        <h2 className="flex items-center gap-2 font-bold text-gray-900">
          <User className="h-4 w-4 text-[#7AC143]" />
          Kişisel Bilgiler
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-700">Ad Soyad</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input mt-1"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">E-posta</label>
            <input
              type="email"
              value={user.email}
              className="form-input mt-1 bg-gray-50"
              disabled
            />
            <p className="mt-1 text-xs text-gray-400">
              E-posta değişikliği için destek ile iletişime geçin.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Telefon</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05XX XXX XX XX"
              className="form-input mt-1"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={saving}>
            <Save className="mr-1.5 h-4 w-4" />
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </form>

      {/* Password Change */}
      <form onSubmit={handlePasswordChange} className="mt-6 rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold text-gray-900">
            <Lock className="h-4 w-4 text-orange-500" />
            Şifre Değiştir
          </h2>
          <button
            type="button"
            onClick={() => setShowPasswords(!showPasswords)}
            className="text-gray-400 hover:text-gray-600"
          >
            {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Mevcut Şifre</label>
            <input
              type={showPasswords ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="form-input mt-1"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Yeni Şifre</label>
              <input
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-input mt-1"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Yeni Şifre (Tekrar)</label>
              <input
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input mt-1"
                minLength={6}
                required
              />
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={changingPassword}>
            {changingPassword ? "Güncelleniyor..." : "Şifreyi Güncelle"}
          </Button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="mt-6 rounded-lg border border-red-200 bg-white p-6">
        <h2 className="flex items-center gap-2 font-bold text-red-600">
          <Trash2 className="h-4 w-4" />
          Hesap İşlemleri
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Hesabınızı silmek isterseniz, KVKK kapsamında tüm kişisel verileriniz silinir.
          Siparişleriniz anonim hale getirilir.
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Hesap silme talebi için{" "}
          <a href="mailto:info@vorte.com.tr" className="text-[#7AC143] hover:underline">
            info@vorte.com.tr
          </a>{" "}
          adresine e-posta gönderin.
        </p>
      </div>
    </div>
  );
}
