"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
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
  Pencil,
  Save,
  X,
  Map as MapIcon,
  Navigation,
} from "lucide-react";

// Leaflet CSS (SSR'da yüklenmemeli)
import "leaflet/dist/leaflet.css";

// Leaflet harita bileşenlerini dynamic import ile yükle (SSR uyumsuz)
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const LeafletMarker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);

// ─── Types ──────────────────────────────────────────────────

type TabKey = "discover" | "customers" | "outreach" | "map";
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
  latitude: number | null;
  longitude: number | null;
  status: ProspectStatus;
  notes: string | null;
  source: string | null;
  createdAt: string;
  emails?: OutreachEmailBrief[];
}

interface OutreachEmailBrief {
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
  latitude: number | null;
  longitude: number | null;
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

const inputCls = "w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-[#7AC143]/40 focus:border-[#7AC143] outline-none";

// ─── Component ──────────────────────────────────────────────

export default function MusteriKesifPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("discover");

  // Keşfet
  const [discoverCategory, setDiscoverCategory] = useState<ProspectCategory>("GAS_STATION");
  const [discoverCity, setDiscoverCity] = useState("Bursa");
  const [discoverBrand, setDiscoverBrand] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredProspect[]>([]);
  const [saving, setSaving] = useState(false);

  // Müşterilerim
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [prospectStats, setProspectStats] = useState<Record<string, number>>({});
  const [prospectPage, setProspectPage] = useState(1);
  const [prospectTotal, setProspectTotal] = useState(0);
  const [prospectTotalPages, setProspectTotalPages] = useState(1);
  const [prospectFilter, setProspectFilter] = useState({ category: "", city: "", status: "", search: "" });
  const [loadingProspects, setLoadingProspects] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendingOutreach, setSendingOutreach] = useState(false);

  // Düzenleme modalı
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string | number | null>>({});
  const [editSaving, setEditSaving] = useState(false);

  // Teklif Takip
  const [outreachEmails, setOutreachEmails] = useState<OutreachDetail[]>([]);
  const [outreachStats, setOutreachStats] = useState<OutreachStats | null>(null);
  const [outreachPage, setOutreachPage] = useState(1);
  const [outreachTotalPages, setOutreachTotalPages] = useState(1);
  const [loadingOutreach, setLoadingOutreach] = useState(false);

  // Harita
  const [mapProspects, setMapProspects] = useState<Prospect[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);

  // Şehir listesini yükle
  useEffect(() => {
    fetch("/api/admin/prospects/discover")
      .then((r) => r.json())
      .then((d) => { if (d.cities) setCities(d.cities); })
      .catch(() => {});
  }, []);

  // ─── Keşfet ───────────────────────────────────────────

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
    setDiscovered((prev) => prev.map((p, idx) => idx === i ? { ...p, selected: !p.selected } : p));
  };

  const selectAll = (val: boolean) => {
    setDiscovered((prev) => prev.map((p) => ({ ...p, selected: val })));
  };

  const updateDiscoveredField = (i: number, field: string, value: string) => {
    setDiscovered((prev) =>
      prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p)
    );
  };

  const cleanVal = (v: string) => (v && v !== "Belirtilmemiş" ? v : null);

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
            brand: cleanVal(p.brand) || discoverBrand || null,
            city: discoverCity,
            address: cleanVal(p.address),
            phone: cleanVal(p.phone),
            email: cleanVal(p.email),
            website: cleanVal(p.website),
            contactName: cleanVal(p.contactName),
            contactTitle: cleanVal(p.contactTitle),
            latitude: p.latitude || undefined,
            longitude: p.longitude || undefined,
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

  // ─── Müşterilerim ─────────────────────────────────────

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
      if (next.has(id)) next.delete(id); else next.add(id);
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

  // ─── Düzenleme Modalı ─────────────────────────────────

  const openEditModal = (p: Prospect) => {
    setEditingProspect(p);
    setEditForm({
      name: p.name,
      brand: p.brand || "",
      city: p.city,
      district: p.district || "",
      address: p.address || "",
      phone: p.phone || "",
      email: p.email || "",
      website: p.website || "",
      contactName: p.contactName || "",
      contactTitle: p.contactTitle || "",
      latitude: p.latitude,
      longitude: p.longitude,
      notes: p.notes || "",
    });
  };

  const handleEditSave = async () => {
    if (!editingProspect) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/prospects/${editingProspect.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name || editingProspect.name,
          brand: editForm.brand || null,
          city: editForm.city || editingProspect.city,
          district: editForm.district || null,
          address: editForm.address || null,
          phone: editForm.phone || null,
          email: editForm.email || null,
          website: editForm.website || null,
          contactName: editForm.contactName || null,
          contactTitle: editForm.contactTitle || null,
          latitude: editForm.latitude ? Number(editForm.latitude) : null,
          longitude: editForm.longitude ? Number(editForm.longitude) : null,
          notes: editForm.notes || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingProspect(null);
        fetchProspects();
      } else {
        alert(data.error || "Güncelleme hatası.");
      }
    } catch {
      alert("Bağlantı hatası.");
    } finally {
      setEditSaving(false);
    }
  };

  // ─── Teklif Takip ─────────────────────────────────────

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

  // ─── Harita ───────────────────────────────────────────

  const fetchMapProspects = useCallback(async () => {
    setLoadingMap(true);
    try {
      const res = await fetch("/api/admin/prospects?limit=500");
      const data = await res.json();
      setMapProspects((data.prospects || []).filter((p: Prospect) => p.latitude && p.longitude));
    } catch {
      console.error("Harita verileri yüklenemedi.");
    } finally {
      setLoadingMap(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "map") fetchMapProspects();
  }, [activeTab, fetchMapProspects]);

  // Harita merkezi hesapla
  const mapCenter = useMemo(() => {
    if (mapProspects.length === 0) return [40.19, 29.06] as [number, number]; // Bursa
    const avgLat = mapProspects.reduce((s, p) => s + (p.latitude || 0), 0) / mapProspects.length;
    const avgLng = mapProspects.reduce((s, p) => s + (p.longitude || 0), 0) / mapProspects.length;
    return [avgLat, avgLng] as [number, number];
  }, [mapProspects]);

  const openGoogleMapsRoute = () => {
    const withCoords = mapProspects.filter((p) => p.latitude && p.longitude);
    if (withCoords.length === 0) return;

    // Google Maps yön URL'i — max 25 waypoint
    const waypoints = withCoords
      .slice(0, 25)
      .map((p) => `${p.latitude},${p.longitude}`)
      .join("/");

    const url = `https://www.google.com/maps/dir/${waypoints}`;
    window.open(url, "_blank");
  };

  // ─── Render ───────────────────────────────────────────

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "discover", label: "Keşfet", icon: <Sparkles className="w-4 h-4" /> },
    { key: "customers", label: "Müşterilerim", icon: <Users className="w-4 h-4" /> },
    { key: "map", label: "Harita", icon: <MapIcon className="w-4 h-4" /> },
    { key: "outreach", label: "Teklif Takip", icon: <MailCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Müşteri Keşfet & Teklif</h1>
        <p className="text-sm text-gray-500 mt-1">
          Potansiyel müşterileri keşfet, kaydet, haritada gör ve toplu teklif gönder
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select
                  value={discoverCategory}
                  onChange={(e) => { setDiscoverCategory(e.target.value as ProspectCategory); setDiscoverBrand(""); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7AC143]/30 focus:border-[#7AC143] outline-none"
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Şehir</label>
                <select
                  value={discoverCity}
                  onChange={(e) => setDiscoverCity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7AC143]/30 focus:border-[#7AC143] outline-none"
                >
                  {cities.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marka (opsiyonel)</label>
                {BRAND_OPTIONS[discoverCategory]?.length > 0 ? (
                  <select
                    value={discoverBrand}
                    onChange={(e) => setDiscoverBrand(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7AC143]/30 focus:border-[#7AC143] outline-none"
                  >
                    <option value="">Tümü</option>
                    {BRAND_OPTIONS[discoverCategory].map((b) => (<option key={b} value={b}>{b}</option>))}
                  </select>
                ) : (
                  <input type="text" value={discoverBrand} onChange={(e) => setDiscoverBrand(e.target.value)} placeholder="Marka adı..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7AC143]/30 focus:border-[#7AC143] outline-none" />
                )}
              </div>
              <div className="flex items-end">
                <button onClick={handleDiscover} disabled={discovering} className="w-full px-4 py-2 bg-[#7AC143] text-white rounded-lg text-sm font-medium hover:bg-[#6AAF35] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {discovering ? (<><Loader2 className="w-4 h-4 animate-spin" />Aranıyor...</>) : (<><Search className="w-4 h-4" />Keşfet</>)}
                </button>
              </div>
            </div>
          </div>

          {/* Sonuçlar — Düzenlenebilir Kartlar */}
          {discovered.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{discovered.length} İşletme Bulundu</h3>
                <div className="flex items-center gap-3">
                  <button onClick={() => selectAll(true)} className="text-sm text-[#7AC143] hover:underline">Tümünü Seç</button>
                  <button onClick={() => selectAll(false)} className="text-sm text-gray-500 hover:underline">Seçimi Kaldır</button>
                  <button onClick={handleSaveSelected} disabled={saving || !discovered.some((p) => p.selected)} className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium hover:bg-black disabled:opacity-50 transition-colors flex items-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Seçilenleri Kaydet ({discovered.filter((p) => p.selected).length})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {discovered.map((p, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      p.selected ? "border-[#7AC143] bg-green-50/50" : "border-gray-200"
                    }`}
                  >
                    {/* Checkbox + İsim */}
                    <div className="flex items-center gap-2 mb-3">
                      <input type="checkbox" checked={p.selected || false} onChange={() => toggleSelect(i)} className="accent-[#7AC143] w-4 h-4" />
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => updateDiscoveredField(i, "name", e.target.value)}
                        className="flex-1 font-semibold text-gray-900 text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#7AC143] outline-none px-1 py-0.5"
                      />
                      {p.brand && p.brand !== "Belirtilmemiş" && (
                        <input
                          type="text"
                          value={p.brand}
                          onChange={(e) => updateDiscoveredField(i, "brand", e.target.value)}
                          className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200 w-20 text-center outline-none focus:ring-1 focus:ring-blue-300"
                        />
                      )}
                    </div>

                    {/* Düzenlenebilir Alanlar */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                      <div className="col-span-2">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                          <input type="text" value={p.address === "Belirtilmemiş" ? "" : p.address} onChange={(e) => updateDiscoveredField(i, "address", e.target.value)} placeholder="Adres" className={inputCls} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                        <input type="tel" value={p.phone === "Belirtilmemiş" ? "" : p.phone} onChange={(e) => updateDiscoveredField(i, "phone", e.target.value)} placeholder="Telefon" className={inputCls} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                        <input type="email" value={p.email === "Belirtilmemiş" ? "" : p.email} onChange={(e) => updateDiscoveredField(i, "email", e.target.value)} placeholder="E-posta" className={inputCls} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-gray-400 shrink-0" />
                        <input type="text" value={p.contactName === "Belirtilmemiş" ? "" : p.contactName} onChange={(e) => updateDiscoveredField(i, "contactName", e.target.value)} placeholder="Yetkili adı" className={inputCls} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-gray-400 shrink-0" />
                        <input type="text" value={p.website === "Belirtilmemiş" ? "" : p.website} onChange={(e) => updateDiscoveredField(i, "website", e.target.value)} placeholder="Web sitesi" className={inputCls} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                        <input type="number" step="any" value={p.latitude ?? ""} onChange={(e) => updateDiscoveredField(i, "latitude", e.target.value)} placeholder="Enlem" className={inputCls} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                        <input type="number" step="any" value={p.longitude ?? ""} onChange={(e) => updateDiscoveredField(i, "longitude", e.target.value)} placeholder="Boylam" className={inputCls} />
                      </div>
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
                <br />Gemini AI sizin için potansiyel müşterileri bulacak.
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
                <button key={s} onClick={() => { setProspectFilter((prev) => ({ ...prev, status: prev.status === s ? "" : s })); setProspectPage(1); }}
                  className={`p-2 rounded-lg border text-center transition-all ${prospectFilter.status === s ? "border-[#7AC143] bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
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
              <select value={prospectFilter.category} onChange={(e) => { setProspectFilter((prev) => ({ ...prev, category: e.target.value })); setProspectPage(1); }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#7AC143]/30">
                <option value="">Tüm Kategoriler</option>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
              </select>
              <input type="text" value={prospectFilter.search} onChange={(e) => { setProspectFilter((prev) => ({ ...prev, search: e.target.value })); setProspectPage(1); }}
                placeholder="İsim, e-posta, telefon ara..." className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#7AC143]/30 flex-1 min-w-[200px]" />
              {selectedIds.size > 0 && (
                <button onClick={handleBulkOutreach} disabled={sendingOutreach} className="px-4 py-1.5 bg-[#7AC143] text-white rounded-lg text-sm font-medium hover:bg-[#6AAF35] disabled:opacity-50 transition-colors flex items-center gap-2">
                  {sendingOutreach ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Seçilenlere Teklif Gönder ({selectedIds.size})
                </button>
              )}
              <span className="text-sm text-gray-500 ml-auto">Toplam: {prospectTotal}</span>
            </div>
          </div>

          {/* Tablo */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loadingProspects ? (
              <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-gray-300 mx-auto" /></div>
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
                        <input type="checkbox" onChange={(e) => { if (e.target.checked) setSelectedIds(new Set(prospects.filter((p) => p.email).map((p) => p.id))); else setSelectedIds(new Set()); }} className="accent-[#7AC143]" />
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">İşletme</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Kategori</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Şehir</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">İletişim</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Durum</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Son Mail</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {prospects.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          {p.email ? <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleProspectSelect(p.id)} className="accent-[#7AC143]" /> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{p.name}</div>
                          {p.brand && <span className="text-xs text-gray-500">{p.brand}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs">{CATEGORY_ICONS[p.category]}{CATEGORY_LABELS[p.category]}</span>
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
                          <select value={p.status} onChange={(e) => handleStatusChange(p.id, e.target.value as ProspectStatus)} className={`text-xs px-2 py-1 rounded-full border-0 font-medium ${STATUS_COLORS[p.status]}`}>
                            {(Object.keys(STATUS_LABELS) as ProspectStatus[]).map((s) => (<option key={s} value={s}>{STATUS_LABELS[s]}</option>))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {p.emails && p.emails[0] ? (
                            <div className="flex items-center gap-1">
                              {p.emails[0].openCount > 0 ? <Eye className="w-3 h-3 text-yellow-500" /> : p.emails[0].status === "SENT" ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Clock className="w-3 h-3 text-gray-400" />}
                              {p.emails[0].openCount > 0 && `${p.emails[0].openCount}x açıldı`}
                              {p.emails[0].clickCount > 0 && `, ${p.emails[0].clickCount}x tık`}
                              {p.emails[0].openCount === 0 && p.emails[0].status === "SENT" && "Gönderildi"}
                              {p.emails[0].status === "FAILED" && <span className="text-red-500">Başarısız</span>}
                            </div>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openEditModal(p)} className="p-1 text-gray-400 hover:text-[#7AC143] transition-colors" title="Düzenle">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteProspect(p.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="Sil">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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
                <p className="text-sm text-gray-500">Sayfa {prospectPage} / {prospectTotalPages}</p>
                <div className="flex gap-1">
                  <button onClick={() => setProspectPage((p) => Math.max(1, p - 1))} disabled={prospectPage <= 1} className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setProspectPage((p) => Math.min(prospectTotalPages, p + 1))} disabled={prospectPage >= prospectTotalPages} className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: HARİTA ───────────────────────────────── */}
      {activeTab === "map" && (
        <div className="space-y-4">
          {/* Üst bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-[#7AC143]" />
              <span className="font-medium text-gray-900">
                {mapProspects.length} müşteri haritada
              </span>
              <span className="text-sm text-gray-500">(koordinatı olan)</span>
            </div>
            {mapProspects.length > 0 && (
              <button
                onClick={openGoogleMapsRoute}
                className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium hover:bg-black transition-colors flex items-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                Google Maps&apos;te Rota Planla
              </button>
            )}
          </div>

          {/* Harita */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: "600px" }}>
            {loadingMap ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
              </div>
            ) : mapProspects.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center">
                <MapIcon className="w-16 h-16 text-gray-200 mb-4" />
                <p className="text-gray-500 font-medium">Haritada gösterilecek müşteri yok</p>
                <p className="text-sm text-gray-400 mt-1">Koordinatı olan müşteriler burada görünür</p>
              </div>
            ) : (
              <MapContainer
                center={mapCenter}
                zoom={10}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mapProspects.map((p) => (
                  <LeafletMarker
                    key={p.id}
                    position={[p.latitude!, p.longitude!]}
                  >
                    <Popup>
                      <div className="text-sm min-w-[180px]">
                        <div className="font-bold text-gray-900">{p.name}</div>
                        {p.brand && <div className="text-xs text-blue-600">{p.brand}</div>}
                        <div className="mt-1 space-y-0.5 text-xs text-gray-600">
                          {p.address && <div>{p.address}</div>}
                          {p.phone && <div>{p.phone}</div>}
                          {p.email && <div>{p.email}</div>}
                          {p.contactName && <div>Yetkili: {p.contactName}</div>}
                        </div>
                        <div className="mt-1.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[p.status]}`}>
                            {STATUS_LABELS[p.status]}
                          </span>
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-xs text-blue-600 hover:underline"
                        >
                          Google Maps&apos;te Aç
                        </a>
                      </div>
                    </Popup>
                  </LeafletMarker>
                ))}
              </MapContainer>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 4: TEKLİF TAKİP ────────────────────────── */}
      {activeTab === "outreach" && (
        <div className="space-y-4">
          {outreachStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-1"><Send className="w-4 h-4 text-blue-500" /><span className="text-sm text-gray-500">Gönderilen</span></div>
                <div className="text-2xl font-bold text-gray-900">{outreachStats.totalSent}</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-1"><Eye className="w-4 h-4 text-yellow-500" /><span className="text-sm text-gray-500">Açılan</span></div>
                <div className="text-2xl font-bold text-gray-900">
                  {outreachStats.totalOpened}
                  {outreachStats.totalSent > 0 && <span className="text-sm font-normal text-gray-500 ml-1">({Math.round((outreachStats.totalOpened / outreachStats.totalSent) * 100)}%)</span>}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-1"><MousePointerClick className="w-4 h-4 text-orange-500" /><span className="text-sm text-gray-500">Tıklanan</span></div>
                <div className="text-2xl font-bold text-gray-900">
                  {outreachStats.totalClicked}
                  {outreachStats.totalSent > 0 && <span className="text-sm font-normal text-gray-500 ml-1">({Math.round((outreachStats.totalClicked / outreachStats.totalSent) * 100)}%)</span>}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="text-sm text-gray-500">Dönüşüm</span></div>
                <div className="text-2xl font-bold text-gray-900">{outreachStats.totalConverted}</div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loadingOutreach ? (
              <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-gray-300 mx-auto" /></div>
            ) : outreachEmails.length === 0 ? (
              <div className="p-12 text-center">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Henüz teklif maili gönderilmemiş.</p>
                <p className="text-sm text-gray-400 mt-1">Müşterilerim sekmesinden seçim yapıp teklif gönderin.</p>
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
                          <div className="text-xs text-gray-500 flex items-center gap-1">{CATEGORY_ICONS[e.prospect.category]}{e.prospect.city}{e.prospect.brand && ` · ${e.prospect.brand}`}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{e.subject}</td>
                        <td className="px-4 py-3 text-center">
                          {e.status === "SENT" ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full"><CheckCircle2 className="w-3 h-3" />Gönderildi</span>
                            : e.status === "FAILED" ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full"><XCircle className="w-3 h-3" />Başarısız</span>
                            : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"><Clock className="w-3 h-3" />Bekliyor</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {e.openCount > 0 ? <span className="inline-flex items-center gap-1 text-sm font-medium text-yellow-600"><Eye className="w-3.5 h-3.5" />{e.openCount}</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {e.clickCount > 0 ? <span className="inline-flex items-center gap-1 text-sm font-medium text-orange-600"><MousePointerClick className="w-3.5 h-3.5" />{e.clickCount}</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {e.sentAt ? new Date(e.sentAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {outreachTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <p className="text-sm text-gray-500">Sayfa {outreachPage} / {outreachTotalPages}</p>
                <div className="flex gap-1">
                  <button onClick={() => setOutreachPage((p) => Math.max(1, p - 1))} disabled={outreachPage <= 1} className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setOutreachPage((p) => Math.min(outreachTotalPages, p + 1))} disabled={outreachPage >= outreachTotalPages} className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── DÜZENLEME MODALI ────────────────────────────── */}
      {editingProspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingProspect(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Müşteri Düzenle</h3>
              <button onClick={() => setEditingProspect(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              {[
                { key: "name", label: "İşletme Adı", icon: <Building2 className="w-4 h-4" />, type: "text" },
                { key: "brand", label: "Marka", icon: <Fuel className="w-4 h-4" />, type: "text" },
                { key: "city", label: "Şehir", icon: <MapPin className="w-4 h-4" />, type: "text" },
                { key: "district", label: "İlçe", icon: <MapPin className="w-4 h-4" />, type: "text" },
                { key: "address", label: "Adres", icon: <MapPin className="w-4 h-4" />, type: "text" },
                { key: "phone", label: "Telefon", icon: <Phone className="w-4 h-4" />, type: "tel" },
                { key: "email", label: "E-posta", icon: <Mail className="w-4 h-4" />, type: "email" },
                { key: "website", label: "Web Sitesi", icon: <Globe className="w-4 h-4" />, type: "text" },
                { key: "contactName", label: "Yetkili Adı", icon: <User className="w-4 h-4" />, type: "text" },
                { key: "contactTitle", label: "Yetkili Unvanı", icon: <User className="w-4 h-4" />, type: "text" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                    {field.icon} {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={String(editForm[field.key] || "")}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7AC143]/30 focus:border-[#7AC143] outline-none"
                  />
                </div>
              ))}

              {/* Koordinatlar */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                    <MapPin className="w-4 h-4 text-blue-500" /> Enlem (Latitude)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.latitude ?? ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, latitude: e.target.value ? parseFloat(e.target.value) : null }))}
                    placeholder="40.1885"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7AC143]/30 focus:border-[#7AC143] outline-none"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                    <MapPin className="w-4 h-4 text-blue-500" /> Boylam (Longitude)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.longitude ?? ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, longitude: e.target.value ? parseFloat(e.target.value) : null }))}
                    placeholder="29.0610"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7AC143]/30 focus:border-[#7AC143] outline-none"
                  />
                </div>
              </div>

              {/* Notlar */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Notlar</label>
                <textarea
                  value={String(editForm.notes || "")}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7AC143]/30 focus:border-[#7AC143] outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
              <button onClick={() => setEditingProspect(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">İptal</button>
              <button onClick={handleEditSave} disabled={editSaving} className="px-4 py-2 bg-[#7AC143] text-white rounded-lg text-sm font-medium hover:bg-[#6AAF35] disabled:opacity-50 transition-colors flex items-center gap-2">
                {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
