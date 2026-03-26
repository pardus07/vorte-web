"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  MapPin,
  Phone,
  Mail,
  Globe,
  User,
  Building2,
  Fuel,
  ShoppingBag,
  Hotel,
  Briefcase,
  Send,
  Eye,
  MousePointerClick,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  Trash2,
  BarChart3,
  Sparkles,
  Users,
  MailCheck,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────

type TabKey = "discover" | "customers" | "outreach";
type ProspectCategory = "GAS_STATION" | "MARKET_CHAIN" | "RETAIL_STORE" | "HOTEL" | "CORPORATE";
type ProspectStatus = "NEW" | "CONTACTED" | "OPENED" | "CLICKED" | "INTERESTED" | "SAMPLE_SENT" | "CONVERTED" | "REJECTED";

interface Prospect {
  id: string;
  name: string;
  category: ProspectCategory;
  brand: string | null;
  city: string;
  district: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  contactName: string | null;
  contactTitle: string | null;
  status: ProspectStatus;
  notes: string | null;
  source: string | null;
  createdAt: string;
  emails?: OutreachEmail[];
}

interface OutreachEmail {
  id: string;
  status: string;
  openCount: number;
  clickCount: number;
  sentAt: string | null;
}

interface DiscoveredProspect {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  contactName: string;
  contactTitle: string;
  brand: string;
  selected?: boolean;
}

interface OutreachStats {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalConverted: number;
  totalOpenCount: number;
  totalClickCount: number;
}

interface OutreachDetail {
  id: string;
  subject: string;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  openCount: number;
  clickCount: number;
  prospect: {
    name: string;
    brand: string | null;
    city: string;
    category: ProspectCategory;
  };
}

// ─── Constants ──────────────────────────────────────────────

const CATEGORY_LABELS: Record<ProspectCategory, string> = {
  GAS_STATION: "Benzin İstasyonu",
  MARKET_CHAIN: "Market Zinciri",
  RETAIL_STORE: "Perakende Mağaza",
  HOTEL: "Otel",
  CORPORATE: "Kurumsal",
};

const CATEGORY_ICONS: Record<ProspectCategory, React.ReactNode> = {
  GAS_STATION: <Fuel className="w-4 h-4" />,
  MARKET_CHAIN: <ShoppingBag className="w-4 h-4" />,
  RETAIL_STORE: <Building2 className="w-4 h-4" />,
  HOTEL: <Hotel className="w-4 h-4" />,
  CORPORATE: <Briefcase className="w-4 h-4" />,
};

const STATUS_LABELS: Record<ProspectStatus, string> = {
  NEW: "Yeni",
  CONTACTED: "İletişime Geçildi",
  OPENED: "Mail Açıldı",
  CLICKED: "Link Tıklandı",
  INTERESTED: "İlgileniyor",
  SAMPLE_SENT: "Numune Gönderildi",
  CONVERTED: "Dönüşüm",
  REJECTED: "Reddetti",
};

const STATUS_COLORS: Record<ProspectStatus, string> = {
  NEW: "bg-gray-100 text-gray-700",
  CONTACTED: "bg-blue-100 text-blue-700",
  OPENED: "bg-yellow-100 text-yellow-700",
  CLICKED: "bg-orange-100 text-orange-700",
  INTERESTED: "bg-emerald-100 text-emerald-700",
  SAMPLE_SENT: "bg-purple-100 text-purple-700",
  CONVERTED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-700",
};

const BRAND_OPTIONS: Record<ProspectCategory, string[]> = {
  GAS_STATION: ["Shell", "BP", "Opet", "Total", "Petrol Ofisi", "Aytemiz", "TP"],
  MARKET_CHAIN: ["A101", "BİM", "ŞOK", "Migros", "CarrefourSA", "File"],
  RETAIL_STORE: [],
  HOTEL: [],
  CORPORATE: [],
};

// ─── Component ──────────────────────────────────────────────

