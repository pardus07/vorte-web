export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import Link from "next/link";
import { Star, Package, MessageSquare, Clock, CheckCircle, XCircle } from "lucide-react";

const REVIEW_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Onay Bekliyor", color: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Yayında", color: "bg-green-100 text-green-700" },
  rejected: { label: "Reddedildi", color: "bg-red-100 text-red-700" },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
        />
      ))}
    </div>
  );
}

export default async function ReviewsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const reviews = await db.productReview.findMany({
    where: { userId: session.user.id },
    include: {
      product: { select: { name: true, slug: true, images: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get delivered orders with products not yet reviewed
  const deliveredOrders = await db.order.findMany({
    where: {
      userId: session.user.id,
      status: "DELIVERED",
    },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, slug: true, images: true } },
          variant: { select: { color: true, size: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Get reviewed product IDs
  const reviewedProductIds = new Set(reviews.map((r) => r.productId));

  // Find products that can be reviewed (delivered but not yet reviewed)
  const reviewableItems = deliveredOrders.flatMap((order) =>
    order.items
      .filter((item) => !reviewedProductIds.has(item.productId))
      .map((item) => ({
        orderId: order.id,
        orderNumber: order.orderNumber,
        productId: item.productId,
        productName: item.product.name,
        productSlug: item.product.slug,
        productImage: (item.product.images as string[])?.[0],
        variant: `${item.variant.color} · ${item.variant.size}`,
      }))
  );

  // Deduplicate by productId
  const uniqueReviewable = reviewableItems.filter(
    (item, index, self) => index === self.findIndex((t) => t.productId === item.productId)
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Breadcrumb
        items={[
          { label: "Ana Sayfa", href: "/" },
          { label: "Hesabım", href: "/hesabim" },
          { label: "Yorumlarım" },
        ]}
      />
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Yorumlarım</h1>

      {/* Reviewable Products */}
      {uniqueReviewable.length > 0 && (
        <div className="mt-6">
          <h2 className="flex items-center gap-2 font-bold text-gray-900">
            <MessageSquare className="h-4 w-4 text-[#7AC143]" />
            Yorum Yazabileceğiniz Ürünler
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {uniqueReviewable.map((item) => (
              <div key={item.productId} className="flex items-center gap-3 rounded-lg border bg-white p-3">
                {item.productImage ? (
                  <div
                    className="h-12 w-12 flex-shrink-0 rounded bg-gray-100 bg-cover bg-center"
                    style={{ backgroundImage: `url(${item.productImage})` }}
                  />
                ) : (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-gray-100">
                    <Package className="h-5 w-5 text-gray-300" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{item.productName}</p>
                  <p className="text-xs text-gray-500">{item.variant}</p>
                </div>
                <Link
                  href={`/urun/${item.productSlug}#yorumlar`}
                  className="rounded-lg bg-[#7AC143] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#6aad38]"
                >
                  Yorum Yap
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Reviews */}
      <div className="mt-8">
        <h2 className="font-bold text-gray-900">Yazdığım Yorumlar</h2>
        {reviews.length === 0 ? (
          <div className="mt-6 flex flex-col items-center text-center">
            <Star className="h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-lg font-bold text-gray-900">Henüz Yorum Yok</h3>
            <p className="mt-2 text-sm text-gray-500">
              Teslim edilen siparişlerinizdeki ürünlere yorum yapabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {reviews.map((review) => {
              const img = (review.product.images as string[])?.[0];
              const statusKey = review.approved ? "approved" : "pending";
              const st = REVIEW_STATUS[statusKey];
              return (
                <div key={review.id} className="rounded-lg border bg-white p-5">
                  <div className="flex items-start gap-4">
                    {img ? (
                      <div
                        className="h-14 w-14 flex-shrink-0 rounded bg-gray-100 bg-cover bg-center"
                        style={{ backgroundImage: `url(${img})` }}
                      />
                    ) : (
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded bg-gray-100">
                        <Package className="h-5 w-5 text-gray-300" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/urun/${review.product.slug}`}
                          className="font-medium text-gray-900 hover:text-[#7AC143]"
                        >
                          {review.product.name}
                        </Link>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${st.color}`}>
                          {st.label}
                        </span>
                      </div>
                      <div className="mt-1">
                        <StarRating rating={review.rating} />
                      </div>
                      {review.title && (
                        <p className="mt-2 font-medium text-gray-700">{review.title}</p>
                      )}
                      {review.comment && (
                        <p className="mt-1 text-sm text-gray-600">{review.comment}</p>
                      )}
                      <p className="mt-2 text-xs text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
