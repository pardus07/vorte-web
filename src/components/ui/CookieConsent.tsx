"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent") || sessionStorage.getItem("cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setShow(false);
  };

  const reject = () => {
    sessionStorage.setItem("cookie-consent", "rejected");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white p-4 shadow-lg md:p-6">
      <div className="mx-auto flex max-w-[1440px] flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <p className="flex-1 text-sm text-gray-600">
          Web sitemizde deneyiminizi iyileştirmek için çerezler kullanıyoruz. Detaylar
          için{" "}
          <Link href="/gizlilik-politikasi" className="text-[#7AC143] underline">
            Gizlilik Politikası
          </Link>{" "}
          ve{" "}
          <Link href="/kvkk" className="text-[#7AC143] underline">
            KVKK Aydınlatma Metni
          </Link>
          &apos;ni inceleyebilirsiniz.
        </p>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={reject}>
            Reddet
          </Button>
          <Button variant="primary" size="sm" onClick={accept}>
            Kabul Et
          </Button>
        </div>
      </div>
    </div>
  );
}
