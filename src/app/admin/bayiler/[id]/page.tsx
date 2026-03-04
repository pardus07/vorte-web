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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

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

export default function AdminDealerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [dealer, setDealer] = useState<DealerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("info");

  // Form state
  const [form, setForm] = useState<Partial<DealerDetail>>({});
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordField, setShowPasswordField] = useState(false);

  // Payment state
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", type: "payment", method: "havale", description: "" });
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // Orders state
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/bayiler" className="rounded-lg border p-2 hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{dealer.companyName}</h1>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tierInfo.className}`}>
                {tierInfo.label}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
              <span className="font-mono">{dealer.dealerCode}</span>
              <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{dealer.phone}</span>
              <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{dealer.email}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{dealer.city}/{dealer.district}</span>
            </div>
          </div>
        </div>
        {dealer.status === "PENDING" && (
          <Button onClick={handleApprove} disabled={saving}>
            Başvuruyu Onayla
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b">
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

      {/* Tab Content */}
      <div className="mt-6">
        {/* ===== TAB 1: GENEL BİLGİLER ===== */}
        {activeTab === "info" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Firma Bilgileri */}
            <div className="rounded-lg border bg-white p-6">
              <h3 className="mb-4 font-semibold text-gray-900">Firma Bilgileri</h3>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Firma Ünvanı</label>
                  <input type="text" value={form.companyName || ""} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="form-input" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">Vergi No</label>
                    <input type="text" value={form.taxNumber || ""} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} className="form-input" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">Vergi Dairesi</label>
                    <input type="text" value={form.taxOffice || ""} onChange={(e) => setForm({ ...form, taxOffice: e.target.value })} className="form-input" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">Durum</label>
                    <select value={form.status || ""} onChange={(e) => setForm({ ...form, status: e.target.value })} className="form-input">
                      <option value="PENDING">Bekliyor</option>
                      <option value="ACTIVE">Aktif</option>
                      <option value="SUSPENDED">Askıda</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">Seviye</label>
                    <select value={form.dealerTier || "standard"} onChange={(e) => setForm({ ...form, dealerTier: e.target.value })} className="form-input">
                      {TIER_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* İletişim Bilgileri */}
            <div className="rounded-lg border bg-white p-6">
              <h3 className="mb-4 font-semibold text-gray-900">İletişim Bilgileri</h3>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Yetkili Adı</label>
                  <input type="text" value={form.contactName || ""} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="form-input" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">Telefon</label>
                    <input type="text" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="form-input" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">E-posta</label>
                    <input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className="form-input" />
                  </div>
                </div>
                {/* Password Reset */}
                <div className="border-t pt-3 mt-3">
                  <button
                    onClick={() => setShowPasswordField(!showPasswordField)}
                    className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <Key className="h-4 w-4" />
                    Şifre Sıfırla
                    {showPasswordField ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  {showPasswordField && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Yeni şifre (min. 6 karakter)"
                        className="form-input"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Adres */}
            <div className="rounded-lg border bg-white p-6">
              <h3 className="mb-4 font-semibold text-gray-900">Teslimat Adresi</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">İl</label>
                    <input type="text" value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} className="form-input" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">İlçe</label>
                    <input type="text" value={form.district || ""} onChange={(e) => setForm({ ...form, district: e.target.value })} className="form-input" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Açık Adres</label>
                  <textarea value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} className="form-input" rows={2} />
                </div>
              </div>
            </div>

            {/* Dükkan Adresi */}
            <div className="rounded-lg border bg-white p-6">
              <h3 className="mb-4 font-semibold text-gray-900">Fiziki Dükkan Adresi</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">Dükkan İl</label>
                    <input type="text" value={form.shopCity || ""} onChange={(e) => setForm({ ...form, shopCity: e.target.value })} className="form-input" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">Dükkan İlçe</label>
                    <input type="text" value={form.shopDistrict || ""} onChange={(e) => setForm({ ...form, shopDistrict: e.target.value })} className="form-input" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Dükkan Adresi</label>
                  <textarea value={form.shopAddress || ""} onChange={(e) => setForm({ ...form, shopAddress: e.target.value })} className="form-input" rows={2} />
                </div>
              </div>
            </div>

            {/* Admin Notları */}
            <div className="rounded-lg border bg-white p-6 lg:col-span-2">
              <h3 className="mb-4 font-semibold text-gray-900">Admin Notları</h3>
              <textarea
                value={form.notes || ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="form-input"
                rows={3}
                placeholder="İç notlar (bayiye gösterilmez)..."
              />
            </div>

            {/* Meta Info */}
            <div className="lg:col-span-2 flex items-center justify-between rounded-lg border bg-gray-50 px-6 py-3 text-xs text-gray-500">
              <div className="flex gap-4">
                <span>Kayıt: {new Date(dealer.createdAt).toLocaleDateString("tr-TR")}</span>
                {dealer.approvedAt && <span>Onay: {new Date(dealer.approvedAt).toLocaleDateString("tr-TR")}</span>}
                <span>Güncelleme: {new Date(dealer.updatedAt).toLocaleDateString("tr-TR")}</span>
              </div>
              <Button onClick={handleSave} disabled={saving} size="sm">
                <Save className="mr-1.5 h-4 w-4" />
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </div>
        )}

        {/* ===== TAB 2: FİYATLANDIRMA ===== */}
        {activeTab === "pricing" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border bg-white p-6">
              <h3 className="mb-4 font-semibold text-gray-900">Ticari Koşullar</h3>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Genel İskonto Oranı (%)</label>
                  <input
                    type="number"
                    value={form.discountRate ?? ""}
                    onChange={(e) => setForm({ ...form, discountRate: e.target.value ? parseFloat(e.target.value) : null })}
                    className="form-input"
                    placeholder="Örn: 15"
                    step="0.5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">Min Sipariş Tutarı (₺)</label>
                    <input
                      type="number"
                      value={form.minOrderAmount ?? ""}
                      onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value ? parseFloat(e.target.value) : null })}
                      className="form-input"
                      placeholder="Örn: 5000"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">Min Sipariş Adedi</label>
                    <input
                      type="number"
                      value={form.minOrderQuantity ?? ""}
                      onChange={(e) => setForm({ ...form, minOrderQuantity: e.target.value ? parseInt(e.target.value) : null })}
                      className="form-input"
                      placeholder="Örn: 12"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">Cari Limit (₺)</label>
                    <input
                      type="number"
                      value={form.creditLimit ?? ""}
                      onChange={(e) => setForm({ ...form, creditLimit: e.target.value ? parseFloat(e.target.value) : null })}
                      className="form-input"
                      placeholder="Örn: 50000"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">Vade Günü</label>
                    <input
                      type="number"
                      value={form.paymentTermDays ?? 0}
                      onChange={(e) => setForm({ ...form, paymentTermDays: parseInt(e.target.value) || 0 })}
                      className="form-input"
                      placeholder="0 = Peşin"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleSave} disabled={saving} size="sm">
                  <Save className="mr-1.5 h-4 w-4" /> Kaydet
                </Button>
              </div>
            </div>

            <div className="rounded-lg border bg-white p-6">
              <h3 className="mb-4 font-semibold text-gray-900">Ürün Bazlı Fiyatlandırma</h3>
              <p className="text-sm text-gray-500 mb-4">
                Bu bayiye özel ürün fiyatları belirlemek için fiyatlandırma sayfasını kullanın.
              </p>
              <Link href="/admin/fiyatlandirma">
                <Button variant="outline" size="sm">
                  <Settings className="mr-1.5 h-4 w-4" /> Fiyatlandırma Sayfası →
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ===== TAB 3: CARİ HESAP ===== */}
        {activeTab === "balance" && (
          <div>
            {/* Balance Cards */}
            <div className="grid gap-4 sm:grid-cols-3 mb-6">
              <div className="rounded-lg border bg-white p-6 text-center">
                <p className="text-sm text-gray-500">Cari Bakiye</p>
                <p className={`mt-2 text-3xl font-bold ${dealer.creditBalance > 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatPrice(dealer.creditBalance)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {dealer.creditBalance > 0 ? "Borçlu" : dealer.creditBalance < 0 ? "Alacaklı" : "Güncel"}
                </p>
              </div>
              <div className="rounded-lg border bg-white p-6 text-center">
                <p className="text-sm text-gray-500">Cari Limit</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {dealer.creditLimit != null ? formatPrice(dealer.creditLimit) : "—"}
                </p>
                {dealer.creditLimit != null && (
                  <p className="text-xs text-gray-400 mt-1">
                    Kullanılabilir: {formatPrice(dealer.creditLimit - dealer.creditBalance)}
                  </p>
                )}
              </div>
              <div className="rounded-lg border bg-white p-6 text-center">
                <p className="text-sm text-gray-500">Vade</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{dealer.paymentTermDays}</p>
                <p className="text-xs text-gray-400 mt-1">{dealer.paymentTermDays === 0 ? "Peşin" : "Gün"}</p>
              </div>
            </div>

            {/* Credit Limit Warning */}
            {dealer.creditLimit != null && dealer.creditBalance >= dealer.creditLimit * 0.9 && (
              <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                <p className="text-sm text-red-800">
                  Cari limit kullanımı %{Math.round((dealer.creditBalance / dealer.creditLimit) * 100)} seviyesinde.
                  {dealer.creditBalance >= dealer.creditLimit && " Limit aşılmış!"}
                </p>
              </div>
            )}

            {/* Add Payment Button */}
            <div className="mb-4 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Cari Hareketler</h3>
              <Button size="sm" onClick={() => setShowPaymentForm(!showPaymentForm)}>
                <Plus className="mr-1.5 h-4 w-4" /> Ödeme Kaydet
              </Button>
            </div>

            {/* Payment Form */}
            {showPaymentForm && (
              <div className="mb-4 rounded-lg border bg-white p-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">Tutar (₺)</label>
                    <input
                      type="number"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      className="form-input"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">İşlem Tipi</label>
                    <select
                      value={paymentForm.type}
                      onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })}
                      className="form-input"
                    >
                      <option value="payment">Ödeme (Alacak)</option>
                      <option value="debt">Borç</option>
                      <option value="refund">İade</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">Yöntem</label>
                    <select
                      value={paymentForm.method}
                      onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                      className="form-input"
                    >
                      <option value="havale">Havale/EFT</option>
                      <option value="nakit">Nakit</option>
                      <option value="cek">Çek</option>
                      <option value="kredi_karti">Kredi Kartı</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">Açıklama</label>
                    <input
                      type="text"
                      value={paymentForm.description}
                      onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                      className="form-input"
                      placeholder="İsteğe bağlı"
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowPaymentForm(false)}>İptal</Button>
                  <Button size="sm" onClick={handleAddPayment}>Kaydet</Button>
                </div>
              </div>
            )}

            {/* Payment History Table */}
            <div className="overflow-x-auto rounded-lg border bg-white">
              {paymentLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 font-medium text-gray-700">Tarih</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Açıklama</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Yöntem</th>
                      <th className="px-4 py-3 font-medium text-gray-700 text-right">Borç (₺)</th>
                      <th className="px-4 py-3 font-medium text-gray-700 text-right">Alacak (₺)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(p.createdAt).toLocaleDateString("tr-TR")}
                        </td>
                        <td className="px-4 py-3">{p.description || "—"}</td>
                        <td className="px-4 py-3 text-gray-500 capitalize">{p.method || "—"}</td>
                        <td className="px-4 py-3 text-right font-medium text-red-600">
                          {p.type === "debt" ? formatPrice(p.amount) : ""}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-green-600">
                          {p.type === "payment" || p.type === "refund" ? formatPrice(p.amount) : ""}
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                          Henüz cari hareket yok
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ===== TAB 4: SİPARİŞLER ===== */}
        {activeTab === "orders" && (
          <div>
            {/* Summary */}
            <div className="grid gap-4 sm:grid-cols-2 mb-6">
              <div className="rounded-lg border bg-white p-6 text-center">
                <p className="text-sm text-gray-500">Toplam Sipariş</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{ordersSummary.totalOrderCount}</p>
              </div>
              <div className="rounded-lg border bg-white p-6 text-center">
                <p className="text-sm text-gray-500">Toplam Ciro</p>
                <p className="mt-2 text-3xl font-bold text-[#7AC143]">{formatPrice(ordersSummary.totalRevenue)}</p>
              </div>
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto rounded-lg border bg-white">
              {ordersLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 font-medium text-gray-700">Sipariş No</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Ürünler</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Tutar</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Tarih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.map((order) => {
                      const orderStatus = ORDER_STATUS_MAP[order.status] || { label: order.status, variant: "outline" as const };
                      return (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <Link href={`/admin/siparisler/${order.id}`} className="font-medium text-[#7AC143] hover:underline">
                              #{order.orderNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {order.items.slice(0, 2).map((item, i) => (
                              <span key={i} className="text-xs">
                                {(item.productSnapshot as { name?: string })?.name || "Ürün"} x{item.quantity}
                                {i < Math.min(order.items.length, 2) - 1 && ", "}
                              </span>
                            ))}
                            {order.items.length > 2 && <span className="text-xs text-gray-400"> +{order.items.length - 2}</span>}
                          </td>
                          <td className="px-4 py-3 font-medium">{formatPrice(order.totalAmount)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={orderStatus.variant}>{orderStatus.label}</Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                          </td>
                        </tr>
                      );
                    })}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                          Henüz sipariş yok
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ===== TAB 5: FATURALAR ===== */}
        {activeTab === "invoices" && (
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-4 font-semibold text-gray-900">Fatura Geçmişi</h3>
            <p className="text-sm text-gray-500">
              Bu bayiye kesilen faturaları görüntülemek için faturalar sayfasına gidin.
            </p>
            <div className="mt-4">
              <Link href="/admin/faturalar">
                <Button variant="outline" size="sm">
                  <FileText className="mr-1.5 h-4 w-4" /> Faturalar Sayfası →
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
