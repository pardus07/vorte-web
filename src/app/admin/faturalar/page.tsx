"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  Filter,
  CheckCircle,
  AlertTriangle,
  Clock,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const STATUS_OPTIONS = [
  { value: "", label: "Tümü", icon: Filter },
  { value: "PENDING", label: "Bekliyor", icon: Clock },
  { value: "CREATED", label: "Oluşturuldu", icon: CheckCircle },
  { value: "SENT", label: "Gönderildi", icon: Send },
  { value: "ERROR", label: "Hata", icon: AlertTriangle },
];

const INVOICE_STATUS_MAP: Record<string, { label: string; variant: "success" | "warning" | "discount" | "outline" }> = {
  PENDING: { label: "Bekliyor", variant: "warning" },
  CREATED: { label: "Oluşturuldu", variant: "success" },
  SENT: { label: "Gönderildi", variant: "success" },
  ERROR: { label: "Hata", variant: "discount" },
};

const DATE_RANGE_OPTIONS = [
  { value: "", label: "Tüm Tarihler" },
  { value: "today", label: "Bugün" },
  { value: "week", label: "Bu Hafta" },
  { value: "month", label: "Bu Ay" },
  { value: "custom", label: "Özel Aralık" },
];

interface InvoiceData {
  id: string;
  invoiceNo: string | null;
  invoiceSeries: string;
  invoiceType: string | null;
  status: string;
  totalAmount: number | null;
  taxAmount: number | null;
  pdfUrl: string | null;
  issuedAt: string | null;
  createdAt: string;
  orderId: string;
  order: {
    orderNumber: string;
    totalAmount: number;
    type: string;
    user: { name: string | null; email: string } | null;
    dealer: { companyName: string; dealerCode: string } | null;
  };
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [total, setTotal] = useState(0);
  const [statusStats, setStatusStats] = useState<Record<string, { count: number; total: number }>>({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [invoiceType, setInvoiceType] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const limit = 20;

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (invoiceType) params.set("type", invoiceType);
    if (dateRange) params.set("dateRange", dateRange);
    if (dateRange === "custom") {
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
    }

    try {
      const res = await fetch(`/api/admin/invoices?${params}`);
      const data = await res.json();
      setInvoices(data.invoices || []);
      setTotal(data.total || 0);
      setStatusStats(data.statusStats || {});
    } catch {
      // silent
    }
    setLoading(false);
  }, [page, search, status, invoiceType, dateRange, dateFrom, dateTo]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchInvoices();
  };

  const totalPages = Math.ceil(total / limit);
  const totalAll = Object.values(statusStats).reduce((s, v) => s + v.count, 0);
  const totalAmount = Object.values(statusStats).reduce((s, v) => s + v.total, 0);

