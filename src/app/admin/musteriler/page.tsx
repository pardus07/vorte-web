"use client";

import { useEffect, useState } from "react";
import {
  Search,
  X,
  Eye,
  Ban,
  CheckCircle,
  Users,
  UserCheck,
  UserX,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  Calendar,
  Mail,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface CustomerData {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  _count?: {
    orders: number;
  };
}

interface CustomerDetail {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  _count: {
    orders: number;
    favorites: number;
    addresses: number;
  };
  orders: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  }[];
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

const STATUS_BADGE: Record<string, { label: string; variant: "success" | "new" | "warning" | "discount" | "outline" }> = {
  DELIVERED: { label: "Teslim", variant: "success" },
  SHIPPED: { label: "Kargoda", variant: "new" },
  PROCESSING: { label: "Hazırlanıyor", variant: "warning" },
  PAID: { label: "Ödendi", variant: "success" },
  PENDING: { label: "Bekliyor", variant: "warning" },
  CANCELLED: { label: "İptal", variant: "discount" },
  REFUNDED: { label: "İade", variant: "outline" },
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const limit = 20;

  const fetchCustomers = async (p: number = page, q: string = search) => {
    setLoading(true);
    const params = new URLSearchParams({
      type: "customer",
      page: String(p),
      limit: String(limit),
    });
    if (q) params.set("search", q);

    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    setCustomers(data.users || []);
    setTotal(data.total || 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers(1, search);
  };

  const viewDetail = async (id: string) => {
    setDetailLoading(true);
    const res = await fetch(`/api/admin/users/${id}`);
    const data = await res.json();
    setDetail(data);
    setDetailLoading(false);
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentActive }),
      });
      if (res.ok) {
        setSuccess(currentActive ? "Müşteri engellendi" : "Müşteri aktifleştirildi");
        setTimeout(() => setSuccess(""), 3000);
        fetchCustomers();
        if (detail?.id === id) {
          setDetail({ ...detail, active: !currentActive });
        }
      } else {
        const data = await res.json();
        setError(data.error || "İşlem başarısız");
        setTimeout(() => setError(""), 3000);
      }
    } catch {
      setError("Bir hata oluştu");
      setTimeout(() => setError(""), 3000);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const activeCount = customers.filter((c) => c.active).length;
  const inactiveCount = customers.filter((c) => !c.active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Müşteriler</h1>
          <p className="mt-1 text-[13px] text-gray-500">{total} kayıtlı müşteri</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
              <p className="text-[12px] text-gray-500">Toplam</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{activeCount}</p>
              <p className="text-[12px] text-gray-500">Aktif</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <UserX className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{inactiveCount}</p>
              <p className="text-[12px] text-gray-500">Engelli</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
              <ShoppingBag className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {customers.reduce((s, c) => s + (c._count?.orders || 0), 0)}
              </p>
              <p className="text-[12px] text-gray-500">Sipariş</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <Ban className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad, e-posta veya telefon ile ara..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
          />
        </div>
        <Button type="submit" size="sm">
          <Search className="mr-1.5 h-3.5 w-3.5" />
          Ara
        </Button>
        {search && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch("");
              setPage(1);
              fetchCustomers(1, "");
            }}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Temizle
          </Button>
        )}
      </form>

      {/* Detail Panel — Slide-over Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4 pt-16">
          <div className="w-full max-w-lg rounded-2xl bg-white p-0 shadow-2xl ring-1 ring-black/5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-bold tracking-tight text-gray-900">Müşteri Detayı</h2>
              <button onClick={() => setDetail(null)} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
              </div>
            ) : (
              <div className="space-y-5 p-6">
                {/* Customer Profile Card */}
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7AC143] to-[#5a9e2e] text-lg font-bold text-white shadow-sm">
                    {getInitials(detail.name, detail.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold text-gray-900">{detail.name || "İsimsiz"}</p>
                      {detail.active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          Engelli
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[13px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {detail.email}
                      </span>
                      {detail.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {detail.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-blue-50/60 p-3 text-center">
                    <ShoppingBag className="mx-auto h-5 w-5 text-blue-500" />
                    <p className="mt-1 text-xl font-bold text-blue-700">{detail._count.orders}</p>
                    <p className="text-[11px] text-blue-500">Sipariş</p>
                  </div>
                  <div className="rounded-xl bg-pink-50/60 p-3 text-center">
                    <Heart className="mx-auto h-5 w-5 text-pink-500" />
                    <p className="mt-1 text-xl font-bold text-pink-700">{detail._count.favorites}</p>
                    <p className="text-[11px] text-pink-500">Favori</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50/60 p-3 text-center">
                    <MapPin className="mx-auto h-5 w-5 text-emerald-500" />
                    <p className="mt-1 text-xl font-bold text-emerald-700">{detail._count.addresses}</p>
                    <p className="text-[11px] text-emerald-500">Adres</p>
                  </div>
                </div>

                {/* Timeline Info */}
                <div className="flex items-center gap-4 rounded-xl bg-gray-50 px-4 py-2.5 text-[12px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Kayıt: {new Date(detail.createdAt).toLocaleDateString("tr-TR")}
                  </span>
                  {detail.lastLoginAt && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span>Son giriş: {new Date(detail.lastLoginAt).toLocaleDateString("tr-TR")}</span>
                    </>
                  )}
                </div>

                {/* Recent Orders */}
                {detail.orders.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-[13px] font-semibold text-gray-700">Son Siparişler</h3>
                    <div className="space-y-2">
                      {detail.orders.map((order) => {
                        const sb = STATUS_BADGE[order.status] || { label: order.status, variant: "outline" as const };
                        return (
                          <div
                            key={order.id}
                            className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 transition-colors hover:bg-gray-50"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">#{order.orderNumber}</p>
                              <p className="text-[11px] text-gray-400">
                                {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                              </p>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span className="text-sm font-semibold text-gray-900">
                                ₺{order.totalAmount.toFixed(2)}
                              </span>
                              <Badge variant={sb.variant}>{sb.label}</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {detail.orders.length === 0 && (
                  <div className="rounded-xl bg-gray-50 py-6 text-center text-[13px] text-gray-400">
                    Henüz sipariş yok
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            {!detailLoading && detail && (
              <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
                <Button
                  variant={detail.active ? "destructive" : "default"}
                  size="sm"
                  onClick={() => toggleActive(detail.id, detail.active)}
                >
                  {detail.active ? (
                    <>
                      <Ban className="mr-1.5 h-4 w-4" />
                      Engelle
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-1.5 h-4 w-4" />
                      Aktifleştir
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDetail(null)}>
                  Kapat
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50/80">
              <tr>
                <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Müşteri</th>
                <th className="px-4 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Telefon</th>
                <th className="px-4 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Sipariş</th>
                <th className="px-4 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Durum</th>
                <th className="px-4 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Kayıt</th>
                <th className="px-4 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.map((customer) => (
                <tr key={customer.id} className="transition-colors hover:bg-gray-50/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xs font-semibold text-gray-600">
                        {getInitials(customer.name, customer.email)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{customer.name || "İsimsiz"}</p>
                        <p className="truncate text-[12px] text-gray-500">{customer.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-gray-600">{customer.phone || "—"}</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 text-[13px] font-medium text-gray-900">
                      <ShoppingBag className="h-3.5 w-3.5 text-gray-400" />
                      {customer._count?.orders || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {customer.active ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        Engelli
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-gray-500">
                    {new Date(customer.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1">
                      <button
                        onClick={() => viewDetail(customer.id)}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-[#7AC143]/10 hover:text-[#7AC143]"
                        title="Detay"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(customer.id, customer.active)}
                        className={`rounded-lg p-2 transition-colors ${
                          customer.active
                            ? "text-gray-400 hover:bg-red-50 hover:text-red-600"
                            : "text-gray-400 hover:bg-green-50 hover:text-green-600"
                        }`}
                        title={customer.active ? "Engelle" : "Aktifleştir"}
                      >
                        {customer.active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <Users className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-400">
                      {search ? "Aramayla eşleşen müşteri bulunamadı" : "Henüz kayıtlı müşteri yok"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-gray-500">
            Sayfa {page} / {totalPages} · Toplam {total} müşteri
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setPage(page - 1); fetchCustomers(page - 1); }}
              disabled={page <= 1}
              className="rounded-lg border border-gray-200 p-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pn: number;
              if (totalPages <= 5) pn = i + 1;
              else if (page <= 3) pn = i + 1;
              else if (page >= totalPages - 2) pn = totalPages - 4 + i;
              else pn = page - 2 + i;
              return (
                <button
                  key={pn}
                  onClick={() => { setPage(pn); fetchCustomers(pn); }}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    page === pn
                      ? "border-[#7AC143] bg-[#7AC143]/10 font-medium text-[#7AC143]"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {pn}
                </button>
              );
            })}
            <button
              onClick={() => { setPage(page + 1); fetchCustomers(page + 1); }}
              disabled={page >= totalPages}
              className="rounded-lg border border-gray-200 p-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
