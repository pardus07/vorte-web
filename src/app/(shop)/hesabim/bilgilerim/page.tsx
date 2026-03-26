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

  // Bildirim tercihleri
  const [prefs, setPrefs] = useState({
    emailOrders: true,
    emailPromotions: true,
    emailStock: true,
    smsOrders: false,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Hesap silme
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

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

    // Bildirim tercihleri
    fetch("/api/hesabim/tercihler")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) setPrefs(data.data);
      })
      .catch(() => {});
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

  const handlePrefsSave = async () => {
    setSavingPrefs(true);
    setMessage(null);
    try {
      const res = await fetch("/api/hesabim/tercihler", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Bildirim tercihleriniz güncellendi." });
      } else {
        setMessage({ type: "error", text: "Tercihler kaydedilemedi." });
      }
    } catch {
      setMessage({ type: "error", text: "Bir hata oluştu." });
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "HESABIMI SIL") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/hesabim/hesap-sil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirm }),
      });
      if (res.ok) {
        window.location.href = "/?deleted=1";
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Hesap silinemedi." });
        setShowDeleteDialog(false);
      }
    } catch {
      setMessage({ type: "error", text: "Bir hata oluştu." });
      setShowDeleteDialog(false);
    } finally {
      setDeleting(false);
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

      {/* Bildirim Tercihleri */}
      <div className="mt-6 rounded-lg border bg-white p-6">
        <h2 className="flex items-center gap-2 font-bold text-gray-900">
          <Bell className="h-4 w-4 text-[#7AC143]" />
          Bildirim Tercihleri
        </h2>
        <div className="mt-4 space-y-3">
          {[
            { key: "emailOrders" as const, label: "Sipariş güncellemeleri (e-posta)", desc: "Sipariş onayı, kargo ve teslimat bildirimleri" },
            { key: "emailPromotions" as const, label: "Kampanya ve indirimler (e-posta)", desc: "Yeni kampanyalar, özel indirimler ve fırsatlar" },
            { key: "emailStock" as const, label: "Stok bildirimleri (e-posta)", desc: "Tükenen ürünler tekrar stoğa girdiğinde" },
            { key: "smsOrders" as const, label: "Sipariş bildirimleri (SMS)", desc: "Sipariş ve kargo SMS bildirimleri" },
          ].map((item) => (
            <label key={item.key} className="flex items-start gap-3 cursor-pointer rounded-lg p-2 hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={prefs[item.key]}
                onChange={(e) => setPrefs((p) => ({ ...p, [item.key]: e.target.checked }))}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#7AC143] focus:ring-[#7AC143]"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handlePrefsSave} disabled={savingPrefs}>
            <Save className="mr-1.5 h-4 w-4" />
            {savingPrefs ? "Kaydediliyor..." : "Tercihleri Kaydet"}
          </Button>
        </div>
      </div>

      {/* Hesap Silme */}
      <div className="mt-6 rounded-lg border border-red-200 bg-white p-6">
        <h2 className="flex items-center gap-2 font-bold text-red-600">
          <Trash2 className="h-4 w-4" />
          Hesap Silme
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Hesabınızı sildiğinizde KVKK kapsamında tüm kişisel verileriniz kalıcı olarak silinir.
          Siparişleriniz anonim hale getirilir. Bu işlem geri alınamaz.
        </p>
        {!showDeleteDialog ? (
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="mt-4 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Hesabımı Silmek İstiyorum
          </button>
        ) : (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm font-medium text-red-700">
              Onaylamak için aşağıya <strong>HESABIMI SIL</strong> yazın:
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="HESABIMI SIL"
              className="mt-2 w-full rounded-lg border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== "HESABIMI SIL" || deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? "Siliniyor..." : "Hesabımı Kalıcı Olarak Sil"}
              </button>
              <button
                onClick={() => { setShowDeleteDialog(false); setDeleteConfirm(""); }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Vazgeç
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
