"use client";

import { useState } from "react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Search,
  Package,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  RotateCcw,
  CreditCard,
  MapPin,
  ExternalLink,
} from "lucide-react";

const STATUS_MAP: Record<string, { label: string; icon: typeof Package; color: string }> = {
  PENDING: { label: "Bekliyor", icon: Clock, color: "text-amber-500" },
  PAID: { label: "Ödendi", icon: CreditCard, color: "text-blue-500" },
  PROCESSING: { label: "Hazırlanıyor", icon: Package, color: "text-orange-500" },
  SHIPPED: { label: "Kargoda", icon: Truck, color: "text-blue-600" },
  DELIVERED: { label: "Teslim Edildi", icon: CheckCircle, color: "text-green-600" },
  CANCELLED: { label: "İptal Edildi", icon: XCircle, color: "text-red-500" },
  REFUNDED: { label: "İade Edildi", icon: RotateCcw, color: "text-gray-500" },
};

interface StatusHistoryEntry {
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
}

interface TrackingEvent {
  status: string;
  description: string;
  location: string;
  timestamp: string;
}

interface TrackingResult {
  orderNumber: string;
  status: string;
  cargoTrackingNo: string | null;
  cargoProvider: string | null;
  cargoTrackingUrl: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory: StatusHistoryEntry[];
  trackingEvents: TrackingEvent[];
}

