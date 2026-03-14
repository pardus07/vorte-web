"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Search,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  Package,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  RotateCcw,
  CreditCard,
  Eye,
  MoreHorizontal,
  ArrowUpDown,
  Calendar,
  Trash2,
  ExternalLink,
  Factory,
  PackageCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const STATUS_OPTIONS = [
  { value: "", label: "Tümü", icon: Filter },
  { value: "PENDING", label: "Bekliyor", icon: Clock },
  { value: "PAID", label: "Ödendi", icon: CreditCard },
  { value: "PROCESSING", label: "Hazırlanıyor", icon: Package },
  { value: "PRODUCTION", label: "Üretimde", icon: Factory },
  { value: "PRODUCTION_READY", label: "Üretim Hazır", icon: PackageCheck },
  { value: "SHIPPED", label: "Kargoda", icon: Truck },
  { value: "DELIVERED", label: "Teslim Edildi", icon: CheckCircle },
  { value: "CANCELLED", label: "İptal", icon: XCircle },
  { value: "REFUNDED", label: "İade", icon: RotateCcw },
];

const STATUS_MAP: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "outline" | "discount" | "new" }
> = {
  PENDING: { label: "Bekliyor", variant: "warning" },
  PAID: { label: "Ödendi", variant: "success" },
  PROCESSING: { label: "Hazırlanıyor", variant: "new" },
  PRODUCTION: { label: "Üretimde", variant: "warning" },
  PRODUCTION_READY: { label: "Üretim Hazır", variant: "new" },
  SHIPPED: { label: "Kargoda", variant: "default" },
  DELIVERED: { label: "Teslim Edildi", variant: "success" },
  CANCELLED: { label: "İptal", variant: "discount" },
  REFUNDED: { label: "İade", variant: "outline" },
};

const DATE_RANGE_OPTIONS = [
  { value: "", label: "Tüm Tarihler" },
  { value: "today", label: "Bugün" },
  { value: "week", label: "Bu Hafta" },
  { value: "month", label: "Bu Ay" },
  { value: "custom", label: "Özel Aralık" },
];

