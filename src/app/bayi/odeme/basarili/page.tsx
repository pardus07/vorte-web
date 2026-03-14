"use client";

import { useSearchParams } from "next/navigation";
import { CheckCircle, ArrowRight, Package } from "lucide-react";
import Link from "next/link";

export default function DealerPaymentSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="rounded-full bg-green-100 p-4">
        <CheckCircle className="h-12 w-12 text-green-600" />
      </div>

      <h1 className="mt-6 text-2xl font-bold text-gray-900">Siparişiniz Alındı!</h1>
      <p className="mt-2 max-w-md text-center text-gray-500">
        Ödemeniz başarıyla tamamlandı. Siparişiniz hazırlanmaya başlayacaktır.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {orderId && (
          <Link
            href={`/bayi/siparislerim`}
            className="flex items-center gap-2 rounded-lg bg-[#7AC143] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#6AAF35]"
          >
            <Package className="h-4 w-4" />
            Siparişlerimi Gör
          </Link>
        )}
        <Link
          href="/bayi/urunler"
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Ürünlere Dön
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Sipariş durumunuzu &quot;Siparişlerim&quot; sayfasından takip edebilirsiniz.
      </p>
    </div>
  );
}
