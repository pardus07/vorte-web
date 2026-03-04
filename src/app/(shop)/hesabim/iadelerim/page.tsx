export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import {
  RotateCcw,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  ArrowRight,
} from "lucide-react";

const RETURN_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Bekliyor", color: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Onaylandı", color: "bg-green-100 text-green-700" },
  rejected: { label: "Reddedildi", color: "bg-red-100 text-red-700" },
  shipped: { label: "Kargo Edildi", color: "bg-purple-100 text-purple-700" },
  completed: { label: "Tamamlandı", color: "bg-green-100 text-green-700" },
  refunded: { label: "İade Edildi", color: "bg-blue-100 text-blue-700" },
};

const REASON_MAP: Record<string, string> = {
  beden_uyumsuz: "Beden uygun değil",
  kusurlu: "Ürün kusurlu/hasarlı",
  yanlis_urun: "Yanlış ürün gönderilmiş",
  beklenti: "Beklentimi karşılamadı",
  diger: "Diğer",
};

export default async function ReturnRequestsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const returns = await db.returnRequest.findMany({
    where: { userId: session.user.id },
    include: {
      order: { select: { orderNumber: true, totalAmount: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Breadcrumb
        items={[
          { label: "Ana Sayfa", href: "/" },
          { label: "Hesabım", href: "/hesabim" },
          { label: "İade Taleplerim" },
        ]}
      />
      <h1 className="mt-4 text-2xl font-bold text-gray-900">İade Taleplerim</h1>
      <p className="mt-1 text-sm text-gray-500">
        Teslim edilen siparişler için 14 gün içinde iade talebi oluşturabilirsiniz.
      </p>

      {returns.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <RotateCcw className="h-16 w-16 text-gray-300" />
          <h2 className="mt-4 text-lg font-bold text-gray-900">İade Talebi Yok</h2>
          <p className="mt-2 text-sm text-gray-500">
            Henüz bir iade talebiniz bulunmuyor.
          </p>
          <Link
            href="/hesabim/siparislerim"
            className="mt-4 inline-flex items-center gap-1 text-sm text-[#7AC143] hover:underline"
          >
            Siparişlerimi Gör
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {returns.map((r) => {
            const st = RETURN_STATUS[r.status] || { label: r.status, color: "bg-gray-100 text-gray-600" };
            return (
              <div key={r.id} className="rounded-lg border bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        Sipariş #{r.order.orderNumber}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {REASON_MAP[r.reason] || r.reason}
                    </p>
                    {r.description && (
                      <p className="mt-1 text-sm text-gray-500">{r.description}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString("tr-TR")}
                  </p>
                </div>

                {/* Status details */}
                <div className="mt-3 flex flex-wrap gap-4 border-t pt-3">
                  {r.refundAmount && r.refundAmount > 0 && (
                    <p className="text-sm text-gray-600">
                      İade Tutarı: <span className="font-medium text-green-600">{formatPrice(r.refundAmount)}</span>
                    </p>
                  )}
                  {r.cargoTrackingNo && (
                    <p className="text-sm text-gray-600">
                      Kargo Takip: <span className="font-mono font-medium text-[#7AC143]">{r.cargoTrackingNo}</span>
                    </p>
                  )}
                  {r.adminNote && (
                    <p className="text-sm text-gray-600">
                      Not: <span className="text-gray-700">{r.adminNote}</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
