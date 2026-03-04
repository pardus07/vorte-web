"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Mail,
  MailOpen,
  Reply,
  Trash2,
  Clock,
  CheckCircle,
  Filter,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const FILTER_OPTIONS = [
  { value: "", label: "Tümü", icon: Filter },
  { value: "unread", label: "Okunmamış", icon: Mail },
  { value: "unreplied", label: "Yanıtlanmamış", icon: Clock },
];

interface MessageData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  read: boolean;
  replied: boolean;
  replyText: string | null;
  repliedAt: string | null;
  createdAt: string;
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");

  // Detail panel
  const [selected, setSelected] = useState<MessageData | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const limit = 20;

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    if (filter) params.set("filter", filter);

    try {
      const res = await fetch(`/api/admin/messages?${params}`);
      const data = await res.json();
      setMessages(data.messages || []);
      setTotal(data.total || 0);
      setUnreadCount(data.unreadCount || 0);
    } catch { /* silent */ }
    setLoading(false);
  }, [page, search, filter]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMessages();
  };

  const openMessage = async (msg: MessageData) => {
    setSelected(msg);
    setReplyText("");
    // Mark as read
    if (!msg.read) {
      try {
        await fetch(`/api/admin/messages/${msg.id}`);
        fetchMessages();
      } catch { /* silent */ }
    }
  };

  const handleReply = async () => {
    if (!selected || !replyText.trim()) return;
    setReplying(true);
    try {
      const res = await fetch(`/api/admin/messages/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyText }),
      });
      if (res.ok) {
        setReplyText("");
        setSelected(null);
        fetchMessages();
      }
    } catch { /* silent */ }
    setReplying(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu mesajı silmek istediğinizden emin misiniz?")) return;
    try {
      await fetch(`/api/admin/messages/${id}`, { method: "DELETE" });
      if (selected?.id === id) setSelected(null);
      fetchMessages();
    } catch { /* silent */ }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mesajlar</h1>
        <p className="mt-1 text-sm text-gray-500">
          {total} mesaj
          {unreadCount > 0 && <span className="ml-2 font-medium text-amber-600">· {unreadCount} okunmamış</span>}
        </p>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              onClick={() => { setFilter(opt.value); setPage(1); }}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                filter === opt.value
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
            placeholder="İsim, e-posta, konu..."
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

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        {/* Message List */}
        <div className="lg:col-span-2 overflow-hidden rounded-lg border bg-white">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
            </div>
          ) : (
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {messages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => openMessage(msg)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                    selected?.id === msg.id ? "bg-[#7AC143]/5 border-l-2 border-l-[#7AC143]" : ""
                  } ${!msg.read ? "bg-blue-50/50" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {msg.read ? <MailOpen className="h-4 w-4 text-gray-400" /> : <Mail className="h-4 w-4 text-blue-500" />}
                      <span className={`text-sm ${!msg.read ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                        {msg.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {msg.replied && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
                      <span className="text-xs text-gray-400">
                        {new Date(msg.createdAt).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 truncate">{msg.email}</p>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">{msg.message}</p>
                </button>
              ))}
              {messages.length === 0 && (
                <div className="py-12 text-center text-gray-400 text-sm">Mesaj yok</div>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-2">
              <span className="text-xs text-gray-500">{page}/{totalPages}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="p-1 disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="p-1 disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-3 rounded-lg border bg-white p-6">
          {selected ? (
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selected.subject || "İletişim Mesajı"}</h3>
                  <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                    <span className="font-medium text-gray-700">{selected.name}</span>
                    <a href={`mailto:${selected.email}`} className="text-[#7AC143] hover:underline">{selected.email}</a>
                    {selected.phone && <span>{selected.phone}</span>}
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(selected.createdAt).toLocaleString("tr-TR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selected.replied ? <Badge variant="success">Yanıtlandı</Badge> : <Badge variant="warning">Bekliyor</Badge>}
                  <button onClick={() => handleDelete(selected.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-6 rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.message}</p>
              </div>

              {selected.replied && selected.replyText && (
                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center gap-1.5 text-xs text-green-700 mb-2">
                    <Reply className="h-3.5 w-3.5" />
                    Yanıtınız · {selected.repliedAt && new Date(selected.repliedAt).toLocaleString("tr-TR")}
                  </div>
                  <p className="text-sm text-green-800 whitespace-pre-wrap">{selected.replyText}</p>
                </div>
              )}

              {!selected.replied && (
                <div className="mt-6">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    <Reply className="inline h-4 w-4 mr-1" /> Yanıtla
                  </label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                    placeholder="Yanıtınızı yazın..."
                  />
                  <div className="mt-2 flex justify-end">
                    <Button onClick={handleReply} disabled={!replyText.trim() || replying} size="sm">
                      <Send className="mr-1.5 h-4 w-4" />
                      {replying ? "Gönderiliyor..." : "Yanıt Gönder"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Mail className="h-12 w-12 mb-3" />
              <p>Bir mesaj seçin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
