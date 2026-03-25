"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Mail,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  Eye,
  Inbox,
  Clock,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const STATUS_OPTIONS = [
  { value: "", label: "Tümü", icon: Filter },
  { value: "sent", label: "Gönderildi", icon: CheckCircle },
  { value: "failed", label: "Başarısız", icon: XCircle },
  { value: "bounced", label: "Bounced", icon: AlertTriangle },
];

const STATUS_MAP: Record<string, { label: string; variant: "success" | "discount" | "warning" | "outline"; dotColor: string }> = {
  sent: { label: "Gönderildi", variant: "success", dotColor: "bg-emerald-500" },
  failed: { label: "Başarısız", variant: "discount", dotColor: "bg-red-500" },
  bounced: { label: "Bounced", variant: "warning", dotColor: "bg-amber-500" },
};

interface EmailLogData {
  id: string;
  to: string;
  subject: string;
  templateId: string | null;
  templateName: string | null;
  fromAddress: string | null;
  status: string;
  error: string | null;
  sentAt: string;
  body?: string | null;
}

export default function AdminEmailLogPage() {
  const [logs, setLogs] = useState<EmailLogData[]>([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [viewLog, setViewLog] = useState<EmailLogData | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const openEmailDetail = async (id: string) => {
    const existing = logs.find(l => l.id === id);
    if (existing) {
      setViewLog(existing);
    }
    setViewLoading(true);
    try {
      const res = await fetch(`/api/admin/email-log/${id}`);
      if (res.ok) {
        const data = await res.json();
        setViewLog(data);
      } else if (existing) {
        setViewLog(existing);
      }
    } catch {
      if (!existing) setViewLog(null);
    } finally {
      setViewLoading(false);
    }
  };

  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    if (status) params.set("status", status);

    try {
      const res = await fetch(`/api/admin/email-log?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setStatusCounts(data.statusCounts || {});
    } catch { /* silent */ }
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const totalPages = Math.ceil(total / limit);
  const totalAll = Object.values(statusCounts).reduce((s, v) => s + v, 0);

  // Generate page numbers for pagination
  const pageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("ellipsis");
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  }, [page, totalPages]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
            <Inbox className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">E-posta Günlüğü</h1>
            <p className="text-[13px] text-gray-500">{totalAll.toLocaleString("tr-TR")} e-posta kaydı</p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Sent */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-gray-500">Gönderildi</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{(statusCounts["sent"] || 0).toLocaleString("tr-TR")}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          {totalAll > 0 && (
            <div className="mt-3 flex items-center gap-1.5">
              <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                <div
                  className="h-1.5 rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${((statusCounts["sent"] || 0) / totalAll) * 100}%` }}
                />
              </div>
              <span className="text-[11px] font-medium text-gray-400">
                %{totalAll > 0 ? Math.round(((statusCounts["sent"] || 0) / totalAll) * 100) : 0}
              </span>
            </div>
          )}
        </div>

        {/* Failed */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-gray-500">Başarısız</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{(statusCounts["failed"] || 0).toLocaleString("tr-TR")}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
          </div>
          {totalAll > 0 && (
            <div className="mt-3 flex items-center gap-1.5">
              <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                <div
                  className="h-1.5 rounded-full bg-red-500 transition-all duration-500"
                  style={{ width: `${((statusCounts["failed"] || 0) / totalAll) * 100}%` }}
                />
              </div>
              <span className="text-[11px] font-medium text-gray-400">
                %{totalAll > 0 ? Math.round(((statusCounts["failed"] || 0) / totalAll) * 100) : 0}
              </span>
            </div>
          )}
        </div>

        {/* Bounced */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-gray-500">Bounced</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{(statusCounts["bounced"] || 0).toLocaleString("tr-TR")}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          {totalAll > 0 && (
            <div className="mt-3 flex items-center gap-1.5">
              <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                <div
                  className="h-1.5 rounded-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${((statusCounts["bounced"] || 0) / totalAll) * 100}%` }}
                />
              </div>
              <span className="text-[11px] font-medium text-gray-400">
                %{totalAll > 0 ? Math.round(((statusCounts["bounced"] || 0) / totalAll) * 100) : 0}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Filters + Search Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filter Pills */}
        <div className="inline-flex rounded-2xl bg-gray-100/80 p-1">
          {STATUS_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = status === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => { setStatus(opt.value); setPage(1); }}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
                {opt.value && statusCounts[opt.value] !== undefined && (
                  <span className={`ml-0.5 text-[11px] ${isActive ? "text-gray-500" : "text-gray-400"}`}>
                    {statusCounts[opt.value] || 0}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Alıcı e-posta, konu..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition-all placeholder:text-gray-400 focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 sm:w-72"
            />
          </div>
          <Button type="submit" size="sm" className="rounded-xl px-4 py-2.5">
            Ara
          </Button>
          {search && (
            <button
              onClick={() => { setSearch(""); setPage(1); }}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-[#7AC143]" />
            <p className="mt-3 text-sm text-gray-400">Yükleniyor...</p>
          </div>
        ) : logs.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50">
              <Mail className="h-8 w-8 text-gray-300" />
            </div>
            <p className="mt-4 text-sm font-medium text-gray-900">E-posta kaydı bulunamadı</p>
            <p className="mt-1 text-[13px] text-gray-500">
              {search || status
                ? "Filtrelerinizi değiştirmeyi deneyin."
                : "Henüz gönderilmiş e-posta bulunmuyor."}
            </p>
            {(search || status) && (
              <button
                onClick={() => { setSearch(""); setStatus(""); setPage(1); }}
                className="mt-4 text-sm font-medium text-[#7AC143] transition-colors hover:text-[#6AAF35]"
              >
                Filtreleri temizle
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50/80">
                  <tr>
                    <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Alıcı</th>
                    <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Konu</th>
                    <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Durum</th>
                    <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Hata</th>
                    <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Tarih</th>
                    <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      <span className="sr-only">İşlem</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => {
                    const statusInfo = STATUS_MAP[log.status] || { label: log.status, variant: "outline" as const, dotColor: "bg-gray-400" };
                    return (
                      <tr key={log.id} className="transition-colors hover:bg-gray-50/60">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                              <Mail className="h-3.5 w-3.5 text-gray-500" />
                            </div>
                            <span className="font-medium text-gray-900">{log.to}</span>
                          </div>
                        </td>
                        <td className="max-w-xs truncate px-5 py-3.5 text-gray-600">{log.subject}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block h-2 w-2 rounded-full ${statusInfo.dotColor}`} />
                            <span className="text-[13px] font-medium text-gray-700">{statusInfo.label}</span>
                          </div>
                        </td>
                        <td className="max-w-[200px] truncate px-5 py-3.5 text-[13px] text-red-500">
                          {log.error || <span className="text-gray-300">&mdash;</span>}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <div className="flex items-center gap-1.5 text-[13px] text-gray-500">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(log.sentAt).toLocaleString("tr-TR")}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); openEmailDetail(log.id); }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-[#7AC143]/10 hover:text-[#7AC143]"
                            title="İçeriği Görüntüle"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
                <p className="text-[13px] text-gray-500">
                  <span className="font-medium text-gray-700">{((page - 1) * limit) + 1}</span>
                  {" - "}
                  <span className="font-medium text-gray-700">{Math.min(page * limit, total)}</span>
                  {" / "}
                  <span>{total.toLocaleString("tr-TR")} kayıt</span>
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {pageNumbers.map((p, i) =>
                    p === "ellipsis" ? (
                      <span key={`ellipsis-${i}`} className="flex h-9 w-9 items-center justify-center text-sm text-gray-400">
                        ...
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                          page === p
                            ? "bg-[#1A1A1A] text-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Email Detail Modal */}
      {(viewLog || viewLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) { setViewLog(null); setViewLoading(false); } }}
        >
          <div
            className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
            style={{ maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7AC143]/10">
                  <Send className="h-5 w-5 text-[#7AC143]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">E-posta Detayı</h3>
                  {viewLog && (
                    <p className="text-[13px] text-gray-500">
                      {new Date(viewLog.sentAt).toLocaleString("tr-TR")}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setViewLog(null); setViewLoading(false); }}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {viewLoading && !viewLog ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-[#7AC143]" />
                <p className="mt-3 text-sm text-gray-400">Yükleniyor...</p>
              </div>
            ) : viewLog ? (
              <>
                {/* Meta Section */}
                <div className="mx-6 mt-5 space-y-3 rounded-xl bg-gray-50/80 p-4">
                  <div className="flex items-start gap-3">
                    <span className="w-20 shrink-0 text-[13px] font-medium text-gray-400">Alıcı</span>
                    <span className="text-[13px] font-medium text-gray-900">{viewLog.to}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-20 shrink-0 text-[13px] font-medium text-gray-400">Konu</span>
                    <span className="text-[13px] font-medium text-gray-900">{viewLog.subject}</span>
                  </div>
                  {viewLog.fromAddress && (
                    <div className="flex items-start gap-3">
                      <span className="w-20 shrink-0 text-[13px] font-medium text-gray-400">Gönderen</span>
                      <span className="text-[13px] text-gray-700">{viewLog.fromAddress}</span>
                    </div>
                  )}
                  {viewLog.templateName && (
                    <div className="flex items-start gap-3">
                      <span className="w-20 shrink-0 text-[13px] font-medium text-gray-400">Şablon</span>
                      <span className="text-[13px] text-gray-700">{viewLog.templateName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-[13px] font-medium text-gray-400">Durum</span>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-2 w-2 rounded-full ${STATUS_MAP[viewLog.status]?.dotColor || "bg-gray-400"}`} />
                      <Badge variant={STATUS_MAP[viewLog.status]?.variant || "outline"}>
                        {STATUS_MAP[viewLog.status]?.label || viewLog.status}
                      </Badge>
                    </div>
                  </div>
                  {viewLog.error && (
                    <div className="flex items-start gap-3">
                      <span className="w-20 shrink-0 text-[13px] font-medium text-gray-400">Hata</span>
                      <span className="text-[13px] text-red-600">{viewLog.error}</span>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto p-6 pt-4">
                  {viewLog.body ? (
                    <div className="overflow-hidden rounded-xl border border-gray-200">
                      <iframe
                        srcDoc={viewLog.body}
                        className="h-[400px] w-full border-0"
                        sandbox="allow-same-origin"
                        title="E-posta içeriği"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-14">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50">
                        <Mail className="h-6 w-6 text-gray-300" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-gray-500">İçerik kaydedilmemiş</p>
                      <p className="mt-1 text-[13px] text-gray-400">Bu özellik eklenmeden önce gönderilmiş e-postalar</p>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
