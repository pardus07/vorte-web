"use client";

import { useEffect, useState } from "react";
import { Search, X, Eye, Ban, CheckCircle } from "lucide-react";
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

  const fetchCustomers = async (p: number = page, q: string = search) => {
    setLoading(true);
    const params = new URLSearchParams({
      type: "customer",
      page: String(p),
      limit: "20",
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
      }
    } catch {
      setError("Bir hata oluştu");
    }
  };

  const totalPages = Math.ceil(total / 20);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DELIVERED": return <Badge variant="success">Teslim</Badge>;
      case "SHIPPED": return <Badge variant="new">Kargoda</Badge>;
      case "PROCESSING": return <Badge variant="warning">Hazırlanıyor</Badge>;
      case "CANCELLED": return <Badge variant="discount">İptal</Badge>;
      case "REFUNDED": return <Badge variant="outline">İade</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Müşteriler</h1>
          <p className="mt-1 text-sm text-gray-500">{total} kayıtlı müşteri</p>
        </div>
      </div>

      {/* Messages */}
      {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      {success && <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-600">{success}</div>}

      {/* Search */}
      <form onSubmit={handleSearch} className="mt-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad, e-posta veya telefon ile ara..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
          />
        </div>
        <Button type="submit" size="sm">
          <Search className="mr-1 h-3.5 w-3.5" />
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

      {/* Detail Panel */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-16">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Müşteri Detayı</h2>
              <button onClick={() => setDetail(null)} className="rounded p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {/* Info */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{detail.name || "İsimsiz"}</p>
                      <p className="text-sm text-gray-500">{detail.email}</p>
                      {detail.phone && <p className="text-sm text-gray-500">{detail.phone}</p>}
                    </div>
                    {detail.active ? (
                      <Badge variant="success">Aktif</Badge>
                    ) : (
                      <Badge variant="discount">Engelli</Badge>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg bg-gray-50 p-2">
                      <p className="text-lg font-bold text-gray-900">{detail._count.orders}</p>
                      <p className="text-xs text-gray-500">Sipariş</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2">
                      <p className="text-lg font-bold text-gray-900">{detail._count.favorites}</p>
                      <p className="text-xs text-gray-500">Favori</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2">
                      <p className="text-lg font-bold text-gray-900">{detail._count.addresses}</p>
                      <p className="text-xs text-gray-500">Adres</p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-400">
                    Kayıt: {new Date(detail.createdAt).toLocaleDateString("tr-TR")}
                    {detail.lastLoginAt && (
                      <> · Son giriş: {new Date(detail.lastLoginAt).toLocaleDateString("tr-TR")}</>
                    )}
                  </div>
                </div>

                {/* Recent Orders */}
                {detail.orders.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-gray-700">Son Siparişler</h3>
                    <div className="space-y-2">
                      {detail.orders.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">#{order.orderNumber}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              ₺{order.totalAmount.toFixed(2)}
                            </span>
                            {getStatusBadge(order.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <Button
                    variant={detail.active ? "destructive" : "default"}
                    size="sm"
                    onClick={() => toggleActive(detail.id, detail.active)}
                  >
                    {detail.active ? (
                      <>
                        <Ban className="mr-1 h-4 w-4" />
                        Engelle
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Aktifleştir
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDetail(null)}>
                    Kapat
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Table */}
      <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Müşteri</th>
                <th className="px-4 py-3 font-medium text-gray-700">Telefon</th>
                <th className="px-4 py-3 font-medium text-gray-700">Sipariş</th>
                <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
                <th className="px-4 py-3 font-medium text-gray-700">Kayıt</th>
                <th className="px-4 py-3 font-medium text-gray-700">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{customer.name || "—"}</p>
                      <p className="text-xs text-gray-500">{customer.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{customer.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">
                      {customer._count?.orders || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {customer.active ? (
                      <Badge variant="success">Aktif</Badge>
                    ) : (
                      <Badge variant="discount">Engelli</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(customer.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => viewDetail(customer.id)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Detay"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(customer.id, customer.active)}
                        className={`rounded p-1.5 ${
                          customer.active
                            ? "text-red-400 hover:bg-red-50 hover:text-red-600"
                            : "text-green-400 hover:bg-green-50 hover:text-green-600"
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
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    {search ? "Aramayla eşleşen müşteri bulunamadı" : "Henüz kayıtlı müşteri yok"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Sayfa {page} / {totalPages} · Toplam {total} müşteri
          </p>
          <div className="flex items-center gap-1">
            {page > 1 && (
              <button
                onClick={() => {
                  setPage(page - 1);
                  fetchCustomers(page - 1);
                }}
                className="rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                ← Önceki
              </button>
            )}
            {page < totalPages && (
              <button
                onClick={() => {
                  setPage(page + 1);
                  fetchCustomers(page + 1);
                }}
                className="rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Sonraki →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
