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
  durationSeconds: number;
  topics: string[];
  summary: string | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  isRead: boolean;
  startedAt: string;
  createdAt: string;
  transcript: TranscriptMessage[] | null;
  notes: string | null;
  audioUrl: string | null;
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
    setAdminNote(call.notes || "");
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
        prev.map((c) => (c.id === selectedCall.id ? { ...c, notes: adminNote } : c))
      );
      setSelectedCall({ ...selectedCall, notes: adminNote });
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Sesli Aramalar
          </h1>
          <p className="mt-1 text-[13px] text-gray-500">
            {total} arama kaydı bulunuyor
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${kpi.bg}`}
                >
                  <Icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-[13px] text-gray-500">{kpi.label}</p>
                  <p className="text-xl font-bold tracking-tight text-gray-900">
                    {kpi.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters Section */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          {/* Date range */}
          <div className="flex items-center gap-2">
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                Başlangıç
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 focus:border-[#7AC143]"
              />
            </div>
            <span className="mt-6 text-sm text-gray-300">&mdash;</span>
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                Bitiş
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 focus:border-[#7AC143]"
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
                className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 focus:border-[#7AC143]"
              />
            </div>
            <Button type="submit" size="sm" className="rounded-xl">
              <Search className="mr-1 h-3.5 w-3.5" />
              Ara
            </Button>
          </form>

          {/* Status pill tabs */}
          <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setStatusFilter(opt.value);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  statusFilter === opt.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="rounded-xl text-gray-500 hover:text-gray-700"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Temizle
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
            <p className="mt-3 text-[13px] text-gray-400">Aramalar yükleniyor...</p>
          </div>
        ) : calls.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
              <Phone className="h-6 w-6 text-gray-300" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-gray-900">
              {hasFilters ? "Sonuç bulunamadı" : "Henüz arama yok"}
            </h3>
            <p className="mt-1 text-[13px] text-gray-500">
              {hasFilters
                ? "Filtreleri değiştirmeyi veya temizlemeyi deneyin."
                : "Sesli arama geldiğinde burada listelenecek."}
            </p>
            {hasFilters && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 rounded-xl"
                onClick={clearFilters}
              >
                Filtreleri Temizle
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50/80">
                  <tr>
                    <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Tarih / Saat
                    </th>
                    <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Arayan Numara
                    </th>
                    <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Süre
                    </th>
                    <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Konular
                    </th>
                    <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Durum
                    </th>
                    <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Özet
                    </th>
                    <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      İşlem
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {calls.map((call) => {
                    const statusInfo = STATUS_MAP[call.status] || {
                      label: call.status,
                      variant: "outline" as const,
                    };
                    return (
                      <tr
                        key={call.id}
                        className={`transition-colors hover:bg-gray-50/60 ${
                          !call.isRead
                            ? "border-l-2 border-[#7AC143] bg-[#7AC143]/5"
                            : "border-l-2 border-transparent"
                        }`}
                      >
                        <td className="whitespace-nowrap px-5 py-3.5 text-[13px] text-gray-600">
                          {formatDate(call.startedAt)}
                        </td>
                        <td className="px-5 py-3.5 text-[13px] font-medium text-gray-900">
                          {call.callerNumber}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-[13px] text-gray-500">
                          {call.status === "missed"
                            ? "—"
                            : formatDuration(call.durationSeconds)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {call.topics.map((topic) => (
                              <span
                                key={topic}
                                className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                  TOPIC_COLORS[topic.toLowerCase()] ||
                                  "bg-gray-100 text-gray-600 border-gray-200"
                                }`}
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={statusInfo.variant}>
                            {statusInfo.label}
                          </Badge>
                        </td>
                        <td className="max-w-[200px] truncate px-5 py-3.5 text-[13px] text-gray-500">
                          {call.summary || "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => openDetail(call)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Detay
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
                  Sayfa{" "}
                  <span className="font-medium text-gray-900">{page}</span> /{" "}
                  {totalPages} &middot; Toplam{" "}
                  <span className="font-medium text-gray-900">{total}</span>{" "}
                  arama
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page <= 1}
                    className="rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
                  >
                    İlk
                  </button>
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                    className="rounded-xl border border-gray-200 bg-white p-1.5 text-gray-600 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from(
                    { length: Math.min(totalPages, 5) },
                    (_, i) => {
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
                          className={`min-w-[36px] rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                            page === pageNum
                              ? "border-[#7AC143] bg-[#7AC143]/10 text-[#7AC143] shadow-sm"
                              : "border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                  )}
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                    className="rounded-xl border border-gray-200 bg-white p-1.5 text-gray-600 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page >= totalPages}
                    className="rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
                  >
                    Son
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Detail Modal ────────────────────────────────────────────────── */}
      {selectedCall && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4 pt-10"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDetail();
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-gray-900">
                  Arama Detayı
                </h2>
                <p className="mt-0.5 text-[13px] text-gray-500">
                  {selectedCall.callerNumber} &middot;{" "}
                  {formatDate(selectedCall.startedAt)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleReadStatus}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  title={
                    selectedCall.isRead
                      ? "Okunmadı işaretle"
                      : "Okundu işaretle"
                  }
                >
                  {selectedCall.isRead ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={closeDetail}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
              {/* Audio Player */}
              {selectedCall.status === "completed" && (
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={togglePlay}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#7AC143] text-white shadow-md transition-all hover:bg-[#6AAF35] hover:shadow-lg active:scale-95"
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="ml-0.5 h-4 w-4" />
                      )}
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
                    <div className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-[13px] font-medium text-gray-500 shadow-sm">
                      <Volume2 className="h-3.5 w-3.5" />
                      {formatDuration(selectedCall.durationSeconds)}
                    </div>
                  </div>
                </div>
              )}

              {/* Transcript */}
              {selectedCall.transcript &&
                selectedCall.transcript.length > 0 && (
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      <MessageSquare className="h-4 w-4" />
                      Transkript
                    </h3>
                    <div className="space-y-2.5 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                      {selectedCall.transcript.map((msg, i) => (
                        <div
                          key={i}
                          className={`flex ${
                            msg.role === "caller"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                              msg.role === "caller"
                                ? "rounded-br-md bg-[#7AC143]/10 text-gray-800"
                                : "rounded-bl-md bg-white text-gray-800 shadow-sm ring-1 ring-black/5"
                            }`}
                          >
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                              {msg.role === "assistant"
                                ? "Vorte Asistan"
                                : "Arayan"}
                            </p>
                            <p className="text-sm leading-relaxed">
                              {msg.text}
                            </p>
                            <p className="mt-1.5 text-right text-[10px] text-gray-400">
                              {msg.timestamp}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* AI Summary */}
              {selectedCall.summary && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-4">
                  <h3 className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-blue-700">
                    <FileText className="h-3.5 w-3.5" />
                    AI Özet
                  </h3>
                  <p className="text-sm leading-relaxed text-blue-800">
                    {selectedCall.summary}
                  </p>
                </div>
              )}

              {/* Topics & Sentiment */}
              {(selectedCall.topics.length > 0 || selectedCall.sentiment) && (
                <div className="flex flex-wrap items-center gap-4">
                  {/* Topics */}
                  {selectedCall.topics.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-gray-400" />
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCall.topics.map((topic) => (
                          <span
                            key={topic}
                            className={`inline-block rounded-full border px-2.5 py-1 text-xs font-medium ${
                              TOPIC_COLORS[topic.toLowerCase()] ||
                              "bg-gray-100 text-gray-600 border-gray-200"
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
                    <div className="flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1">
                      <span className="text-[12px] font-medium text-gray-500">
                        Duygu:
                      </span>
                      <span
                        className={`text-[13px] font-semibold ${
                          SENTIMENT_MAP[selectedCall.sentiment]?.color || ""
                        }`}
                      >
                        {SENTIMENT_MAP[selectedCall.sentiment]?.emoji}{" "}
                        {SENTIMENT_MAP[selectedCall.sentiment]?.label}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Admin Note */}
              <div>
                <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Admin Notu
                </h3>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Bu arama hakkında not ekleyin..."
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 focus:border-[#7AC143]"
                />
                <div className="mt-2.5 flex justify-end">
                  <Button
                    size="sm"
                    onClick={saveNote}
                    loading={savingNote}
                    className="rounded-xl"
                  >
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
