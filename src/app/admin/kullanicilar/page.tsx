"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Save, X, Shield, ShieldCheck, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface UserData {
  id: string;
  name: string | null;
  email: string;
  role: string;
  permissions: Record<string, string> | null;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLES = [
  { value: "ADMIN", label: "Süper Admin", description: "Tüm yetkilere sahip" },
  { value: "EDITOR", label: "Editör", description: "Ürün, sipariş, slider düzenleyebilir" },
  { value: "VIEWER", label: "Görüntüleyici", description: "Sadece görüntüleyebilir" },
];

const RESOURCES = [
  { value: "products", label: "Ürünler" },
  { value: "orders", label: "Siparişler" },
  { value: "dealers", label: "Bayiler" },
  { value: "invoices", label: "Faturalar" },
  { value: "settings", label: "Ayarlar" },
  { value: "users", label: "Kullanıcılar" },
  { value: "sliders", label: "Slider" },
  { value: "banners", label: "Bannerlar" },
  { value: "coupons", label: "Kuponlar" },
  { value: "reports", label: "Raporlar" },
];

const DEFAULT_PERMS: Record<string, Record<string, string>> = {
  ADMIN: Object.fromEntries(RESOURCES.map((r) => [r.value, "rwd"])),
  EDITOR: {
    products: "rw", orders: "rw", dealers: "r", invoices: "r",
    settings: "r", users: "", sliders: "rw", banners: "rw", coupons: "r", reports: "r",
  },
  VIEWER: Object.fromEntries(RESOURCES.map((r) => [r.value, r.value === "settings" || r.value === "users" ? "" : "r"])),
};

interface EditingUser {
  id?: string;
  name: string;
  email: string;
  password: string;
  role: string;
  permissions: Record<string, string>;
  active: boolean;
}