export default function MusteriKesifPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("discover");

  // Keşfet tab state
  const [discoverCategory, setDiscoverCategory] = useState<ProspectCategory>("GAS_STATION");
  const [discoverCity, setDiscoverCity] = useState("Bursa");
  const [discoverBrand, setDiscoverBrand] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredProspect[]>([]);
  const [saving, setSaving] = useState(false);

  // Müşterilerim tab state
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [prospectStats, setProspectStats] = useState<Record<string, number>>({});
  const [prospectPage, setProspectPage] = useState(1);
  const [prospectTotal, setProspectTotal] = useState(0);
  const [prospectTotalPages, setProspectTotalPages] = useState(1);
  const [prospectFilter, setProspectFilter] = useState({ category: "", city: "", status: "", search: "" });
  const [loadingProspects, setLoadingProspects] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendingOutreach, setSendingOutreach] = useState(false);

  // Teklif Takip tab state
  const [outreachEmails, setOutreachEmails] = useState<OutreachDetail[]>([]);
  const [outreachStats, setOutreachStats] = useState<OutreachStats | null>(null);
  const [outreachPage, setOutreachPage] = useState(1);
  const [outreachTotalPages, setOutreachTotalPages] = useState(1);
  const [loadingOutreach, setLoadingOutreach] = useState(false);

  // Şehir listesini yükle
  useEffect(() => {
    fetch("/api/admin/prospects/discover")
      .then((r) => r.json())
      .then((d) => {
        if (d.cities) setCities(d.cities);
      })
      .catch(() => {});
  }, []);

  // ─── Keşfet Tab ─────────────────────────────────────────

  const handleDiscover = async () => {
    setDiscovering(true);
    setDiscovered([]);
    try {
      const res = await fetch("/api/admin/prospects/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: discoverCategory,
          city: discoverCity,
          brand: discoverBrand || undefined,
        }),
      });
      const data = await res.json();
      if (data.prospects) {
        setDiscovered(data.prospects.map((p: DiscoveredProspect) => ({ ...p, selected: true })));
      } else {
        alert(data.error || "Bir hata oluştu.");
      }
    } catch {
      alert("Bağlantı hatası.");
    } finally {
      setDiscovering(false);
    }
  };

  const toggleSelect = (i: number) => {
    setDiscovered((prev) =>
      prev.map((p, idx) => (idx === i ? { ...p, selected: !p.selected } : p))
    );
  };

  const selectAll = (val: boolean) => {
    setDiscovered((prev) => prev.map((p) => ({ ...p, selected: val })));
  };

  const handleSaveSelected = async () => {
    const selected = discovered.filter((p) => p.selected);
    if (selected.length === 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospects: selected.map((p) => ({
            name: p.name,
            category: discoverCategory,
            brand: p.brand !== "Belirtilmemiş" ? p.brand : discoverBrand || null,
            city: discoverCity,
            address: p.address !== "Belirtilmemiş" ? p.address : null,
            phone: p.phone !== "Belirtilmemiş" ? p.phone : null,
            email: p.email !== "Belirtilmemiş" ? p.email : null,
            website: p.website !== "Belirtilmemiş" ? p.website : null,
            contactName: p.contactName !== "Belirtilmemiş" ? p.contactName : null,
            contactTitle: p.contactTitle !== "Belirtilmemiş" ? p.contactTitle : null,
            source: "gemini-discover",
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`${data.count} müşteri kaydedildi.`);
        setDiscovered([]);
      } else {
        alert(data.error || "Kaydetme hatası.");
      }
    } catch {
      alert("Bağlantı hatası.");
    } finally {
      setSaving(false);
    }
  };

  // ─── Müşterilerim Tab ───────────────────────────────────

  const fetchProspects = useCallback(async () => {
    setLoadingProspects(true);
    try {
      const params = new URLSearchParams({ page: String(prospectPage), limit: "30" });
      if (prospectFilter.category) params.set("category", prospectFilter.category);
      if (prospectFilter.city) params.set("city", prospectFilter.city);
      if (prospectFilter.status) params.set("status", prospectFilter.status);
      if (prospectFilter.search) params.set("search", prospectFilter.search);

      const res = await fetch(`/api/admin/prospects?${params}`);
      const data = await res.json();
      setProspects(data.prospects || []);
      setProspectTotal(data.total || 0);
      setProspectTotalPages(data.totalPages || 1);
      setProspectStats(data.stats || {});
    } catch {
      console.error("Müşteri listesi yüklenemedi.");
    } finally {
      setLoadingProspects(false);
    }
  }, [prospectPage, prospectFilter]);

  useEffect(() => {
    if (activeTab === "customers") fetchProspects();
  }, [activeTab, fetchProspects]);

  const handleDeleteProspect = async (id: string) => {
    if (!confirm("Bu müşteriyi silmek istediğinize emin misiniz?")) return;
    try {
      await fetch(`/api/admin/prospects/${id}`, { method: "DELETE" });
      fetchProspects();
    } catch {
      alert("Silme hatası.");
    }
  };

  const handleStatusChange = async (id: string, status: ProspectStatus) => {
    try {
      await fetch(`/api/admin/prospects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchProspects();
    } catch {
      alert("Durum güncelleme hatası.");
    }
  };

  const toggleProspectSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkOutreach = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size} müşteriye teklif maili gönderilecek. Onaylıyor musunuz?`)) return;

    setSendingOutreach(true);
    try {
      const res = await fetch("/api/admin/prospects/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectIds: [...selectedIds] }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`${data.summary.sent} mail gönderildi, ${data.summary.failed} başarısız.`);
        setSelectedIds(new Set());
        fetchProspects();
      } else {
        alert(data.error || "Gönderim hatası.");
      }
    } catch {
      alert("Bağlantı hatası.");
    } finally {
      setSendingOutreach(false);
    }
  };

  // ─── Teklif Takip Tab ─────────────────────────────────

  const fetchOutreach = useCallback(async () => {
    setLoadingOutreach(true);
    try {
      const res = await fetch(`/api/admin/prospects/outreach?page=${outreachPage}&limit=30`);
      const data = await res.json();
      setOutreachEmails(data.emails || []);
      setOutreachStats(data.stats || null);
      setOutreachTotalPages(data.totalPages || 1);
    } catch {
      console.error("Outreach verileri yüklenemedi.");
    } finally {
      setLoadingOutreach(false);
    }
  }, [outreachPage]);

  useEffect(() => {
    if (activeTab === "outreach") fetchOutreach();
  }, [activeTab, fetchOutreach]);

  // ─── Render ───────────────────────────────────────────

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "discover", label: "Keşfet", icon: <Sparkles className="w-4 h-4" /> },
    { key: "customers", label: "Müşterilerim", icon: <Users className="w-4 h-4" /> },
    { key: "outreach", label: "Teklif Takip", icon: <MailCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Müşteri Keşfet & Teklif</h1>
        <p className="text-sm text-gray-500 mt-1">
          Potansiyel müşterileri keşfet, kaydet ve toplu teklif gönder
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-[#7AC143] text-[#7AC143]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── TAB 1: KEŞFET ───────────────────────────────── */}
      {activeTab === "discover" && (
        <div className="space-y-6">
          {/* Arama Formu */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#7AC143]" />
              AI ile Müşteri Keşfet
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Kategori */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select
                  value={discoverCategory}
                  onChange={(e) => {
                    setDiscoverCategory(e.target.value as ProspectCategory);
                    setDiscoverBrand("");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7AC143]/30 focus:border-[#7AC143] outline-none"
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Şehir */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Şehir</label>
                <select
                  value={discoverCity}
                  onChange={(e) => setDiscoverCity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7AC143]/30 focus:border-[#7AC143] outline-none"
                >
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Marka (opsiyonel) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marka (opsiyonel)</label>
                {BRAND_OPTIONS[discoverCategory]?.length > 0 ? (
                  <select
                    value={discoverBrand}
                    onChange={(e) => setDiscoverBrand(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7AC143]/30 focus:border-[#7AC143] outline-none"
                  >
                    <option value="">Tümü</option>
                    {BRAND_OPTIONS[discoverCategory].map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={discoverBrand}
                    onChange={(e) => setDiscoverBrand(e.target.value)}
                    placeholder="Marka adı..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7AC143]/30 focus:border-[#7AC143] outline-none"
                  />
                )}
              </div>

              {/* Ara Butonu */}
              <div className="flex items-end">
                <button
                  onClick={handleDiscover}
                  disabled={discovering}
                  className="w-full px-4 py-2 bg-[#7AC143] text-white rounded-lg text-sm font-medium hover:bg-[#6AAF35] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {discovering ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Aranıyor...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Keşfet
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Sonuçlar */}
          {discovered.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {discovered.length} İşletme Bulundu
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => selectAll(true)}
                    className="text-sm text-[#7AC143] hover:underline"
                  >
                    Tümünü Seç
                  </button>
                  <button
                    onClick={() => selectAll(false)}
                    className="text-sm text-gray-500 hover:underline"
                  >
                    Seçimi Kaldır
                  </button>
                  <button
                    onClick={handleSaveSelected}
                    disabled={saving || !discovered.some((p) => p.selected)}
                    className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium hover:bg-black disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Seçilenleri Kaydet ({discovered.filter((p) => p.selected).length})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {discovered.map((p, i) => (
                  <div
                    key={i}
                    onClick={() => toggleSelect(i)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      p.selected
                        ? "border-[#7AC143] bg-green-50/50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={p.selected || false}
                          onChange={() => toggleSelect(i)}
                          className="accent-[#7AC143] w-4 h-4"
                        />
                        <h4 className="font-semibold text-gray-900 text-sm">{p.name}</h4>
                      </div>
                      {p.brand && p.brand !== "Belirtilmemiş" && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                          {p.brand}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-xs text-gray-600">
                      {p.address !== "Belirtilmemiş" && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {p.address}
                        </div>
                      )}
                      {p.phone !== "Belirtilmemiş" && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {p.phone}
                        </div>
                      )}
                      {p.email !== "Belirtilmemiş" && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-gray-400" />
                          {p.email}
                        </div>
                      )}
                      {p.contactName !== "Belirtilmemiş" && (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-gray-400" />
                          {p.contactName}
                          {p.contactTitle !== "Belirtilmemiş" && ` — ${p.contactTitle}`}
                        </div>
                      )}
                      {p.website !== "Belirtilmemiş" && (
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3 h-3 text-gray-400" />
                          {p.website}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Boş durum */}
          {!discovering && discovered.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-700">Müşteri Keşfet</h3>
              <p className="text-sm text-gray-500 mt-1">
                Yukarıdan kategori ve şehir seçip &quot;Keşfet&quot; butonuna tıklayın.
                <br />
                Gemini AI sizin için potansiyel müşterileri bulacak.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: MÜŞTERİLERİM ────────────────────────── */}
      {activeTab === "customers" && (
        <div className="space-y-4">
          {/* Durum İstatistikleri */}
          {Object.keys(prospectStats).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
              {(Object.keys(STATUS_LABELS) as ProspectStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setProspectFilter((prev) => ({
                      ...prev,
                      status: prev.status === s ? "" : s,
                    }));
                    setProspectPage(1);
                  }}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    prospectFilter.status === s
                      ? "border-[#7AC143] bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-lg font-bold text-gray-900">{prospectStats[s] || 0}</div>
                  <div className="text-xs text-gray-500">{STATUS_LABELS[s]}</div>
                </button>
              ))}
            </div>
          )}

          {/* Filtreler */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={prospectFilter.category}
                onChange={(e) => {
                  setProspectFilter((prev) => ({ ...prev, category: e.target.value }));
                  setProspectPage(1);
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#7AC143]/30"
              >
                <option value="">Tüm Kategoriler</option>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <input
                type="text"
                value={prospectFilter.search}
                onChange={(e) => {
                  setProspectFilter((prev) => ({ ...prev, search: e.target.value }));
                  setProspectPage(1);
                }}
                placeholder="İsim, e-posta, telefon ara..."
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#7AC143]/30 flex-1 min-w-[200px]"
              />
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkOutreach}
                  disabled={sendingOutreach}
                  className="px-4 py-1.5 bg-[#7AC143] text-white rounded-lg text-sm font-medium hover:bg-[#6AAF35] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {sendingOutreach ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Seçilenlere Teklif Gönder ({selectedIds.size})
                </button>
              )}
              <span className="text-sm text-gray-500 ml-auto">
                Toplam: {prospectTotal}
              </span>
            </div>
          </div>

          {/* Müşteri Tablosu */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loadingProspects ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300 mx-auto" />
              </div>
            ) : prospects.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Henüz kayıtlı müşteri yok.</p>
                <p className="text-sm text-gray-400 mt-1">Keşfet sekmesinden müşteri ekleyin.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left w-8">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(new Set(prospects.filter((p) => p.email).map((p) => p.id)));
                            } else {
                              setSelectedIds(new Set());
                            }
                          }}
                          className="accent-[#7AC143]"
                        />
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">İşletme</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Kategori</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Şehir</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">İletişim</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Durum</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Son Mail</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700 w-20">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {prospects.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          {p.email ? (
                            <input
                              type="checkbox"
                              checked={selectedIds.has(p.id)}
                              onChange={() => toggleProspectSelect(p.id)}
                              className="accent-[#7AC143]"
                            />
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{p.name}</div>
                          {p.brand && (
                            <span className="text-xs text-gray-500">{p.brand}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs">
                            {CATEGORY_ICONS[p.category]}
                            {CATEGORY_LABELS[p.category]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{p.city}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5 text-xs text-gray-600">
                            {p.contactName && <div className="flex items-center gap-1"><User className="w-3 h-3" />{p.contactName}</div>}
                            {p.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</div>}
                            {p.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{p.email}</div>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={p.status}
                            onChange={(e) => handleStatusChange(p.id, e.target.value as ProspectStatus)}
                            className={`text-xs px-2 py-1 rounded-full border-0 font-medium ${STATUS_COLORS[p.status]}`}
                          >
                            {(Object.keys(STATUS_LABELS) as ProspectStatus[]).map((s) => (
                              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {p.emails && p.emails[0] ? (
                            <div className="flex items-center gap-1">
                              {p.emails[0].openCount > 0 ? (
                                <Eye className="w-3 h-3 text-yellow-500" />
                              ) : p.emails[0].status === "SENT" ? (
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                              ) : (
                                <Clock className="w-3 h-3 text-gray-400" />
                              )}
                              {p.emails[0].openCount > 0 && `${p.emails[0].openCount}x açıldı`}
                              {p.emails[0].clickCount > 0 && `, ${p.emails[0].clickCount}x tık`}
                              {p.emails[0].openCount === 0 && p.emails[0].status === "SENT" && "Gönderildi"}
                              {p.emails[0].status === "FAILED" && <span className="text-red-500">Başarısız</span>}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeleteProspect(p.id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Sayfalama */}
            {prospectTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Sayfa {prospectPage} / {prospectTotalPages}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setProspectPage((p) => Math.max(1, p - 1))}
                    disabled={prospectPage <= 1}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setProspectPage((p) => Math.min(prospectTotalPages, p + 1))}
                    disabled={prospectPage >= prospectTotalPages}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: TEKLİF TAKİP ────────────────────────── */}
      {activeTab === "outreach" && (
        <div className="space-y-4">
          {/* İstatistik Kartları */}
          {outreachStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Send className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-500">Gönderilen</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{outreachStats.totalSent}</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-gray-500">Açılan</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {outreachStats.totalOpened}
                  {outreachStats.totalSent > 0 && (
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      ({Math.round((outreachStats.totalOpened / outreachStats.totalSent) * 100)}%)
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <MousePointerClick className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-gray-500">Tıklanan</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {outreachStats.totalClicked}
                  {outreachStats.totalSent > 0 && (
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      ({Math.round((outreachStats.totalClicked / outreachStats.totalSent) * 100)}%)
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-500">Dönüşüm</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{outreachStats.totalConverted}</div>
              </div>
            </div>
          )}

          {/* Email Tablosu */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loadingOutreach ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300 mx-auto" />
              </div>
            ) : outreachEmails.length === 0 ? (
              <div className="p-12 text-center">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Henüz teklif maili gönderilmemiş.</p>
                <p className="text-sm text-gray-400 mt-1">
                  Müşterilerim sekmesinden seçim yapıp teklif gönderin.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Müşteri</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Konu</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700">Durum</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700">Açılma</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700">Tıklama</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Tarih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {outreachEmails.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{e.prospect.name}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            {CATEGORY_ICONS[e.prospect.category]}
                            {e.prospect.city}
                            {e.prospect.brand && ` · ${e.prospect.brand}`}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                          {e.subject}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {e.status === "SENT" ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Gönderildi
                            </span>
                          ) : e.status === "FAILED" ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                              <XCircle className="w-3 h-3" /> Başarısız
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                              <Clock className="w-3 h-3" /> Bekliyor
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {e.openCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-yellow-600">
                              <Eye className="w-3.5 h-3.5" /> {e.openCount}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {e.clickCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-orange-600">
                              <MousePointerClick className="w-3.5 h-3.5" /> {e.clickCount}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {e.sentAt
                            ? new Date(e.sentAt).toLocaleDateString("tr-TR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Sayfalama */}
            {outreachTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Sayfa {outreachPage} / {outreachTotalPages}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setOutreachPage((p) => Math.max(1, p - 1))}
                    disabled={outreachPage <= 1}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setOutreachPage((p) => Math.min(outreachTotalPages, p + 1))}
                    disabled={outreachPage >= outreachTotalPages}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
