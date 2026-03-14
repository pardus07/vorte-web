"use client";

import { useState } from "react";
import Image from "next/image";
import { Package, Check, ShoppingCart, ChevronDown, ChevronUp } from "lucide-react";
import { STAND_PACKAGES, type StandPackage } from "@/lib/stand-packages";

interface StandPackageSectionProps {
  wholesalePrices: Record<string, number>; // productSlug → wholesalePrice
  standImages?: Record<string, string>;    // packageId → imageUrl
}

export function StandPackageSection({ wholesalePrices, standImages = {} }: StandPackageSectionProps) {
  return (
    <div className="mb-10">
      <div className="mb-4 flex items-center gap-2">
        <Package className="h-5 w-5 text-[#7AC143]" />
        <h2 className="text-lg font-bold text-gray-900">Hazır Stand Paketleri</h2>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        Karton stand dahil, doldurulmuş halde kargo ile gönderilir. İade kabul edilmez.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STAND_PACKAGES.map((pkg) => (
          <StandPackageCard
            key={pkg.id}
            pkg={pkg}
            wholesalePrices={wholesalePrices}
            imageUrl={standImages[pkg.id]}
          />
        ))}
      </div>
    </div>
  );
}

function StandPackageCard({
  pkg,
  wholesalePrices,
  imageUrl,
}: {
  pkg: StandPackage;
  wholesalePrices: Record<string, number>;
  imageUrl?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Paket toplam fiyatını hesapla
  const totalPrice = pkg.items.reduce((sum, item) => {
    const price = wholesalePrices[item.productSlug] || 0;
    const itemTotal = Object.values(item.sizes).reduce((s, qty) => s + qty, 0);
    return sum + price * itemTotal;
  }, 0);

  const handleAdd = async () => {
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/dealer/cart/stand-package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      if (res.ok) {
        setAdded(true);
        setTimeout(() => setAdded(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Eklenemedi");
      }
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setAdding(false);
    }
  };

  // Renk rozet stili
  const colorBadge = (color: string) => {
    const map: Record<string, string> = {
      Siyah: "bg-gray-900 text-white",
      Lacivert: "bg-[#1B2A4A] text-white",
      Gri: "bg-gray-400 text-white",
      Beyaz: "bg-white text-gray-700 border border-gray-300",
      Ten: "bg-[#D4A574] text-white",
    };
    return map[color] || "bg-gray-200 text-gray-700";
  };

  // Paket rengi ve vurgusu
  const accentMap: Record<string, { border: string; bg: string; badge: string }> = {
    A: { border: "border-emerald-200", bg: "bg-emerald-50", badge: "bg-emerald-500" },
    B: { border: "border-blue-200", bg: "bg-blue-50", badge: "bg-blue-500" },
    C: { border: "border-purple-200", bg: "bg-purple-50", badge: "bg-purple-500" },
  };
  const accent = accentMap[pkg.id] || accentMap.A;

  return (
    <div className={`overflow-hidden rounded-xl border-2 ${accent.border} bg-white shadow-sm transition-shadow hover:shadow-md`}>
      {/* Header */}
      <div className={`${accent.bg} px-4 py-3`}>
        <div className="flex items-center justify-between">
          <div>
            <span className={`inline-block rounded-full ${accent.badge} px-2.5 py-0.5 text-xs font-bold text-white`}>
              {pkg.name}
            </span>
            <h3 className="mt-1 text-base font-bold text-gray-900">{pkg.subtitle}</h3>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-gray-900">{pkg.totalItems}</span>
            <span className="block text-xs text-gray-500">adet</span>
          </div>
        </div>
      </div>

      {/* Stand görseli */}
      {imageUrl ? (
        <div className="relative h-40 w-full overflow-hidden bg-gray-50">
          <Image
            src={imageUrl}
            alt={`${pkg.name} - ${pkg.subtitle}`}
            fill
            className="object-contain p-2"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center">
            <Package className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-1 text-xs text-gray-400">Stand görseli eklenecek</p>
          </div>
        </div>
      )}

      {/* İçerik */}
      <div className="p-4">
        {/* Format */}
        <p className="text-xs text-gray-500">{pkg.format}</p>

        {/* İçerik detayı — açılır/kapanır */}
        <button
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="mt-3 flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
        >
          <span>Paket İçeriği ({pkg.items.length} ürün)</span>
          {detailsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {detailsOpen && (
          <div className="mt-2 space-y-1.5">
            {pkg.items.map((item, i) => {
              const itemQty = Object.values(item.sizes).reduce((s, q) => s + q, 0);
              const isErkek = item.productSlug.includes("erkek");
              return (
                <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${colorBadge(item.color)}`}>
                      {item.color}
                    </span>
                    <span className="text-gray-700">
                      {isErkek ? "Erkek Boxer" : "Kadın Külot"}
                    </span>
                  </div>
                  <span className="font-medium text-gray-900">{itemQty} ad.</span>
                </div>
              );
            })}
            <p className="mt-1 text-[10px] text-gray-400 text-center">
              Her renk: S:5, M:5, L:5, XL:5, XXL:5
            </p>
          </div>
        )}

        {/* Fiyat */}
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-sm text-gray-500">Paket Toplam:</span>
          <span className="text-xl font-bold text-[#7AC143]">
            {totalPrice > 0 ? `${totalPrice.toFixed(2)} ₺` : "—"}
          </span>
        </div>

        {/* Sepete Ekle */}
        {added ? (
          <button
            disabled
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 py-2.5 text-sm font-medium text-white"
          >
            <Check className="h-4 w-4" />
            Sepete Eklendi
          </button>
        ) : (
          <button
            onClick={handleAdd}
            disabled={adding || totalPrice === 0}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#1A1A1A] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#333] disabled:opacity-50"
          >
            <ShoppingCart className="h-4 w-4" />
            {adding ? "Ekleniyor..." : "Paketi Sepete Ekle"}
          </button>
        )}

        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}
