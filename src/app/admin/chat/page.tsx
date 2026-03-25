"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  MessageCircle,
  User,
  Send,
  Trash2,
  HandMetal,
  Play,
  X,
  Clock,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────

interface ChatSession {
  id: string;
  sessionToken: string;
  customerName: string | null;
  customerEmail: string | null;
  status: string;
  aiEnabled: boolean;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  _count: { messages: number };
  messages: { content: string; role: string; createdAt: string }[];
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface SessionDetail {
  id: string;
  sessionToken: string;
  customerName: string | null;
  customerEmail: string | null;
  status: string;
  aiEnabled: boolean;
  messages: ChatMessage[];
}

interface Stats {
  active: number;
  adminTakeover: number;
  closed: number;
  totalMessages: number;
}

// ── Constants ───────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: "Aktif", color: "bg-green-100 text-green-700" },
  admin_takeover: { label: "Admin", color: "bg-blue-100 text-blue-700" },
  closed: { label: "Kapal\u0131", color: "bg-gray-100 text-gray-500" },
};

const STATUS_DOT: Record<string, string> = {
  active: "bg-green-500",
  admin_takeover: "bg-blue-500",
  closed: "bg-gray-400",
};

const FILTER_TABS = [
  { value: "all", label: "T\u00fcm\u00fc" },
  { value: "active", label: "Aktif" },
  { value: "admin_takeover", label: "Admin" },
  { value: "closed", label: "Kapal\u0131" },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── Component ───────────────────────────────────────────────────────────────

export default function AdminChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [stats, setStats] = useState<Stats>({ active: 0, adminTakeover: 0, closed: 0, totalMessages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    const res = await fetch(`/api/admin/chat?${params}`);
    if (res.ok) {
      const data = await res.json();
      setSessions(data.sessions);
      setStats(data.stats);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const fetchDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/chat/${id}`);
    if (res.ok) {
      const data = await res.json();
      setDetail(data);
    }
  }, []);

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId);
  }, [selectedId, fetchDetail]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.messages]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleReply = async () => {
    if (!replyText.trim() || !selectedId) return;
    setSending(true);
    const res = await fetch(`/api/admin/chat/${selectedId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: replyText }),
    });
    if (res.ok) {
      setReplyText("");
      fetchDetail(selectedId);
      fetchSessions();
    }
    setSending(false);
  };

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/admin/chat/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchSessions();
    if (selectedId === id) fetchDetail(id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu sohbeti silmek istedi\u011finize emin misiniz?")) return;
    await fetch(`/api/admin/chat/${id}`, { method: "DELETE" });
    if (selectedId === id) {
      setSelectedId(null);
      setDetail(null);
    }
    fetchSessions();
  };

  const formatTime = (d: string) =>
    new Date(d).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  // ── Skeleton loader ───────────────────────────────────────────────────────

  const SessionSkeleton = () => (
    <div className="animate-pulse space-y-0">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="border-b border-gray-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gray-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-28 rounded bg-gray-100" />
              <div className="h-3 w-40 rounded bg-gray-50" />
            </div>
            <div className="h-2 w-2 rounded-full bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
          <Bot className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Chat Monit\u00f6r
          </h1>
          <p className="text-[13px] text-gray-500">
            Canl\u0131 sohbetleri izleyin, admin olarak m\u00fcdahale edin
          </p>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Active */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-gray-500">Aktif</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <MessageCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        {/* Admin Takeover */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-gray-500">Admin M\u00fcdahale</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.adminTakeover}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <HandMetal className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Closed */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-gray-500">Kapal\u0131</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.closed}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50">
              <X className="h-5 w-5 text-gray-500" />
            </div>
          </div>
        </div>

        {/* Total Messages */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-gray-500">Toplam Mesaj</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalMessages}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
              <Send className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter tabs ────────────────────────────────────────────────────── */}
      <div className="inline-flex rounded-2xl bg-gray-100/80 p-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`rounded-xl px-4 py-1.5 text-[13px] font-medium transition-all ${
              statusFilter === tab.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Split view ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12" style={{ minHeight: 560 }}>
        {/* ── Session list panel ────────────────────────────────────────────── */}
        <div className="lg:col-span-4 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden flex flex-col">
          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Sohbetler</h2>
            <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
              {sessions.length}
            </span>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: 504 }}>
            {loading ? (
              <SessionSkeleton />
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50">
                  <MessageCircle className="h-6 w-6 text-gray-300" />
                </div>
                <p className="mt-3 text-sm font-medium text-gray-400">Hen\u00fcz sohbet yok</p>
                <p className="mt-1 text-[12px] text-gray-300">Yeni sohbetler burada g\u00f6r\u00fcnecek</p>
              </div>
            ) : (
              sessions.map((s) => {
                const lastMsg = s.messages[0];
                const isSelected = selectedId === s.id;
                const dotColor = STATUS_DOT[s.status] || STATUS_DOT.active;

                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`cursor-pointer border-b border-gray-50 px-4 py-3 transition-colors hover:bg-gray-50 ${
                      isSelected
                        ? "bg-[#7AC143]/5 border-l-2 border-l-[#7AC143]"
                        : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
                        <span className="text-[11px] font-semibold text-gray-500">
                          {getInitials(s.customerName)}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13px] font-medium text-gray-900">
                            {s.customerName || s.sessionToken.slice(0, 12) + "..."}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                          </div>
                        </div>

                        {s.customerEmail && (
                          <p className="mt-0.5 text-[11px] text-gray-400">{s.customerEmail}</p>
                        )}

                        {lastMsg && (
                          <p className="mt-1 truncate text-[12px] text-gray-500 leading-relaxed">
                            {lastMsg.content}
                          </p>
                        )}

                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-[11px] text-gray-400">
                            {s._count.messages} mesaj
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            <Clock className="h-3 w-3" />
                            {s.lastMessageAt ? formatTime(s.lastMessageAt) : formatTime(s.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Chat detail panel ────────────────────────────────────────────── */}
        <div className="lg:col-span-8 rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col overflow-hidden">
          {!detail ? (
            /* ── Empty state ──────────────────────────────────────────────── */
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50">
                  <Bot className="h-8 w-8 text-gray-300" />
                </div>
                <p className="mt-4 text-sm font-medium text-gray-400">
                  Sohbet se\u00e7in
                </p>
                <p className="mt-1 text-[12px] text-gray-300">
                  Soldaki listeden bir sohbet se\u00e7erek detaylar\u0131 g\u00f6r\u00fcn
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* ── Detail header ──────────────────────────────────────────── */}
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">
                    <span className="text-[12px] font-semibold text-gray-500">
                      {getInitials(detail.customerName)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {detail.customerName || "Anonim Ziyaret\u00e7i"}
                    </p>
                    {detail.customerEmail && (
                      <p className="text-[12px] text-gray-400">{detail.customerEmail}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Status badge */}
                  <span
                    className={`mr-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium ${
                      STATUS_MAP[detail.status]?.color || STATUS_MAP.active.color
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        STATUS_DOT[detail.status] || STATUS_DOT.active
                      }`}
                    />
                    {STATUS_MAP[detail.status]?.label || "Aktif"}
                  </span>

                  {/* Admin takeover */}
                  {detail.status !== "admin_takeover" && (
                    <button
                      onClick={() => handleStatusChange(detail.id, "admin_takeover")}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-blue-500 transition-colors hover:bg-blue-50"
                      title="Admin M\u00fcdahale"
                    >
                      <HandMetal className="h-4 w-4" />
                    </button>
                  )}

                  {/* Resume AI */}
                  {detail.status === "admin_takeover" && (
                    <button
                      onClick={() => handleStatusChange(detail.id, "active")}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-green-500 transition-colors hover:bg-green-50"
                      title="AI'\u0131 A\u00e7"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                  )}

                  {/* Close */}
                  {detail.status !== "closed" && (
                    <button
                      onClick={() => handleStatusChange(detail.id, "closed")}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100"
                      title="Kapat"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(detail.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* ── Messages ───────────────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto bg-gray-50/40 px-5 py-4 space-y-4">
                {detail.messages.map((msg) => {
                  const isUser = msg.role === "user";
                  const isAdmin = msg.role === "admin";

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`flex max-w-[75%] gap-2.5 ${
                          isUser ? "flex-row-reverse" : ""
                        }`}
                      >
                        {/* Avatar */}
                        <div
                          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl ${
                            isUser
                              ? "bg-gray-200"
                              : isAdmin
                              ? "bg-blue-100"
                              : "bg-[#7AC143]/10"
                          }`}
                        >
                          {isUser ? (
                            <User className="h-3.5 w-3.5 text-gray-500" />
                          ) : isAdmin ? (
                            <HandMetal className="h-3.5 w-3.5 text-blue-600" />
                          ) : (
                            <Bot className="h-3.5 w-3.5 text-[#7AC143]" />
                          )}
                        </div>

                        {/* Bubble */}
                        <div>
                          <div
                            className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                              isUser
                                ? "bg-gray-900 text-white"
                                : isAdmin
                                ? "bg-blue-50 text-blue-900 border border-blue-100"
                                : "bg-white text-gray-700 border border-gray-100 shadow-sm"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <p className="mt-1 px-1 text-[10px] text-gray-400">
                            {isAdmin ? "Admin" : isUser ? "M\u00fc\u015fteri" : "AI"}
                            {" \u00b7 "}
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* ── Admin reply input ──────────────────────────────────────── */}
              {detail.status !== "closed" && (
                <div className="border-t border-gray-100 bg-white px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleReply()}
                      className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[13px] text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-[#7AC143] focus:bg-white focus:ring-1 focus:ring-[#7AC143]/20"
                      placeholder="Admin olarak yan\u0131tla..."
                      disabled={sending}
                    />
                    <button
                      onClick={handleReply}
                      disabled={!replyText.trim() || sending}
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#7AC143] text-white shadow-sm transition-all hover:bg-[#6aad36] disabled:opacity-40 disabled:shadow-none"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
