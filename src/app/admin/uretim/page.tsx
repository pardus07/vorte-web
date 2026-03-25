"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calculator,
  ShoppingCart,
  PackageCheck,
  Factory,
  CheckSquare,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";

interface FullProductionOrder {
  id: string;
  orderNumber: string;
  stage: string;
  priority: string;
  totalQuantity: number;
  targetDate: string | null;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  notes: string | null;
  createdAt: string;
  items: { id: string; productName: string; sku: string; color: string; totalQuantity: number }[];
  _count?: { tracking: number; qualityChecks: number };
}

interface StageStats {
  PENDING: number;
  BOM_CALCULATED: number;
  MATERIALS_ORDERED: number;
  MATERIALS_RECEIVED: number;
  IN_PRODUCTION: number;
  QUALITY_CHECK: number;
  PACKAGING_STAGE: number;
  PROD_SHIPPED: number;
  PROD_DELIVERED: number;
  PROD_CANCELLED: number;
  totalQuantity: number;
}

interface ProductFromAPI {
  id: string;
  name: string;
  sku: string;
  variants: { color: string; size: string }[];
}

interface FormItem {
  productId: string;
  sku: string;
  productName: string;
  color: string;
  sizeS: number;
  sizeM: number;
  sizeL: number;
  sizeXL: number;
  sizeXXL: number;
}

type OrderType = "standA" | "standB" | "standC" | "manuel";

const STAGE_MAP: Record<string, { label: string; color: string; icon: React.ElementType; iconBg: string; iconColor: string }> = {
  PENDING: { label: "Beklemede", color: "bg-gray-100 text-gray-700", icon: Clock, iconBg: "bg-gray-100", iconColor: "text-gray-500" },
  BOM_CALCULATED: { label: "BOM Hazır", color: "bg-blue-100 text-blue-700", icon: Calculator, iconBg: "bg-blue-100", iconColor: "text-blue-600" },
  MATERIALS_ORDERED: { label: "Malzeme Sipariş", color: "bg-indigo-100 text-indigo-700", icon: ShoppingCart, iconBg: "bg-indigo-100", iconColor: "text-indigo-600" },
  MATERIALS_RECEIVED: { label: "Malzeme Teslim", color: "bg-teal-100 text-teal-700", icon: PackageCheck, iconBg: "bg-teal-100", iconColor: "text-teal-600" },
  IN_PRODUCTION: { label: "Üretimde", color: "bg-orange-100 text-orange-700", icon: Factory, iconBg: "bg-orange-100", iconColor: "text-orange-600" },
  QUALITY_CHECK: { label: "Kalite Kontrol", color: "bg-purple-100 text-purple-700", icon: CheckSquare, iconBg: "bg-purple-100", iconColor: "text-purple-600" },
  PACKAGING_STAGE: { label: "Paketleme", color: "bg-cyan-100 text-cyan-700", icon: Package, iconBg: "bg-cyan-100", iconColor: "text-cyan-600" },
  PROD_SHIPPED: { label: "Kargoda", color: "bg-amber-100 text-amber-700", icon: Truck, iconBg: "bg-amber-100", iconColor: "text-amber-600" },
  PROD_DELIVERED: { label: "Teslim Edildi", color: "bg-green-100 text-green-700", icon: CheckCircle2, iconBg: "bg-green-100", iconColor: "text-green-600" },
  PROD_CANCELLED: { label: "İptal", color: "bg-red-100 text-red-700", icon: XCircle, iconBg: "bg-red-100", iconColor: "text-red-600" },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: "Düşük", color: "bg-gray-100 text-gray-600" },
  normal: { label: "Normal", color: "bg-blue-100 text-blue-600" },
  high: { label: "Yüksek", color: "bg-orange-100 text-orange-600" },
  urgent: { label: "Acil", color: "bg-red-100 text-red-600" },
};

