"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Shield,
  ShieldCheck,
  Eye,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

/* ------------------------------------------------------------------ */
/*  Types & constants                                                  */
/* ------------------------------------------------------------------ */

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
  { value: "ADMIN", label: "Super Admin", description: "Tum yetkilere sahip" },
  { value: "EDITOR", label: "Editor", description: "Urun, siparis, slider duzenleyebilir" },
  { value: "VIEWER", label: "Goruntuleyici", description: "Sadece goruntuleyebilir" },
];

const RESOURCES = [
  { value: "products", label: "Urunler" },
  { value: "orders", label: "Siparisler" },
  { value: "dealers", label: "Bayiler" },
  { value: "invoices", label: "Faturalar" },
  { value: "settings", label: "Ayarlar" },
  { value: "users", label: "Kullanicilar" },
  { value: "sliders", label: "Slider" },
  { value: "banners", label: "Bannerlar" },
  { value: "coupons", label: "Kuponlar" },
  { value: "reports", label: "Raporlar" },
];

const DEFAULT_PERMS: Record<string, Record<string, string>> = {
  ADMIN: Object.fromEntries(RESOURCES.map((r) => [r.value, "rwd"])),
  EDITOR: {
    products: "rw",
    orders: "rw",
    dealers: "r",
    invoices: "r",
    settings: "r",
    users: "",
    sliders: "rw",
    banners: "rw",
    coupons: "r",
    reports: "r",
  },
  VIEWER: Object.fromEntries(
    RESOURCES.map((r) => [r.value, r.value === "settings" || r.value === "users" ? "" : "r"]),
  ),
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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const getRoleIcon = (role: string) => {
  switch (role) {
    case "ADMIN":
      return <ShieldCheck className="h-4 w-4 text-red-500" />;
    case "EDITOR":
      return <Shield className="h-4 w-4 text-blue-500" />;
    default:
      return <Eye className="h-4 w-4 text-gray-400" />;
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case "ADMIN":
      return "Super Admin";
    case "EDITOR":
      return "Editor";
    case "VIEWER":
      return "Goruntuleyici";
    default:
      return role;
  }
};

const getRoleColor = (role: string) => {
  switch (role) {
    case "ADMIN":
      return "bg-red-50 text-red-700 ring-red-600/10";
    case "EDITOR":
      return "bg-blue-50 text-blue-700 ring-blue-600/10";
    default:
      return "bg-gray-50 text-gray-600 ring-gray-500/10";
  }
};

const getInitials = (name: string | null, email: string) => {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].substring(0, 2).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
};

