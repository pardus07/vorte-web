"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, CreditCard, ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { formatPrice } from "@/lib/utils";

interface CartItem {
  id: string;
  quantity: number;
  product: { name: string; images: string[] };
  variant: { color: string; size: string };
  unitPrice: number;
  totalPrice: number;
}

interface CartData {
  items: CartItem[];
  total: number;
  itemCount: number;
}

const FREE_SHIPPING_THRESHOLD = 200;

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"address" | "payment">("address");

  const [address, setAddress] = useState({
    fullName: "",
    phone: "",
    city: "",
    district: "",
    neighborhood: "",
    address: "",
    zipCode: "",
  });

  useEffect(() => {
    fetch("/api/cart")
      .then((r) => r.json())
      .then((data) => {
        setCart(data);
        if (data.items.length === 0) {
          router.push("/sepet");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("payment");
  };

  const handlePaymentSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      const data = await res.json();

      if (data.checkoutFormContent) {
        // Redirect to iyzico 3D Secure page
        const div = document.createElement("div");
        div.innerHTML = data.checkoutFormContent;
        document.body.appendChild(div);
        const form = div.querySelector("form");
        if (form) form.submit();
      } else if (data.orderId) {
        // Direct payment success (for testing)
        router.push(`/odeme/basarili?order=${data.orderId}`);
      } else {
        router.push("/odeme/basarisiz");
      }
    } catch {
      router.push("/odeme/basarisiz");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !cart) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[#7AC143]" />
        </div>
      </div>
    );
  }

  const shippingCost = cart.total >= FREE_SHIPPING_THRESHOLD ? 0 : 29.9;
  const grandTotal = cart.total + shippingCost;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Breadcrumb
        items={[
          { label: "Ana Sayfa", href: "/" },
          { label: "Sepet", href: "/sepet" },
          { label: "Ödeme" },
        ]}
      />

      {/* Steps */}
      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={() => setStep("address")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            step === "address"
              ? "bg-[#1A1A1A] text-white"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          <MapPin className="h-4 w-4" />
          1. Teslimat Adresi
        </button>
        <div className="h-px flex-1 bg-gray-300" />
        <button
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            step === "payment"
              ? "bg-[#1A1A1A] text-white"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          2. Ödeme
        </button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Form */}
        <div className="lg:col-span-2">
          {step === "address" ? (
            <form onSubmit={handleAddressSubmit} className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Teslimat Adresi</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Ad Soyad *
                  </label>
                  <input
                    type="text"
                    required
                    value={address.fullName}
                    onChange={(e) =>
                      setAddress((p) => ({ ...p, fullName: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Telefon *
                  </label>
                  <input
                    type="tel"
                    required
                    value={address.phone}
                    onChange={(e) =>
                      setAddress((p) => ({ ...p, phone: e.target.value }))
                    }
                    placeholder="05XX XXX XX XX"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    İl *
                  </label>
                  <input
                    type="text"
                    required
                    value={address.city}
                    onChange={(e) =>
                      setAddress((p) => ({ ...p, city: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    İlçe *
                  </label>
                  <input
                    type="text"
                    required
                    value={address.district}
                    onChange={(e) =>
                      setAddress((p) => ({ ...p, district: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Mahalle
                </label>
                <input
                  type="text"
                  value={address.neighborhood}
                  onChange={(e) =>
                    setAddress((p) => ({ ...p, neighborhood: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Adres *
                </label>
                <textarea
                  required
                  rows={3}
                  value={address.address}
                  onChange={(e) =>
                    setAddress((p) => ({ ...p, address: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                />
              </div>

              <Button type="submit" size="lg" className="w-full sm:w-auto">
                Ödeme Adımına Geç
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Ödeme</h2>
                <button
                  onClick={() => setStep("address")}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#7AC143]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Adresi Düzenle
                </button>
              </div>

              {/* Address summary */}
              <div className="rounded-lg border bg-gray-50 p-4">
                <p className="text-sm font-medium">{address.fullName}</p>
                <p className="text-sm text-gray-600">
                  {address.address}, {address.neighborhood && `${address.neighborhood}, `}
                  {address.district}/{address.city}
                </p>
                <p className="text-sm text-gray-600">{address.phone}</p>
              </div>

              {/* Payment info */}
              <div className="rounded-lg border p-6">
                <div className="flex items-center gap-2 text-[#7AC143]">
                  <Lock className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    iyzico Güvenli Ödeme
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Ödeme bilgileriniz iyzico 3D Secure altyapısı ile güvenle
                  işlenir. Kredi kartı bilgileriniz sunucularımızda saklanmaz.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Visa", "Mastercard", "Troy"].map((card) => (
                    <span
                      key={card}
                      className="rounded border px-3 py-1 text-xs text-gray-500"
                    >
                      {card}
                    </span>
                  ))}
                </div>
              </div>

              <Button
                size="lg"
                className="w-full"
                onClick={handlePaymentSubmit}
                loading={submitting}
              >
                <Lock className="mr-2 h-4 w-4" />
                {formatPrice(grandTotal)} Öde
              </Button>
            </div>
          )}
        </div>

        {/* Order summary */}
        <div>
          <div className="rounded-lg border p-6">
            <h3 className="text-lg font-bold text-gray-900">Sipariş Özeti</h3>
            <div className="mt-4 space-y-3">
              {cart.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div>
                    <p className="text-gray-700">{item.product.name}</p>
                    <p className="text-xs text-gray-400">
                      {item.variant.color} / {item.variant.size} x {item.quantity}
                    </p>
                  </div>
                  <span className="font-medium">{formatPrice(item.totalPrice)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Ara Toplam</span>
                <span>{formatPrice(cart.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Kargo</span>
                <span className={shippingCost === 0 ? "text-[#7AC143]" : ""}>
                  {shippingCost === 0 ? "Ücretsiz" : formatPrice(shippingCost)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 text-lg font-bold">
                <span>Toplam</span>
                <span>{formatPrice(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
