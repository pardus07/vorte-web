"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, CreditCard, ArrowLeft, Lock, Truck, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { formatPrice } from "@/lib/utils";

interface BannerItem {
  id: string;
  name: string;
  imageDesktop: string;
  imageMobile?: string | null;
  link?: string | null;
  altText?: string | null;
}

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

const FREE_SHIPPING_THRESHOLD = 300;

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [step, setStep] = useState<"address" | "payment">("address");
  const [checkoutBanners, setCheckoutBanners] = useState<BannerItem[]>([]);

  const [orderNotes, setOrderNotes] = useState("");
  const [wantInvoice, setWantInvoice] = useState(false);
  const [invoiceType, setInvoiceType] = useState<"personal" | "corporate">("personal");
  const [invoiceInfo, setInvoiceInfo] = useState({ tcKimlik: "", taxNumber: "", taxOffice: "", companyName: "" });

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
    fetch("/api/banners?position=checkout")
      .then((r) => r.json())
      .then((data) => setCheckoutBanners(data.banners || []))
      .catch(() => {});
  }, [router]);

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("payment");
  };

  const handlePaymentSubmit = async () => {
    setSubmitting(true);
    setPaymentError("");
    try {
      const res = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          orderNotes: orderNotes || undefined,
          invoice: wantInvoice ? { type: invoiceType, ...invoiceInfo } : undefined,
        }),
      });

      const data = await res.json();

      if (data.paymentPageUrl) {
        // iyzico hosted payment page — en güvenilir yöntem
        window.location.href = data.paymentPageUrl;
      } else if (data.checkoutFormContent) {
        // iyzico checkout form script — script'leri manuel çalıştır
        const container = document.createElement("div");
        container.id = "iyzico-checkout-form";
        document.body.appendChild(container);
        container.innerHTML = data.checkoutFormContent;
        // innerHTML ile eklenen script'ler çalışmaz, manuel oluştur
        const scripts = container.querySelectorAll("script");
        scripts.forEach((oldScript) => {
          const newScript = document.createElement("script");
          if (oldScript.src) {
            newScript.src = oldScript.src;
          } else {
            newScript.textContent = oldScript.textContent;
          }
          oldScript.parentNode?.replaceChild(newScript, oldScript);
        });
      } else if (data.orderId) {
        // Direct payment success (for testing)
        router.push(`/odeme/basarili?order=${data.orderId}`);
      } else {
        setPaymentError(data.error || "Ödeme başlatılamadı. Lütfen tekrar deneyin.");
      }
    } catch {
      setPaymentError("Bağlantı hatası. Lütfen tekrar deneyin.");
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

  const shippingCost = cart.total >= FREE_SHIPPING_THRESHOLD ? 0 : 90;
  const grandTotal = cart.total + shippingCost;

  // Tahmini teslimat hesaplama
  const bigCities = ["istanbul", "ankara", "izmir", "bursa", "antalya", "adana", "konya", "gaziantep", "kocaeli", "mersin"];
  const isBigCity = bigCities.includes(address.city.toLowerCase().replace(/İ/g, "i").replace(/ı/g, "i"));
  const deliveryDays = isBigCity ? "2-3" : "3-5";

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

      {/* Checkout Banners */}
      {checkoutBanners.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {checkoutBanners.map((banner) => {
            const img = (
              <div className="relative w-full overflow-hidden rounded-lg">
                <div className="hidden md:block">
                  <Image
                    src={banner.imageDesktop}
                    alt={banner.altText || banner.name}
                    width={900}
                    height={200}
                    className="w-full h-auto object-cover"
                  />
                </div>
                <div className="block md:hidden">
                  <Image
                    src={banner.imageMobile || banner.imageDesktop}
                    alt={banner.altText || banner.name}
                    width={768}
                    height={200}
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            );
            return banner.link ? (
              <Link key={banner.id} href={banner.link} className="block hover:opacity-95 transition-opacity">
                {img}
              </Link>
            ) : (
              <div key={banner.id}>{img}</div>
            );
          })}
        </div>
      )}

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

              {/* Sipariş Notu */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Sipariş Notu (opsiyonel)
                </label>
                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Teslimat hakkında özel bir notunuz varsa buraya yazabilirsiniz..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                />
              </div>

              {/* Fatura Bilgisi */}
              <div className="rounded-lg border border-gray-200 p-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wantInvoice}
                    onChange={(e) => setWantInvoice(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#7AC143] focus:ring-[#7AC143]"
                  />
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Fatura İstiyorum</span>
                </label>

                {wantInvoice && (
                  <div className="mt-4 space-y-4">
                    {/* Fatura Tipi */}
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="invoiceType"
                          checked={invoiceType === "personal"}
                          onChange={() => setInvoiceType("personal")}
                          className="h-4 w-4 border-gray-300 text-[#7AC143] focus:ring-[#7AC143]"
                        />
                        <span className="text-sm text-gray-700">Bireysel</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="invoiceType"
                          checked={invoiceType === "corporate"}
                          onChange={() => setInvoiceType("corporate")}
                          className="h-4 w-4 border-gray-300 text-[#7AC143] focus:ring-[#7AC143]"
                        />
                        <span className="text-sm text-gray-700">Kurumsal</span>
                      </label>
                    </div>

                    {invoiceType === "personal" ? (
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          TC Kimlik No *
                        </label>
                        <input
                          type="text"
                          required={wantInvoice && invoiceType === "personal"}
                          maxLength={11}
                          value={invoiceInfo.tcKimlik}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            setInvoiceInfo((p) => ({ ...p, tcKimlik: val }));
                          }}
                          placeholder="XXXXXXXXXXX"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Firma Adı *
                          </label>
                          <input
                            type="text"
                            required={wantInvoice && invoiceType === "corporate"}
                            value={invoiceInfo.companyName}
                            onChange={(e) => setInvoiceInfo((p) => ({ ...p, companyName: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                              Vergi No *
                            </label>
                            <input
                              type="text"
                              required={wantInvoice && invoiceType === "corporate"}
                              maxLength={11}
                              value={invoiceInfo.taxNumber}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "");
                                setInvoiceInfo((p) => ({ ...p, taxNumber: val }));
                              }}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                              Vergi Dairesi *
                            </label>
                            <input
                              type="text"
                              required={wantInvoice && invoiceType === "corporate"}
                              value={invoiceInfo.taxOffice}
                              onChange={(e) => setInvoiceInfo((p) => ({ ...p, taxOffice: e.target.value }))}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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

              {/* Order notes & invoice summary */}
              {(orderNotes || wantInvoice) && (
                <div className="rounded-lg border bg-gray-50 p-4 space-y-2">
                  {orderNotes && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sipariş Notu</p>
                      <p className="text-sm text-gray-700 mt-0.5">{orderNotes}</p>
                    </div>
                  )}
                  {wantInvoice && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fatura Bilgisi</p>
                      <p className="text-sm text-gray-700 mt-0.5">
                        {invoiceType === "personal"
                          ? `Bireysel — TC: ${invoiceInfo.tcKimlik}`
                          : `Kurumsal — ${invoiceInfo.companyName}, VN: ${invoiceInfo.taxNumber}, VD: ${invoiceInfo.taxOffice}`}
                      </p>
                    </div>
                  )}
                </div>
              )}

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

              {paymentError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="text-sm font-medium text-red-700">{paymentError}</p>
                </div>
              )}

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
              {address.city && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
                  <Truck className="h-4 w-4 text-[#7AC143] shrink-0" />
                  <span className="text-xs text-green-700">
                    Tahmini teslimat: <strong>{deliveryDays} iş günü</strong>
                  </span>
                </div>
              )}
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
