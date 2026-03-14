"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Lock } from "lucide-react";

export default function DealerPaymentPage() {
  const searchParams = useSearchParams();
  const formContent = searchParams.get("form");
  const orderNumber = searchParams.get("orderNumber");
  const total = searchParams.get("total");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (formContent && containerRef.current) {
      // iyzico checkout form'u embed et
      containerRef.current.innerHTML = decodeURIComponent(formContent);

      // iyzico script'lerini çalıştır
      const scripts = containerRef.current.querySelectorAll("script");
      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");
        if (oldScript.src) {
          newScript.src = oldScript.src;
        } else {
          newScript.textContent = oldScript.textContent;
        }
        oldScript.parentNode?.replaceChild(newScript, oldScript);
      });
    }
  }, [formContent]);

  if (!formContent) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <h2 className="mt-4 text-lg font-bold text-gray-900">Ödeme Başlatılamadı</h2>
        <p className="mt-2 text-sm text-gray-500">Sepetinize dönüp tekrar deneyin.</p>
        <a href="/bayi/sepet" className="mt-4 rounded-lg bg-[#7AC143] px-6 py-2 text-sm font-medium text-white">
          Sepete Dön
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Ödeme</h1>
      {orderNumber && (
        <p className="mt-1 text-sm text-gray-500">
          Sipariş: #{orderNumber} • Toplam: {total} ₺
        </p>
      )}

      {/* İade uyarısı */}
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Toptan siparişlerde <strong>iade kabul edilmez</strong>. Ödeme yapıldıktan sonra sipariş kesinleşir.
        </span>
      </div>

      {/* iyzico Checkout Form */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
          <Lock className="h-4 w-4" />
          <span>Güvenli ödeme — iyzico ile korunmaktadır</span>
        </div>
        <div ref={containerRef} id="iyzipay-checkout-form" />
      </div>
    </div>
  );
}
