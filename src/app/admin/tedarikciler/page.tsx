"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Truck,
  Filter,
  Phone,
  Mail,
  Globe,
  MapPin,
  Package,
  Scissors,
  Tag,
  Box,
  Layers,
  Send,
  BarChart3,
  Star,
  CheckCircle2,
  Clock,
  FileText,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

// ─── Types ───────────────────────────────────────────────────────────

type SupplierType = "FABRIC" | "ELASTIC" | "THREAD" | "PACKAGING_MAT" | "LABEL";
type TabKey = "suppliers" | "discover" | "quotes" | "compare";
type QuoteStatus = "PENDING" | "SENT" | "RECEIVED" | "ACCEPTED" | "REJECTED";

interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  type: SupplierType;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
}

interface DiscoveredSupplier {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  products: string | null;
  minOrder: string | null;
  capacity: string | null;
  alreadySaved: boolean;
}

interface Quote {
  id: string;
  supplierId: string;
  supplierName: string;
  category: string;
  product: string;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  status: QuoteStatus;
  deliveryDays: number | null;
  validUntil: string | null;
  notes: string | null;
  createdAt: string;
}

// ─── Constants ───────────────────────────────────────────────────────

const TYPE_LABELS: Record<SupplierType, string> = {
  FABRIC: "Kumas",
  ELASTIC: "Lastik",
  THREAD: "Iplik",
  PACKAGING_MAT: "Ambalaj",
  LABEL: "Etiket",
};

const TYPE_COLORS: Record<SupplierType, string> = {
  FABRIC: "bg-blue-100 text-blue-700",
  ELASTIC: "bg-purple-100 text-purple-700",
  THREAD: "bg-orange-100 text-orange-700",
  PACKAGING_MAT: "bg-cyan-100 text-cyan-700",
  LABEL: "bg-teal-100 text-teal-700",
};

const TYPE_TABS: { value: string; label: string }[] = [
  { value: "", label: "Tumu" },
  { value: "FABRIC", label: "Kumas" },
  { value: "ELASTIC", label: "Lastik" },
  { value: "THREAD", label: "Iplik" },
  { value: "PACKAGING_MAT", label: "Ambalaj" },
  { value: "LABEL", label: "Etiket" },
];

const EMPTY_FORM = {
  name: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  type: "FABRIC" as SupplierType,
  isActive: true,
  notes: "",
};

const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  PENDING: "Beklemede",
  SENT: "Gonderildi",
  RECEIVED: "Alindi",
  ACCEPTED: "Kabul Edildi",
  REJECTED: "Reddedildi",
};

const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  SENT: "bg-blue-100 text-blue-800",
  RECEIVED: "bg-emerald-100 text-emerald-800",
  ACCEPTED: "bg-green-200 text-green-900",
  REJECTED: "bg-red-100 text-red-800",
};

