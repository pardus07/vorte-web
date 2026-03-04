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
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

const ORDER_STATUS_MAP: Record<
  string,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Bekliyor",
    className: "bg-yellow-100 text-yellow-800",
  },
  PAID: {
    label: "Ödendi",
    className: "bg-green-100 text-green-800",
  },
  PROCESSING: {
    label: "Hazırlanıyor",
    className: "bg-blue-100 text-blue-800",
  },
  SHIPPED: {
    label: "Kargoda",
    className: "bg-purple-100 text-purple-800",
  },
  DELIVERED: {
    label: "Teslim Edildi",
    className: "bg-green-100 text-green-800",
  },
  CANCELLED: {
    label: "İptal",
    className: "bg-red-100 text-red-800",
  },
  REFUNDED: {
    label: "İade",
    className: "bg-gray-100 text-gray-800",
  },
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
    balanceColor = "border-red-300 bg-red-50";
    balanceStatusText = "Cari limitiniz aşıldı!";
    BalanceIcon = AlertTriangle;
  } else if (creditBalance > 0) {
    balanceColor = "border-orange-300 bg-orange-50";
    balanceStatusText = `Bakiyeniz: ${formatPrice(creditBalance)}`;
    BalanceIcon = Clock;
  } else {
    balanceColor = "border-green-300 bg-green-50";
    balanceStatusText = "Bakiyeniz güncel";
    BalanceIcon = CheckCircle;
  }

  // Payment due date (from most recent unpaid order or general term)
  const paymentDueText =
    paymentTermDays > 0
      ? `${paymentTermDays} gün vadeli`
      : "Peşin ödeme";

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hoş Geldiniz, {dealer.companyName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Bayi panelinize genel bakış &middot; {dealer.dealerCode}
          </p>
        </div>
        <Link
          href="/bayi/urunler"
          className="inline-flex items-center gap-2 rounded-lg bg-[#7AC143] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#6aad38]"
        >
          <Plus className="h-4 w-4" />
          Yeni Sipariş Ver
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* 1. Cari Bakiye Card — Large & Prominent */}
        <div
          className={`rounded-lg border-2 p-6 sm:col-span-2 lg:col-span-1 ${balanceColor}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cari Bakiye</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {formatPrice(creditBalance)}
              </p>
              {creditLimit > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  Limit: {formatPrice(creditLimit)}
                </p>
              )}
            </div>
            <div className="rounded-lg bg-white/60 p-2">
              <Wallet className="h-5 w-5 text-gray-700" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <BalanceIcon className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{balanceStatusText}</span>
          </div>
        </div>

        {/* 2. Payment Due Info */}
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Ödeme Vadesi</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {paymentTermDays > 0 ? `${paymentTermDays} gün` : "Peşin"}
              </p>
            </div>
            <div className="rounded-lg bg-blue-100 p-3 text-blue-600">
              <CalendarClock className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-400">{paymentDueText}</p>
        </div>

        {/* 3. This Month's Order Count */}
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Bu Ay Sipariş</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {monthlyOrders}
              </p>
            </div>
            <div className="rounded-lg bg-purple-100 p-3 text-purple-600">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-400">Toplam sipariş adedi</p>
        </div>

        {/* 4. This Month's Order Amount */}
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Bu Ay Tutar</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {formatPrice(monthlyAmount)}
              </p>
            </div>
            <div className="rounded-lg bg-green-100 p-3 text-green-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Onaylanan siparişler toplamı
          </p>
        </div>

        {/* 5. Discount Rate Badge */}
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">İskonto Oranı</p>
              <p className="mt-1 text-2xl font-bold text-[#7AC143]">
                %{discountRate}
              </p>
            </div>
            <div className="rounded-lg bg-yellow-100 p-3 text-yellow-600">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="rounded-full bg-[#7AC143]/10 px-2 py-0.5 text-xs font-medium text-[#7AC143]">
              {tierLabel} Bayi — %{discountRate} İskonto
            </span>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Son Siparişler</h2>
          <Link
            href="/bayi/siparislerim"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#7AC143] hover:underline"
          >
            Tümünü Gör
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="mt-4 rounded-lg border bg-white p-8 text-center">
            <ShoppingCart className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-400">
              Henüz sipariş bulunmuyor
            </p>
            <Link
              href="/bayi/urunler"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#7AC143] px-4 py-2 text-sm font-medium text-white hover:bg-[#6aad38]"
            >
              <Plus className="h-4 w-4" />
              İlk Siparişinizi Verin
            </Link>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-700">
                    Sipariş No
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-700">
                    Tarih
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-700">
                    Tutar
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-700">
                    Durum
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentOrders.map((order) => {
                  const statusInfo = ORDER_STATUS_MAP[order.status] ?? {
                    label: order.status,
                    className: "bg-gray-100 text-gray-800",
                  };
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        #{order.orderNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatPrice(order.totalAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
