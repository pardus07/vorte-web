import { getDealerSession } from "@/lib/dealer-session";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import {
  Wallet,
  CalendarClock,
  ShoppingCart,
  TrendingUp,
  Award,
  Plus,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  Package,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

const ORDER_STATUS_MAP: Record<
  string,
  { label: string; className: string }
> = {
  PENDING: { label: "Bekliyor", className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  PAID: { label: "Ödendi", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  PROCESSING: { label: "Hazırlanıyor", className: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
  SHIPPED: { label: "Kargoda", className: "bg-purple-50 text-purple-700 ring-1 ring-purple-200" },
  DELIVERED: { label: "Teslim Edildi", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  CANCELLED: { label: "İptal", className: "bg-red-50 text-red-700 ring-1 ring-red-200" },
  REFUNDED: { label: "İade", className: "bg-gray-50 text-gray-700 ring-1 ring-gray-200" },
};

const TIER_LABELS: Record<string, string> = {
  standard: "Standart",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

export default async function DealerDashboardPage() {
  const session = await getDealerSession();
  if (!session) redirect("/bayi-girisi");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [dealer, monthlyOrders, monthlyTotal, recentOrders] =
    await Promise.all([
      db.dealer.findUnique({
        where: { id: session.id },
        select: {
          id: true,
          companyName: true,
          dealerCode: true,
          dealerTier: true,
          discountRate: true,
          creditLimit: true,
          creditBalance: true,
          paymentTermDays: true,
          status: true,
        },
      }),
      db.order.count({
        where: {
          dealerId: session.id,
          createdAt: { gte: startOfMonth },
        },
      }),
      db.order.aggregate({
        where: {
          dealerId: session.id,
          createdAt: { gte: startOfMonth },
          status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
        },
        _sum: { totalAmount: true },
      }),
      db.order.findMany({
        where: { dealerId: session.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          status: true,
          createdAt: true,
          _count: { select: { items: true } },
        },
      }),
    ]);

  if (!dealer) redirect("/bayi-girisi");

  const creditBalance = dealer.creditBalance ?? 0;
  const creditLimit = dealer.creditLimit ?? 0;
  const discountRate = dealer.discountRate ?? 0;
  const paymentTermDays = dealer.paymentTermDays ?? 0;
  const tierLabel = TIER_LABELS[dealer.dealerTier] ?? dealer.dealerTier;
  const monthlyAmount = monthlyTotal._sum.totalAmount ?? 0;

  // Determine balance status
  let balanceColor: string;
  let balanceStatusText: string;
  let BalanceIcon: typeof CheckCircle;

  if (creditLimit > 0 && creditBalance > creditLimit) {
    balanceColor = "from-red-500 to-red-600";
    balanceStatusText = "Cari limitiniz aşıldı!";
    BalanceIcon = AlertTriangle;
  } else if (creditBalance > 0) {
    balanceColor = "from-orange-500 to-amber-600";
    balanceStatusText = `Bakiye: ${formatPrice(creditBalance)}`;
    BalanceIcon = Clock;
  } else {
    balanceColor = "from-emerald-500 to-emerald-600";
    balanceStatusText = "Bakiyeniz güncel";
    BalanceIcon = CheckCircle;
  }

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Günaydın";
    if (h < 18) return "İyi günler";
    return "İyi akşamlar";
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {greeting}, {dealer.companyName}
          </h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            {now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })} · {dealer.dealerCode}
          </p>
        </div>
        <Link
          href="/bayi/urunler"
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-purple-600/25 transition-all hover:bg-purple-700 hover:shadow-md"
        >
          <Plus className="h-4 w-4" />
          Yeni Sipariş Ver
        </Link>
      </div>

      {/* Main Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* 1. Cari Bakiye — gradient card */}
        <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${balanceColor} p-5 text-white shadow-lg sm:col-span-2 lg:col-span-1`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-white/70">Cari Bakiye</p>
              <p className="mt-1.5 text-2xl font-bold">{formatPrice(creditBalance)}</p>
            </div>
            <div className="rounded-xl bg-white/15 p-2.5">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-white/80">
            <BalanceIcon className="h-3 w-3" />
            {balanceStatusText}
          </div>
          <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/5" />
        </div>

        {/* 2. Payment Term */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Ödeme Vadesi</p>
              <p className="mt-1.5 text-2xl font-bold text-gray-900">
                {paymentTermDays > 0 ? `${paymentTermDays} gün` : "Peşin"}
              </p>
            </div>
            <div className="rounded-xl bg-blue-50 p-2.5">
              <CalendarClock className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            {paymentTermDays > 0 ? `${paymentTermDays} gün vadeli` : "Peşin ödeme"}
          </p>
        </div>

        {/* 3. Monthly Orders */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Bu Ay Sipariş</p>
              <p className="mt-1.5 text-2xl font-bold text-gray-900">{monthlyOrders}</p>
            </div>
            <div className="rounded-xl bg-purple-50 p-2.5">
              <ShoppingCart className="h-5 w-5 text-purple-500" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">Toplam sipariş adedi</p>
        </div>

        {/* 4. Monthly Amount */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Bu Ay Tutar</p>
              <p className="mt-1.5 text-2xl font-bold text-gray-900">{formatPrice(monthlyAmount)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-2.5">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">Onaylanan toplamı</p>
        </div>

        {/* 5. Discount Rate */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">İskonto</p>
              <p className="mt-1.5 text-2xl font-bold text-purple-600">%{discountRate}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-2.5">
              <Award className="h-5 w-5 text-amber-500" />
            </div>
          </div>
          <p className="mt-2">
            <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-600 ring-1 ring-purple-100">
              {tierLabel} Bayi
            </span>
          </p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-gray-900">
            <Package className="h-4 w-4 text-gray-400" />
            Son Siparişler
          </h2>
          <Link
            href="/bayi/siparislerim"
            className="flex items-center gap-1 text-[12px] font-medium text-purple-600 hover:underline"
          >
            Tümünü Gör
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10">
            <div className="rounded-full bg-purple-50 p-3">
              <ShoppingCart className="h-6 w-6 text-purple-400" />
            </div>
            <p className="text-[13px] text-gray-400">Henüz sipariş bulunmuyor</p>
            <Link
              href="/bayi/urunler"
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-purple-700"
            >
              <Plus className="h-3.5 w-3.5" />
              İlk Siparişinizi Verin
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentOrders.map((order) => {
              const statusInfo = ORDER_STATUS_MAP[order.status] ?? {
                label: order.status,
                className: "bg-gray-50 text-gray-700 ring-1 ring-gray-200",
              };
              return (
                <Link
                  key={order.id}
                  href={`/bayi/siparislerim/${order.id}`}
                  className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-gray-50/50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-mono font-medium text-gray-700">
                        #{order.orderNumber}
                      </span>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      {order._count.items} kalem · {new Date(order.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[13px] font-semibold text-gray-700">
                      {formatPrice(order.totalAmount)}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-gray-300" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
