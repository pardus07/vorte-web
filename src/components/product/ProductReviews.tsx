"use client";

import { useState, useEffect } from "react";
import { StarRating } from "@/components/ui/StarRating";
import { Button } from "@/components/ui/Button";
import { MessageSquare, Send, LogIn } from "lucide-react";
import Link from "next/link";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: string;
  userName: string;
}

interface ReviewsData {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  distribution: number[];
}

export function ProductReviews({ productId }: { productId: string }) {
  const [data, setData] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formState, setFormState] = useState<
    "idle" | "loading" | "success" | "error" | "auth"
  >("idle");
  const [formError, setFormError] = useState("");
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    fetch(`/api/reviews?productId=${productId}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setFormError("Lütfen bir puan seçin");
      return;
    }

    setFormState("loading");
    setFormError("");

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, title, comment }),
      });

      const result = await res.json();

      if (res.status === 401) {
        setFormState("auth");
        return;
      }

      if (!res.ok) {
        setFormError(result.error || "Bir hata oluştu");
        setFormState("error");
        return;
      }

      setFormState("success");
      setRating(0);
      setTitle("");
      setComment("");
    } catch {
      setFormError("Bağlantı hatası. Lütfen tekrar deneyin.");
      setFormState("error");
    }
  };

  if (loading) {
    return (
      <div className="mt-12 border-t pt-8">
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#7AC143]" />
        </div>
      </div>
    );
  }

  const reviews = data?.reviews || [];
  const avg = data?.averageRating || 0;
  const total = data?.totalReviews || 0;
  const dist = data?.distribution || [0, 0, 0, 0, 0];

  return (
    <div className="mt-12 border-t pt-8">
      <h2 className="text-xl font-bold text-gray-900">
        Değerlendirmeler
        {total > 0 && (
          <span className="ml-2 text-base font-normal text-gray-500">
            ({total})
          </span>
        )}
      </h2>

      {total > 0 ? (
        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          {/* Sol: Ortalama puan + dağılım */}
          <div className="rounded-lg border bg-gray-50 p-6 text-center">
            <div className="text-4xl font-bold text-gray-900">
              {avg.toFixed(1)}
            </div>
            <StarRating rating={avg} size="md" className="mt-2 justify-center" />
            <p className="mt-1 text-sm text-gray-500">
              {total} değerlendirme
            </p>

            {/* Puan dağılımı */}
            <div className="mt-4 space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = dist[star - 1];
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-sm">
                    <span className="w-3 text-gray-600">{star}</span>
                    <Star className="h-3 w-3 text-amber-400" />
                    <div className="h-2 flex-1 rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs text-gray-400">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sağ: Yorum listesi */}
          <div className="space-y-4 lg:col-span-2">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                      {review.userName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {review.userName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <StarRating rating={review.rating} size="sm" />
                </div>
                {review.title && (
                  <p className="mt-3 font-medium text-gray-900">
                    {review.title}
                  </p>
                )}
                {review.comment && (
                  <p className="mt-1 text-sm text-gray-600">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-dashed p-8 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-gray-500">
            Henüz değerlendirme yapılmamış.
          </p>
          <p className="text-sm text-gray-400">
            Bu ürünü değerlendiren ilk kişi siz olun!
          </p>
        </div>
      )}

      {/* Yorum Yaz Butonu / Formu */}
      <div className="mt-6">
        {formState === "success" ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
            <p className="font-medium text-green-700">
              Yorumunuz alındı!
            </p>
            <p className="mt-1 text-sm text-green-600">
              Onay sonrası yayınlanacaktır.
            </p>
          </div>
        ) : formState === "auth" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="text-sm text-amber-700">
              Yorum yazmak için giriş yapmalısınız.
            </p>
            <Link href="/giris">
              <Button size="sm" variant="outline" className="mt-2">
                <LogIn className="mr-2 h-4 w-4" />
                Giriş Yap
              </Button>
            </Link>
          </div>
        ) : !showForm ? (
          <Button variant="outline" onClick={() => setShowForm(true)}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Yorum Yaz
          </Button>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border p-6 space-y-4"
          >
            <h3 className="font-bold text-gray-900">Değerlendirmeniz</h3>

            {/* Puan seçimi */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Puanınız *
              </label>
              <StarRating
                rating={rating}
                interactive
                onChange={setRating}
                size="lg"
              />
            </div>

            {/* Başlık */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Başlık
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                placeholder="Kısa bir başlık (opsiyonel)"
              />
            </div>

            {/* Yorum */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Yorumunuz
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]"
                placeholder="Ürün hakkında deneyiminizi paylaşın (opsiyonel)"
              />
            </div>

            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}

            <div className="flex gap-3">
              <Button
                type="submit"
                loading={formState === "loading"}
              >
                <Send className="mr-2 h-4 w-4" />
                Gönder
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setFormError("");
                }}
              >
                İptal
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Star icon — lucide-react'ten import etmeden küçük inline SVG
function Star({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
