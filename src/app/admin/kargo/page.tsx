"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  X,
  Truck,
  Package,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface ShippingOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  cargoTrackingNo: string | null;
  cargoProvider: string | null;
  createdAt: string;
  updatedAt: string;
  user: { name: string | null; email: string; phone: string | null } | null;
  dealer: { companyName: string; dealerCode: string } | null;
  _count: { items: number };
}

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Tümü" },
  { value: "PROCESSING", label: "Hazırlanıyor" },
  { value: "SHIPPED", label: "Kargoda" },
  { value: "DELIVERED", label: "Teslim Edildi" },
];

export default function AdminShippingPage() {
  const [orders, setOrders] = useState<ShippingOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const limit = 30;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const statusParam = statusFilter || "PROCESSING,SHIPPED,DELIVERED";
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    // Filter by shipping-related statuses
    if (statusFilter) {
      params.set("status", statusFilter);
    } else {
      // Show all shipping-relevant orders (need separate calls or custom handling)
      // For now, we'll fetch without status filter and filter client-side
    }

    if (search) params.set("search", search);

    try {
      // Use the main orders API with status filter
      const statuses = statusParam.split(",");
      const allOrders: ShippingOrder[] = [];

      for (const s of statuses) {
        const p = new URLSearchParams({
          page: "1",
          limit: "100",
          status: s,
        });
        if (search) p.set("search", search);
        const res = await fetch(`/api/admin/orders?${p}`);
        const data = await res.json();
        if (data.orders) allOrders.push(...data.orders);
      }

      // Sort by updatedAt desc
      allOrders.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      setOrders(allOrders);
      setTotal(allOrders.length);
    } catch {
      setError("Veriler yüklenemedi");
    }
    setLoading(false);
  }, [statusFilter, search, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleCreateShipment = async (orderId: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/ship`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Kargo oluşturuldu: ${data.carrier} - ${data.trackingNo}`);
        setTimeout(() => setSuccess(""), 4000);
        fetchOrders();
      } else {
        setError(data.error || "Kargo oluşturulamadı");
        setTimeout(() => setError(""), 4000);
      }
    } catch {
      setError("Bir hata oluştu");
      setTimeout(() => setError(""), 4000);
    }
  };

  const processingCount = orders.filter((o) => o.status === "PROCESSING").length;
  const shippedCount = orders.filter((o) => o.status === "SHIPPED").length;
  const deliveredCount = orders.filter((o) => o.status === "DELIVERED").length;

  const formatPrice = (n: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);

  // Detect orders stuck in SHIPPED for more than 5 days
  const stuckOrders = orders.filter((o) => {
    if (o.status !== "SHIPPED") return false;
    const daysSinceUpdate = (Date.now() - new Date(o.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > 5;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Kargo Yönetimi</h1>
      <p className="mt-1 text-sm text-gray-500">Kargoya verilmiş ve bekleyen siparişler</p>

      {/* Messages */}
      {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      {success && <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-600">{success}</div>}

      {/* Stats Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <button
          onClick={() => setStatusFilter("PROCESSING")}
          className={`rounded-lg border bg-white p-4 text-center transition-colors hover:border-orange-300 ${statusFilter === "PROCESSING" ? "border-orange-400 ring-1 ring-orange-200" : ""}`}
        >
          <Package className="mx-auto h-6 w-6 text-orange-500" />
          <p className="mt-2 text-2xl font-bold text-orange-600">{processingCount}</p>
          <p className="text-sm text-gray-500">Hazırlanıyor</p>
        </button>
        <button
          onClick={() => setStatusFilter("SHIPPED")}
          className={`rounded-lg border bg-white p-4 text-center transition-colors hover:border-blue-300 ${statusFilter === "SHIPPED" ? "border-blue-400 ring-1 ring-blue-200" : ""}`}
        >
          <Truck className="mx-auto h-6 w-6 text-blue-500" />
          <p className="mt-2 text-2xl font-bold text-blue-600">{shippedCount}</p>
          <p className="text-sm text-gray-500">Kargoda</p>
        </button>
        <button
          onClick={() => setStatusFilter("DELIVERED")}
          className={`rounded-lg border bg-white p-4 text-center transition-colors hover:border-green-300 ${statusFilter === "DELIVERED" ? "border-green-400 ring-1 ring-green-200" : ""}`}
        >
          <CheckCircle className="mx-auto h-6 w-6 text-green-500" />
          <p className="mt-2 text-2xl font-bold text-green-600">{deliveredCount}</p>
          <p className="text-sm text-gray-500">Teslim Edildi</p>
        </button>
      </div>

      {/* Warning: Stuck orders */}
      {stuckOrders.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">{stuckOrders.length} sipariş 5+ gündür teslim edilmedi</span>
          </div>
          <div className="mt-2 space-y-1">
            {stuckOrders.slice(0, 5).map((order) => (
              <Link
                key={order.id}
                href={`/admin/siparisler/${order.id}`}
                className="block text-sm text-amber-600 hover:underline"
              >
                #{order.orderNumber} — {order.cargoProvider} ({order.cargoTrackingNo})
              </Link>
            ))}
            {stuckOrders.length > 5 && (
              <p className="text-xs text-amber-500">ve {stuckOrders.length - 5} daha...</p>
            )}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sipariş no, müşteri adı, takip no..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
            />
          </div>
          <Button type="submit" size="sm">
            <Search className="mr-1 h-3.5 w-3.5" />
            Ara
          </Button>
        </form>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {(search || statusFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSearch(""); setStatusFilter(""); setPage(1); }}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Temizle
            </Button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Sipariş</th>
                <th className="px-4 py-3 font-medium text-gray-700">Müşteri</th>
                <th className="px-4 py-3 font-medium text-gray-700">Tutar</th>
                <th className="px-4 py-3 font-medium text-gray-700">Kargo Firması</th>
                <th className="px-4 py-3 font-medium text-gray-700">Takip No</th>
                <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
                <th className="px-4 py-3 font-medium text-gray-700">Tarih</th>
                <th className="px-4 py-3 font-medium text-gray-700">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/siparisler/${order.id}`} className="font-medium text-[#7AC143] hover:underline">
                      #{order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">
                      {order.dealer?.companyName || order.user?.name || "Misafir"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {order.user?.phone || ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {formatPrice(order.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {order.cargoProvider || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {order.cargoTrackingNo ? (
                      <span className="font-mono text-sm text-gray-600">{order.cargoTrackingNo}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        order.status === "DELIVERED" ? "success" :
                        order.status === "SHIPPED" ? "default" : "warning"
                      }
                    >
                      {order.status === "PROCESSING" ? "Hazırlanıyor" :
                       order.status === "SHIPPED" ? "Kargoda" : "Teslim Edildi"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(order.updatedAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {order.status === "PROCESSING" && !order.cargoTrackingNo && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCreateShipment(order.id)}
                        >
                          <Truck className="mr-1 h-3.5 w-3.5" />
                          Kargola
                        </Button>
                      )}
                      {order.cargoTrackingNo && (
                        <button
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Takip Sayfası"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      )}
                      {order.user?.email && (
                        <button
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Müşteriye E-posta"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    {search || statusFilter ? "Eşleşen kargo bulunamadı" : "Henüz kargo yok"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