const ACTIVE_STAGES = ["PENDING", "BOM_CALCULATED", "MATERIALS_ORDERED", "MATERIALS_RECEIVED", "IN_PRODUCTION", "QUALITY_CHECK", "PACKAGING_STAGE", "PROD_SHIPPED"] as const;

// Stand paket tanimlari — isme gore eslestirme yapilacak
interface StandProductDef {
  nameMatch: string;
  color: string;
  sizeS: number;
  sizeM: number;
  sizeL: number;
  sizeXL: number;
  sizeXXL: number;
}

const STAND_PACKAGES: Record<"standA" | "standB" | "standC", { label: string; icon: string; subtitle: string; description: string; borderColor: string; products: StandProductDef[] }> = {
  standA: {
    label: "Stand A Paketi",
    icon: "\u{1F4E6}",
    subtitle: "50 Adet \u00B7 Tek Y\u00F6nl\u00FC",
    description: "Erkek Boxer Siyah (25) + Kad\u0131n K\u00FClot Ten (25)",
    borderColor: "border-[#7AC143]",
    products: [
      { nameMatch: "Boxer Siyah", color: "Siyah", sizeS: 5, sizeM: 5, sizeL: 5, sizeXL: 5, sizeXXL: 5 },
      { nameMatch: "Külot Ten", color: "Ten Rengi", sizeS: 5, sizeM: 5, sizeL: 5, sizeXL: 5, sizeXXL: 5 },
    ],
  },
  standB: {
    label: "Stand B Paketi",
    icon: "\u{1F4E6}\u{1F4E6}",
    subtitle: "100 Adet \u00B7 \u00C7ift Y\u00F6nl\u00FC Ada",
    description: "Erkek Boxer Siyah+Lacivert, Kad\u0131n K\u00FClot Siyah+Ten",
    borderColor: "border-blue-500",
    products: [
      { nameMatch: "Boxer Siyah", color: "Siyah", sizeS: 5, sizeM: 5, sizeL: 5, sizeXL: 5, sizeXXL: 5 },
      { nameMatch: "Boxer Lacivert", color: "Lacivert", sizeS: 5, sizeM: 5, sizeL: 5, sizeXL: 5, sizeXXL: 5 },
      { nameMatch: "Külot Siyah", color: "Siyah", sizeS: 5, sizeM: 5, sizeL: 5, sizeXL: 5, sizeXXL: 5 },
      { nameMatch: "Külot Ten", color: "Ten Rengi", sizeS: 5, sizeM: 5, sizeL: 5, sizeXL: 5, sizeXXL: 5 },
    ],
  },
  standC: {
    label: "Stand C Paketi",
    icon: "\u{1F4E6}\u{1F4E6}\u{1F4E6}",
    subtitle: "150 Adet \u00B7 Tam Boy \u00C7ift Y\u00F6nl\u00FC",
    description: "T\u00FCm renkler: 3 Boxer + 3 K\u00FClot",
    borderColor: "border-orange-500",
    products: [
      { nameMatch: "Boxer Siyah", color: "Siyah", sizeS: 5, sizeM: 5, sizeL: 5, sizeXL: 5, sizeXXL: 5 },
      { nameMatch: "Boxer Lacivert", color: "Lacivert", sizeS: 5, sizeM: 5, sizeL: 5, sizeXL: 5, sizeXXL: 5 },
      { nameMatch: "Boxer Gri", color: "Gri", sizeS: 5, sizeM: 5, sizeL: 5, sizeXL: 5, sizeXXL: 5 },
      { nameMatch: "Külot Siyah", color: "Siyah", sizeS: 5, sizeM: 5, sizeL: 5, sizeXL: 5, sizeXXL: 5 },
      { nameMatch: "Külot Beyaz", color: "Beyaz", sizeS: 5, sizeM: 5, sizeL: 5, sizeXL: 5, sizeXXL: 5 },
      { nameMatch: "Külot Ten", color: "Ten Rengi", sizeS: 5, sizeM: 5, sizeL: 5, sizeXL: 5, sizeXXL: 5 },
    ],
  },
};

