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
  Eye,
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

type SupplierType = "FABRIC" | "THREAD" | "ELASTIC_MALE" | "ELASTIC_FEMALE" | "LABEL" | "FLEXIBLE_PACKAGING" | "CARDBOARD_PACKAGING" | "CARDBOARD_STAND" | "SEWING_THREAD" | "ACCESSORY" | "ELASTIC" | "PACKAGING_MAT";
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  materials: any;
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

const TYPE_LABELS: Record<string, string> = {
  FABRIC: "Penye Kumaş",
  THREAD: "İplik",
  ELASTIC_MALE: "Erkek Bel Lastiği",
  ELASTIC_FEMALE: "Kadın Külot Lastiği",
  LABEL: "Dokuma Etiket",
  FLEXIBLE_PACKAGING: "Esnek Ambalaj",
  CARDBOARD_PACKAGING: "Karton Ambalaj",
  CARDBOARD_STAND: "Karton Stand",
  SEWING_THREAD: "Dikiş İpliği",
  ACCESSORY: "Aksesuar",
  ELASTIC: "Lastik (Eski)",
  PACKAGING_MAT: "Ambalaj (Eski)",
};

const TYPE_COLORS: Record<string, string> = {
  FABRIC: "bg-green-100 text-green-700",
  THREAD: "bg-orange-100 text-orange-700",
  ELASTIC_MALE: "bg-red-100 text-red-700",
  ELASTIC_FEMALE: "bg-pink-100 text-pink-700",
  LABEL: "bg-purple-100 text-purple-700",
  FLEXIBLE_PACKAGING: "bg-emerald-100 text-emerald-700",
  CARDBOARD_PACKAGING: "bg-amber-100 text-amber-700",
  CARDBOARD_STAND: "bg-lime-100 text-lime-700",
  SEWING_THREAD: "bg-rose-100 text-rose-700",
  ACCESSORY: "bg-indigo-100 text-indigo-700",
  ELASTIC: "bg-purple-100 text-purple-700",
  PACKAGING_MAT: "bg-cyan-100 text-cyan-700",
};