export default function CargoTrackingPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || query.trim().length < 3) {
      setError("En az 3 karakter giriniz");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`/api/kargo-takip?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();

      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || "Sipariş bulunamadı");
      }
    } catch {
      setError("Bir hata oluştu, lütfen tekrar deneyin");
    }

    setLoading(false);
  };

  const statusInfo = result ? STATUS_MAP[result.status] : null;

  // Build ordered steps for the progress indicator
  const statusSteps = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED"];
  const currentStepIndex = result ? statusSteps.indexOf(result.status) : -1;
  const isCancelledOrRefunded = result && ["CANCELLED", "REFUNDED"].includes(result.status);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Ana Sayfa", href: "/" },
          { label: "Kargo Takip" },
        ]}
      />

      <h1 className="mt-6 text-3xl font-bold text-gray-900">Kargo Takip</h1>
      <p className="mt-2 text-gray-600">
        Sipariş numaranız veya kargo takip numaranız ile siparişinizi takip edin.
      </p>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mt-8">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sipariş numarası veya kargo takip numarası"
              className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-2 focus:ring-[#7AC143]/20"
            />
          </div>
          <Button type="submit" loading={loading} className="px-6">
            <Search className="mr-2 h-4 w-4" />
            Sorgula
          </Button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Sipariş numaranızı sipariş onay e-postanızda veya Hesabım &gt; Siparişlerim sayfasında bulabilirsiniz.
        </p>
      </form>

      {/* Error */}
      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <XCircle className="mx-auto h-8 w-8 text-red-400" />
          <p className="mt-2 font-medium text-red-600">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-8 space-y-6">
          {/* Status Card */}
          <div className="rounded-lg border bg-white p-6 text-center">
            {statusInfo && (
              <>
                <statusInfo.icon className={`mx-auto h-12 w-12 ${statusInfo.color}`} />
                <h2 className="mt-3 text-xl font-bold text-gray-900">{statusInfo.label}</h2>
              </>
            )}
            <p className="mt-1 text-gray-500">Sipariş #{result.orderNumber}</p>

            {result.cargoTrackingNo && (
              <div className="mt-4 flex flex-col items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-2">
                  <Truck className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{result.cargoProvider}</span>
                  <span className="font-mono font-medium text-gray-900">{result.cargoTrackingNo}</span>
                </div>
                {result.cargoTrackingUrl && (
                  <a
                    href={result.cargoTrackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#7AC143] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#6aad38]"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Kargo Firmasında Takip Et
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Progress Steps (only for non-cancelled orders) */}
          {!isCancelledOrRefunded && (
            <div className="rounded-lg border bg-white p-6">
              <h3 className="mb-4 font-bold text-gray-900">Sipariş Durumu</h3>
              <div className="flex items-center justify-between">
                {statusSteps.map((step, idx) => {
                  const stepInfo = STATUS_MAP[step];
                  const StepIcon = stepInfo.icon;
                  const isActive = idx <= currentStepIndex;
                  const isCurrent = idx === currentStepIndex;

                  return (
                    <div key={step} className="flex flex-1 items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            isCurrent
                              ? "bg-[#7AC143] text-white"
                              : isActive
                                ? "bg-[#7AC143]/20 text-[#7AC143]"
                                : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          <StepIcon className="h-4 w-4" />
                        </div>
                        <span className={`mt-1 text-[10px] ${isActive ? "font-medium text-gray-900" : "text-gray-400"}`}>
                          {stepInfo.label}
                        </span>
                      </div>
                      {idx < statusSteps.length - 1 && (
                        <div
                          className={`mx-1 h-0.5 flex-1 ${
                            idx < currentStepIndex ? "bg-[#7AC143]" : "bg-gray-200"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cancelled/Refunded status */}
          {isCancelledOrRefunded && statusInfo && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
              <Badge variant={result.status === "CANCELLED" ? "discount" : "outline"}>
                {statusInfo.label}
              </Badge>
            </div>
          )}

          {/* Tracking Events from Geliver */}
          {result.trackingEvents.length > 0 && (
            <div className="rounded-lg border bg-white p-6">
              <h3 className="mb-4 font-bold text-gray-900">Kargo Hareketleri</h3>
              <div className="space-y-4">
                {result.trackingEvents.map((event, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="relative flex flex-col items-center">
                      <div className={`h-3 w-3 rounded-full ${idx === 0 ? "bg-[#7AC143]" : "bg-gray-300"}`} />
                      {idx < result.trackingEvents.length - 1 && (
                        <div className="w-0.5 flex-1 bg-gray-200" />
                      )}
                    </div>
                    <div className="pb-3">
                      <p className="text-sm font-medium text-gray-900">{event.description}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                        {event.location && (
                          <>
                            <MapPin className="h-3 w-3" />
                            <span>{event.location}</span>
                            <span>·</span>
                          </>
                        )}
                        <span>{new Date(event.timestamp).toLocaleString("tr-TR")}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status History Timeline */}
          {result.statusHistory.length > 0 && (
            <div className="rounded-lg border bg-white p-6">
              <h3 className="mb-4 font-bold text-gray-900">Sipariş Geçmişi</h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="relative flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-gray-300" />
                    <div className="w-0.5 flex-1 bg-gray-200" />
                  </div>
                  <div className="pb-3">
                    <p className="text-sm text-gray-900">Sipariş oluşturuldu</p>
                    <p className="text-xs text-gray-500">
                      {new Date(result.createdAt).toLocaleString("tr-TR")}
                    </p>
                  </div>
                </div>

                {result.statusHistory.map((entry, idx) => {
                  const toInfo = STATUS_MAP[entry.toStatus];
                  const isLast = idx === result.statusHistory.length - 1;
                  return (
                    <div key={idx} className="flex gap-3">
                      <div className="relative flex flex-col items-center">
                        <div className={`h-3 w-3 rounded-full ${isLast ? "bg-[#7AC143]" : "bg-gray-300"}`} />
                        {!isLast && <div className="w-0.5 flex-1 bg-gray-200" />}
                      </div>
                      <div className="pb-3">
                        <p className="text-sm text-gray-900">
                          {toInfo?.label || entry.toStatus}
                        </p>
                        {entry.note && !entry.note.includes("admin") && (
                          <p className="text-xs text-gray-600">{entry.note}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          {new Date(entry.createdAt).toLocaleString("tr-TR")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Order Date */}
          <div className="text-center text-xs text-gray-400">
            Sipariş tarihi: {new Date(result.createdAt).toLocaleString("tr-TR")}
          </div>
        </div>
      )}
    </div>
  );
}