interface OrderData {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  totalAmount: number;
  shippingCost: number;
  discountAmount: number;
  cargoTrackingNo: string | null;
  cargoProvider: string | null;
  createdAt: string;
  user: { name: string | null; email: string; phone: string | null } | null;
  dealer: { companyName: string; dealerCode: string } | null;
  payment: { status: string } | null;
  _count: { items: number };
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("newest");

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkStatus, setBulkStatus] = useState("PROCESSING");
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Dropdown & Delete
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; orderNumber: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Messages
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const limit = 20;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      sort,
    });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (dateRange) params.set("dateRange", dateRange);
    if (dateRange === "custom") {
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
    }

    try {
      const res = await fetch(`/api/admin/orders?${params}`);
      const data = await res.json();
      setOrders(data.orders || []);
      setTotal(data.total || 0);
      setStatusCounts(data.statusCounts || {});
    } catch {
      setError("Siparişler yüklenemedi");
    }
    setLoading(false);
  }, [page, search, status, type, dateRange, dateFrom, dateTo, sort]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  const canDeleteOrder = (order: OrderData) => {
    return (
      order.status === "CANCELLED" ||
      order.status === "REFUNDED" ||
      (order.status === "PENDING" &&
        (!order.payment ||
          order.payment.status === "PENDING" ||
          order.payment.status === "FAILED"))
    );
  };

  const handleDeleteOrder = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/admin/orders/${deleteConfirm.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSuccess(`#${deleteConfirm.orderNumber} siparişi silindi`);
        setDeleteConfirm(null);
        fetchOrders();
      } else {
        const data = await res.json();
        setError(data.error || "Sipariş silinemedi");
      }
    } catch {
      setError("Bir hata oluştu");
    }
    setDeleting(false);
    setTimeout(() => { setSuccess(""); setError(""); }, 4000);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleStatusFilter = (s: string) => {
    setStatus(s);
    setPage(1);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    }
  };

  const handleBulkAction = async () => {
    if (selectedIds.size === 0 || !bulkAction) return;
    setBulkProcessing(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/orders/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds: Array.from(selectedIds),
          action: bulkAction,
          status: bulkAction === "status_update" ? bulkStatus : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`${data.successCount} sipariş güncellendi${data.errorCount > 0 ? `, ${data.errorCount} hata` : ""}`);
        setSelectedIds(new Set());
        setBulkAction("");
        fetchOrders();
      } else {
        setError(data.error || "İşlem başarısız");
      }
    } catch {
      setError("Bir hata oluştu");
    }
    setBulkProcessing(false);
    setTimeout(() => { setSuccess(""); setError(""); }, 4000);
  };

  const totalPages = Math.ceil(total / limit);
  const totalAll = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const formatPrice = (n: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Siparişler</h1>
          <p className="mt-1 text-sm text-gray-500">{total} sipariş bulundu</p>
        </div>
      </div>

      {/* Messages */}
      {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      {success && <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-600">{success}</div>}

      {/* Status Tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const count = opt.value ? statusCounts[opt.value] || 0 : totalAll;
          return (
            <button
              key={opt.value}
              onClick={() => handleStatusFilter(opt.value)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                status === opt.value
                  ? "border-[#7AC143] bg-[#7AC143]/10 font-medium text-[#7AC143]"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {opt.label}
              {count > 0 && (
                <span className="ml-0.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="mt-4 flex flex-col gap-3 lg:flex-row">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sipariş no, müşteri adı, e-posta, telefon..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
            />
          </div>
          <Button type="submit" size="sm">
            <Search className="mr-1 h-3.5 w-3.5" />
            Ara
          </Button>
          {(search || type || dateRange) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setType("");
                setDateRange("");
                setDateFrom("");
                setDateTo("");
                setPage(1);
              }}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Temizle
            </Button>
          )}
        </form>

        <div className="flex gap-2">
          <select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
          >
            <option value="">Tüm Tipler</option>
            <option value="RETAIL">Perakende</option>
            <option value="WHOLESALE">Toptan</option>
          </select>

          <select
            value={dateRange}
            onChange={(e) => { setDateRange(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
          >
            {DATE_RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
          >
            <option value="newest">En Yeni</option>
            <option value="oldest">En Eski</option>
            <option value="amount_high">Tutar ↓</option>
            <option value="amount_low">Tutar ↑</option>
          </select>
        </div>
      </div>

      {/* Custom Date Range */}
      {dateRange === "custom" && (
        <div className="mt-2 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#7AC143] focus:outline-none"
          />
          <span className="text-sm text-gray-400">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#7AC143] focus:outline-none"
          />
          <Button size="sm" variant="outline" onClick={() => { setPage(1); fetchOrders(); }}>
            Uygula
          </Button>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-[#7AC143]/30 bg-[#7AC143]/5 p-3">
          <span className="text-sm font-medium text-gray-700">
            {selectedIds.size} sipariş seçildi
          </span>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm focus:border-[#7AC143] focus:outline-none"
          >
            <option value="">İşlem seçin</option>
            <option value="status_update">Durum Güncelle</option>
            <option value="delete">Seçilenleri Sil</option>
          </select>
          {bulkAction === "status_update" && (
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-sm focus:border-[#7AC143] focus:outline-none"
            >
              <option value="PROCESSING">Hazırlanıyor</option>
              <option value="PRODUCTION">Üretimde</option>
              <option value="PRODUCTION_READY">Üretim Hazır</option>
              <option value="SHIPPED">Kargoda</option>
              <option value="DELIVERED">Teslim Edildi</option>
              <option value="CANCELLED">İptal</option>
            </select>
          )}
          <Button
            size="sm"
            onClick={handleBulkAction}
            loading={bulkProcessing}
            disabled={!bulkAction}
          >
            Uygula
          </Button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-sm text-gray-500 hover:text-gray-700"
          >
            Seçimi Temizle
          </button>
        </div>
      )}

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
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={orders.length > 0 && selectedIds.size === orders.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 font-medium text-gray-700">
                  <button onClick={() => setSort(sort === "newest" ? "oldest" : "newest")} className="flex items-center gap-1">
                    Sipariş <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-gray-700">Müşteri</th>
                <th className="px-4 py-3 font-medium text-gray-700">Tip</th>
                <th className="px-4 py-3 font-medium text-gray-700">Ürün</th>
                <th className="px-4 py-3 font-medium text-gray-700">
                  <button onClick={() => setSort(sort === "amount_high" ? "amount_low" : "amount_high")} className="flex items-center gap-1">
                    Tutar <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-gray-700">Ödeme</th>
                <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
                <th className="px-4 py-3 font-medium text-gray-700">Tarih</th>
                <th className="px-4 py-3 font-medium text-gray-700">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => {
                const statusInfo = STATUS_MAP[order.status] || { label: order.status, variant: "outline" as const };
                const paymentStatus = order.payment?.status;
                return (
                  <tr key={order.id} className={`hover:bg-gray-50 ${selectedIds.has(order.id) ? "bg-[#7AC143]/5" : ""}`}>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/siparisler/${order.id}`}
                        className="font-medium text-[#7AC143] hover:underline"
                      >
                        #{order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {order.dealer
                            ? order.dealer.companyName
                            : order.user?.name || "Misafir"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.dealer
                            ? order.dealer.dealerCode
                            : order.user?.email || ""}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={order.type === "WHOLESALE" ? "new" : "outline"}>
                        {order.type === "WHOLESALE" ? "Toptan" : "Perakende"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{order._count.items}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {formatPrice(order.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          paymentStatus === "SUCCESS" ? "success" :
                          paymentStatus === "FAILED" ? "discount" :
                          paymentStatus === "REFUNDED" ? "outline" : "warning"
                        }
                      >
                        {paymentStatus === "SUCCESS" ? "Ödendi" :
                         paymentStatus === "FAILED" ? "Başarısız" :
                         paymentStatus === "REFUNDED" ? "İade" : "Bekliyor"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative flex gap-1">
                        <Link
                          href={`/admin/siparisler/${order.id}`}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Detay"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === order.id ? null : order.id)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Daha Fazla"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {/* Dropdown Menu */}
                        {openMenuId === order.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-white py-1 shadow-lg"
                          >
                            <Link
                              href={`/admin/siparisler/${order.id}`}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setOpenMenuId(null)}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Detay Görüntüle
                            </Link>
                            {canDeleteOrder(order) && (
                              <button
                                onClick={() => {
                                  setDeleteConfirm({ id: order.id, orderNumber: order.orderNumber });
                                  setOpenMenuId(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Siparişi Sil
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                    {search || status ? "Filtreyle eşleşen sipariş bulunamadı" : "Henüz sipariş yok"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">Siparişi Sil</h3>
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-medium text-gray-900">#{deleteConfirm.orderNumber}</span> numaralı siparişi silmek istediğinize emin misiniz?
            </p>
            <p className="mt-1 text-xs text-red-500">
              Bu işlem geri alınamaz. Sipariş ve ilişkili tüm veriler (ödeme, kargo, fatura) silinecektir.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
              >
                İptal
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteOrder}
                loading={deleting}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Evet, Sil
              </Button>
            </div>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Sayfa {page} / {totalPages} · Toplam {total} sipariş
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setPage(page - 1); setSelectedIds(new Set()); }}
              disabled={page <= 1}
              className="rounded-lg border p-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => { setPage(pageNum); setSelectedIds(new Set()); }}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    page === pageNum
                      ? "border-[#7AC143] bg-[#7AC143]/10 font-medium text-[#7AC143]"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => { setPage(page + 1); setSelectedIds(new Set()); }}
              disabled={page >= totalPages}
              className="rounded-lg border p-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
