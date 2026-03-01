import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const gender = searchParams.get("gender")?.toUpperCase();
  const category = searchParams.get("category");
  const search = searchParams.get("q");
  const sort = searchParams.get("sort") || "newest";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 12));
  const sizes = searchParams.get("size")?.split(",").filter(Boolean);
  const colors = searchParams.get("color")?.split(",").filter(Boolean);
  const priceMin = searchParams.get("priceMin") ? Number(searchParams.get("priceMin")) : undefined;
  const priceMax = searchParams.get("priceMax") ? Number(searchParams.get("priceMax")) : undefined;
  const featured = searchParams.get("featured");

  const where: Record<string, unknown> = { active: true };

  if (gender === "ERKEK" || gender === "KADIN") {
    where.gender = gender;
  }

  if (category) {
    where.category = { slug: category };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (featured === "true") {
    where.featured = true;
  }

  if (sizes?.length || colors?.length) {
    where.variants = {
      some: {
        active: true,
        ...(sizes?.length && { size: { in: sizes } }),
        ...(colors?.length && { color: { in: colors } }),
      },
    };
  }

  if (priceMin !== undefined || priceMax !== undefined) {
    where.basePrice = {
      ...(priceMin !== undefined && { gte: priceMin }),
      ...(priceMax !== undefined && { lte: priceMax }),
    };
  }

  let orderBy: Record<string, string> = { createdAt: "desc" };
  switch (sort) {
    case "price_asc":
      orderBy = { basePrice: "asc" };
      break;
    case "price_desc":
      orderBy = { basePrice: "desc" };
      break;
    case "newest":
      orderBy = { createdAt: "desc" };
      break;
    case "name_asc":
      orderBy = { name: "asc" };
      break;
  }

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        category: true,
        variants: {
          where: { active: true },
          orderBy: [{ color: "asc" }, { size: "asc" }],
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.product.count({ where }),
  ]);

  return NextResponse.json({
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
