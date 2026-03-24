"use client";

import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const STATUS_OPTIONS = [
  { value: "", label: "Tümü", icon: Filter },
  { value: "sent", label: "Gönderildi", icon: CheckCircle },
  { value: "failed", label: "Başarısız", icon: XCircle },
  { value: "bounced", label: "Bounced", icon: AlertTriangle },
];

const STATUS_MAP: Record<string, { label: string; variant: "success" | "discount" | "warning" | "outline" }> = {
  sent: { label: "Gönderildi", variant: "success" },
  failed: { label: "Başarısız", variant: "discount" },
  bounced: { label: "Bounced", variant: "warning" },
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
    // Find from current logs first for instant display
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
        // API failed but we have basic data, show it
        setViewLog(existing);
      }
    } catch {
      // API failed, keep existing if available
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

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">E-posta Günlüğü</h1>
        <p className="mt-1 text-sm text-gray-500">{totalAll} e-posta kaydı</p>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 text-center">
          <CheckCircle className="mx-auto h-6 w-6 text-green-500" />
          <p className="mt-2 text-2xl font-bold text-green-600">{statusCounts["sent"] || 0}</p>
          <p className="text-sm text-gray-500">Gönderildi</p>
        </div>
        <div className="rounded-lg border bg-white p-4 text-center">
          <XCircle className="mx-auto h-6 w-6 text-red-500" />
          <p className="mt-2 text-2xl font-bold text-red-600">{statusCounts["failed"] || 0}</p>
          <p className="text-sm text-gray-500">Başarısız</p>
        </div>
        <div className="rounded-lg border bg-white p-4 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-amber-500" />
          <p className="mt-2 text-2xl font-bold text-amber-600">{statusCounts["bounced"] || 0}</p>
          <p className="text-sm text-gray-500">Bounced</p>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => {
          const Icon = opt.icon;
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
            </button>
          );
        })}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Alıcı e-posta, konu..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
          />
        </div>
        <Button type="submit" size="sm">Ara</Button>
        {search && (
          <Button variant="outline" size="sm" onClick={() => { setSearch(""); setPage(1); }}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </form>

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
                <th className="px-4 py-3 font-medium text-gray-700">Alıcı</th>
                <th className="px-4 py-3 font-medium text-gray-700">Konu</th>
                <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
                <th className="px-4 py-3 font-medium text-gray-700">Hata</th>
                <th className="px-4 py-3 font-medium text-gray-700">Tarih</th>
                <th className="px-4 py-3 font-medium text-gray-700">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => {
                const statusInfo = STATUS_MAP[log.status] || { label: log.status, variant: "outline" as const };
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">{log.to}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{log.subject}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-red-500 max-w-xs truncate">{log.error || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(log.sentAt).toLocaleString("tr-TR")}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); openEmailDetail(log.id); }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#7AC143] transition-colors"
                        title="İçeriği Görüntüle"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    E-posta kaydı yok
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
          <p className="text-sm text-gray-500">Sayfa {page} / {totalPages}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="rounded-lg border p-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="rounded-lg border p-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {/* Email Detail Modal */}
      {(viewLog || viewLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) { setViewLog(null); setViewLoading(false); } }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#7AC143]/10 rounded-lg">
                  <Mail className="h-5 w-5 text-[#7AC143]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1A1A1A]">E-posta İçeriği</h3>
                  {viewLog && (
                    <p className="text-xs text-gray-500">{new Date(viewLog.sentAt).toLocaleString("tr-TR")}</p>
                  )}
                </div>
              </div>
              <button onClick={() => setViewLog(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {viewLoading ? (
              <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7AC143]" />
              </div>
            ) : viewLog ? (
              <>
                {/* Meta */}
                <div className="px-5 py-3 bg-gray-50 text-sm space-y-1 border-b">
                  <div className="flex gap-2"><span className="text-gray-500 w-16">Alıcı:</span><span className="font-medium">{viewLog.to}</span></div>
                  <div className="flex gap-2"><span className="text-gray-500 w-16">Konu:</span><span className="font-medium">{viewLog.subject}</span></div>
                  {viewLog.fromAddress && (
                    <div className="flex gap-2"><span className="text-gray-500 w-16">Gönderen:</span><span>{viewLog.fromAddress}</span></div>
                  )}
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-16">Durum:</span>
                    <Badge variant={STATUS_MAP[viewLog.status]?.variant || "outline"}>
                      {STATUS_MAP[viewLog.status]?.label || viewLog.status}
                    </Badge>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto p-1">
                  {viewLog.body ? (
                    <iframe
                      srcDoc={viewLog.body}
                      className="w-full h-[500px] border-0"
                      sandbox="allow-same-origin"
                      title="E-posta içeriği"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                      <Mail className="h-12 w-12 mb-3 opacity-30" />
                      <p className="text-sm">İçerik kaydedilmemiş</p>
                      <p className="text-xs mt-1">Bu özellik eklenmeden önce gönderilmiş e-postalar</p>
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