  const formatPrice = (n: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Faturalar</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} fatura · Toplam {formatPrice(totalAmount)}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 text-center">
          <FileText className="mx-auto h-6 w-6 text-gray-400" />
          <p className="mt-2 text-2xl font-bold text-gray-900">{totalAll}</p>
          <p className="text-sm text-gray-500">Toplam Fatura</p>
        </div>
        <div className="rounded-lg border bg-white p-4 text-center">
          <CheckCircle className="mx-auto h-6 w-6 text-green-500" />
          <p className="mt-2 text-2xl font-bold text-green-600">{statusStats.CREATED?.count || 0}</p>
          <p className="text-sm text-gray-500">Oluşturuldu</p>
        </div>
        <div className="rounded-lg border bg-white p-4 text-center">
          <Send className="mx-auto h-6 w-6 text-blue-500" />
          <p className="mt-2 text-2xl font-bold text-blue-600">{statusStats.SENT?.count || 0}</p>
          <p className="text-sm text-gray-500">Gönderildi</p>
        </div>
        <div className="rounded-lg border bg-white p-4 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-red-500" />
          <p className="mt-2 text-2xl font-bold text-red-600">{statusStats.ERROR?.count || 0}</p>
          <p className="text-sm text-gray-500">Hata</p>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const count = opt.value ? statusStats[opt.value]?.count || 0 : totalAll;
          return (
            <button
              key={opt.value}
              onClick={() => { setStatus(opt.value); setPage(1); }}
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
              placeholder="Fatura no, sipariş no, müşteri adı..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
            />
          </div>
          <Button type="submit" size="sm">Ara</Button>
          {(search || invoiceType || dateRange) && (
            <Button variant="outline" size="sm" onClick={() => { setSearch(""); setInvoiceType(""); setDateRange(""); setDateFrom(""); setDateTo(""); setPage(1); }}>
              <X className="mr-1 h-3.5 w-3.5" /> Temizle
            </Button>
          )}
        </form>
        <div className="flex gap-2">
          <select value={invoiceType} onChange={(e) => { setInvoiceType(e.target.value); setPage(1); }} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none">
            <option value="">Tüm Tipler</option>
            <option value="EFATURA">E-Fatura</option>
            <option value="EARSIV">E-Arşiv</option>
          </select>
          <select value={dateRange} onChange={(e) => { setDateRange(e.target.value); setPage(1); }} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {dateRange === "custom" && (
        <div className="mt-2 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#7AC143] focus:outline-none" />
          <span className="text-sm text-gray-400">—</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#7AC143] focus:outline-none" />
          <Button size="sm" variant="outline" onClick={() => { setPage(1); fetchInvoices(); }}>Uygula</Button>
        </div>
      )}

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Fatura No</th>
                <th className="px-4 py-3 font-medium text-gray-700">Sipariş</th>
                <th className="px-4 py-3 font-medium text-gray-700">Müşteri</th>
                <th className="px-4 py-3 font-medium text-gray-700">Tip</th>
                <th className="px-4 py-3 font-medium text-gray-700">Tutar</th>
                <th className="px-4 py-3 font-medium text-gray-700">KDV</th>
                <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
                <th className="px-4 py-3 font-medium text-gray-700">Tarih</th>
                <th className="px-4 py-3 font-medium text-gray-700">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map((inv) => {
                const statusInfo = INVOICE_STATUS_MAP[inv.status] || { label: inv.status, variant: "outline" as const };
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm">{inv.invoiceNo || "—"}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/siparisler/${inv.orderId}`} className="font-medium text-[#7AC143] hover:underline">
                        #{inv.order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {inv.order.dealer?.companyName || inv.order.user?.name || "—"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {inv.order.dealer?.dealerCode || inv.order.user?.email || ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={inv.invoiceType === "EFATURA" ? "new" : "outline"} className="text-[10px]">
                        {inv.invoiceType === "EFATURA" ? "E-Fatura" : inv.invoiceType === "EARSIV" ? "E-Arşiv" : "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium">{formatPrice(inv.totalAmount || inv.order.totalAmount)}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {inv.taxAmount ? formatPrice(inv.taxAmount) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(inv.issuedAt || inv.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-4 py-3">
                      {inv.pdfUrl && (
                        <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="PDF İndir">
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
              {invoices.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                  {search || status || invoiceType ? "Eşleşen fatura bulunamadı" : "Henüz fatura yok"}
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">Sayfa {page} / {totalPages} · Toplam {total} fatura</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="rounded-lg border p-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pn: number;
              if (totalPages <= 5) pn = i + 1;
              else if (page <= 3) pn = i + 1;
              else if (page >= totalPages - 2) pn = totalPages - 4 + i;
              else pn = page - 2 + i;
              return (
                <button key={pn} onClick={() => setPage(pn)} className={`rounded-lg border px-3 py-1.5 text-sm ${page === pn ? "border-[#7AC143] bg-[#7AC143]/10 font-medium text-[#7AC143]" : "text-gray-600 hover:bg-gray-50"}`}>
                  {pn}
                </button>
              );
            })}
            <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="rounded-lg border p-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