const TYPE_TABS: { value: string; label: string }[] = [
  { value: "", label: "Tümü" },
  { value: "FABRIC", label: "Penye Kumaş" },
  { value: "THREAD", label: "İplik" },
  { value: "ELASTIC_MALE", label: "Erkek Lastiği" },
  { value: "ELASTIC_FEMALE", label: "Kadın Lastiği" },
  { value: "LABEL", label: "Etiket" },
  { value: "FLEXIBLE_PACKAGING", label: "Esnek Ambalaj" },
  { value: "CARDBOARD_PACKAGING", label: "Karton Ambalaj" },
  { value: "CARDBOARD_STAND", label: "Karton Stand" },
  { value: "SEWING_THREAD", label: "Dikiş İpliği" },
  { value: "ACCESSORY", label: "Aksesuar" },
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
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);
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

  // ── Tab 3: BOM Stand Paketi ──
  type QuoteModalMode = "stand" | "manual";
  const [quoteModalMode, setQuoteModalMode] = useState<QuoteModalMode>("stand");
  const [standCounts, setStandCounts] = useState({ A: 0, B: 0, C: 0 });
  const [bomCalculated, setBomCalculated] = useState(false);
  const [bomSending, setBomSending] = useState(false);
  const [bomResult, setBomResult] = useState<{ success: number; fail: number } | null>(null);

  interface BomMaterialRow {
    key: string;
    label: string;
    quantity: number;
    unit: string;
    supplierTypes: SupplierType[];
    selectedSupplierIds: string[];
    productDetails: string;
  }
  const [bomMaterials, setBomMaterials] = useState<BomMaterialRow[]>([]);

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
    if (!confirm(`"${supplier.name}" tedarikçisi kalıcı olarak silinecek. Bu işlem geri alınamaz. Emin misiniz?`))
      return;

    try {
      const res = await fetch(`/api/admin/suppliers/${supplier.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchSuppliers();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Silme işlemi başarısız oldu.");
      }
    } catch {
      alert("Bağlantı hatası. Lütfen tekrar deneyin.");
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

  // Map discover category to SupplierType
  const categoryToSupplierType = (cat: string | null): string => {
    const validTypes = [
      "FABRIC", "THREAD", "ELASTIC_MALE", "ELASTIC_FEMALE", "LABEL",
      "FLEXIBLE_PACKAGING", "CARDBOARD_PACKAGING", "CARDBOARD_STAND",
      "SEWING_THREAD", "ACCESSORY",
    ];
    if (cat && validTypes.includes(cat)) return cat;
    return "FABRIC";
  };

  const handleSaveDiscovered = async (discovered: DiscoveredSupplier) => {
    setSavingDiscoverId(discovered.id);
    try {
      const res = await fetch("/api/admin/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: discovered.name,
          email: discovered.email || "",
          phone: discovered.phone || "",
          address: discovered.address || "",
          type: categoryToSupplierType(discoverCategory),
          isActive: true,
          minOrderQty: discovered.minOrder || null,
          materials: JSON.stringify({
            products: discovered.products || "",
            capacity: discovered.capacity || "",
            website: discovered.website || "",
            minOrder: discovered.minOrder || "",
            discoverCategory: discoverCategory,
          }),
          notes: `Ürünler: ${discovered.products || "-"}\nKapasite: ${discovered.capacity || "-"}\nMin. Sipariş: ${discovered.minOrder || "-"}\nWebsite: ${discovered.website || "-"}`,
        }),
      });
      if (res.ok) {
        setDiscoverResults((prev) =>
          prev.map((s) =>
            s.id === discovered.id ? { ...s, alreadySaved: true } : s
          )
        );
        fetchSuppliers();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`Kayıt başarısız: ${data.error || "Bilinmeyen hata"}${data.details ? "\n" + JSON.stringify(data.details) : ""}`);
      }
    } catch (err) {
      alert("Bağlantı hatası. Lütfen tekrar deneyin.");
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

  // ─── BOM Stand Paketi Hesaplama ──────────────────────────────────

  const calculateStandBOM = () => {
    const a = standCounts.A || 0;
    const b = standCounts.B || 0;
    const c = standCounts.C || 0;

    // Stand A = 50 adet: 25 EB Siyah + 25 KK Ten
    // Stand B = 100 adet: 25 EB Siyah + 25 EB Lacivert + 25 KK Siyah + 25 KK Ten
    // Stand C = 150 adet: 25 EB Siyah + 25 EB Lacivert + 25 EB Gri + 25 KK Siyah + 25 KK Beyaz + 25 KK Ten
    const ebCount = a * 25 + b * 50 + c * 75; // Erkek Boxer toplam
    const kkCount = a * 25 + b * 50 + c * 75; // Kadin Kulot toplam
    const totalProducts = ebCount + kkCount;

    if (totalProducts === 0) return;

    // BOM hesaplama (birim tuketim degerleri)
    // EB: kumasi 0.0375 kg, bel lastik 0.85m, bacak lastik 0.70m, iplik 9.25m, etiket 1, ambalaj 1
    // KK: kumasi 0.022 kg, bel lastik 0.68m, bacak lastik 0.63m, iplik 7.5m, etiket 1, ambalaj 1
    const fabricKg = parseFloat((ebCount * 0.0375 + kkCount * 0.022).toFixed(2));
    const elasticMaleM = parseFloat((ebCount * 0.85).toFixed(2)); // Erkek bel lastigi
    const elasticMaleLegM = parseFloat((ebCount * 0.70).toFixed(2)); // Erkek bacak lastigi
    const elasticFemaleM = parseFloat((kkCount * 0.68).toFixed(2)); // Kadin bel lastigi
    const elasticFemaleLegM = parseFloat((kkCount * 0.63).toFixed(2)); // Kadin bacak lastigi
    const sewingThreadM = parseFloat((ebCount * 9.25 + kkCount * 7.5).toFixed(2));
    const labels = totalProducts;
    const packaging = totalProducts;

    // Detay metinleri
    const ebDetail = [];
    if (a > 0) ebDetail.push(`Stand A: ${a * 25} adet (Siyah)`);
    if (b > 0) ebDetail.push(`Stand B: ${b * 25} Siyah + ${b * 25} Lacivert`);
    if (c > 0) ebDetail.push(`Stand C: ${c * 25} Siyah + ${c * 25} Lacivert + ${c * 25} Gri`);

    const kkDetail = [];
    if (a > 0) kkDetail.push(`Stand A: ${a * 25} adet (Ten)`);
    if (b > 0) kkDetail.push(`Stand B: ${b * 25} Siyah + ${b * 25} Ten`);
    if (c > 0) kkDetail.push(`Stand C: ${c * 25} Siyah + ${c * 25} Beyaz + ${c * 25} Ten`);

    // Renk dagilimi hesapla
    const ebSiyah = a * 25 + b * 25 + c * 25;
    const ebLacivert = b * 25 + c * 25;
    const ebGri = c * 25;
    const kkSiyah = b * 25 + c * 25;
    const kkBeyaz = c * 25;
    const kkTen = a * 25 + b * 25 + c * 25;

    const ebRenkler = [
      ebSiyah > 0 ? `Siyah: ${ebSiyah} adet` : "",
      ebLacivert > 0 ? `Lacivert: ${ebLacivert} adet` : "",
      ebGri > 0 ? `Gri: ${ebGri} adet` : "",
    ].filter(Boolean).join(", ");

    const kkRenkler = [
      kkSiyah > 0 ? `Siyah: ${kkSiyah} adet` : "",
      kkBeyaz > 0 ? `Beyaz: ${kkBeyaz} adet` : "",
      kkTen > 0 ? `Ten Rengi: ${kkTen} adet` : "",
    ].filter(Boolean).join(", ");

    const materials: BomMaterialRow[] = [
      {
        key: "fabric",
        label: "Penye Kumas",
        quantity: fabricKg,
        unit: "kg",
        supplierTypes: ["FABRIC"],
        selectedSupplierIds: [],
        productDetails: [
          `Penye Suprem Kumas (%95 Pamuk, %5 Elastan)`,
          `Iplik: Ring Combed (Penye), Ne 30/1`,
          ``,
          `ERKEK BOXER (Gramaj: 180 gr/m2):`,
          ...(ebSiyah > 0 ? [`  Siyah: ${ebSiyah} adet = ${(ebSiyah * 0.0375).toFixed(2)} kg`] : []),
          ...(ebLacivert > 0 ? [`  Lacivert: ${ebLacivert} adet = ${(ebLacivert * 0.0375).toFixed(2)} kg`] : []),
          ...(ebGri > 0 ? [`  Gri: ${ebGri} adet = ${(ebGri * 0.0375).toFixed(2)} kg`] : []),
          `  Erkek Boxer Toplam: ${ebCount} adet = ${(ebCount * 0.0375).toFixed(2)} kg`,
          ``,
          `KADIN KULOT (Gramaj: 160 gr/m2):`,
          ...(kkSiyah > 0 ? [`  Siyah: ${kkSiyah} adet = ${(kkSiyah * 0.022).toFixed(2)} kg`] : []),
          ...(kkBeyaz > 0 ? [`  Beyaz: ${kkBeyaz} adet = ${(kkBeyaz * 0.022).toFixed(2)} kg`] : []),
          ...(kkTen > 0 ? [`  Ten Rengi: ${kkTen} adet = ${(kkTen * 0.022).toFixed(2)} kg`] : []),
          `  Kadin Kulot Toplam: ${kkCount} adet = ${(kkCount * 0.022).toFixed(2)} kg`,
          ``,
          `GENEL TOPLAM: ${fabricKg} kg`,
          `Bedenler: S, M, L, XL, XXL (her renk/bedenden esit dagilim)`,
          `Kullanim: Ic giyim uretimi (boxer + kulot)`,
        ].join("\n"),
      },
      {
        key: "elastic_male",
        label: "Erkek Bel Lastigi",
        quantity: elasticMaleM,
        unit: "m",
        supplierTypes: ["ELASTIC_MALE"],
        selectedSupplierIds: [],
        productDetails: [
          `Jakarli Bel Lastigi - Erkek Boxer icin`,
          `Genislik: 30-40mm, VORTE logo jakarlı dokuma`,
          `Renkler: ${ebRenkler}`,
          `Toplam: ${ebCount} adet boxer x 0.85m = ${elasticMaleM} metre`,
          `Malzeme: Polyester + elastan, yumusak dokulu`,
        ].join("\n"),
      },
      {
        key: "elastic_male_leg",
        label: "Erkek Bacak Lastigi",
        quantity: elasticMaleLegM,
        unit: "m",
        supplierTypes: ["ELASTIC_MALE"],
        selectedSupplierIds: [],
        productDetails: [
          `Bacak (Paca) Lastigi - Erkek Boxer icin`,
          `Genislik: 8-12mm, duz elastik`,
          `Toplam: ${ebCount} adet boxer x 2 bacak x 0.35m = ${elasticMaleLegM} metre`,
        ].join("\n"),
      },
      {
        key: "elastic_female",
        label: "Kadin Bel Lastigi",
        quantity: elasticFemaleM,
        unit: "m",
        supplierTypes: ["ELASTIC_FEMALE"],
        selectedSupplierIds: [],
        productDetails: [
          `Ince Bel Lastigi - Kadin Kulot icin`,
          `Genislik: 8-12mm, yumusak dantel kenarli`,
          `Renkler: ${kkRenkler}`,
          `Toplam: ${kkCount} adet kulot x 0.68m = ${elasticFemaleM} metre`,
        ].join("\n"),
      },
      {
        key: "elastic_female_leg",
        label: "Kadin Bacak Lastigi",
        quantity: elasticFemaleLegM,
        unit: "m",
        supplierTypes: ["ELASTIC_FEMALE"],
        selectedSupplierIds: [],
        productDetails: [
          `Bacak Lastigi / Biye - Kadin Kulot icin`,
          `Genislik: 6-10mm, yumusak elastik veya biye`,
          `Toplam: ${kkCount} adet kulot x 2 bacak x 0.315m = ${elasticFemaleLegM} metre`,
        ].join("\n"),
      },
      {
        key: "sewing_thread",
        label: "Dikis Ipligi",
        quantity: sewingThreadM,
        unit: "m",
        supplierTypes: ["SEWING_THREAD"],
        selectedSupplierIds: [],
        productDetails: [
          `Dikis Ipligi - Overlok + Recme + Duz Dikis`,
          `Erkek Boxer: ${ebCount} adet x 9.25m (4 iplik overlok + recme)`,
          `Kadin Kulot: ${kkCount} adet x 7.5m (4 iplik overlok + recme)`,
          `Toplam: ${sewingThreadM} metre`,
          `Renk: Siyah, Beyaz, Gri, Lacivert, Ten (urun rengine uygun)`,
        ].join("\n"),
      },
      {
        key: "label",
        label: "Dokuma Etiket",
        quantity: labels,
        unit: "adet",
        supplierTypes: ["LABEL"],
        selectedSupplierIds: [],
        productDetails: [
          `Dokuma Etiket Seti - ${totalProducts} adet urun icin`,
          `1. Marka Etiketi: VORTE logo, arka bel ortasi (${totalProducts} adet)`,
          `2. Beden Etiketi: S/M/L/XL/XXL (${totalProducts} adet)`,
          `3. Yikama Talimati: ISO 3758 semboller + %95 Pamuk %5 Elastan + Made in Turkey (${totalProducts} adet)`,
          `4. GTIN Barkod Etiketi: EAN-13 barkod (${totalProducts} adet)`,
          `Toplam: ${totalProducts * 4} adet etiket (4 cesit x ${totalProducts} urun)`,
        ].join("\n"),
      },
      {
        key: "packaging",
        label: "Ambalaj",
        quantity: packaging,
        unit: "adet",
        supplierTypes: ["FLEXIBLE_PACKAGING", "CARDBOARD_PACKAGING"],
        selectedSupplierIds: [],
        productDetails: [
          `Tekli Urun Ambalaji - ${totalProducts} adet`,
          `OPP Seffaf Poset: ${totalProducts} adet (urun gorunur, barkodlu)`,
          `Karton Insert/Kartela: ${totalProducts} adet (marka baskili)`,
          `Ic Koli (12'li): ${Math.ceil(totalProducts / 12)} adet`,
          `Dis Koli (5 kat oluklu mukavva): ${Math.ceil(totalProducts / 24)} adet`,
        ].join("\n"),
      },
    ];

    // Karton Stand satirlari
    if (a > 0) {
      materials.push({
        key: "stand_a",
        label: "Karton Stand A",
        quantity: a,
        unit: "adet",
        supplierTypes: ["CARDBOARD_STAND"],
        selectedSupplierIds: [],
        productDetails: [
          `Stand A - Tek Yonlu Tezgah Ustu (${a} adet)`,
          `Kapasite: 50 urun/stand`,
          `Icerik: 25 Erkek Boxer Siyah + 25 Kadin Kulot Ten Rengi`,
          `Olculer: Tezgah ustu boyut, tek yonlu sergileme`,
          `Malzeme: 3 katli oluklu mukavva, VORTE marka baskili`,
        ].join("\n"),
      });
    }
    if (b > 0) {
      materials.push({
        key: "stand_b",
        label: "Karton Stand B",
        quantity: b,
        unit: "adet",
        supplierTypes: ["CARDBOARD_STAND"],
        selectedSupplierIds: [],
        productDetails: [
          `Stand B - Cift Yonlu Ada Tipi (${b} adet)`,
          `Kapasite: 100 urun/stand`,
          `Icerik: 25 EB Siyah + 25 EB Lacivert + 25 KK Siyah + 25 KK Ten`,
          `Olculer: Cift yonlu ada tipi, 360 derece sergileme`,
          `Malzeme: 3 katli oluklu mukavva, VORTE marka baskili`,
        ].join("\n"),
      });
    }
    if (c > 0) {
      materials.push({
        key: "stand_c",
        label: "Karton Stand C",
        quantity: c,
        unit: "adet",
        supplierTypes: ["CARDBOARD_STAND"],
        selectedSupplierIds: [],
        productDetails: [
          `Stand C - Tam Boy Cift Yonlu (${c} adet)`,
          `Kapasite: 150 urun/stand`,
          `Icerik: 25 EB Siyah + 25 EB Lacivert + 25 EB Gri + 25 KK Siyah + 25 KK Beyaz + 25 KK Ten`,
          `Olculer: 145x45x45 cm, tam boy cift yonlu`,
          `Malzeme: 5 katli oluklu mukavva, VORTE marka baskili, laminasyonlu`,
        ].join("\n"),
      });
    }

    setBomMaterials(materials);
    setBomCalculated(true);
    setBomResult(null);
  };

  const toggleBomSupplier = (key: string, supplierId: string) => {
    setBomMaterials((prev) =>
      prev.map((m) => {
        if (m.key !== key) return m;
        const ids = m.selectedSupplierIds.includes(supplierId)
          ? m.selectedSupplierIds.filter((id) => id !== supplierId)
          : [...m.selectedSupplierIds, supplierId];
        return { ...m, selectedSupplierIds: ids };
      })
    );
  };

  const selectAllSuppliersForRow = (key: string) => {
    setBomMaterials((prev) =>
      prev.map((m) => {
        if (m.key !== key) return m;
        const available = suppliersForTypes(m.supplierTypes);
        const allSelected = available.every((s) => m.selectedSupplierIds.includes(s.id));
        return {
          ...m,
          selectedSupplierIds: allSelected ? [] : available.map((s) => s.id),
        };
      })
    );
  };

  const suppliersForTypes = (types: SupplierType[]) =>
    suppliers.filter((s) => s.isActive && types.includes(s.type));

  const totalSelectedSuppliers = bomMaterials.reduce(
    (sum, m) => sum + m.selectedSupplierIds.length, 0
  );

  const handleSendAllBomQuotes = async () => {
    if (totalSelectedSuppliers === 0) return;

    setBomSending(true);
    setBomResult(null);
    let success = 0;
    let fail = 0;

    for (const row of bomMaterials) {
      for (const supplierId of row.selectedSupplierIds) {
        try {
          const res = await fetch(
            `/api/admin/suppliers/${supplierId}/quotes`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                category: row.label,
                productDetails: row.productDetails,
                quantity: `${row.quantity} ${row.unit}`,
              }),
            }
          );
          if (res.ok) {
            success++;
          } else {
            fail++;
          }
        } catch {
          fail++;
        }
      }
    }

    setBomResult({ success, fail });
    setBomSending(false);
    if (success > 0) fetchQuotes();
  };

  const resetBomModal = () => {
    setQuoteModalMode("stand");
    setStandCounts({ A: 0, B: 0, C: 0 });
    setBomCalculated(false);
    setBomMaterials([]);
    setBomResult(null);
    setBomSending(false);
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
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
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
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
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
                            onClick={() => setDetailSupplier(supplier)}
                            className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                            title="Detay"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
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
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
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
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
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
              onClick={() => { resetBomModal(); setQuoteForm({ supplierId: "", category: "", product: "", quantity: "" }); setQuoteModalOpen(true); }}
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
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
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
      {/* MODAL: Tedarikci Detay */}
      {detailSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <button
              onClick={() => setDetailSupplier(null)}
              className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-gray-900 pr-8">{detailSupplier.name}</h3>
            <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[detailSupplier.type]}`}>
              {TYPE_LABELS[detailSupplier.type]}
            </span>
            <Badge variant={detailSupplier.isActive ? "success" : "outline"} className="ml-2">
              {detailSupplier.isActive ? "Aktif" : "Pasif"}
            </Badge>

            <div className="mt-4 space-y-3 text-sm">
              {detailSupplier.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <span className="text-gray-700">{detailSupplier.address}</span>
                </div>
              )}
              {detailSupplier.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                  <a href={`tel:${detailSupplier.phone}`} className="text-[#7AC143] hover:underline">{detailSupplier.phone}</a>
                </div>
              )}
              {detailSupplier.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                  <a href={`mailto:${detailSupplier.email}`} className="text-[#7AC143] hover:underline">{detailSupplier.email}</a>
                </div>
              )}
              {detailSupplier.contactName && (
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 shrink-0 text-center text-gray-400 text-xs">👤</span>
                  <span className="text-gray-700">Yetkili: {detailSupplier.contactName}</span>
                </div>
              )}
            </div>

            {/* Materials / Details */}
            {detailSupplier.materials && (() => {
              try {
                const m = typeof detailSupplier.materials === "string" ? JSON.parse(detailSupplier.materials) : detailSupplier.materials;
                return (
                  <div className="mt-4 rounded-lg bg-gray-50 p-4 space-y-2 text-sm">
                    <h4 className="font-semibold text-gray-800 mb-2">Detay Bilgileri</h4>
                    {m.products && (
                      <div><span className="font-medium text-gray-600">Ürünler:</span> <span className="text-gray-800">{m.products}</span></div>
                    )}
                    {m.capacity && (
                      <div><span className="font-medium text-gray-600">Kapasite:</span> <span className="text-gray-800">{m.capacity}</span></div>
                    )}
                    {m.website && (
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3 text-gray-400" />
                        <span className="font-medium text-gray-600">Website:</span>
                        <a href={m.website.startsWith("http") ? m.website : `https://${m.website}`} target="_blank" rel="noopener noreferrer" className="text-[#7AC143] hover:underline">{m.website}</a>
                      </div>
                    )}
                    {m.minOrder && (
                      <div><span className="font-medium text-gray-600">Min. Sipariş:</span> <span className="text-gray-800">{m.minOrder}</span></div>
                    )}
                  </div>
                );
              } catch { return null; }
            })()}

            {/* Notes */}
            {detailSupplier.notes && (
              <div className="mt-4 rounded-lg border border-gray-200 p-4 text-sm">
                <h4 className="font-semibold text-gray-800 mb-1">Notlar</h4>
                <p className="text-gray-600 whitespace-pre-line">{detailSupplier.notes}</p>
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <Button variant="primary" size="sm" onClick={() => { setDetailSupplier(null); openEditModal(detailSupplier); }}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Düzenle
              </Button>
              <Button variant="destructive" size="sm" onClick={() => { setDetailSupplier(null); handleDelete(detailSupplier); }}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Sil
              </Button>
            </div>
          </div>
        </div>
      )}

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
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
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
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
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
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
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
                      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
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
                      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
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
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
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
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 resize-none"
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
      {/* MODAL: Yeni Teklif Talebi (2 Modlu: Stand Paketi / Manuel)     */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {quoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <Send className="h-5 w-5 text-[#7AC143]" />
                Yeni Teklif Talebi
              </h2>
              <button
                onClick={() => { setQuoteModalOpen(false); resetBomModal(); }}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex border-b px-6">
              <button
                onClick={() => { setQuoteModalMode("stand"); setBomResult(null); }}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  quoteModalMode === "stand"
                    ? "border-[#7AC143] text-[#7AC143]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Package className="inline h-4 w-4 mr-1.5" />
                Stand Paketi ile Teklif
              </button>
              <button
                onClick={() => { setQuoteModalMode("manual"); setBomResult(null); }}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  quoteModalMode === "manual"
                    ? "border-[#7AC143] text-[#7AC143]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Pencil className="inline h-4 w-4 mr-1.5" />
                Manuel Teklif
              </button>
            </div>

            {/* Body - scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

              {/* ── MOD 1: Stand Paketi ── */}
              {quoteModalMode === "stand" && (
                <>
                  {!bomCalculated ? (
                    <>
                      <p className="text-sm text-gray-500">
                        Stand adetlerini girin ve BOM hesaplamasini baslatin.
                      </p>

                      <div className="grid grid-cols-3 gap-4">
                        {(["A", "B", "C"] as const).map((stand) => (
                          <div key={stand} className="rounded-lg border p-4 text-center">
                            <div className="text-sm font-semibold text-gray-700 mb-1">
                              Stand {stand}
                            </div>
                            <div className="text-xs text-gray-400 mb-2">
                              {stand === "A" ? "50 urun" : stand === "B" ? "100 urun" : "150 urun"}
                            </div>
                            <input
                              type="number"
                              min={0}
                              value={standCounts[stand]}
                              onChange={(e) =>
                                setStandCounts({ ...standCounts, [stand]: Math.max(0, Number(e.target.value)) })
                              }
                              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 text-center text-lg font-bold"
                              placeholder="0"
                            />
                            <div className="text-xs text-gray-400 mt-1">adet</div>
                          </div>
                        ))}
                      </div>

                      {/* Stand icerik aciklamalari */}
                      <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500 space-y-1">
                        <p><strong>Stand A (50):</strong> 25 EB Siyah + 25 KK Ten (her beden 5 adet)</p>
                        <p><strong>Stand B (100):</strong> 25 EB Siyah + 25 EB Lacivert + 25 KK Siyah + 25 KK Ten</p>
                        <p><strong>Stand C (150):</strong> 25 EB Siyah + 25 EB Lacivert + 25 EB Gri + 25 KK Siyah + 25 KK Beyaz + 25 KK Ten</p>
                      </div>

                      {/* Ozet */}
                      {(standCounts.A > 0 || standCounts.B > 0 || standCounts.C > 0) && (
                        <div className="rounded-lg border border-[#7AC143]/30 bg-green-50 p-3 text-sm">
                          <div className="font-medium text-gray-800 mb-1">Toplam Uretim</div>
                          <div className="text-gray-600">
                            {(() => {
                              const eb = standCounts.A * 25 + standCounts.B * 50 + standCounts.C * 75;
                              const kk = standCounts.A * 25 + standCounts.B * 50 + standCounts.C * 75;
                              return (
                                <>
                                  <span className="font-medium">{eb.toLocaleString("tr-TR")}</span> Erkek Boxer +{" "}
                                  <span className="font-medium">{kk.toLocaleString("tr-TR")}</span> Kadin Kulot ={" "}
                                  <span className="font-bold text-[#7AC143]">{(eb + kk).toLocaleString("tr-TR")}</span> toplam urun
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* BOM sonuclari - Malzeme Ihtiyaclari tablosu */}
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-800">
                          Malzeme Ihtiyaclari
                        </h3>
                        <button
                          onClick={() => { setBomCalculated(false); setBomMaterials([]); setBomResult(null); }}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          Geri Don
                        </button>
                      </div>

                      {/* Ozet bar */}
                      <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                        Stand A: {standCounts.A} | Stand B: {standCounts.B} | Stand C: {standCounts.C} |{" "}
                        Toplam: {((standCounts.A * 50) + (standCounts.B * 100) + (standCounts.C * 150)).toLocaleString("tr-TR")} urun
                      </div>

                      <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Malzeme</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Miktar</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 min-w-[180px]">Tedarikci</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {bomMaterials.map((row) => {
                              const availableSuppliers = suppliersForTypes(row.supplierTypes);
                              return (
                                <tr key={row.key} className="hover:bg-gray-50">
                                  <td className="px-3 py-2">
                                    <div className="font-medium text-gray-800 text-xs">{row.label}</div>
                                  </td>
                                  <td className="px-3 py-2 text-right whitespace-nowrap">
                                    <span className="font-semibold text-gray-800">
                                      {row.quantity.toLocaleString("tr-TR")}
                                    </span>
                                    <span className="text-gray-400 ml-1">{row.unit}</span>
                                  </td>
                                  <td className="px-3 py-2">
                                    {availableSuppliers.length > 0 ? (
                                      <div className="space-y-1">
                                        <button
                                          type="button"
                                          onClick={() => selectAllSuppliersForRow(row.key)}
                                          className="text-[10px] text-[#7AC143] hover:underline mb-1"
                                        >
                                          {availableSuppliers.every((s) => row.selectedSupplierIds.includes(s.id))
                                            ? "Secimi Kaldir"
                                            : "Tumunu Sec"}
                                        </button>
                                        {availableSuppliers.map((s) => (
                                          <label
                                            key={s.id}
                                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={row.selectedSupplierIds.includes(s.id)}
                                              onChange={() => toggleBomSupplier(row.key, s.id)}
                                              className="h-3.5 w-3.5 rounded border-gray-300 text-[#7AC143] focus:ring-[#7AC143]"
                                            />
                                            <span className="text-xs text-gray-700">{s.name}</span>
                                          </label>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-400 italic">
                                        Kayitli tedarikci yok
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Sonuc mesaji */}
                      {bomResult && (
                        <div
                          className={`rounded-lg p-3 text-sm ${
                            bomResult.fail > 0
                              ? "bg-amber-50 border border-amber-200 text-amber-800"
                              : "bg-green-50 border border-green-200 text-green-800"
                          }`}
                        >
                          {bomResult.success > 0 && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4" />
                              {bomResult.success} teklif basariyla gonderildi.
                            </span>
                          )}
                          {bomResult.fail > 0 && (
                            <span className="flex items-center gap-1 mt-1">
                              <AlertTriangle className="h-4 w-4" />
                              {bomResult.fail} teklif gonderilemedi.
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* ── MOD 2: Manuel Teklif ── */}
              {quoteModalMode === "manual" && (
                <>
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
                      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
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
                      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
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
                      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 resize-none"
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
                      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                      min={1}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setQuoteModalOpen(false); resetBomModal(); }}
              >
                Iptal
              </Button>

              {quoteModalMode === "stand" && !bomCalculated && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={calculateStandBOM}
                  disabled={standCounts.A === 0 && standCounts.B === 0 && standCounts.C === 0}
                >
                  <BarChart3 className="h-4 w-4" />
                  BOM Hesapla
                </Button>
              )}

              {quoteModalMode === "stand" && bomCalculated && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSendAllBomQuotes}
                  disabled={bomSending || totalSelectedSuppliers === 0}
                  loading={bomSending}
                >
                  <Send className="h-4 w-4" />
                  Tum Teklifleri Gonder ({totalSelectedSuppliers})
                </Button>
              )}

              {quoteModalMode === "manual" && (
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
              )}
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
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
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
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
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
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
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
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20 resize-none"
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
