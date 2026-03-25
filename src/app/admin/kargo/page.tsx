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
  Clock,
  ArrowRight,
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

    try {
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Kargo Yönetimi</h1>
        <p className="mt-1 text-[13px] text-gray-500">Kargoya verilmiş ve bekleyen siparişler</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <button
          onClick={() => setStatusFilter("PROCESSING")}
          className={`group rounded-2xl border bg-white p-5 text-left shadow-sm transition-all hover:shadow-md ${
            statusFilter === "PROCESSING" ? "border-orange-300 ring-2 ring-orange-100" : "border-gray-100"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 transition-colors group-hover:bg-orange-100">
              <Package className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{processingCount}</p>
              <p className="text-[12px] text-gray-500">Hazırlanıyor</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => setStatusFilter("SHIPPED")}
          className={`group rounded-2xl border bg-white p-5 text-left shadow-sm transition-all hover:shadow-md ${
            statusFilter === "SHIPPED" ? "border-blue-300 ring-2 ring-blue-100" : "border-gray-100"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 transition-colors group-hover:bg-blue-100">
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{shippedCount}</p>
              <p className="text-[12px] text-gray-500">Kargoda</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => setStatusFilter("DELIVERED")}
          className={`group rounded-2xl border bg-white p-5 text-left shadow-sm transition-all hover:shadow-md ${
            statusFilter === "DELIVERED" ? "border-green-300 ring-2 ring-green-100" : "border-gray-100"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 transition-colors group-hover:bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{deliveredCount}</p>
              <p className="text-[12px] text-gray-500">Teslim Edildi</p>
            </div>
          </div>
        </button>
      </div>

      {/* Warning: Stuck orders */}
      {stuckOrders.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/50 p-5">
          <div className="flex items-center gap-2.5 text-amber-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
              <Clock className="h-4 w-4 text-amber-700" />
            </div>
            <span className="font-semibold">{stuckOrders.length} sipariş 5+ gündür teslim edilmedi</span>
          </div>
          <div className="mt-3 space-y-1.5 pl-10">
            {stuckOrders.slice(0, 5).map((order) => (
              <Link
                key={order.id}
                href={`/admin/siparisler/${order.id}`}
                className="flex items-center gap-2 text-sm text-amber-700 transition-colors hover:text-amber-900"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                <span className="font-medium">#{order.orderNumber}</span>
                <span className="text-amber-600">— {order.cargoProvider} ({order.cargoTrackingNo})</span>
              </Link>
            ))}
            {stuckOrders.length > 5 && (
              <p className="text-[12px] text-amber-500">ve {stuckOrders.length - 5} daha...</p>
            )}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sipariş no, müşteri adı, takip no..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
            />
          </div>
          <Button type="submit" size="sm">
            <Search className="mr-1.5 h-3.5 w-3.5" />
            Ara
          </Button>
        </form>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
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
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50/80">
              <tr>
                <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Sipariş</th>
                <th className="px-4 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Müşteri</th>
                <th className="px-4 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Tutar</th>
                <th className="px-4 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Kargo Firması</th>
                <th className="px-4 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Takip No</th>
                <th className="px-4 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Durum</th>
                <th className="px-4 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Tarih</th>
                <th className="px-4 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-gray-50/50">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/siparisler/${order.id}`} className="font-medium text-[#7AC143] hover:underline">
                      #{order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-gray-900">
                      {order.dealer?.companyName || order.user?.name || "Misafir"}
                    </p>
                    <p className="text-[12px] text-gray-500">
                      {order.user?.phone || ""}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-gray-900">
                    {formatPrice(order.totalAmount)}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-gray-600">
                    {order.cargoProvider || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    {order.cargoTrackingNo ? (
                      <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-0.5 font-mono text-[12px] text-gray-700">
                        {order.cargoTrackingNo}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
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
                  <td className="px-4 py-3.5 text-[13px] text-gray-500">
                    {new Date(order.updatedAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1">
                      {order.status === "PROCESSING" && !order.cargoTrackingNo && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCreateShipment(order.id)}
                        >
                          <Truck className="mr-1.5 h-3.5 w-3.5" />
                          Kargola
                        </Button>
                      )}
                      {order.cargoTrackingNo && (
                        <button
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                          title="Takip Sayfası"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      )}
                      {order.user?.email && (
                        <button
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-purple-50 hover:text-purple-600"
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
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Truck className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-400">
                      {search || statusFilter ? "Eşleşen kargo bulunamadı" : "Henüz kargo yok"}
                    </p>
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