function matchProductByName(products: ProductFromAPI[], nameMatch: string): ProductFromAPI | undefined {
  return products.find((p) => p.name.includes(nameMatch));
}

function buildStandItems(products: ProductFromAPI[], standKey: "standA" | "standB" | "standC"): FormItem[] {
  const pkg = STAND_PACKAGES[standKey];
  return pkg.products.map((def) => {
    const prod = matchProductByName(products, def.nameMatch);
    return {
      productId: prod?.id || "",
      sku: prod?.sku || "",
      productName: prod?.name || def.nameMatch,
      color: def.color,
      sizeS: def.sizeS,
      sizeM: def.sizeM,
      sizeL: def.sizeL,
      sizeXL: def.sizeXL,
      sizeXXL: def.sizeXXL,
    };
  });
}

function calcTotalQty(items: FormItem[]): number {
  return items.reduce((sum, item) => sum + item.sizeS + item.sizeM + item.sizeL + item.sizeXL + item.sizeXXL, 0);
}

export default function UretimPage() {
  const [orders, setOrders] = useState<FullProductionOrder[]>([]);
  const [stats, setStats] = useState<StageStats>({
    PENDING: 0, BOM_CALCULATED: 0, MATERIALS_ORDERED: 0, MATERIALS_RECEIVED: 0,
    IN_PRODUCTION: 0, QUALITY_CHECK: 0, PACKAGING_STAGE: 0, PROD_SHIPPED: 0,
    PROD_DELIVERED: 0, PROD_CANCELLED: 0, totalQuantity: 0,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // New order form state
  const [showForm, setShowForm] = useState(false);
  const [products, setProducts] = useState<ProductFromAPI[]>([]);
  const [formData, setFormData] = useState({ priority: "normal", notes: "", targetDate: "" });
  const [formItems, setFormItems] = useState<FormItem[]>([]);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [orderType, setOrderType] = useState<OrderType | null>(null);

  const limit = 20;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (stageFilter !== "all") params.set("stage", stageFilter);
    if (priorityFilter !== "all") params.set("priority", priorityFilter);
    if (search) params.set("search", search);

    const res = await fetch(`/api/admin/production-full?${params}`);
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
      setTotal(data.total);
      setStats(data.stats);
    }
    setLoading(false);
  }, [page, stageFilter, priorityFilter, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const fetchProducts = async () => {
    const res = await fetch("/api/admin/products?limit=100");
    if (res.ok) {
      const data = await res.json();
      setProducts(data.products.map((p: any) => ({
        id: p.id, name: p.name, sku: p.sku || "",
        variants: p.variants?.map((v: any) => ({ color: v.color, size: v.size })) || [],
      })));
    }
  };

  const handleOpenForm = () => {
    if (products.length === 0) fetchProducts();
    setShowForm(true);
    setFormError("");
    setFormItems([]);
    setOrderType(null);
    setFormData({ priority: "normal", notes: "", targetDate: "" });
  };

  const handleSelectOrderType = (type: OrderType) => {
    setOrderType(type);
    if (type === "manuel") {
      setFormItems([]);
    } else {
      setFormItems(buildStandItems(products, type));
    }
  };

  const addFormItem = () => {
    setFormItems([...formItems, { productId: "", sku: "", productName: "", color: "", sizeS: 0, sizeM: 0, sizeL: 0, sizeXL: 0, sizeXXL: 0 }]);
  };

  const updateFormItem = (idx: number, field: string, value: any) => {
    const items = [...formItems];
    (items[idx] as any)[field] = value;
    if (field === "productId") {
      const prod = products.find(p => p.id === value);
      if (prod) {
        items[idx].productName = prod.name;
        items[idx].sku = prod.sku;
        // Renk otomatik doldur: urun adindaki renk bilgisini cikart
        const colorMap: Record<string, string> = {
          "Siyah": "Siyah",
          "Lacivert": "Lacivert",
          "Gri": "Gri",
          "Beyaz": "Beyaz",
          "Ten": "Ten Rengi",
        };
        let foundColor = "";
        for (const [key, val] of Object.entries(colorMap)) {
          if (prod.name.includes(key)) {
            foundColor = val;
            break;
          }
        }
        // Variant'lardan renk bilgisi de alinabilir
        if (!foundColor && prod.variants.length > 0) {
          foundColor = prod.variants[0].color;
        }
        items[idx].color = foundColor;
      }
    }
    setFormItems(items);
  };

  const removeFormItem = (idx: number) => {
    setFormItems(formItems.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (formItems.length === 0) { setFormError("En az bir ürün ekleyin."); return; }
    if (!formData.targetDate) { setFormError("Hedef tarih zorunludur."); return; }

    const hasQty = formItems.some(item =>
      item.sizeS + item.sizeM + item.sizeL + item.sizeXL + item.sizeXXL > 0
    );
    if (!hasQty) { setFormError("En az bir beden adedi giriniz."); return; }

    setSaving(true);
    setFormError("");
    const res = await fetch("/api/admin/production-full", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: formItems.map(item => ({
          productId: item.productId,
          sku: item.sku,
          productName: item.productName,
          color: item.color,
          sizeS: item.sizeS, sizeM: item.sizeM, sizeL: item.sizeL, sizeXL: item.sizeXL, sizeXXL: item.sizeXXL,
        })),
        priority: formData.priority,
        notes: formData.notes || undefined,
        targetDate: formData.targetDate,
      }),
    });

    if (res.ok) {
      setShowForm(false);
      setFormData({ priority: "normal", notes: "", targetDate: "" });
      setFormItems([]);
      setOrderType(null);
      fetchOrders();
    } else {
      const data = await res.json();
      setFormError(data.error || "Hata oluştu");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu üretim siparişini silmek istediğinize emin misiniz?")) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/production-full/${id}`, { method: "DELETE" });
    if (res.ok) fetchOrders();
    else {
      const data = await res.json();
      alert(data.error || "Silinemedi");
    }
    setDeleting(null);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("tr-TR");
  };

  const isOverdue = (order: FullProductionOrder) => {
    if (["PROD_DELIVERED", "PROD_CANCELLED"].includes(order.stage)) return false;
    const target = order.estimatedDelivery || order.targetDate;
    if (!target) return false;
    return new Date(target) < new Date();
  };

  const totalPages = Math.ceil(total / limit);

  // Summary stat boxes — show top 6 active stages
  const statBoxes = [
    { key: "PENDING", ...STAGE_MAP.PENDING },
    { key: "BOM_CALCULATED", ...STAGE_MAP.BOM_CALCULATED },
    { key: "MATERIALS_ORDERED", ...STAGE_MAP.MATERIALS_ORDERED },
    { key: "IN_PRODUCTION", ...STAGE_MAP.IN_PRODUCTION },
    { key: "QUALITY_CHECK", ...STAGE_MAP.QUALITY_CHECK },
    { key: "PROD_DELIVERED", ...STAGE_MAP.PROD_DELIVERED },
  ];

  const isStandType = orderType === "standA" || orderType === "standB" || orderType === "standC";
  const totalItemCount = formItems.length;
  const totalPieceCount = calcTotalQty(formItems);

  // Build page number array for pagination
  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "ellipsis")[] = [];
    if (page <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push("ellipsis");
      pages.push(totalPages);
    } else if (page >= totalPages - 3) {
      pages.push(1);
      pages.push("ellipsis");
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("ellipsis");
      for (let i = page - 1; i <= page + 1; i++) pages.push(i);
      pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Üretim Siparişleri</h1>
          <p className="mt-1 text-[13px] text-gray-500">
            Toplam {total} sipariş · {(stats.totalQuantity || 0).toLocaleString("tr-TR")} adet
          </p>
        </div>
        <button
          onClick={handleOpenForm}
          className="flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333333]"
        >
          <Plus className="h-4 w-4" /> Yeni Üretim Siparişi
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {statBoxes.map(({ key, label, icon: Icon, iconBg, iconColor }) => (
          <div key={key} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium uppercase tracking-wider text-gray-500">{label}</p>
                <p className="mt-0.5 text-2xl font-bold text-gray-900">
                  {stats[key as keyof StageStats] || 0}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Sipariş no, ürün adı ara..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
            />
          </div>
          <select
            value={stageFilter}
            onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
          >
            <option value="all">Tüm Aşamalar</option>
            {Object.entries(STAGE_MAP).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
          >
            <option value="all">Tüm Öncelikler</option>
            <option value="urgent">Acil</option>
            <option value="high">Yüksek</option>
            <option value="normal">Normal</option>
            <option value="low">Düşük</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {!loading ? (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/80 text-left">
                  <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Sipariş No</th>
                  <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Ürünler</th>
                  <th className="px-4 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">Adet</th>
                  <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Aşama</th>
                  <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Öncelik</th>
                  <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Hedef</th>
                  <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Tahmini Teslim</th>
                  <th className="px-4 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const stageCfg = STAGE_MAP[order.stage] || STAGE_MAP.PENDING;
                  const priCfg = PRIORITY_MAP[order.priority] || PRIORITY_MAP.normal;
                  const overdue = isOverdue(order);
                  const productNames = order.items?.map(i => i.productName).filter(Boolean).join(", ") || "-";

                  return (
                    <tr
                      key={order.id}
                      className={`border-b transition-colors hover:bg-gray-50/60 ${
                        overdue ? "border-l-2 border-l-red-300 bg-red-50/30" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <Link href={`/admin/uretim/${order.id}`} className="font-medium text-[#7AC143] hover:underline">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="max-w-[200px] px-4 py-3">
                        <span className="block truncate text-gray-700">{productNames}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{(order.totalQuantity || order.items?.reduce((s, i) => s + i.totalQuantity, 0) || 0).toLocaleString("tr-TR")}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${stageCfg.color}`}>
                          {stageCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${priCfg.color}`}>{priCfg.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={overdue ? "font-medium text-red-500" : "text-gray-500"}>
                          {formatDate(order.targetDate)}
                          {overdue && <AlertTriangle className="ml-1 inline h-3 w-3" />}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(order.estimatedDelivery)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/uretim/${order.id}`}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                            title="Detay"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {["PENDING", "PROD_CANCELLED"].includes(order.stage) && (
                            <button
                              onClick={() => handleDelete(order.id)}
                              disabled={deleting === order.id}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                              title="Sil"
                            >
                              {deleting === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <Factory className="mx-auto h-12 w-12 text-gray-200" />
                      <p className="mt-3 text-sm font-medium text-gray-400">Henüz üretim siparişi bulunmuyor</p>
                      <p className="mt-1 text-[13px] text-gray-300">Yeni sipariş oluşturmak için yukarıdaki butona tıklayın</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-[13px] text-gray-500">
                Sayfa {page} / {totalPages} · Toplam {total} kayıt
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {getPageNumbers().map((p, idx) =>
                  p === "ellipsis" ? (
                    <span key={`ellipsis-${idx}`} className="flex h-8 w-8 items-center justify-center text-xs text-gray-400">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        page === p
                          ? "bg-[#1A1A1A] text-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white py-20 shadow-sm">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50">
              <Loader2 className="h-6 w-6 animate-spin text-[#7AC143]" />
            </div>
            <p className="mt-3 text-sm font-medium text-gray-400">Yükleniyor...</p>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-gray-900">Yeni Üretim Siparişi</h2>
                <p className="mt-0.5 text-[13px] text-gray-500">BOM otomatik hesaplanır, termin tahmini yapılır</p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {formError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}

              {/* SECTION 1: Siparis Turu Secimi */}
              <div>
                <label className="mb-3 block text-sm font-semibold text-gray-900">Sipariş Türü</label>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {/* Stand A */}
                  <button
                    type="button"
                    onClick={() => handleSelectOrderType("standA")}
                    className={`rounded-2xl border-2 p-4 text-left transition-all hover:shadow-md ${
                      orderType === "standA" ? "border-[#7AC143] bg-green-50 shadow-md" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="mb-2 text-2xl">{"\u{1F4E6}"}</div>
                    <div className="text-sm font-bold text-gray-900">Stand A Paketi</div>
                    <div className="mt-1 text-xs font-medium text-gray-500">50 Adet · Tek Yönlü</div>
                    <div className="mt-2 text-[11px] leading-relaxed text-gray-400">
                      Erkek Boxer Siyah (25) + Kadın Külot Ten (25)
                    </div>
                  </button>

                  {/* Stand B */}
                  <button
                    type="button"
                    onClick={() => handleSelectOrderType("standB")}
                    className={`rounded-2xl border-2 p-4 text-left transition-all hover:shadow-md ${
                      orderType === "standB" ? "border-blue-500 bg-blue-50 shadow-md" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="mb-2 text-2xl">{"\u{1F4E6}\u{1F4E6}"}</div>
                    <div className="text-sm font-bold text-gray-900">Stand B Paketi</div>
                    <div className="mt-1 text-xs font-medium text-gray-500">100 Adet · Çift Yönlü Ada</div>
                    <div className="mt-2 text-[11px] leading-relaxed text-gray-400">
                      Erkek Boxer Siyah+Lacivert, Kadın Külot Siyah+Ten
                    </div>
                  </button>

                  {/* Stand C */}
                  <button
                    type="button"
                    onClick={() => handleSelectOrderType("standC")}
                    className={`rounded-2xl border-2 p-4 text-left transition-all hover:shadow-md ${
                      orderType === "standC" ? "border-orange-500 bg-orange-50 shadow-md" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="mb-2 text-2xl">{"\u{1F4E6}\u{1F4E6}\u{1F4E6}"}</div>
                    <div className="text-sm font-bold text-gray-900">Stand C Paketi</div>
                    <div className="mt-1 text-xs font-medium text-gray-500">150 Adet · Tam Boy Çift Yönlü</div>
                    <div className="mt-2 text-[11px] leading-relaxed text-gray-400">
                      Tüm renkler: 3 Boxer + 3 Külot
                    </div>
                  </button>

                  {/* Manuel */}
                  <button
                    type="button"
                    onClick={() => handleSelectOrderType("manuel")}
                    className={`rounded-2xl border-2 p-4 text-left transition-all hover:shadow-md ${
                      orderType === "manuel" ? "border-gray-500 bg-gray-50 shadow-md" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="mb-2 text-2xl">{"\u270F\uFE0F"}</div>
                    <div className="text-sm font-bold text-gray-900">Özel Sipariş</div>
                    <div className="mt-1 text-xs font-medium text-gray-500">Manuel Sipariş</div>
                    <div className="mt-2 text-[11px] leading-relaxed text-gray-400">
                      Ürün ve adetleri kendiniz belirleyin
                    </div>
                  </button>
                </div>
              </div>

              {/* SECTION 2: Urun Detaylari */}
              {orderType && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-900">
                      Ürün Kalemleri
                      {isStandType && (
                        <span className="ml-2 text-xs font-normal text-gray-400">(Paket içeriği otomatik dolduruldu)</span>
                      )}
                    </label>
                    {orderType === "manuel" && (
                      <button
                        onClick={addFormItem}
                        className="flex items-center gap-1.5 rounded-xl bg-[#1A1A1A] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#333333]"
                      >
                        <Plus className="h-3.5 w-3.5" /> Ürün Ekle
                      </button>
                    )}
                  </div>

                  {/* Stand paket readonly gosterim */}
                  {isStandType && formItems.length > 0 && (
                    <div className="space-y-3">
                      {formItems.map((item, idx) => (
                        <div key={idx} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 shadow-sm">
                          <div className="mb-3 flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-gray-900">{item.productName}</span>
                              <span className="ml-2 rounded-lg bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600">{item.sku}</span>
                            </div>
                            <span className="rounded-full bg-[#7AC143]/10 px-2.5 py-0.5 text-xs font-medium text-[#7AC143]">
                              {item.color}
                            </span>
                          </div>
                          <div className="grid grid-cols-5 gap-2">
                            {(["S", "M", "L", "XL", "XXL"] as const).map((size) => (
                              <div key={size} className="text-center">
                                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">{size}</div>
                                <div className="rounded-xl border border-gray-200 bg-white py-2 text-sm font-semibold text-gray-900">
                                  {(item as any)[`size${size}`]}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Manuel siparis formu */}
                  {orderType === "manuel" && (
                    <div className="space-y-3">
                      {formItems.map((item, idx) => (
                        <div key={idx} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                          {/* Urun secimi - buyuk dropdown */}
                          <div className="mb-3 flex items-start gap-3">
                            <div className="flex-1">
                              <select
                                value={item.productId}
                                onChange={(e) => updateFormItem(idx, "productId", e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                              >
                                <option value="">Ürün seçin...</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.sku})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              onClick={() => removeFormItem(idx)}
                              className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl text-red-400 transition-colors hover:bg-red-50 hover:text-red-500"
                              title="Kalemi sil"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Renk (readonly) */}
                          {item.productId && (
                            <div className="mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Renk:</span>
                                <span className="rounded-full bg-[#7AC143]/10 px-2.5 py-0.5 text-xs font-medium text-[#7AC143]">
                                  {item.color || "Belirlenmedi"}
                                </span>
                                <span className="text-xs text-gray-300">|</span>
                                <span className="text-xs text-gray-500">SKU:</span>
                                <span className="font-mono text-xs text-gray-600">{item.sku}</span>
                              </div>
                            </div>
                          )}

                          {/* Beden adetleri - buyuk inputlar */}
                          <div className="grid grid-cols-5 gap-2">
                            {(["S", "M", "L", "XL", "XXL"] as const).map((size) => (
                              <div key={size} className="text-center">
                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">{size}</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={(item as any)[`size${size}`] || ""}
                                  onChange={(e) => updateFormItem(idx, `size${size}`, parseInt(e.target.value) || 0)}
                                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 text-center text-sm font-semibold text-gray-900 shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                                  placeholder="0"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      {formItems.length === 0 && (
                        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50">
                            <Package className="h-6 w-6 text-gray-300" />
                          </div>
                          <p className="mt-3 text-sm font-medium text-gray-400">
                            Henüz ürün eklenmedi.
                          </p>
                          <button
                            onClick={addFormItem}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200"
                          >
                            <Plus className="h-3.5 w-3.5" /> Ürün Ekle
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 3: Siparis Bilgileri */}
              {orderType && (
                <div>
                  <label className="mb-3 block text-sm font-semibold text-gray-900">Sipariş Bilgileri</label>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-600">Hedef Tarih *</label>
                      <input
                        type="date"
                        value={formData.targetDate}
                        onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-600">Öncelik</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                      >
                        <option value="low">Düşük</option>
                        <option value="normal">Normal</option>
                        <option value="high">Yüksek</option>
                        <option value="urgent">Acil</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">Notlar</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                      rows={2}
                      placeholder="Üretim notları..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="shrink-0 rounded-b-2xl border-t bg-gray-50/80 px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Toplam ozet */}
                <div className="text-sm text-gray-600">
                  {orderType && formItems.length > 0 ? (
                    <span className="font-medium">
                      Toplam: <span className="text-[#7AC143]">{totalItemCount} ürün</span> ·{" "}
                      <span className="text-[#7AC143]">{totalPieceCount.toLocaleString("tr-TR")} adet</span>
                    </span>
                  ) : (
                    <span className="text-gray-400">Sipariş türü seçin</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowForm(false)}
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-100"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={saving || !orderType || formItems.length === 0}
                    className="flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saving ? "Oluşturuluyor..." : "Oluştur (BOM + Termin Otomatik)"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