const getAvatarColor = (name: string | null, email: string) => {
  const str = name || email;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "bg-violet-100 text-violet-700",
    "bg-sky-100 text-sky-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-indigo-100 text-indigo-700",
    "bg-teal-100 text-teal-700",
    "bg-orange-100 text-orange-700",
  ];
  return colors[Math.abs(hash) % colors.length];
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ---------- Data fetching ---------- */

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users?type=admin");
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  /* ---------- CRUD handlers ---------- */

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name || !editing.email) {
      setError("Ad ve e-posta zorunludur");
      return;
    }
    if (!editing.id && !editing.password) {
      setError("Yeni kullanici icin sifre zorunludur");
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
        setSuccess(isNew ? "Kullanici eklendi" : "Kullanici guncellendi");
        setTimeout(() => setSuccess(""), 3000);
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || "Islem basarisiz");
      }
    } catch {
      setError("Bir hata olustu");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${name} kullanicisini silmek istediginize emin misiniz?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSuccess("Kullanici silindi");
        setTimeout(() => setSuccess(""), 3000);
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || "Silme basarisiz");
      }
    } catch {
      setError("Silme basarisiz");
    }
  };

  const startEdit = (user: UserData) => {
    setEditing({
      id: user.id,
      name: user.name || "",
      email: user.email,
      password: "",
      role: user.role,
      permissions:
        (user.permissions as Record<string, string>) || DEFAULT_PERMS[user.role] || {},
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

  /* ---------- Computed values ---------- */

  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const editorCount = users.filter((u) => u.role === "EDITOR").length;
  const viewerCount = users.filter((u) => u.role === "VIEWER").length;

  /* ---------- Loading state ---------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-gray-200 border-t-[#7AC143]" />
          <p className="text-[13px] text-gray-400">Kullanicilar yukleniyor...</p>
        </div>
      </div>
    );
  }

  /* ---------- Render ---------- */

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/*  Header                                                       */}
      {/* ============================================================ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7AC143]/20 to-[#7AC143]/5">
            <Users className="h-6 w-6 text-[#7AC143]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Admin Kullanicilari
              </h1>
              {/* Stat pills */}
              <div className="flex items-center gap-1.5">
                <Badge variant="subtle" className="rounded-full px-2.5 py-0.5">
                  {users.length} Toplam
                </Badge>
                {adminCount > 0 && (
                  <Badge className="rounded-full bg-red-50 px-2.5 py-0.5 text-red-600">
                    {adminCount} Admin
                  </Badge>
                )}
                {editorCount > 0 && (
                  <Badge className="rounded-full bg-blue-50 px-2.5 py-0.5 text-blue-600">
                    {editorCount} Editor
                  </Badge>
                )}
                {viewerCount > 0 && (
                  <Badge variant="subtle" className="rounded-full px-2.5 py-0.5">
                    {viewerCount} Viewer
                  </Badge>
                )}
              </div>
            </div>
            <p className="mt-0.5 text-[13px] text-gray-500">
              Yonetim paneline erisim yetkileri ve kullanici rolleri
            </p>
          </div>
        </div>

        <Button
          onClick={() => setEditing({ ...emptyUser })}
          className="rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Yeni Kullanici
        </Button>
      </div>

      {/* ============================================================ */}
      {/*  Messages                                                     */}
      {/* ============================================================ */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <XCircle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button
            onClick={() => setError("")}
            className="ml-auto rounded-lg p-1 text-red-400 hover:bg-red-100 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
          <p className="text-sm font-medium text-emerald-700">{success}</p>
          <button
            onClick={() => setSuccess("")}
            className="ml-auto rounded-lg p-1 text-emerald-400 hover:bg-emerald-100 hover:text-emerald-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Edit / Create Modal                                          */}
      {/* ============================================================ */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4 pt-[8vh]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditing(null);
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7AC143]/10">
                  {editing.id ? (
                    <Edit className="h-4 w-4 text-[#7AC143]" />
                  ) : (
                    <Plus className="h-4 w-4 text-[#7AC143]" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-gray-900">
                    {editing.id ? "Kullanici Duzenle" : "Yeni Admin Kullanici"}
                  </h2>
                  <p className="text-[12px] text-gray-400">
                    {editing.id ? "Mevcut kullanici bilgilerini guncelleyin" : "Panele erisim icin yeni kullanici olusturun"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-5 px-6 py-5">
              {/* Form fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    Ad Soyad *
                  </label>
                  <input
                    type="text"
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                    placeholder="Ahmet Yilmaz"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    E-posta *
                  </label>
                  <input
                    type="email"
                    value={editing.email}
                    onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                    placeholder="admin@vorte.com.tr"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    {editing.id ? "Yeni Sifre (opsiyonel)" : "Sifre *"}
                  </label>
                  <input
                    type="password"
                    value={editing.password}
                    onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                    placeholder={editing.id ? "Degistirmek icin girin" : "En az 6 karakter"}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    Rol *
                  </label>
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
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label} -- {r.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="userActive"
                  checked={editing.active}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                  className="h-4 w-4 rounded accent-[#7AC143]"
                />
                <label htmlFor="userActive" className="text-sm text-gray-700">
                  Aktif kullanici
                </label>
              </div>

              {/* Permissions grid (EDITOR and VIEWER only) */}
              {editing.role !== "ADMIN" && (
                <div>
                  <h3 className="mb-2.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    Yetkiler
                  </h3>
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-gray-50/80">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                            Kaynak
                          </th>
                          <th className="w-20 px-3 py-2.5 text-center text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                            Gorme
                          </th>
                          <th className="w-20 px-3 py-2.5 text-center text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                            Yazma
                          </th>
                          <th className="w-20 px-3 py-2.5 text-center text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                            Silme
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {RESOURCES.map((res) => (
                          <tr
                            key={res.value}
                            className="transition-colors hover:bg-gray-50/60"
                          >
                            <td className="px-4 py-2.5 text-sm font-medium text-gray-700">
                              {res.label}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={(editing.permissions[res.value] || "").includes("r")}
                                onChange={() => togglePerm(res.value, "r")}
                                className="h-4 w-4 rounded accent-[#7AC143]"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={(editing.permissions[res.value] || "").includes("w")}
                                onChange={() => togglePerm(res.value, "w")}
                                className="h-4 w-4 rounded accent-[#7AC143]"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={(editing.permissions[res.value] || "").includes("d")}
                                onChange={() => togglePerm(res.value, "d")}
                                className="h-4 w-4 rounded accent-[#7AC143]"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Admin role warning */}
              {editing.role === "ADMIN" && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/50 px-4 py-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Super Admin</p>
                    <p className="mt-0.5 text-[13px] text-amber-600">
                      Bu rol tum yetkilere otomatik sahiptir. Granuler yetki ayari gerekmez.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <Button
                variant="outline"
                onClick={() => setEditing(null)}
                className="rounded-xl px-4 py-2.5 text-sm"
              >
                Iptal
              </Button>
              <Button
                onClick={handleSave}
                loading={saving}
                className="rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white shadow-sm"
              >
                <Save className="mr-2 h-4 w-4" />
                Kaydet
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  User Table                                                   */}
      {/* ============================================================ */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50/80">
            <tr>
              <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                Kullanici
              </th>
              <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                Rol
              </th>
              <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                Durum
              </th>
              <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                Son Giris
              </th>
              <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                Kayit
              </th>
              <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                Islem
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((user) => (
              <tr
                key={user.id}
                className="transition-colors hover:bg-gray-50/60"
              >
                {/* User cell with avatar */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold ${getAvatarColor(user.name, user.email)}`}
                    >
                      {getInitials(user.name, user.email)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {user.name || "--"}
                      </p>
                      <p className="text-[12px] text-gray-400">{user.email}</p>
                    </div>
                  </div>
                </td>

                {/* Role cell with icon + label */}
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getRoleColor(user.role)}`}
                  >
                    {getRoleIcon(user.role)}
                    {getRoleLabel(user.role)}
                  </span>
                </td>

                {/* Status cell with dot */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${user.active ? "bg-emerald-500" : "bg-gray-300"}`}
                    />
                    <span
                      className={`text-sm ${user.active ? "text-emerald-700" : "text-gray-400"}`}
                    >
                      {user.active ? "Aktif" : "Pasif"}
                    </span>
                  </div>
                </td>

                {/* Last login */}
                <td className="px-5 py-3.5 text-sm text-gray-500">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "--"}
                </td>

                {/* Created date */}
                <td className="px-5 py-3.5 text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                </td>

                {/* Actions */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(user)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                      title="Duzenle"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() =>
                        handleDelete(user.id, user.name || user.email)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
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
                <td
                  colSpan={6}
                  className="px-5 py-16 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                      <Users className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                      Henuz admin kullanicisi yok
                    </p>
                    <p className="text-[13px] text-gray-400">
                      Yukaridaki butona tiklayarak yeni bir kullanici ekleyin
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ============================================================ */}
      {/*  Role Explanation Cards                                       */}
      {/* ============================================================ */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-gray-500">
          Rol Aciklamalari
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {ROLES.map((r) => {
            const iconBg =
              r.value === "ADMIN"
                ? "bg-red-50"
                : r.value === "EDITOR"
                  ? "bg-blue-50"
                  : "bg-gray-100";

            return (
              <div
                key={r.value}
                className="rounded-2xl border border-gray-100 p-4 transition-colors hover:border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}
                  >
                    {getRoleIcon(r.value)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {r.label}
                    </p>
                    <p className="mt-0.5 text-[12px] text-gray-400">
                      {r.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
