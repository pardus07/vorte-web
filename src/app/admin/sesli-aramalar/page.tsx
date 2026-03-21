"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Phone,
  Clock,
  Timer,
  PhoneMissed,
  Play,
  Pause,
  MessageSquare,
  Tag,
  Eye,
  EyeOff,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

// ── Types ──────────────────────────────────────────────────────────────────

interface VoiceCall {
  id: string;
  callerNumber: string;
  status: "completed" | "missed" | "failed";
  duration: number; // seconds
  topics: string[];
  summary: string;
  sentiment: "positive" | "neutral" | "negative";
  isRead: boolean;
  createdAt: string;
  transcript: TranscriptMessage[];
  adminNote: string;
  audioUrl: string;
}

interface TranscriptMessage {
  role: "assistant" | "caller";
  text: string;
  timestamp: string;
}

interface CallsResponse {
  calls: VoiceCall[];
  total: number;
  stats: {
    todayCalls: number;
    totalDuration: number;
    avgDuration: number;
    missedCalls: number;
  };
}

// ── Constants ──────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "", label: "Tümü" },
  { value: "completed", label: "Tamamlandı" },
  { value: "missed", label: "Cevapsız" },
  { value: "failed", label: "Başarısız" },
];

const STATUS_MAP: Record<string, { label: string; variant: "success" | "discount" | "outline" }> = {
  completed: { label: "Tamamlandı", variant: "success" },
  missed: { label: "Cevapsız", variant: "discount" },
  failed: { label: "Başarısız", variant: "outline" },
};

const TOPIC_COLORS: Record<string, string> = {
  bayilik: "bg-green-100 text-green-700 border-green-200",
  "ürün": "bg-blue-100 text-blue-700 border-blue-200",
  fiyat: "bg-orange-100 text-orange-700 border-orange-200",
  sipariş: "bg-purple-100 text-purple-700 border-purple-200",
  iade: "bg-red-100 text-red-700 border-red-200",
};

