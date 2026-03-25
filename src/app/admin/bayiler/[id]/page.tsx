"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Save,
  Wallet,
  ShoppingCart,
  FileText,
  Settings,
  Phone,
  Mail,
  MapPin,
  Key,
  Plus,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Trash2,
  TrendingUp,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  Banknote,
  Receipt,
  Calendar,
  Hash,
  User,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

/* ─── Constants ─── */
const TIER_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "platinum", label: "Platinum" },
];

const TIER_BADGES: Record<string, { label: string; className: string }> = {
  standard: { label: "Standard", className: "bg-gray-100 text-gray-700" },
  silver: { label: "Silver", className: "bg-gray-200 text-gray-800" },
  gold: { label: "Gold", className: "bg-amber-100 text-amber-800" },
  platinum: { label: "Platinum", className: "bg-purple-100 text-purple-800" },
};

const STATUS_MAP: Record<string, { label: string; variant: "success" | "warning" | "discount" }> = {
  ACTIVE: { label: "Aktif", variant: "success" },
  PENDING: { label: "Bekliyor", variant: "warning" },
  SUSPENDED: { label: "Askıda", variant: "discount" },
};

const ORDER_STATUS_MAP: Record<string, { label: string; variant: "success" | "warning" | "discount" | "outline" | "new" }> = {
  PENDING: { label: "Bekliyor", variant: "warning" },
  PAID: { label: "Ödendi", variant: "success" },
  PROCESSING: { label: "Hazırlanıyor", variant: "new" },
  SHIPPED: { label: "Kargoda", variant: "new" },
  DELIVERED: { label: "Teslim", variant: "success" },
  CANCELLED: { label: "İptal", variant: "discount" },
  REFUNDED: { label: "İade", variant: "discount" },
};

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-[#7AC143]/30 focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20";
const labelCls = "mb-1.5 block text-[13px] font-medium text-gray-600";

/* ─── Types ─── */
interface DealerDetail {
  id: string;
  companyName: string;
  taxNumber: string;
  taxOffice: string;
  dealerCode: string;
  contactName: string;
  phone: string;
  email: string;
  city: string;
  district: string;
  address: string;
  shopAddress: string | null;
  shopCity: string | null;
  shopDistrict: string | null;
  discountRate: number | null;
  creditLimit: number | null;
  creditBalance: number;
  minOrderAmount: number | null;
  minOrderQuantity: number | null;
  paymentTermDays: number;
  dealerTier: string;
  status: string;
  approvedAt: string | null;
  approvedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaymentRecord {
  id: string;
  amount: number;
  type: string;
  method: string | null;
  description: string | null;
  createdAt: string;
}

interface OrderRecord {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: { quantity: number; totalPrice: number; productSnapshot: { name?: string } }[];
}

type TabType = "info" | "pricing" | "balance" | "orders" | "invoices";

/* ─── Component ─── */
export default function AdminDealerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [dealer, setDealer] = useState<DealerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("info");

  const [form, setForm] = useState<Partial<DealerDetail>>({});
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordField, setShowPasswordField] = useState(false);

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", type: "payment", method: "havale", description: "" });
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersSummary, setOrdersSummary] = useState({ totalRevenue: 0, totalOrderCount: 0 });

  const formatPrice = (n: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);

  const fetchDealer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/dealers/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDealer(data);
      setForm(data);
    } catch {
      router.push("/admin/bayiler");
    }
    setLoading(false);
  }, [id, router]);

  const fetchPayments = useCallback(async () => {
    setPaymentLoading(true);
    try {
      const res = await fetch(`/api/admin/dealers/${id}/payments`);
      const data = await res.json();
      setPayments(data.payments || []);
    } catch { /* silent */ }
    setPaymentLoading(false);
  }, [id]);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch(`/api/admin/dealers/${id}/orders`);
      const data = await res.json();
      setOrders(data.orders || []);
      setOrdersSummary({ totalRevenue: data.totalRevenue || 0, totalOrderCount: data.totalOrderCount || 0 });
    } catch { /* silent */ }
    setOrdersLoading(false);
  }, [id]);

  useEffect(() => {
    fetchDealer();
  }, [fetchDealer]);

  useEffect(() => {
    if (activeTab === "balance") fetchPayments();
    if (activeTab === "orders") fetchOrders();
  }, [activeTab, fetchPayments, fetchOrders]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { ...form };
      if (newPassword) body.newPassword = newPassword;
      const res = await fetch(`/api/admin/dealers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await fetchDealer();
        setNewPassword("");
        setShowPasswordField(false);
        alert("Bayi bilgileri güncellendi");
      }
    } catch { /* silent */ }
    setSaving(false);
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/dealers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      await fetchDealer();
      alert("Bayi onaylandı");
    } catch { /* silent */ }
    setSaving(false);
  };

  const handleAddPayment = async () => {
    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) return;
    try {
      const res = await fetch(`/api/admin/dealers/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          type: paymentForm.type,
          method: paymentForm.method,
          description: paymentForm.description || undefined,
        }),
      });
      if (res.ok) {
        setPaymentForm({ amount: "", type: "payment", method: "havale", description: "" });
        setShowPaymentForm(false);
        await Promise.all([fetchPayments(), fetchDealer()]);
      }
    } catch { /* silent */ }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `"${dealer?.companyName}" bayisini silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/dealers/${id}`, { method: "DELETE" });
      if (res.ok) {
        alert("Bayi silindi");
        router.push("/admin/bayiler");
      } else {
        const data = await res.json();
        alert(data.error || "Bayi silinemedi");
      }
    } catch {
      alert("Bir hata oluştu");
    }
    setDeleting(false);
  };

  /* ─── Loading ─── */
  if (loading || !dealer) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
      </div>
    );
  }

  const statusInfo = STATUS_MAP[dealer.status] || { label: dealer.status, variant: "discount" as const };
  const tierInfo = TIER_BADGES[dealer.dealerTier] || TIER_BADGES.standard;

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: "info", label: "Genel Bilgiler", icon: Building2 },
    { id: "pricing", label: "Fiyatlandırma", icon: Settings },
    { id: "balance", label: "Cari Hesap", icon: Wallet },
    { id: "orders", label: "Siparişler", icon: ShoppingCart },
    { id: "invoices", label: "Faturalar", icon: FileText },
  ];

  const creditUsagePercent = dealer.creditLimit
    ? Math.min(Math.round((dealer.creditBalance / dealer.creditLimit) * 100), 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/bayiler"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm transition-colors hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">{dealer.companyName}</h1>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tierInfo.className}`}>
                {tierInfo.label}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-gray-500">
              <span className="flex items-center gap-1.5 font-mono text-xs"><Hash className="h-3.5 w-3.5" />{dealer.dealerCode}</span>
              <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{dealer.contactName}</span>
              <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{dealer.phone}</span>
              <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{dealer.email}</span>
              <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{dealer.city}/{dealer.district}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dealer.status === "PENDING" && (
            <button
              onClick={handleApprove}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Başvuruyu Onayla
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? "Siliniyor..." : "Sil"}
          </button>
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-[#7AC143] text-[#7AC143]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── Tab Content ─── */}

      {/* ========== TAB 1: GENEL BİLGİLER ========== */}
      {activeTab === "info" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Firma Bilgileri */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Building2 className="h-4.5 w-4.5 text-blue-600" />
              </div>
              <h3 className="text-[15px] font-semibold text-gray-900">Firma Bilgileri</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Firma Ünvanı</label>
                <input type="text" value={form.companyName || ""} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Vergi No</label>
                  <input type="text" value={form.taxNumber || ""} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Vergi Dairesi</label>
                  <input type="text" value={form.taxOffice || ""} onChange={(e) => setForm({ ...form, taxOffice: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Durum</label>
                  <select value={form.status || ""} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                    <option value="PENDING">Bekliyor</option>
                    <option value="ACTIVE">Aktif</option>
                    <option value="SUSPENDED">Askıda</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Seviye</label>
                  <select value={form.dealerTier || "standard"} onChange={(e) => setForm({ ...form, dealerTier: e.target.value })} className={inputCls}>
                    {TIER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* İletişim */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
                <Phone className="h-4.5 w-4.5 text-green-600" />
              </div>
              <h3 className="text-[15px] font-semibold text-gray-900">İletişim Bilgileri</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Yetkili Adı</label>
                <input type="text" value={form.contactName || ""} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Telefon</label>
                  <input type="text" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>E-posta</label>
                  <input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <button
                  onClick={() => setShowPasswordField(!showPasswordField)}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
                >
                  <Key className="h-4 w-4" />
                  Şifre Sıfırla
                  {showPasswordField ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {showPasswordField && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Yeni şifre (min. 6 karakter)"
                      className={inputCls}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Teslimat Adresi */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
                <MapPin className="h-4.5 w-4.5 text-orange-600" />
              </div>
              <h3 className="text-[15px] font-semibold text-gray-900">Teslimat Adresi</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>İl</label>
                  <input type="text" value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>İlçe</label>
                  <input type="text" value={form.district || ""} onChange={(e) => setForm({ ...form, district: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Açık Adres</label>
                <textarea value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} rows={2} />
              </div>
            </div>
          </div>

          {/* Dükkan Adresi */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
                <Store className="h-4.5 w-4.5 text-purple-600" />
              </div>
              <h3 className="text-[15px] font-semibold text-gray-900">Fiziki Dükkan Adresi</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Dükkan İl</label>
                  <input type="text" value={form.shopCity || ""} onChange={(e) => setForm({ ...form, shopCity: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Dükkan İlçe</label>
                  <input type="text" value={form.shopDistrict || ""} onChange={(e) => setForm({ ...form, shopDistrict: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Dükkan Adresi</label>
                <textarea value={form.shopAddress || ""} onChange={(e) => setForm({ ...form, shopAddress: e.target.value })} className={inputCls} rows={2} />
              </div>
            </div>
          </div>

          {/* Admin Notları */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-5 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                <FileText className="h-4.5 w-4.5 text-gray-600" />
              </div>
              <h3 className="text-[15px] font-semibold text-gray-900">Admin Notları</h3>
            </div>
            <textarea
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={inputCls}
              rows={3}
              placeholder="İç notlar (bayiye gösterilmez)..."
            />
          </div>

          {/* Meta + Save */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/50 px-6 py-4 lg:col-span-2">
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Kayıt: {new Date(dealer.createdAt).toLocaleDateString("tr-TR")}
              </span>
              {dealer.approvedAt && (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  Onay: {new Date(dealer.approvedAt).toLocaleDateString("tr-TR")}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Güncelleme: {new Date(dealer.updatedAt).toLocaleDateString("tr-TR")}
              </span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-[#1A1A1A] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </button>
          </div>
        </div>
      )}

      {/* ========== TAB 2: FİYATLANDIRMA ========== */}
      {activeTab === "pricing" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <CreditCard className="h-4.5 w-4.5 text-emerald-600" />
              </div>
              <h3 className="text-[15px] font-semibold text-gray-900">Ticari Koşullar</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Genel İskonto Oranı (%)</label>
                <input
                  type="number"
                  value={form.discountRate ?? ""}
                  onChange={(e) => setForm({ ...form, discountRate: e.target.value ? parseFloat(e.target.value) : null })}
                  className={inputCls}
                  placeholder="Örn: 15"
                  step="0.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Min Sipariş Tutarı (₺)</label>
                  <input
                    type="number"
                    value={form.minOrderAmount ?? ""}
                    onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value ? parseFloat(e.target.value) : null })}
                    className={inputCls}
                    placeholder="Örn: 5000"
                  />
                </div>
                <div>
                  <label className={labelCls}>Min Sipariş Adedi</label>
                  <input
                    type="number"
                    value={form.minOrderQuantity ?? ""}
                    onChange={(e) => setForm({ ...form, minOrderQuantity: e.target.value ? parseInt(e.target.value) : null })}
                    className={inputCls}
                    placeholder="Örn: 12"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Cari Limit (₺)</label>
                  <input
                    type="number"
                    value={form.creditLimit ?? ""}
                    onChange={(e) => setForm({ ...form, creditLimit: e.target.value ? parseFloat(e.target.value) : null })}
                    className={inputCls}
                    placeholder="Örn: 50000"
                  />
                </div>
                <div>
                  <label className={labelCls}>Vade Günü</label>
                  <input
                    type="number"
                    value={form.paymentTermDays ?? 0}
                    onChange={(e) => setForm({ ...form, paymentTermDays: parseInt(e.target.value) || 0 })}
                    className={inputCls}
                    placeholder="0 = Peşin"
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333] disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> Kaydet
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Current Pricing Summary */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                  <TrendingUp className="h-4.5 w-4.5 text-amber-600" />
                </div>
                <h3 className="text-[15px] font-semibold text-gray-900">Mevcut Koşullar</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <span className="text-sm text-gray-600">İskonto</span>
                  <span className="text-sm font-semibold text-gray-900">%{dealer.discountRate ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <span className="text-sm text-gray-600">Cari Limit</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {dealer.creditLimit != null ? formatPrice(dealer.creditLimit) : "Limitsiz"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <span className="text-sm text-gray-600">Vade</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {dealer.paymentTermDays === 0 ? "Peşin" : `${dealer.paymentTermDays} gün`}
                  </span>
                </div>
              </div>
            </div>

            {/* Product Pricing Link */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                  <Settings className="h-4.5 w-4.5 text-violet-600" />
                </div>
                <h3 className="text-[15px] font-semibold text-gray-900">Ürün Bazlı Fiyatlandırma</h3>
              </div>
              <p className="mb-4 text-[13px] text-gray-500">
                Bu bayiye özel ürün fiyatları belirlemek için fiyatlandırma sayfasını kullanın.
              </p>
              <Link
                href="/admin/fiyatlandirma"
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
              >
                <Settings className="h-4 w-4" /> Fiyatlandırma Sayfası
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ========== TAB 3: CARİ HESAP ========== */}
      {activeTab === "balance" && (
        <div className="space-y-6">
          {/* Balance Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${dealer.creditBalance > 0 ? "bg-red-50" : "bg-green-50"}`}>
                  <Wallet className={`h-5 w-5 ${dealer.creditBalance > 0 ? "text-red-600" : "text-green-600"}`} />
                </div>
                <div>
                  <p className="text-[13px] text-gray-500">Cari Bakiye</p>
                  <p className={`text-xl font-bold ${dealer.creditBalance > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatPrice(dealer.creditBalance)}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {dealer.creditBalance > 0 ? "Borçlu" : dealer.creditBalance < 0 ? "Alacaklı" : "Güncel"}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[13px] text-gray-500">Cari Limit</p>
                  <p className="text-xl font-bold text-gray-900">
                    {dealer.creditLimit != null ? formatPrice(dealer.creditLimit) : "—"}
                  </p>
                  {dealer.creditLimit != null && (
                    <p className="text-[11px] text-gray-400">
                      Kullanılabilir: {formatPrice(dealer.creditLimit - dealer.creditBalance)}
                    </p>
                  )}
                </div>
              </div>
              {dealer.creditLimit != null && (
                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all ${creditUsagePercent >= 90 ? "bg-red-500" : creditUsagePercent >= 70 ? "bg-amber-500" : "bg-blue-500"}`}
                      style={{ width: `${Math.max(creditUsagePercent, 0)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400">%{creditUsagePercent} kullanım</p>
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-[13px] text-gray-500">Vade</p>
                  <p className="text-xl font-bold text-gray-900">{dealer.paymentTermDays}</p>
                  <p className="text-[11px] text-gray-400">{dealer.paymentTermDays === 0 ? "Peşin" : "Gün"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Credit Limit Warning */}
          {dealer.creditLimit != null && dealer.creditBalance >= dealer.creditLimit * 0.9 && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
              <p className="text-sm text-red-800">
                Cari limit kullanımı %{creditUsagePercent} seviyesinde.
                {dealer.creditBalance >= dealer.creditLimit && " Limit aşılmış!"}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-gray-900">Cari Hareketler</h3>
            <button
              onClick={() => setShowPaymentForm(!showPaymentForm)}
              className="flex items-center gap-1.5 rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333]"
            >
              <Plus className="h-4 w-4" /> Ödeme Kaydet
            </button>
          </div>

          {/* Payment Form */}
          {showPaymentForm && (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <label className={labelCls}>Tutar (₺)</label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className={inputCls}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className={labelCls}>İşlem Tipi</label>
                  <select
                    value={paymentForm.type}
                    onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })}
                    className={inputCls}
                  >
                    <option value="payment">Ödeme (Alacak)</option>
                    <option value="debt">Borç</option>
                    <option value="refund">İade</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Yöntem</label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    className={inputCls}
                  >
                    <option value="havale">Havale/EFT</option>
                    <option value="nakit">Nakit</option>
                    <option value="cek">Çek</option>
                    <option value="kredi_karti">Kredi Kartı</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Açıklama</label>
                  <input
                    type="text"
                    value={paymentForm.description}
                    onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                    className={inputCls}
                    placeholder="İsteğe bağlı"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setShowPaymentForm(false)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleAddPayment}
                  className="flex items-center gap-1.5 rounded-xl bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333]"
                >
                  <Banknote className="h-4 w-4" /> Kaydet
                </button>
              </div>
            </div>
          )}

          {/* Payment History Table */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {paymentLoading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50/80">
                  <tr>
                    <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Tarih</th>
                    <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Açıklama</th>
                    <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Yöntem</th>
                    <th className="px-5 py-3.5 text-right text-[12px] font-semibold uppercase tracking-wider text-red-500">Borç (₺)</th>
                    <th className="px-5 py-3.5 text-right text-[12px] font-semibold uppercase tracking-wider text-green-600">Alacak (₺)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payments.map((p) => (
                    <tr key={p.id} className="transition-colors hover:bg-gray-50/50">
                      <td className="px-5 py-3.5 text-gray-500">
                        {new Date(p.createdAt).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="px-5 py-3.5 text-gray-700">{p.description || "—"}</td>
                      <td className="px-5 py-3.5 capitalize text-gray-500">{p.method || "—"}</td>
                      <td className="px-5 py-3.5 text-right font-medium text-red-600">
                        {p.type === "debt" ? formatPrice(p.amount) : ""}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-green-600">
                        {p.type === "payment" || p.type === "refund" ? formatPrice(p.amount) : ""}
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-16 text-center">
                        <Receipt className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                        <p className="text-sm text-gray-400">Henüz cari hareket yok</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ========== TAB 4: SİPARİŞLER ========== */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[13px] text-gray-500">Toplam Sipariş</p>
                  <p className="text-2xl font-bold text-gray-900">{ordersSummary.totalOrderCount}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-[13px] text-gray-500">Toplam Ciro</p>
                  <p className="text-2xl font-bold text-[#7AC143]">{formatPrice(ordersSummary.totalRevenue)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {ordersLoading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50/80">
                  <tr>
                    <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Sipariş No</th>
                    <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Ürünler</th>
                    <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Tutar</th>
                    <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Durum</th>
                    <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.map((order) => {
                    const orderStatus = ORDER_STATUS_MAP[order.status] || { label: order.status, variant: "outline" as const };
                    return (
                      <tr key={order.id} className="transition-colors hover:bg-gray-50/50">
                        <td className="px-5 py-3.5">
                          <Link href={`/admin/siparisler/${order.id}`} className="font-medium text-[#7AC143] hover:underline">
                            #{order.orderNumber}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-gray-600">
                          {order.items.slice(0, 2).map((item, i) => (
                            <span key={i} className="text-xs">
                              {(item.productSnapshot as { name?: string })?.name || "Ürün"} x{item.quantity}
                              {i < Math.min(order.items.length, 2) - 1 && ", "}
                            </span>
                          ))}
                          {order.items.length > 2 && <span className="text-xs text-gray-400"> +{order.items.length - 2}</span>}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-gray-900">{formatPrice(order.totalAmount)}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant={orderStatus.variant}>{orderStatus.label}</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                        </td>
                      </tr>
                    );
                  })}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-16 text-center">
                        <ShoppingCart className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                        <p className="text-sm text-gray-400">Henüz sipariş yok</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ========== TAB 5: FATURALAR ========== */}
      {activeTab === "invoices" && (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
              <FileText className="h-7 w-7 text-gray-400" />
            </div>
            <h3 className="mb-2 text-[15px] font-semibold text-gray-900">Fatura Geçmişi</h3>
            <p className="mb-6 text-[13px] text-gray-500">
              Bu bayiye kesilen faturaları görüntülemek için faturalar sayfasına gidin.
            </p>
            <Link
              href="/admin/faturalar"
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <FileText className="h-4 w-4" /> Faturalar Sayfası
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