const emptyUser: EditingUser = {
  name: "",
  email: "",
  password: "",
  role: "EDITOR",
  permissions: { ...DEFAULT_PERMS.EDITOR },
  active: true,
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users?type=admin");
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name || !editing.email) {
      setError("Ad ve e-posta zorunludur");
      return;
    }
    if (!editing.id && !editing.password) {
      setError("Yeni kullanıcı için şifre zorunludur");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const isNew = !editing.id;
      const url = isNew ? "/api/admin/users" : `/api/admin/users/${editing.id}`;
      const method = isNew ? "POST" : "PUT";

      const payload: Record<string, unknown> = {
        name: editing.name,
        email: editing.email,
        role: editing.role,
        permissions: editing.role === "ADMIN" ? null : editing.permissions,
        active: editing.active,
      };
      if (editing.password) payload.password = editing.password;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditing(null);
        setSuccess(isNew ? "Kullanıcı eklendi" : "Kullanıcı güncellendi");
        setTimeout(() => setSuccess(""), 3000);
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || "İşlem başarısız");
      }
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${name} kullanıcısını silmek istediğinize emin misiniz?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSuccess("Kullanıcı silindi");
        setTimeout(() => setSuccess(""), 3000);
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || "Silme başarısız");
      }
    } catch {
      setError("Silme başarısız");
    }
  };

  const startEdit = (user: UserData) => {
    setEditing({
      id: user.id,
      name: user.name || "",
      email: user.email,
      password: "",
      role: user.role,
      permissions: (user.permissions as Record<string, string>) || DEFAULT_PERMS[user.role] || {},
      active: user.active,
    });
  };

  const togglePerm = (resource: string, action: string) => {
    if (!editing) return;
    const current = editing.permissions[resource] || "";
    const newPerms = { ...editing.permissions };
    if (current.includes(action)) {
      newPerms[resource] = current.replace(action, "");
    } else {
      newPerms[resource] = current + action;
    }
    setEditing({ ...editing, permissions: newPerms });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN": return <ShieldCheck className="h-4 w-4 text-red-500" />;
      case "EDITOR": return <Shield className="h-4 w-4 text-blue-500" />;
      default: return <Eye className="h-4 w-4 text-gray-400" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "ADMIN": return "Süper Admin";
      case "EDITOR": return "Editör";
      case "VIEWER": return "Görüntüleyici";
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Kullanıcıları</h1>
          <p className="mt-1 text-sm text-gray-500">Yönetim paneline erişim yetkileri</p>
        </div>
        <Button onClick={() => setEditing({ ...emptyUser })}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Kullanıcı
        </Button>
      </div>

      {/* Messages */}
      {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      {success && <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-600">{success}</div>}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-16">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editing.id ? "Kullanıcı Düzenle" : "Yeni Admin Kullanıcı"}
              </h2>
              <button onClick={() => setEditing(null)} className="rounded p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Ad Soyad *</label>
                  <input
                    type="text"
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="form-input w-full"
                    placeholder="Ahmet Yılmaz"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">E-posta *</label>
                  <input
                    type="email"
                    value={editing.email}
                    onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                    className="form-input w-full"
                    placeholder="admin@vorte.com.tr"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {editing.id ? "Yeni Şifre (opsiyonel)" : "Şifre *"}
                  </label>
                  <input
                    type="password"
                    value={editing.password}
                    onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                    className="form-input w-full"
                    placeholder={editing.id ? "Değiştirmek için girin" : "En az 6 karakter"}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Rol *</label>
                  <select
                    value={editing.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setEditing({
                        ...editing,
                        role: newRole,
                        permissions: DEFAULT_PERMS[newRole] || {},
                      });
                    }}
                    className="form-input w-full"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label} — {r.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="userActive"
                  checked={editing.active}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                  className="h-4 w-4 accent-[#7AC143]"
                />
                <label htmlFor="userActive" className="text-sm text-gray-700">Aktif</label>
              </div>

              {/* Permissions Grid (only for EDITOR and VIEWER) */}
              {editing.role !== "ADMIN" && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">Yetkiler</h3>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Kaynak</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-600 w-20">Görme</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-600 w-20">Yazma</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-600 w-20">Silme</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {RESOURCES.map((res) => (
                          <tr key={res.value} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-700">{res.label}</td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={(editing.permissions[res.value] || "").includes("r")}
                                onChange={() => togglePerm(res.value, "r")}
                                className="h-4 w-4 accent-[#7AC143]"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={(editing.permissions[res.value] || "").includes("w")}
                                onChange={() => togglePerm(res.value, "w")}
                                className="h-4 w-4 accent-[#7AC143]"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={(editing.permissions[res.value] || "").includes("d")}
                                onChange={() => togglePerm(res.value, "d")}
                                className="h-4 w-4 accent-[#7AC143]"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {editing.role === "ADMIN" && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                  <strong>Süper Admin</strong> rolü tüm yetkilere otomatik sahiptir. Granüler yetki ayarı gerekmez.
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditing(null)}>İptal</Button>
              <Button onClick={handleSave} loading={saving}>
                <Save className="mr-2 h-4 w-4" />
                Kaydet
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* User List */}
      <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700">Kullanıcı</th>
              <th className="px-4 py-3 font-medium text-gray-700">Rol</th>
              <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
              <th className="px-4 py-3 font-medium text-gray-700">Son Giriş</th>
              <th className="px-4 py-3 font-medium text-gray-700">Kayıt</th>
              <th className="px-4 py-3 font-medium text-gray-700">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{user.name || "—"}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {getRoleIcon(user.role)}
                    <span className="text-gray-700">{getRoleLabel(user.role)}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {user.active ? (
                    <Badge variant="success">Aktif</Badge>
                  ) : (
                    <Badge variant="outline">Pasif</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(user)}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Düzenle"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id, user.name || user.email)}
                      className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                      title="Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  Henüz admin kullanıcısı yok
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Role Explanation */}
      <div className="mt-6 rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-700">Rol Açıklamaları</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {ROLES.map((r) => (
            <div key={r.value} className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                {getRoleIcon(r.value)}
                <span className="font-medium text-gray-900">{r.label}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{r.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
