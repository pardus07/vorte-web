import { getDealerSession } from "@/lib/dealer-session";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

export default async function DealerCariHesapPage() {
  const session = await getDealerSession();
  if (!session) return null;

  const dealer = await db.dealer.findUnique({
    where: { id: session.id },
    select: {
      creditBalance: true,
      creditLimit: true,
      discountRate: true,
      dealerTier: true,
      paymentTermDays: true,
    },
  });

  if (!dealer) return null;

  // Get dealer payments (credit movements)
  const payments = await db.dealerPayment.findMany({
    where: { dealerId: session.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Get order numbers for payments that have orderId
  const orderIds = payments.map((p) => p.orderId).filter(Boolean) as string[];
  const orders = orderIds.length > 0
    ? await db.order.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, orderNumber: true },
      })
    : [];
  const orderMap = new Map(orders.map((o) => [o.id, o.orderNumber]));

  const balance = dealer.creditBalance || 0;
  const limit = dealer.creditLimit || 0;
  const available = limit - balance;

  // Calculate totals — type: "debt" (borç), "payment" (ödeme), "refund" (iade)
  const totalDebit = payments.filter((p) => p.type === "debt").reduce((sum, p) => sum + p.amount, 0);
  const totalCredit = payments.filter((p) => p.type === "payment" || p.type === "refund").reduce((sum, p) => sum + p.amount, 0);

  const balanceColor =
    balance <= 0
      ? "border-green-300 bg-green-50"
      : balance > limit
        ? "border-red-300 bg-red-50"
        : "border-orange-300 bg-orange-50";

  const balanceTextColor =
    balance <= 0
      ? "text-green-700"
      : balance > limit
        ? "text-red-700"
        : "text-orange-700";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Cari Hesap</h1>
      <p className="mt-1 text-sm text-gray-500">Cari bakiye ve hesap hareketleri</p>

      {/* Balance Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={`rounded-lg border-2 p-6 ${balanceColor}`}>
          <div className="flex items-center gap-2">
            <Wallet className={`h-5 w-5 ${balanceTextColor}`} />
            <p className="text-sm font-medium text-gray-600">Cari Bakiye</p>
          </div>
          <p className={`mt-2 text-2xl font-bold ${balanceTextColor}`}>
            {formatPrice(balance)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {balance <= 0
              ? "Bakiyeniz güncel"
              : balance > limit
                ? "Cari limitiniz aşıldı!"
                : "Ödenmesi gereken bakiye"}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-500" />
            <p className="text-sm font-medium text-gray-600">Cari Limit</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatPrice(limit)}</p>
          <p className="mt-1 text-xs text-gray-500">Toplam kredi limiti</p>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <p className="text-sm font-medium text-gray-600">Kullanılabilir</p>
          </div>
          <p className={`mt-2 text-2xl font-bold ${available >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatPrice(Math.max(0, available))}
          </p>
          <p className="mt-1 text-xs text-gray-500">Kalan limit</p>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-500" />
            <p className="text-sm font-medium text-gray-600">Vade</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {dealer.paymentTermDays || 0} gün
          </p>
          <p className="mt-1 text-xs text-gray-500">Ödeme vadesi</p>
        </div>
      </div>

      {/* Bank Info */}
      <div className="mt-6 rounded-lg border bg-blue-50 p-6">
        <h3 className="flex items-center gap-2 font-bold text-blue-900">
          <Building2 className="h-4 w-4" />
          Havale / EFT Bilgileri
        </h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-blue-600">Banka</p>
            <p className="font-medium text-blue-900">Ziraat Bankası</p>
          </div>
          <div>
            <p className="text-xs text-blue-600">Şube</p>
            <p className="font-medium text-blue-900">Nilüfer / Bursa</p>
          </div>
          <div>
            <p className="text-xs text-blue-600">IBAN</p>
            <p className="font-mono font-medium text-blue-900">TR00 0000 0000 0000 0000 0000 00</p>
          </div>
          <div>
            <p className="text-xs text-blue-600">Hesap Sahibi</p>
            <p className="font-medium text-blue-900">Vorte Tekstil San. Tic. Ltd. Şti.</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-blue-600">
          Açıklama kısmına bayi kodunuzu ({session.dealerCode}) yazmayı unutmayın.
        </p>
      </div>

      {/* Movement History */}
      <div className="mt-6">
        <h2 className="text-lg font-bold text-gray-900">Cari Hareketler</h2>
        <div className="mt-2 flex gap-4 text-sm">
          <span className="flex items-center gap-1 text-red-600">
            <TrendingDown className="h-3.5 w-3.5" />
            Toplam Borç: {formatPrice(totalDebit)}
          </span>
          <span className="flex items-center gap-1 text-green-600">
            <TrendingUp className="h-3.5 w-3.5" />
            Toplam Ödeme: {formatPrice(totalCredit)}
          </span>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Tarih</th>
                <th className="px-4 py-3 font-medium text-gray-700">Açıklama</th>
                <th className="px-4 py-3 font-medium text-gray-700 text-right">Borç</th>
                <th className="px-4 py-3 font-medium text-gray-700 text-right">Alacak</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(p.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {p.type === "debt" ? (
                        <ArrowUpRight className="h-4 w-4 text-red-400" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-green-400" />
                      )}
                      <div>
                        <p className="text-gray-700">
                          {p.description || (p.type === "debt" ? "Sipariş Borcu" : "Ödeme")}
                        </p>
                        {p.orderId && orderMap.get(p.orderId) && (
                          <p className="text-xs text-gray-400">#{orderMap.get(p.orderId)}</p>
                        )}
                      </div>
                    </div>
                  </td>
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
                  <td colSpan={4} className="py-12 text-center text-gray-400">
                    Henüz cari hareket yok
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
