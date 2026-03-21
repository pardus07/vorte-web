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

const STAGE_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: "Beklemede", color: "bg-gray-100 text-gray-700", icon: Clock },
  BOM_CALCULATED: { label: "BOM Hazır", color: "bg-blue-100 text-blue-700", icon: Calculator },
  MATERIALS_ORDERED: { label: "Malzeme Sipariş", color: "bg-indigo-100 text-indigo-700", icon: ShoppingCart },
  MATERIALS_RECEIVED: { label: "Malzeme Teslim", color: "bg-teal-100 text-teal-700", icon: PackageCheck },
  IN_PRODUCTION: { label: "Üretimde", color: "bg-orange-100 text-orange-700", icon: Factory },
  QUALITY_CHECK: { label: "Kalite Kontrol", color: "bg-purple-100 text-purple-700", icon: CheckSquare },
  PACKAGING_STAGE: { label: "Paketleme", color: "bg-cyan-100 text-cyan-700", icon: Package },
  PROD_SHIPPED: { label: "Kargoda", color: "bg-amber-100 text-amber-700", icon: Truck },
  PROD_DELIVERED: { label: "Teslim Edildi", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  PROD_CANCELLED: { label: "İptal", color: "bg-red-100 text-red-700", icon: XCircle },
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
      { nameMatch: "K\u00FClot Ten", color: "Ten Rengi", sizeS: 5, sizeM: 5, sizeL: 5, sizeXL: 5, sizeXXL: 5 },
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
      { nameMatch: "K\u00FClot Siyah", color: "Siyah", sizeS: 5, sizeM: 5, sizeL: 5, sizeXL: 5, sizeXXL: 5 },
      { nameMatch: "K\u00FClot Ten", color: "Ten Rengi", sizeS: 5, sizeM: 5, sizeL: 5, sizeXL: 5, sizeXXL: 5 },
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
      { nameMatch: "K\u00FClot Siyah", color: "Siyah", sizeS: 5, sizeM: 5, sizeL: 5, sizeXL: 5, sizeXXL: 5 },
      { nameMatch: "K\u00FClot Beyaz", color: "Beyaz", sizeS: 5, sizeM: 5, sizeL: 5, sizeXL: 5, sizeXXL: 5 },
      { nameMatch: "K\u00FClot Ten", color: "Ten Rengi", sizeS: 5, sizeM: 5, sizeL: 5, sizeXL: 5, sizeXXL: 5 },
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
    if (formItems.length === 0) { setFormError("En az bir \u00FCr\u00FCn ekleyin."); return; }
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
      setFormError(data.error || "Hata olu\u015Ftu");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu \u00FCretim sipari\u015Fini silmek istedi\u011Finize emin misiniz?")) return;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{"\u00DC"}retim Sipari\u015Fleri</h1>
          <p className="mt-1 text-sm text-gray-500">
            Toplam {total} sipari\u015F \u00B7 {(stats.totalQuantity || 0).toLocaleString("tr-TR")} adet
          </p>
        </div>
        <button
          onClick={handleOpenForm}
          className="flex items-center gap-2 rounded-lg bg-[#7AC143] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6aad38]"
        >
          <Plus className="h-4 w-4" /> Yeni {"\u00DC"}retim Sipari\u015Fi
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {statBoxes.map(({ key, label, icon: Icon }) => (
          <div key={key} className="rounded-lg border bg-white p-4">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {stats[key as keyof StageStats] || 0}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Sipari\u015F no, \u00FCr\u00FCn ad\u0131 ara..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="form-input w-full pl-10"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
          className="form-input"
        >
          <option value="all">T{"\u00FC"}m A\u015Famalar</option>
          {Object.entries(STAGE_MAP).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
          className="form-input"
        >
          <option value="all">T{"\u00FC"}m {"\u00D6"}ncelikler</option>
          <option value="urgent">Acil</option>
          <option value="high">Y{"\u00FC"}ksek</option>
          <option value="normal">Normal</option>
          <option value="low">D{"\u00FC"}\u015F{"\u00FC"}k</option>
        </select>
      </div>

      {/* Table */}
      {!loading ? (
        <div className="rounded-lg border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">Sipari\u015F No</th>
                  <th className="px-4 py-3 font-medium">{"\u00DC"}r{"\u00FC"}nler</th>
                  <th className="px-4 py-3 font-medium text-right">Adet</th>
                  <th className="px-4 py-3 font-medium">A\u015Fama</th>
                  <th className="px-4 py-3 font-medium">{"\u00D6"}ncelik</th>
                  <th className="px-4 py-3 font-medium">Hedef</th>
                  <th className="px-4 py-3 font-medium">Tahmini Teslim</th>
                  <th className="px-4 py-3 font-medium text-right">{"\u0130"}\u015Flem</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const stageCfg = STAGE_MAP[order.stage] || STAGE_MAP.PENDING;
                  const priCfg = PRIORITY_MAP[order.priority] || PRIORITY_MAP.normal;
                  const overdue = isOverdue(order);
                  const productNames = order.items?.map(i => i.productName).filter(Boolean).join(", ") || "-";

                  return (
                    <tr key={order.id} className={`border-b hover:bg-gray-50 ${overdue ? "bg-red-50/50" : ""}`}>
                      <td className="px-4 py-3">
                        <Link href={`/admin/uretim/${order.id}`} className="font-medium text-[#7AC143] hover:underline">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className="text-gray-700 truncate block">{productNames}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{(order.totalQuantity || order.items?.reduce((s, i) => s + i.totalQuantity, 0) || 0).toLocaleString("tr-TR")}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${stageCfg.color}`}>
                          {stageCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${priCfg.color}`}>{priCfg.label}</span>
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
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            title="Detay"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {["PENDING", "PROD_CANCELLED"].includes(order.stage) && (
                            <button
                              onClick={() => handleDelete(order.id)}
                              disabled={deleting === order.id}
                              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
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
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      Hen{"\u00FC"}z {"\u00FC"}retim sipari\u015Fi bulunmuyor
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-gray-500">Sayfa {page} / {totalPages} {"\u00B7"} Toplam {total}</p>
              <div className="flex gap-1">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="rounded p-1 hover:bg-gray-100 disabled:opacity-50">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="px-3 py-1 text-sm">{page} / {totalPages}</span>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="rounded p-1 hover:bg-gray-100 disabled:opacity-50">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-20 text-center text-gray-400">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          <p className="mt-2">Y{"\u00FC"}kleniyor...</p>
        </div>
      )}

      {/* New Order Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-[#333333]">Yeni {"\u00DC"}retim Sipari\u015Fi</h2>
                <p className="mt-0.5 text-sm text-gray-500">BOM otomatik hesaplan\u0131r, termin tahmini yap\u0131l\u0131r</p>
              </div>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {formError && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">{formError}</div>}

              {/* SECTION 1: Siparis Turu Secimi */}
              <div>
                <label className="mb-3 block text-sm font-semibold text-[#333333]">Sipari\u015F T{"\u00FC"}r{"\u00FC"}</label>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {/* Stand A */}
                  <button
                    type="button"
                    onClick={() => handleSelectOrderType("standA")}
                    className={`rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${
                      orderType === "standA" ? "border-[#7AC143] bg-green-50 shadow-md" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-2xl mb-2">{"\u{1F4E6}"}</div>
                    <div className="text-sm font-bold text-[#333333]">Stand A Paketi</div>
                    <div className="mt-1 text-xs font-medium text-gray-500">50 Adet {"\u00B7"} Tek Y{"\u00F6"}nl{"\u00FC"}</div>
                    <div className="mt-2 text-[11px] text-gray-400 leading-relaxed">
                      Erkek Boxer Siyah (25) + Kad{"\u0131"}n K{"\u00FC"}lot Ten (25)
                    </div>
                  </button>

                  {/* Stand B */}
                  <button
                    type="button"
                    onClick={() => handleSelectOrderType("standB")}
                    className={`rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${
                      orderType === "standB" ? "border-blue-500 bg-blue-50 shadow-md" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-2xl mb-2">{"\u{1F4E6}\u{1F4E6}"}</div>
                    <div className="text-sm font-bold text-[#333333]">Stand B Paketi</div>
                    <div className="mt-1 text-xs font-medium text-gray-500">100 Adet {"\u00B7"} {"\u00C7"}ift Y{"\u00F6"}nl{"\u00FC"} Ada</div>
                    <div className="mt-2 text-[11px] text-gray-400 leading-relaxed">
                      Erkek Boxer Siyah+Lacivert, Kad{"\u0131"}n K{"\u00FC"}lot Siyah+Ten
                    </div>
                  </button>

                  {/* Stand C */}
                  <button
                    type="button"
                    onClick={() => handleSelectOrderType("standC")}
                    className={`rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${
                      orderType === "standC" ? "border-orange-500 bg-orange-50 shadow-md" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-2xl mb-2">{"\u{1F4E6}\u{1F4E6}\u{1F4E6}"}</div>
                    <div className="text-sm font-bold text-[#333333]">Stand C Paketi</div>
                    <div className="mt-1 text-xs font-medium text-gray-500">150 Adet {"\u00B7"} Tam Boy {"\u00C7"}ift Y{"\u00F6"}nl{"\u00FC"}</div>
                    <div className="mt-2 text-[11px] text-gray-400 leading-relaxed">
                      T{"\u00FC"}m renkler: 3 Boxer + 3 K{"\u00FC"}lot
                    </div>
                  </button>

                  {/* Manuel */}
                  <button
                    type="button"
                    onClick={() => handleSelectOrderType("manuel")}
                    className={`rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${
                      orderType === "manuel" ? "border-gray-500 bg-gray-50 shadow-md" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-2xl mb-2">{"\u270F\uFE0F"}</div>
                    <div className="text-sm font-bold text-[#333333]">{"\u00D6"}zel Sipari\u015F</div>
                    <div className="mt-1 text-xs font-medium text-gray-500">Manuel Sipari\u015F</div>
                    <div className="mt-2 text-[11px] text-gray-400 leading-relaxed">
                      {"\u00DC"}r{"\u00FC"}n ve adetleri kendiniz belirleyin
                    </div>
                  </button>
                </div>
              </div>

              {/* SECTION 2: Urun Detaylari */}
              {orderType && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-sm font-semibold text-[#333333]">
                      {"\u00DC"}r{"\u00FC"}n Kalemleri
                      {isStandType && (
                        <span className="ml-2 text-xs font-normal text-gray-400">(Paket i{"\u00E7"}eri\u011Fi otomatik dolduruldu)</span>
                      )}
                    </label>
                    {orderType === "manuel" && (
                      <button
                        onClick={addFormItem}
                        className="flex items-center gap-1.5 rounded-lg bg-[#7AC143] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#6aad38] transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" /> {"\u00DC"}r{"\u00FC"}n Ekle
                      </button>
                    )}
                  </div>

                  {/* Stand paket readonly gosterim */}
                  {isStandType && formItems.length > 0 && (
                    <div className="space-y-3">
                      {formItems.map((item, idx) => (
                        <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-[#333333]">{item.productName}</span>
                              <span className="ml-2 rounded bg-gray-200 px-2 py-0.5 text-[11px] text-gray-600">{item.sku}</span>
                            </div>
                            <span className="rounded-full bg-[#7AC143]/10 px-2.5 py-0.5 text-xs font-medium text-[#7AC143]">
                              {item.color}
                            </span>
                          </div>
                          <div className="grid grid-cols-5 gap-2">
                            {(["S", "M", "L", "XL", "XXL"] as const).map((size) => (
                              <div key={size} className="text-center">
                                <div className="mb-1 text-[10px] font-bold text-gray-400 uppercase">{size}</div>
                                <div className="rounded-lg border border-gray-200 bg-white py-2 text-sm font-semibold text-[#333333]">
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
                        <div key={idx} className="rounded-lg border border-gray-200 bg-white p-4">
                          {/* Urun secimi - buyuk dropdown */}
                          <div className="mb-3 flex items-start gap-3">
                            <div className="flex-1">
                              <select
                                value={item.productId}
                                onChange={(e) => updateFormItem(idx, "productId", e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-[#333333] shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                              >
                                <option value="">{"\u00DC"}r{"\u00FC"}n se{"\u00E7"}in...</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.sku})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              onClick={() => removeFormItem(idx)}
                              className="mt-1 rounded-lg p-2 text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors"
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
                                <span className="text-xs text-gray-400">|</span>
                                <span className="text-xs text-gray-500">SKU:</span>
                                <span className="text-xs font-mono text-gray-600">{item.sku}</span>
                              </div>
                            </div>
                          )}

                          {/* Beden adetleri - buyuk inputlar */}
                          <div className="grid grid-cols-5 gap-2">
                            {(["S", "M", "L", "XL", "XXL"] as const).map((size) => (
                              <div key={size} className="text-center">
                                <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">{size}</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={(item as any)[`size${size}`] || ""}
                                  onChange={(e) => updateFormItem(idx, `size${size}`, parseInt(e.target.value) || 0)}
                                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 text-center text-sm font-semibold text-[#333333] shadow-sm transition-colors focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                                  placeholder="0"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      {formItems.length === 0 && (
                        <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
                          <Package className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                          <p className="text-sm text-gray-400">
                            Hen{"\u00FC"}z {"\u00FC"}r{"\u00FC"}n eklenmedi.
                          </p>
                          <button
                            onClick={addFormItem}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" /> {"\u00DC"}r{"\u00FC"}n Ekle
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
                  <label className="mb-3 block text-sm font-semibold text-[#333333]">Sipari\u015F Bilgileri</label>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-600">Hedef Tarih *</label>
                      <input
                        type="date"
                        value={formData.targetDate}
                        onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-600">{"\u00D6"}ncelik</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                      >
                        <option value="low">D{"\u00FC"}\u015F{"\u00FC"}k</option>
                        <option value="normal">Normal</option>
                        <option value="high">Y{"\u00FC"}ksek</option>
                        <option value="urgent">Acil</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">Notlar</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
                      rows={2}
                      placeholder="{"\u00DC"}retim notlar\u0131..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="shrink-0 border-t bg-gray-50 px-6 py-4 rounded-b-xl">
              <div className="flex items-center justify-between">
                {/* Toplam ozet */}
                <div className="text-sm text-gray-600">
                  {orderType && formItems.length > 0 ? (
                    <span className="font-medium">
                      Toplam: <span className="text-[#7AC143]">{totalItemCount} {"\u00FC"}r{"\u00FC"}n</span> {"\u00B7"}{" "}
                      <span className="text-[#7AC143]">{totalPieceCount.toLocaleString("tr-TR")} adet</span>
                    </span>
                  ) : (
                    <span className="text-gray-400">Sipari\u015F t{"\u00FC"}r{"\u00FC"} se{"\u00E7"}in</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowForm(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    {"\u0130"}ptal
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={saving || !orderType || formItems.length === 0}
                    className="flex items-center gap-2 rounded-lg bg-[#7AC143] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#6aad38] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saving ? "Olu\u015Fturuluyor..." : "Olu\u015Ftur (BOM + Termin Otomatik)"}
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
