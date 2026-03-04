"use client";

import { useCallback, useEffect, useState } from "react";
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

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: "Aktif", color: "bg-green-100 text-green-700" },
  admin_takeover: { label: "Admin", color: "bg-blue-100 text-blue-700" },
  closed: { label: "Kapalı", color: "bg-gray-100 text-gray-500" },
};

export default function AdminChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [stats, setStats] = useState<Stats>({ active: 0, adminTakeover: 0, closed: 0, totalMessages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

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
    if (!confirm("Bu sohbeti silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/admin/chat/${id}`, { method: "DELETE" });
    if (selectedId === id) {
      setSelectedId(null);
      setDetail(null);
    }
    fetchSessions();
  };

  const formatTime = (d: string) =>
    new Date(d).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Chat Monitör</h1>
        <p className="mt-1 text-sm text-gray-500">
          {stats.active} aktif · {stats.adminTakeover} admin · {stats.totalMessages} toplam mesaj
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-gray-500">Aktif</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-gray-500">Admin Müdahale</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{stats.adminTakeover}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-gray-500">Kapalı</p>
          <p className="mt-1 text-2xl font-bold text-gray-500">{stats.closed}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-gray-500">Toplam Mesaj</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalMessages}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {["all", "active", "admin_takeover", "closed"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm ${statusFilter === s ? "bg-[#7AC143] text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}
          >
            {s === "all" ? "Tümü" : STATUS_MAP[s]?.label || s}
          </button>
        ))}
      </div>

      {/* Split view */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5" style={{ minHeight: 500 }}>
        {/* Session list */}
        <div className="lg:col-span-2 space-y-2 overflow-y-auto" style={{ maxHeight: 600 }}>
          {sessions.map((s) => {
            const lastMsg = s.messages[0];
            const stCfg = STATUS_MAP[s.status] || STATUS_MAP.active;
            return (
              <div
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`cursor-pointer rounded-lg border p-3 transition hover:bg-gray-50 ${selectedId === s.id ? "border-[#7AC143] bg-[#7AC143]/5" : "bg-white"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">
                      {s.customerName || s.sessionToken.slice(0, 12) + "..."}
                    </span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${stCfg.color}`}>{stCfg.label}</span>
                </div>
                {s.customerEmail && <p className="mt-0.5 text-xs text-gray-400">{s.customerEmail}</p>}
                {lastMsg && (
                  <p className="mt-1 text-xs text-gray-500 truncate">{lastMsg.content}</p>
                )}
                <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400">
                  <span>{s._count.messages} mesaj</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {s.lastMessageAt ? formatTime(s.lastMessageAt) : formatTime(s.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}
          {!loading && sessions.length === 0 && (
            <div className="py-12 text-center text-gray-400">Henüz sohbet yok</div>
          )}
          {loading && <div className="py-10 text-center text-gray-400">Yükleniyor...</div>}
        </div>

        {/* Chat detail */}
        <div className="lg:col-span-3 rounded-lg border bg-white flex flex-col" style={{ minHeight: 500 }}>
          {!detail ? (
            <div className="flex flex-1 items-center justify-center text-gray-400">
              <div className="text-center">
                <Bot className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-2 text-sm">Sohbet seçin</p>
              </div>
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {detail.customerName || "Anonim Ziyaretçi"}
                  </p>
                  {detail.customerEmail && <p className="text-xs text-gray-400">{detail.customerEmail}</p>}
                </div>
                <div className="flex items-center gap-1">
                  {detail.status !== "admin_takeover" && (
                    <button
                      onClick={() => handleStatusChange(detail.id, "admin_takeover")}
                      className="rounded p-1.5 text-sm text-blue-500 hover:bg-blue-50"
                      title="Admin Müdahale"
                    >
                      <HandMetal className="h-4 w-4" />
                    </button>
                  )}
                  {detail.status === "admin_takeover" && (
                    <button
                      onClick={() => handleStatusChange(detail.id, "active")}
                      className="rounded p-1.5 text-sm text-green-500 hover:bg-green-50"
                      title="AI'ı Aç"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                  )}
                  {detail.status !== "closed" && (
                    <button
                      onClick={() => handleStatusChange(detail.id, "closed")}
                      className="rounded p-1.5 text-sm text-gray-400 hover:bg-gray-100"
                      title="Kapat"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(detail.id)}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {detail.messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`flex max-w-[80%] gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] ${
                        msg.role === "user" ? "bg-gray-200 text-gray-500" :
                        msg.role === "admin" ? "bg-blue-100 text-blue-600" :
                        "bg-[#7AC143]/10 text-[#7AC143]"
                      }`}>
                        {msg.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                      </div>
                      <div>
                        <div className={`rounded-lg px-3 py-2 text-sm ${
                          msg.role === "user" ? "bg-gray-100 text-gray-700" :
                          msg.role === "admin" ? "bg-blue-50 text-blue-800 border border-blue-100" :
                          "bg-[#7AC143]/5 text-gray-700 border border-[#7AC143]/10"
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <p className="mt-0.5 text-[10px] text-gray-400">
                          {msg.role === "admin" ? "Admin" : msg.role === "assistant" ? "AI" : "Müşteri"}
                          {" · "}{formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Admin reply */}
              {detail.status !== "closed" && (
                <div className="border-t px-4 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleReply()}
                      className="form-input flex-1 text-sm"
                      placeholder="Admin olarak yanıtla..."
                      disabled={sending}
                    />
                    <button
                      onClick={handleReply}
                      disabled={!replyText.trim() || sending}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
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