const DISCOVER_CATEGORIES = [
  {
    id: "FABRIC",
    title: "Penye Kumas",
    desc: "Suprem, Ribana, Interlok, Modal",
    icon: Layers,
    color: "bg-blue-50 border-blue-200 hover:border-blue-400",
    iconColor: "text-blue-600",
  },
  {
    id: "THREAD",
    title: "Iplik",
    desc: "Ring Combed, Compact, Penye Iplik",
    icon: Scissors,
    color: "bg-orange-50 border-orange-200 hover:border-orange-400",
    iconColor: "text-orange-600",
  },
  {
    id: "ELASTIC_MALE",
    title: "Erkek Bel Lastigi",
    desc: "Jakarli, Dokuma, Orme 30-40mm",
    icon: Package,
    color: "bg-purple-50 border-purple-200 hover:border-purple-400",
    iconColor: "text-purple-600",
  },
  {
    id: "ELASTIC_FEMALE",
    title: "Kadin Kulot Lastigi",
    desc: "Ince elastik 8-12mm, Dantel, Biye",
    icon: Package,
    color: "bg-pink-50 border-pink-200 hover:border-pink-400",
    iconColor: "text-pink-600",
  },
  {
    id: "LABEL",
    title: "Dokuma Etiket",
    desc: "Marka, Beden, Yikama talimati, Barkod",
    icon: Tag,
    color: "bg-teal-50 border-teal-200 hover:border-teal-400",
    iconColor: "text-teal-600",
  },
  {
    id: "FLEXIBLE_PACKAGING",
    title: "Esnek Ambalaj",
    desc: "Sase lamine poset, OPP, Zipli, Dijital baski",
    icon: Box,
    color: "bg-cyan-50 border-cyan-200 hover:border-cyan-400",
    iconColor: "text-cyan-600",
  },
  {
    id: "CARDBOARD_PACKAGING",
    title: "Karton Ambalaj",
    desc: "Kutu, Kartela, Askili etiket, Sleeve",
    icon: Box,
    color: "bg-amber-50 border-amber-200 hover:border-amber-400",
    iconColor: "text-amber-600",
  },
  {
    id: "CARDBOARD_STAND",
    title: "Karton Stand",
    desc: "Tezgah ustu, Ada tipi, Tam boy",
    icon: Box,
    color: "bg-lime-50 border-lime-200 hover:border-lime-400",
    iconColor: "text-lime-600",
  },
  {
    id: "SEWING_THREAD",
    title: "Dikis Ipligi",
    desc: "Overlok, Recme, Duz dikis",
    icon: Scissors,
    color: "bg-rose-50 border-rose-200 hover:border-rose-400",
    iconColor: "text-rose-600",
  },
  {
    id: "ACCESSORY",
    title: "Aksesuar",
    desc: "Aski, Cengelli igne, Silika jel, Bant",
    icon: Tag,
    color: "bg-indigo-50 border-indigo-200 hover:border-indigo-400",
    iconColor: "text-indigo-600",
  },
];

const REGIONS = [
  "Tum Turkiye",
  "Bursa",
  "Istanbul",
  "Denizli",
  "Gaziantep",
  "Adana",
  "Izmir",
];

// ─── Main Component ──────────────────────────────────────────────────

