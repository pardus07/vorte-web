import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return false;
  const role = (session.user as unknown as { role: string }).role;
  return role === "ADMIN";
}

// GET /api/admin/reviews — Tüm yorumlar (onaylı + bekleyen)
export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId") || "";
  const status = searchParams.get("status") || ""; // "pending" | "approved" | ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (productId) where.productId = productId;
  if (status === "pending") where.approved = false;
  if (status === "approved") where.approved = true;

  const [reviews, total] = await Promise.all([
    db.productReview.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        product: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.productReview.count({ where }),
  ]);

  return NextResponse.json({
    reviews,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

// PUT /api/admin/reviews — Onayla / Reddet
export async function PUT(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, approved } = body;

    if (!id || typeof approved !== "boolean") {
      return NextResponse.json(
        { error: "id ve approved alanları zorunludur" },
        { status: 400 }
      );
    }

    const review = await db.productReview.update({
      where: { id },
      data: { approved },
    });

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error("[admin reviews] PUT error:", error);
    return NextResponse.json(
      { error: "Yorum güncellenemedi" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/reviews?id=xxx — Yorum sil
export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "id parametresi zorunludur" },
      { status: 400 }
    );
  }

  try {
    await db.productReview.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin reviews] DELETE error:", error);
    return NextResponse.json(
      { error: "Yorum silinemedi" },
      { status: 500 }
    );
  }
}