const SENTIMENT_MAP: Record<string, { emoji: string; label: string; color: string }> = {
  positive: { emoji: "\ud83d\ude0a", label: "Pozitif", color: "text-green-600" },
  neutral: { emoji: "\ud83d\ude10", label: "Nötr", color: "text-gray-600" },
  negative: { emoji: "\ud83d\ude1f", label: "Negatif", color: "text-red-600" },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}dk ${s}sn`;
  return `${s}sn`;
}

function formatDurationLong(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}sa ${m}dk`;
  return `${m}dk`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} ${hours}:${mins}`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminVoiceCallsPage() {
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ todayCalls: 0, totalDuration: 0, avgDuration: 0, missedCalls: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Detail modal
  const [selectedCall, setSelectedCall] = useState<VoiceCall | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const limit = 20;

  // ── Fetch calls ──

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);

    try {
      const res = await fetch(`/api/admin/voice-calls?${params}`);
      if (!res.ok) throw new Error("Fetch failed");
      const data: CallsResponse = await res.json();
      setCalls(data.calls || []);
      setTotal(data.total || 0);
      setStats(data.stats || { todayCalls: 0, totalDuration: 0, avgDuration: 0, missedCalls: 0 });
    } catch {
      setError("Sesli aramalar yüklenemedi");
    }
    setLoading(false);
  }, [page, dateFrom, dateTo, search, statusFilter]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  // ── Handlers ──

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCalls();
  };

  const clearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("");
    setPage(1);
  };

  const openDetail = (call: VoiceCall) => {
    setSelectedCall(call);
    setAdminNote(call.adminNote || "");
    setIsPlaying(false);

    // Mark as read
    if (!call.isRead) {
      setCalls((prev) => prev.map((c) => (c.id === call.id ? { ...c, isRead: true } : c)));
      fetch(`/api/admin/voice-calls/${call.id}/read`, { method: "POST" }).catch(() => {});
    }
  };

  const closeDetail = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setSelectedCall(null);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const saveNote = async () => {
    if (!selectedCall) return;
    setSavingNote(true);
    try {
      await fetch(`/api/admin/voice-calls/${selectedCall.id}/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: adminNote }),
      });
      setCalls((prev) =>
        prev.map((c) => (c.id === selectedCall.id ? { ...c, adminNote } : c))
      );
      setSelectedCall({ ...selectedCall, adminNote });
    } catch {
      // silent
    }
    setSavingNote(false);
  };

  const toggleReadStatus = async () => {
    if (!selectedCall) return;
    const newStatus = !selectedCall.isRead;
    setSelectedCall({ ...selectedCall, isRead: newStatus });
    setCalls((prev) =>
      prev.map((c) => (c.id === selectedCall.id ? { ...c, isRead: newStatus } : c))
    );
    try {
      await fetch(`/api/admin/voice-calls/${selectedCall.id}/${newStatus ? "read" : "unread"}`, {
        method: "POST",
      });
    } catch {
      // revert
      setSelectedCall({ ...selectedCall, isRead: !newStatus });
      setCalls((prev) =>
        prev.map((c) => (c.id === selectedCall.id ? { ...c, isRead: !newStatus } : c))
      );
    }
  };

  const totalPages = Math.ceil(total / limit);
  const hasFilters = search || dateFrom || dateTo || statusFilter;

  // ── KPI Cards ──

  const kpiCards = [
    {
      label: "Bugünkü Aramalar",
      value: stats.todayCalls,
      icon: Phone,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Toplam Konuşma Süresi",
      value: formatDurationLong(stats.totalDuration),
      icon: Clock,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Ortalama Süre",
      value: formatDuration(stats.avgDuration),
      icon: Timer,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Cevapsız Aramalar",
      value: stats.missedCalls,
      icon: PhoneMissed,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  // ── Render ──

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sesli Aramalar</h1>
          <p className="mt-1 text-sm text-gray-500">{total} arama kaydı</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* KPI Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-lg border bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2.5 ${kpi.bg}`}>
                  <Icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{kpi.label}</p>
                  <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-end">
        {/* Date range */}
        <div className="flex items-center gap-2">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Başlangıç</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
            />
          </div>
          <span className="mt-5 text-sm text-gray-400">&mdash;</span>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Bitiş</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
            />
          </div>
        </div>

        {/* Number search */}
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Numara ara..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
            />
          </div>
          <Button type="submit" size="sm">
            <Search className="mr-1 h-3.5 w-3.5" />
            Ara
          </Button>
        </form>

        {/* Status dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Clear filters */}
        {hasFilters && (
          <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-3.5 w-3.5" />
            Temizle
          </Button>
        )}
      </div>

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
                <th className="px-4 py-3 font-medium text-gray-700">Tarih/Saat</th>
                <th className="px-4 py-3 font-medium text-gray-700">Arayan Numara</th>
                <th className="px-4 py-3 font-medium text-gray-700">Süre</th>
                <th className="px-4 py-3 font-medium text-gray-700">Konular</th>
                <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
                <th className="px-4 py-3 font-medium text-gray-700">Özet</th>
                <th className="px-4 py-3 font-medium text-gray-700">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {calls.map((call) => {
                const statusInfo = STATUS_MAP[call.status] || { label: call.status, variant: "outline" as const };
                return (
                  <tr
                    key={call.id}
                    className={`hover:bg-gray-50 ${!call.isRead ? "bg-[#7AC143]/5" : ""}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {formatDate(call.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {call.callerNumber}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {call.status === "missed" ? "—" : formatDuration(call.duration)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {call.topics.map((topic) => (
                          <span
                            key={topic}
                            className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                              TOPIC_COLORS[topic.toLowerCase()] || "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-sm text-gray-500">
                      {call.summary || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openDetail(call)}
                        className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Detay
                      </button>
                    </td>
                  </tr>
                );
              })}
              {calls.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    {hasFilters ? "Filtreyle eşleşen arama bulunamadı" : "Henüz sesli arama kaydı yok"}
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
            Sayfa {page} / {totalPages} &middot; Toplam {total} arama
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(page - 1)}
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
                  onClick={() => setPage(pageNum)}
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
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg border p-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Detail Modal ────────────────────────────────────────────────── */}
      {selectedCall && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Arama Detayı</h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  {selectedCall.callerNumber} &middot; {formatDate(selectedCall.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleReadStatus}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  title={selectedCall.isRead ? "Okunmadı işaretle" : "Okundu işaretle"}
                >
                  {selectedCall.isRead ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={closeDetail}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-4 space-y-5">
              {/* Audio Player */}
              {selectedCall.status === "completed" && (
                <div className="rounded-lg border bg-gray-50 p-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlay}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7AC143] text-white transition-colors hover:bg-[#6AAF35]"
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
                    </button>
                    <div className="flex-1">
                      <audio
                        ref={audioRef}
                        src={`/api/admin/voice-calls/${selectedCall.id}/audio`}
                        onEnded={() => setIsPlaying(false)}
                        onPause={() => setIsPlaying(false)}
                        onPlay={() => setIsPlaying(true)}
                        controls
                        className="w-full"
                      />
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Volume2 className="h-4 w-4" />
                      {formatDuration(selectedCall.duration)}
                    </div>
                  </div>
                </div>
              )}

              {/* Transcript */}
              {selectedCall.transcript && selectedCall.transcript.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <MessageSquare className="h-4 w-4" />
                    Transkript
                  </h3>
                  <div className="space-y-2 rounded-lg border bg-gray-50 p-4">
                    {selectedCall.transcript.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === "caller" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                            msg.role === "caller"
                              ? "rounded-br-md bg-[#7AC143]/15 text-gray-800"
                              : "rounded-bl-md bg-white text-gray-800 shadow-sm"
                          }`}
                        >
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                            {msg.role === "assistant" ? "\ud83e\udd16 Vorte Asistan" : "\ud83d\udcde Arayan"}
                          </p>
                          <p className="text-sm leading-relaxed">{msg.text}</p>
                          <p className="mt-1 text-right text-[10px] text-gray-400">{msg.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Summary */}
              {selectedCall.summary && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h3 className="mb-1 text-sm font-semibold text-blue-800">AI Özet</h3>
                  <p className="text-sm leading-relaxed text-blue-700">{selectedCall.summary}</p>
                </div>
              )}

              {/* Topics & Sentiment */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Topics */}
                {selectedCall.topics.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <div className="flex flex-wrap gap-1">
                      {selectedCall.topics.map((topic) => (
                        <span
                          key={topic}
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            TOPIC_COLORS[topic.toLowerCase()] || "bg-gray-100 text-gray-600 border-gray-200"
                          }`}
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sentiment */}
                {selectedCall.sentiment && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-gray-500">Duygu:</span>
                    <span className={`text-sm font-medium ${SENTIMENT_MAP[selectedCall.sentiment]?.color || ""}`}>
                      {SENTIMENT_MAP[selectedCall.sentiment]?.emoji}{" "}
                      {SENTIMENT_MAP[selectedCall.sentiment]?.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Admin Note */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">Admin Notu</h3>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Bu arama hakkında not ekleyin..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                />
                <div className="mt-2 flex justify-end">
                  <Button size="sm" onClick={saveNote} loading={savingNote}>
                    Notu Kaydet
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
