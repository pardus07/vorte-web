"use client";

import { XCircle, ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function DealerPaymentFailedPage() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="rounded-full bg-red-100 p-4">
        <XCircle className="h-12 w-12 text-red-600" />
      </div>

      <h1 className="mt-6 text-2xl font-bold text-gray-900">Ödeme Başarısız</h1>
      <p className="mt-2 max-w-md text-center text-gray-500">
        Ödemeniz tamamlanamadı. Kart bilgilerinizi kontrol edip tekrar deneyebilirsiniz.
        Sepetinizdeki ürünler korunmuştur.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/bayi/sepet"
          className="flex items-center gap-2 rounded-lg bg-[#1A1A1A] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#333]"
        >
          <RefreshCw className="h-4 w-4" />
          Sepete Dön ve Tekrar Dene
        </Link>
        <Link
          href="/bayi/urunler"
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Ürünlere Dön
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Sorun devam ederse lütfen bizimle iletişime geçin: 0850 305 86 35
      </p>
    </div>
  );
}
