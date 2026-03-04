import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET /api/reviews?productId=xxx — Public: onaylı yorumları getir
export async function GET(request: NextRequest) {
  try {
    const productId = request.nextUrl.searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { error: "productId parametresi zorunludur" },
        { status: 400 }
      );
    }

    const reviews = await db.productReview.findMany({
      where: { productId, approved: true },
      include: {
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Ortalama puan hesapla
    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    // Puan dağılımı (1-5 yıldız kaçar tane)
    const distribution = [0, 0, 0, 0, 0]; // index 0=1yıldız, 4=5yıldız
    reviews.forEach((r) => {
      distribution[r.rating - 1]++;
    });

    // Kullanıcı adını maskele (Ali K.)
    const maskedReviews = reviews.map((r) => {
      const name = r.user.name || "Anonim";
      const parts = name.trim().split(" ");
      const masked =
        parts.length > 1
          ? `${parts[0]} ${parts[parts.length - 1][0]}.`
          : parts[0];

      return {
        id: r.id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        createdAt: r.createdAt,
        userName: masked,
      };
    });

    return NextResponse.json({
      reviews: maskedReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      distribution,
    });
  } catch (error) {
    console.error("[reviews] GET error:", error);
    return NextResponse.json(
      { error: "Yorumlar yüklenemedi" },
      { status: 500 }
    );
  }
}

// POST /api/reviews — Auth: yeni yorum ekle
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Yorum yazmak için giriş yapmalısınız" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId, rating, title, comment } = body;

    // Validasyon
    if (!productId) {
      return NextResponse.json(
        { error: "Ürün bilgisi eksik" },
        { status: 400 }
      );
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Puan 1-5 arasında olmalıdır" },
        { status: 400 }
      );
    }

    // Ürün var mı kontrol
    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Ürün bulunamadı" },
        { status: 404 }
      );
    }

    // Aynı kullanıcı bu ürüne zaten yorum yapmış mı?
    const existing = await db.productReview.findFirst({
      where: {
        userId: session.user.id,
        productId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Bu ürüne zaten yorum yapmışsınız" },
        { status: 409 }
      );
    }

    // Yorum oluştur (admin onayı bekleyecek)
    const review = await db.productReview.create({
      data: {
        userId: session.user.id,
        productId,
        rating: Math.round(rating),
        title: title?.trim() || null,
        comment: comment?.trim() || null,
        approved: false,
      },
    });

    // Admin bildirimi
    try {
      await db.notification.create({
        data: {
          type: "STOCK_ALERT", // mevcut enum'dan en yakını
          title: "Yeni Ürün Yorumu",
          message: `${product.name} — ${rating} yıldız`,
        },
      });
    } catch {
      // Bildirim oluşturulamazsa yorum yine kaydedilsin
    }

    return NextResponse.json({
      success: true,
      reviewId: review.id,
      message: "Yorumunuz alındı, onay sonrası yayınlanacaktır.",
    });
  } catch (error) {
    console.error("[reviews] POST error:", error);
    return NextResponse.json(
      { error: "Yorum gönderilemedi. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}
