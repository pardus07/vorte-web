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
  Inbox,
  MessageSquare,
  User,
  Phone,
  Calendar,
  ArrowRight,
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Mesajlar</h1>
        <p className="mt-1 text-[13px] text-gray-500">
          Toplam {total} mesaj
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-600">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {unreadCount} okunmamış
            </span>
          )}
        </p>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = filter === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => { setFilter(opt.value); setPage(1); }}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-[13px] transition-all ${
                  isActive
                    ? "border-[#7AC143] bg-[#7AC143]/10 font-medium text-[#7AC143] shadow-sm"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Isim, e-posta, konu..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 sm:w-64"
            />
          </div>
          <Button type="submit" size="sm" className="rounded-xl px-4">
            Ara
          </Button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); setPage(1); }}
              className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2.5 text-gray-400 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
      </div>

      {/* Main Content - List + Detail */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Message List Panel */}
        <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-[#7AC143]" />
              <p className="text-[13px] text-gray-400">Mesajlar yükleniyor...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
                <Inbox className="h-7 w-7 text-gray-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-500">Mesaj bulunamadı</p>
                <p className="mt-0.5 text-[13px] text-gray-400">
                  {search ? "Arama kriterlerine uygun mesaj yok" : "Henüz bir mesaj gelmemiş"}
                </p>
              </div>
            </div>
          ) : (
            <div className="max-h-[640px] divide-y divide-gray-100 overflow-y-auto">
              {messages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => openMessage(msg)}
                  className={`group w-full text-left px-4 py-3.5 transition-colors hover:bg-gray-50/50 ${
                    selected?.id === msg.id
                      ? "border-l-3 border-l-[#7AC143] bg-[#7AC143]/5"
                      : "border-l-3 border-l-transparent"
                  } ${!msg.read && selected?.id !== msg.id ? "bg-blue-50/40" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {msg.read ? (
                        <MailOpen className="h-4 w-4 shrink-0 text-gray-400" />
                      ) : (
                        <div className="relative shrink-0">
                          <Mail className="h-4 w-4 text-blue-500" />
                          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-white bg-blue-500" />
                        </div>
                      )}
                      <span
                        className={`truncate text-sm ${
                          !msg.read ? "font-semibold text-gray-900" : "text-gray-700"
                        }`}
                      >
                        {msg.name}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {msg.replied && (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      )}
                      <span className="text-[11px] text-gray-400">
                        {new Date(msg.createdAt).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 truncate pl-[26px] text-[12px] text-gray-400">{msg.email}</p>
                  {msg.subject && (
                    <p className="mt-1 truncate pl-[26px] text-[13px] font-medium text-gray-600">
                      {msg.subject}
                    </p>
                  )}
                  <p className="mt-0.5 line-clamp-2 pl-[26px] text-[13px] leading-relaxed text-gray-500">
                    {msg.message}
                  </p>
                  {/* Hover hint */}
                  <div className="mt-1.5 flex items-center gap-1 pl-[26px] text-[11px] text-gray-300 opacity-0 transition-opacity group-hover:opacity-100">
                    <ArrowRight className="h-3 w-3" />
                    Detayları görüntüle
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
              <span className="text-[13px] text-gray-500">
                Sayfa <span className="font-medium text-gray-700">{page}</span> / {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Message Detail Panel */}
        <div className="lg:col-span-3 rounded-2xl border border-gray-100 bg-white shadow-sm">
          {selected ? (
            <div className="p-6">
              {/* Detail Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold tracking-tight text-gray-900">
                    {selected.subject || "Iletisim Mesaji"}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <span className="flex items-center gap-1.5 text-sm text-gray-700">
                      <User className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-medium">{selected.name}</span>
                    </span>
                    <a
                      href={`mailto:${selected.email}`}
                      className="flex items-center gap-1.5 text-sm text-[#7AC143] transition-colors hover:text-[#68a938] hover:underline"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {selected.email}
                    </a>
                    {selected.phone && (
                      <span className="flex items-center gap-1.5 text-sm text-gray-500">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        {selected.phone}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-gray-400">
                    <Calendar className="h-3 w-3" />
                    {new Date(selected.createdAt).toLocaleString("tr-TR")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {selected.replied ? (
                    <Badge variant="success">Yanitlandi</Badge>
                  ) : (
                    <Badge variant="warning">Bekliyor</Badge>
                  )}
                  <button
                    onClick={() => handleDelete(selected.id)}
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Mesaji sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="my-5 border-t border-gray-100" />

              {/* Message Body */}
              <div className="rounded-xl bg-gray-50 p-5">
                <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                  {selected.message}
                </p>
              </div>

              {/* Reply Display */}
              {selected.replied && selected.replyText && (
                <div className="mt-4 rounded-xl border border-green-200 bg-green-50/50 p-5">
                  <div className="mb-3 flex items-center gap-2 text-[12px] font-medium text-green-700">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                      <Reply className="h-3 w-3" />
                    </div>
                    Yanitiniz
                    {selected.repliedAt && (
                      <span className="font-normal text-green-600">
                        &middot; {new Date(selected.repliedAt).toLocaleString("tr-TR")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-green-800 whitespace-pre-wrap">
                    {selected.replyText}
                  </p>
                </div>
              )}

              {/* Reply Form */}
              {!selected.replied && (
                <div className="mt-6">
                  <label className="mb-2.5 flex items-center gap-2 text-sm font-medium text-gray-700">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#7AC143]/10">
                      <Reply className="h-3.5 w-3.5 text-[#7AC143]" />
                    </div>
                    Yanit Yaz
                  </label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed shadow-sm transition-colors placeholder:text-gray-400 focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                    placeholder="Yanitinizi yazin..."
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[12px] text-gray-400">
                      Yanit, musterinin e-posta adresine gonderilecektir.
                    </p>
                    <Button
                      onClick={handleReply}
                      disabled={!replyText.trim() || replying}
                      size="sm"
                      className="rounded-xl px-5"
                    >
                      <Send className="mr-1.5 h-4 w-4" />
                      {replying ? "Gonderiliyor..." : "Yanit Gonder"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Empty State - No Message Selected */
            <div className="flex flex-col items-center justify-center py-24">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gray-50">
                <MessageSquare className="h-10 w-10 text-gray-300" />
              </div>
              <h3 className="mt-5 text-base font-medium text-gray-500">
                Mesaj secilmedi
              </h3>
              <p className="mt-1 max-w-[260px] text-center text-[13px] leading-relaxed text-gray-400">
                Detaylarini goruntulemek icin sol panelden bir mesaj secin
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