export default function AdminSuppliersPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("suppliers");

  // ── Tab 1: Kayitli Tedarikcilerim ──
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const limit = 20;

  // ── Tab 2: Tedarikci Kesfet ──
  const [discoverCategory, setDiscoverCategory] = useState<string | null>(null);
  const [discoverRegion, setDiscoverRegion] = useState("Tum Turkiye");
  const [discoverExtra, setDiscoverExtra] = useState("");
  const [discoverResults, setDiscoverResults] = useState<DiscoveredSupplier[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverSearched, setDiscoverSearched] = useState(false);
  const [savingDiscoverId, setSavingDiscoverId] = useState<string | null>(null);

  // ── Tab 3: Teklif Talepleri ──
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [editQuoteModalOpen, setEditQuoteModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    supplierId: "",
    category: "",
    product: "",
    quantity: "",
  });
  const [editQuoteForm, setEditQuoteForm] = useState({
    unitPrice: "",
    deliveryDays: "",
    notes: "",
    status: "PENDING" as QuoteStatus,
  });
  const [quoteSaving, setQuoteSaving] = useState(false);

  // ── Tab 4: Karsilastirma ──
  const [compareCategory, setCompareCategory] = useState("");

  // ─── Fetch Suppliers ───────────────────────────────────────────────

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    if (typeFilter) params.set("type", typeFilter);
    if (activeFilter) params.set("active", activeFilter);

    try {
      const res = await fetch(`/api/admin/suppliers?${params}`);
      const data = await res.json();
      setSuppliers(data.suppliers || []);
      setTotal(data.total || 0);
    } catch {
      // silent
    }
    setLoading(false);
  }, [page, search, typeFilter, activeFilter]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // ─── Fetch Quotes ──────────────────────────────────────────────────

  const fetchQuotes = useCallback(async () => {
    setQuotesLoading(true);
    try {
      const res = await fetch("/api/admin/suppliers/quotes");
      const data = await res.json();
      setQuotes(data.quotes || []);
    } catch {
      // silent
    }
    setQuotesLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === "quotes" || activeTab === "compare") {
      fetchQuotes();
    }
  }, [activeTab, fetchQuotes]);

  // ─── Supplier CRUD Handlers ────────────────────────────────────────

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSuppliers();
  };

  const openNewModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name,
      contactName: supplier.contactName || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      type: supplier.type,
      isActive: supplier.isActive,
      notes: supplier.notes || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);

    try {
      const url = editingId
        ? `/api/admin/suppliers/${editingId}`
        : "/api/admin/suppliers";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          contactName: form.contactName.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          type: form.type,
          isActive: form.isActive,
          notes: form.notes.trim() || null,
        }),
      });

      if (res.ok) {
        closeModal();
        fetchSuppliers();
      }
    } catch {
      // silent
    }
    setSaving(false);
  };

  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(`"${supplier.name}" tedarikcisi devre disi birakilacak. Emin misiniz?`))
      return;

    try {
      const res = await fetch(`/api/admin/suppliers/${supplier.id}`, {
        method: "DELETE",
      });
      if (res.ok) fetchSuppliers();
    } catch {
      // silent
    }
  };

  // ─── Discover Handlers ─────────────────────────────────────────────

  const handleDiscover = async () => {
    if (!discoverCategory) return;
    setDiscoverLoading(true);
    setDiscoverSearched(true);
    setDiscoverResults([]);

    try {
      const body: Record<string, string> = {
        category: discoverCategory,
        region: discoverRegion === "Tum Turkiye" ? "ALL" : discoverRegion.toUpperCase(),
      };
      if (discoverExtra.trim()) body.customQuery = discoverExtra.trim();

      const res = await fetch("/api/admin/suppliers/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("[discover] Error:", data.error);
        setDiscoverResults([]);
      } else {
        setDiscoverResults(
          (data.suppliers || []).map((s: DiscoveredSupplier, i: number) => ({
            ...s,
            id: `discover-${i}-${Date.now()}`,
            alreadySaved: suppliers.some(
              (existing) => existing.name.toLowerCase() === (s.name || "").toLowerCase()
            ),
          }))
        );
      }
    } catch (err) {
      console.error("[discover] Fetch error:", err);
    }
    setDiscoverLoading(false);
  };

  const handleSaveDiscovered = async (discovered: DiscoveredSupplier) => {
    setSavingDiscoverId(discovered.id);
    try {
      const res = await fetch("/api/admin/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: discovered.name,
          email: discovered.email,
          phone: discovered.phone,
          address: discovered.address,
          type: "FABRIC" as SupplierType,
          isActive: true,
          notes: `Kesfedilen tedarikci. Website: ${discovered.website || "-"}, Urunler: ${discovered.products || "-"}, Min. Siparis: ${discovered.minOrder || "-"}, Kapasite: ${discovered.capacity || "-"}`,
        }),
      });
      if (res.ok) {
        setDiscoverResults((prev) =>
          prev.map((s) =>
            s.id === discovered.id ? { ...s, alreadySaved: true } : s
          )
        );
        fetchSuppliers();
      }
    } catch {
      // silent
    }
    setSavingDiscoverId(null);
  };

  // ─── Quote Handlers ────────────────────────────────────────────────

  const handleCreateQuote = async () => {
    if (!quoteForm.supplierId || !quoteForm.product.trim() || !quoteForm.quantity) return;
    setQuoteSaving(true);

    try {
      const res = await fetch(
        `/api/admin/suppliers/${quoteForm.supplierId}/quotes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: quoteForm.category,
            product: quoteForm.product.trim(),
            quantity: Number(quoteForm.quantity),
          }),
        }
      );
      if (res.ok) {
        setQuoteModalOpen(false);
        setQuoteForm({ supplierId: "", category: "", product: "", quantity: "" });
        fetchQuotes();
      }
    } catch {
      // silent
    }
    setQuoteSaving(false);
  };

  const handleUpdateQuote = async () => {
    if (!editingQuote) return;
    setQuoteSaving(true);

    try {
      const res = await fetch(
        `/api/admin/suppliers/${editingQuote.supplierId}/quotes/${editingQuote.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            unitPrice: editQuoteForm.unitPrice ? Number(editQuoteForm.unitPrice) : null,
            deliveryDays: editQuoteForm.deliveryDays
              ? Number(editQuoteForm.deliveryDays)
              : null,
            notes: editQuoteForm.notes.trim() || null,
            status: editQuoteForm.status,
          }),
        }
      );
      if (res.ok) {
        setEditQuoteModalOpen(false);
        setEditingQuote(null);
        fetchQuotes();
      }
    } catch {
      // silent
    }
    setQuoteSaving(false);
  };

  const openEditQuoteModal = (quote: Quote) => {
    setEditingQuote(quote);
    setEditQuoteForm({
      unitPrice: quote.unitPrice ? String(quote.unitPrice) : "",
      deliveryDays: quote.deliveryDays ? String(quote.deliveryDays) : "",
      notes: quote.notes || "",
      status: quote.status,
    });
    setEditQuoteModalOpen(true);
  };

  // ─── Compare Data ──────────────────────────────────────────────────

  const filteredCompareQuotes = useMemo(() => {
    const received = quotes.filter(
      (q) => q.status === "RECEIVED" || q.status === "ACCEPTED"
    );
    if (!compareCategory) return received;
    return received.filter((q) => q.category === compareCategory);
  }, [quotes, compareCategory]);

  const cheapestId = useMemo(() => {
    if (filteredCompareQuotes.length === 0) return null;
    const withPrice = filteredCompareQuotes.filter((q) => q.unitPrice != null);
    if (withPrice.length === 0) return null;
    return withPrice.reduce((a, b) =>
      (a.unitPrice ?? Infinity) < (b.unitPrice ?? Infinity) ? a : b
    ).id;
  }, [filteredCompareQuotes]);

  const fastestId = useMemo(() => {
    if (filteredCompareQuotes.length === 0) return null;
    const withDays = filteredCompareQuotes.filter((q) => q.deliveryDays != null);
    if (withDays.length === 0) return null;
    return withDays.reduce((a, b) =>
      (a.deliveryDays ?? Infinity) < (b.deliveryDays ?? Infinity) ? a : b
    ).id;
  }, [filteredCompareQuotes]);

  // ─── Derived ───────────────────────────────────────────────────────

  const totalPages = Math.ceil(total / limit);

  // ─── Tab Config ────────────────────────────────────────────────────

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    {
      key: "suppliers",
      label: "Kayitli Tedarikcilerim",
      icon: <Truck className="h-4 w-4" />,
    },
    {
      key: "discover",
      label: "Tedarikci Kesfet",
      icon: <Search className="h-4 w-4" />,
    },
    {
      key: "quotes",
      label: "Teklif Talepleri",
      icon: <Send className="h-4 w-4" />,
    },
    {
      key: "compare",
      label: "Teklif Karsilastirma",
      icon: <BarChart3 className="h-4 w-4" />,
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tedarikci Yonetimi</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tedarikcilerinizi yonetin, yeni tedarikciler kesfedin ve teklifleri karsilastirin.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-lg border bg-gray-50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white text-[#1A1A1A] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: KAYITLI TEDARIKCILERIM                                  */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === "suppliers" && (
        <div>
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Tedarikciler</h2>
              <p className="text-sm text-gray-500">Toplam {total} tedarikci</p>
            </div>
            <Button variant="primary" size="sm" onClick={openNewModal}>
              <Plus className="h-4 w-4" />
              Yeni Tedarikci
            </Button>
          </div>

          {/* Type Tabs */}
          <div className="mt-6 flex flex-wrap gap-2">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setTypeFilter(tab.value);
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  typeFilter === tab.value
                    ? "border-[#7AC143] bg-[#7AC143]/10 font-medium text-[#7AC143]"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab.value === "" && <Filter className="h-3.5 w-3.5" />}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search + Active Filter */}
          <div className="mt-4 flex flex-col gap-3 lg:flex-row">
            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tedarikci adi, yetkili, e-posta, telefon..."
                  className="form-input w-full pl-10"
                />
              </div>
              <Button type="submit" variant="primary" size="sm">
                Ara
              </Button>
              {(search || activeFilter) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setActiveFilter("");
                    setPage(1);
                  }}
                >
                  <X className="h-3.5 w-3.5" /> Temizle
                </Button>
              )}
            </form>
            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value);
                setPage(1);
              }}
              className="form-input"
            >
              <option value="">Tum Durum</option>
              <option value="true">Aktif</option>
              <option value="false">Pasif</option>
            </select>
          </div>

          {/* Table */}
          <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#7AC143]" />
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-700">
                      Tedarikci Adi
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-700">Tur</th>
                    <th className="px-4 py-3 font-medium text-gray-700">
                      Yetkili Kisi
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-700">E-posta</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Telefon</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Islemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{supplier.name}</p>
                        {supplier.address && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 truncate max-w-[200px]">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {supplier.address}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            TYPE_COLORS[supplier.type]
                          }`}
                        >
                          {TYPE_LABELS[supplier.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {supplier.contactName || "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {supplier.email ? (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {supplier.email}
                          </span>
                        ) : (
                          "\u2014"
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {supplier.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {supplier.phone}
                          </span>
                        ) : (
                          "\u2014"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={supplier.isActive ? "success" : "outline"}>
                          {supplier.isActive ? "Aktif" : "Pasif"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(supplier)}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            title="Duzenle"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(supplier)}
                            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {suppliers.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-12 text-center text-gray-400"
                      >
                        {search || typeFilter || activeFilter
                          ? "Eslesen tedarikci bulunamadi"
                          : "Henuz tedarikci eklenmemis"}
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
                Sayfa {page} / {totalPages} - Toplam {total} tedarikci
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
                  let pn: number;
                  if (totalPages <= 5) pn = i + 1;
                  else if (page <= 3) pn = i + 1;
                  else if (page >= totalPages - 2) pn = totalPages - 4 + i;
                  else pn = page - 2 + i;
                  return (
                    <button
                      key={pn}
                      onClick={() => setPage(pn)}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${
                        page === pn
                          ? "border-[#7AC143] bg-[#7AC143]/10 font-medium text-[#7AC143]"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {pn}
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
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: TEDARIKCI KESFET                                        */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === "discover" && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Tedarikci Kesfet</h2>
          <p className="mt-1 text-sm text-gray-500">
            Kategoriye gore yeni tedarikciler bulun ve kaydedin.
          </p>

          {/* Category Grid */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {DISCOVER_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = discoverCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() =>
                    setDiscoverCategory(isSelected ? null : cat.id)
                  }
                  className={`flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? "border-[#7AC143] bg-[#7AC143]/5 ring-1 ring-[#7AC143]/30"
                      : cat.color
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 ${
                      isSelected ? "text-[#7AC143]" : cat.iconColor
                    }`}
                  />
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        isSelected ? "text-[#7AC143]" : "text-gray-900"
                      }`}
                    >
                      {cat.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">{cat.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Search Controls */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Bolge
              </label>
              <select
                value={discoverRegion}
                onChange={(e) => setDiscoverRegion(e.target.value)}
                className="form-input w-full"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Ek Arama Terimi (opsiyonel)
              </label>
              <input
                type="text"
                value={discoverExtra}
                onChange={(e) => setDiscoverExtra(e.target.value)}
                placeholder="orn: organik pamuk, %100 cotton..."
                className="form-input w-full"
              />
            </div>
            <Button
              variant="primary"
              onClick={handleDiscover}
              disabled={!discoverCategory || discoverLoading}
              loading={discoverLoading}
            >
              <Search className="h-4 w-4" />
              Tedarikci Ara
            </Button>
          </div>

          {/* Loading Skeleton */}
          {discoverLoading && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl border bg-white p-5"
                >
                  <div className="h-5 w-3/4 rounded bg-gray-200" />
                  <div className="mt-3 h-4 w-full rounded bg-gray-100" />
                  <div className="mt-2 h-4 w-2/3 rounded bg-gray-100" />
                  <div className="mt-2 h-4 w-1/2 rounded bg-gray-100" />
                  <div className="mt-4 h-9 w-full rounded bg-gray-200" />
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {!discoverLoading && discoverSearched && (
            <>
              {discoverResults.length > 0 ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {discoverResults.map((result) => (
                    <div
                      key={result.id}
                      className="rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <h3 className="text-base font-bold text-gray-900">
                          {result.name}
                        </h3>
                        {result.alreadySaved && (
                          <Badge variant="success" className="shrink-0">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Kayitli
                          </Badge>
                        )}
                      </div>

                      <div className="mt-3 space-y-1.5 text-sm text-gray-600">
                        {result.address && (
                          <p className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                            {result.address}
                          </p>
                        )}
                        {result.phone && (
                          <p className="flex items-center gap-2">
                            <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                            {result.phone}
                          </p>
                        )}
                        {result.email && (
                          <p className="flex items-center gap-2">
                            <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                            {result.email}
                          </p>
                        )}
                        {result.website && (
                          <p className="flex items-center gap-2">
                            <Globe className="h-4 w-4 shrink-0 text-gray-400" />
                            <a
                              href={result.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#7AC143] underline"
                            >
                              {result.website}
                            </a>
                          </p>
                        )}
                      </div>

                      {(result.products || result.minOrder || result.capacity) && (
                        <div className="mt-3 space-y-1 border-t pt-3 text-xs text-gray-500">
                          {result.products && (
                            <p>
                              <span className="font-medium text-gray-700">
                                Urunler:
                              </span>{" "}
                              {result.products}
                            </p>
                          )}
                          {result.minOrder && (
                            <p>
                              <span className="font-medium text-gray-700">
                                Min. Siparis:
                              </span>{" "}
                              {result.minOrder}
                            </p>
                          )}
                          {result.capacity && (
                            <p>
                              <span className="font-medium text-gray-700">
                                Kapasite:
                              </span>{" "}
                              {result.capacity}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-4">
                        {result.alreadySaved ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            disabled
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Kayitli
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full"
                            loading={savingDiscoverId === result.id}
                            onClick={() => handleSaveDiscovered(result)}
                          >
                            <Plus className="h-4 w-4" />
                            Tedarikci Olarak Kaydet
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-8 flex flex-col items-center py-12 text-center">
                  <Search className="h-12 w-12 text-gray-300" />
                  <p className="mt-3 text-sm text-gray-500">
                    Bu kriterlere uygun tedarikci bulunamadi. Farkli bir kategori
                    veya bolge deneyin.
                  </p>
                </div>
              )}

              {/* Disclaimer */}
              <div className="mt-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs text-amber-800">
                  Sonuclar Google + Gemini AI ile bulundu. Bilgileri dogrulamaniz
                  onerilir.
                </p>
              </div>
            </>
          )}

          {/* Empty State */}
          {!discoverLoading && !discoverSearched && (
            <div className="mt-10 flex flex-col items-center py-12 text-center">
              <Search className="h-16 w-16 text-gray-200" />
              <p className="mt-4 text-sm text-gray-500">
                Yukaridaki kategorilerden birini secin ve arama yapin.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: TEKLIF TALEPLERI                                        */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === "quotes" && (
        <div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Teklif Talepleri
              </h2>
              <p className="text-sm text-gray-500">
                Tedarikcilerinizden alinan tum teklifler
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setQuoteModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Yeni Teklif Talebi
            </Button>
          </div>

          {/* Quotes Table */}
          <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
            {quotesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#7AC143]" />
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-700">
                      Tedarikci
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-700">
                      Kategori
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-700">Urun</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Miktar</th>
                    <th className="px-4 py-3 font-medium text-gray-700">
                      Birim Fiyat
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-700">Toplam</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Tarih</th>
                    <th className="px-4 py-3 font-medium text-gray-700">
                      Islemler
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {quotes.map((quote) => (
                    <tr key={quote.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {quote.supplierName}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{quote.category}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                        {quote.product}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {quote.quantity.toLocaleString("tr-TR")}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {quote.unitPrice != null
                          ? `${quote.unitPrice.toLocaleString("tr-TR", {
                              minimumFractionDigits: 2,
                            })} TL`
                          : "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {quote.totalPrice != null
                          ? `${quote.totalPrice.toLocaleString("tr-TR", {
                              minimumFractionDigits: 2,
                            })} TL`
                          : "\u2014"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            QUOTE_STATUS_COLORS[quote.status]
                          }`}
                        >
                          {QUOTE_STATUS_LABELS[quote.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(quote.createdAt).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openEditQuoteModal(quote)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Duzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {quotes.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-12 text-center text-gray-400"
                      >
                        <FileText className="mx-auto h-8 w-8 text-gray-300" />
                        <p className="mt-2">Henuz teklif talebi olusturulmamis</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: TEKLIF KARSILASTIRMA                                    */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === "compare" && (
        <div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Teklif Karsilastirma
              </h2>
              <p className="text-sm text-gray-500">
                Alinan teklifleri yan yana karsilastirin
              </p>
            </div>
            <div>
              <select
                value={compareCategory}
                onChange={(e) => setCompareCategory(e.target.value)}
                className="form-input"
              >
                <option value="">Tum Kategoriler</option>
                {[
                  ...new Set(
                    quotes
                      .filter(
                        (q) =>
                          q.status === "RECEIVED" || q.status === "ACCEPTED"
                      )
                      .map((q) => q.category)
                  ),
                ].map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full bg-emerald-200" />
              En Ucuz
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full bg-blue-200" />
              En Hizli
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 text-amber-500" />
              Onerilen
            </span>
          </div>

          {/* Compare Table */}
          <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
            {quotesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#7AC143]" />
              </div>
            ) : filteredCompareQuotes.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-700">
                      Tedarikci
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-700">Urun</th>
                    <th className="px-4 py-3 font-medium text-gray-700">
                      Birim Fiyat
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-700">
                      Min. Siparis
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-700">
                      Teslimat Suresi
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-700">
                      Gecerlilik
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredCompareQuotes.map((quote) => {
                    const isCheapest = quote.id === cheapestId;
                    const isFastest = quote.id === fastestId;
                    const isRecommended = isCheapest && isFastest;

                    return (
                      <tr
                        key={quote.id}
                        className={`hover:bg-gray-50 ${
                          isCheapest && !isFastest
                            ? "bg-emerald-50/50"
                            : isFastest && !isCheapest
                            ? "bg-blue-50/50"
                            : isRecommended
                            ? "bg-amber-50/50"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {quote.supplierName}
                            </span>
                            {isRecommended && (
                              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                          {quote.product}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-medium ${
                              isCheapest
                                ? "text-emerald-700"
                                : "text-gray-900"
                            }`}
                          >
                            {quote.unitPrice != null
                              ? `${quote.unitPrice.toLocaleString("tr-TR", {
                                  minimumFractionDigits: 2,
                                })} TL`
                              : "\u2014"}
                          </span>
                          {isCheapest && (
                            <Badge
                              variant="success"
                              className="ml-2 text-[10px]"
                            >
                              En Ucuz
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {quote.quantity.toLocaleString("tr-TR")}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`${
                              isFastest ? "font-medium text-blue-700" : "text-gray-600"
                            }`}
                          >
                            {quote.deliveryDays != null
                              ? `${quote.deliveryDays} gun`
                              : "\u2014"}
                          </span>
                          {isFastest && (
                            <Badge
                              variant="new"
                              className="ml-2 bg-blue-100 text-blue-800 text-[10px]"
                            >
                              En Hizli
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {quote.validUntil
                            ? new Date(quote.validUntil).toLocaleDateString(
                                "tr-TR"
                              )
                            : "\u2014"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              QUOTE_STATUS_COLORS[quote.status]
                            }`}
                          >
                            {QUOTE_STATUS_LABELS[quote.status]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center py-12 text-center text-gray-400">
                <BarChart3 className="h-8 w-8 text-gray-300" />
                <p className="mt-2">
                  Karsilastirilacak teklif bulunamadi. Oncelikle tedarikcilerden
                  teklif alin.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Yeni / Duzenle Tedarikci                                */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <Truck className="h-5 w-5 text-[#7AC143]" />
                {editingId ? "Tedarikci Duzenle" : "Yeni Tedarikci"}
              </h2>
              <button
                onClick={closeModal}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Tedarikci Adi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Tedarikci firma adi"
                    className="form-input w-full"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Tur <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        type: e.target.value as SupplierType,
                      })
                    }
                    className="form-input w-full"
                  >
                    {(Object.keys(TYPE_LABELS) as SupplierType[]).map((key) => (
                      <option key={key} value={key}>
                        {TYPE_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contact Person */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Yetkili Kisi
                  </label>
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={(e) =>
                      setForm({ ...form, contactName: e.target.value })
                    }
                    placeholder="Ad Soyad"
                    className="form-input w-full"
                  />
                </div>

                {/* Email + Phone */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      E-posta
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      placeholder="ornek@firma.com"
                      className="form-input w-full"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      placeholder="0XXX XXX XX XX"
                      className="form-input w-full"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Adres
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    placeholder="Firma adresi"
                    className="form-input w-full"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Notlar
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    rows={3}
                    placeholder="Ek notlar..."
                    className="form-input w-full resize-none"
                  />
                </div>

                {/* Active Toggle */}
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) =>
                        setForm({ ...form, isActive: e.target.checked })
                      }
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[#7AC143] peer-checked:after:translate-x-full" />
                  </label>
                  <span className="text-sm text-gray-700">
                    {form.isActive ? "Aktif" : "Pasif"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
              <Button variant="ghost" size="sm" onClick={closeModal}>
                Iptal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                loading={saving}
              >
                {editingId ? "Guncelle" : "Kaydet"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Yeni Teklif Talebi                                      */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {quoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <Send className="h-5 w-5 text-[#7AC143]" />
                Yeni Teklif Talebi
              </h2>
              <button
                onClick={() => setQuoteModalOpen(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Supplier Select */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Tedarikci <span className="text-red-500">*</span>
                </label>
                <select
                  value={quoteForm.supplierId}
                  onChange={(e) =>
                    setQuoteForm({ ...quoteForm, supplierId: e.target.value })
                  }
                  className="form-input w-full"
                >
                  <option value="">Tedarikci secin...</option>
                  {suppliers
                    .filter((s) => s.isActive)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({TYPE_LABELS[s.type]})
                      </option>
                    ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Kategori
                </label>
                <select
                  value={quoteForm.category}
                  onChange={(e) =>
                    setQuoteForm({ ...quoteForm, category: e.target.value })
                  }
                  className="form-input w-full"
                >
                  <option value="">Kategori secin...</option>
                  {DISCOVER_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.title}>
                      {cat.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Details */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Urun Detaylari <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={quoteForm.product}
                  onChange={(e) =>
                    setQuoteForm({ ...quoteForm, product: e.target.value })
                  }
                  rows={3}
                  placeholder="Urun adi, ozellikleri, renk, gramaj vb..."
                  className="form-input w-full resize-none"
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Miktar <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={quoteForm.quantity}
                  onChange={(e) =>
                    setQuoteForm({ ...quoteForm, quantity: e.target.value })
                  }
                  placeholder="orn: 5000"
                  className="form-input w-full"
                  min={1}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuoteModalOpen(false)}
              >
                Iptal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateQuote}
                disabled={
                  quoteSaving ||
                  !quoteForm.supplierId ||
                  !quoteForm.product.trim() ||
                  !quoteForm.quantity
                }
                loading={quoteSaving}
              >
                <Send className="h-4 w-4" />
                Teklif Iste
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Teklif Duzenle                                          */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {editQuoteModalOpen && editingQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <Pencil className="h-5 w-5 text-[#7AC143]" />
                Teklif Duzenle
              </h2>
              <button
                onClick={() => {
                  setEditQuoteModalOpen(false);
                  setEditingQuote(null);
                }}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Info */}
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <p className="font-medium text-gray-900">
                  {editingQuote.supplierName}
                </p>
                <p className="text-gray-500">
                  {editingQuote.product} - {editingQuote.quantity.toLocaleString("tr-TR")}{" "}
                  adet
                </p>
              </div>

              {/* Status */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Durum
                </label>
                <select
                  value={editQuoteForm.status}
                  onChange={(e) =>
                    setEditQuoteForm({
                      ...editQuoteForm,
                      status: e.target.value as QuoteStatus,
                    })
                  }
                  className="form-input w-full"
                >
                  {(Object.keys(QUOTE_STATUS_LABELS) as QuoteStatus[]).map(
                    (key) => (
                      <option key={key} value={key}>
                        {QUOTE_STATUS_LABELS[key]}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Unit Price */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Birim Fiyat (TL)
                </label>
                <input
                  type="number"
                  value={editQuoteForm.unitPrice}
                  onChange={(e) =>
                    setEditQuoteForm({
                      ...editQuoteForm,
                      unitPrice: e.target.value,
                    })
                  }
                  placeholder="orn: 12.50"
                  className="form-input w-full"
                  step="0.01"
                  min={0}
                />
              </div>

              {/* Delivery Days */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Teslimat Suresi (gun)
                </label>
                <input
                  type="number"
                  value={editQuoteForm.deliveryDays}
                  onChange={(e) =>
                    setEditQuoteForm({
                      ...editQuoteForm,
                      deliveryDays: e.target.value,
                    })
                  }
                  placeholder="orn: 14"
                  className="form-input w-full"
                  min={1}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Notlar
                </label>
                <textarea
                  value={editQuoteForm.notes}
                  onChange={(e) =>
                    setEditQuoteForm({
                      ...editQuoteForm,
                      notes: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Ek notlar..."
                  className="form-input w-full resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditQuoteModalOpen(false);
                  setEditingQuote(null);
                }}
              >
                Iptal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleUpdateQuote}
                loading={quoteSaving}
              >
                Guncelle
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
