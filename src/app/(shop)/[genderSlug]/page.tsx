export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ProductGrid } from "@/components/product/ProductGrid";
import { SortDropdown } from "@/components/product/SortDropdown";
import { FilterToggle } from "./FilterToggle";
import { DesktopFilter } from "./DesktopFilter";
import type { Metadata } from "next";

const GENDERS: Record<string, { label: string; gender: "ERKEK" | "KADIN"; description: string }> = {
  erkek: {
    label: "Erkek İç Giyim",
    gender: "ERKEK",
    description: "Erkek boxer, atlet ve iç giyim ürünleri. Premium kalite, uygun fiyat.",
  },
  kadin: {
    label: "Kadın İç Giyim",
    gender: "KADIN",
    description: "Kadın külot, sütyen ve iç giyim ürünleri. Konfor ve şıklık bir arada.",
  },
};

interface PageProps {
  params: Promise<{ genderSlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { genderSlug } = await params;
  const genderKey = genderSlug.replace("-ic-giyim", "");
  const genderInfo = GENDERS[genderKey];
  if (!genderInfo) return {};

  return {
    title: genderInfo.label,
    description: genderInfo.description,
  };
}

export default async function ProductListingPage({ params, searchParams }: PageProps) {
  const { genderSlug } = await params;
  const genderKey = genderSlug.replace("-ic-giyim", "");
  const genderInfo = GENDERS[genderKey];

  if (!genderInfo) {
    notFound();
  }

  const search = await searchParams;
  const sort = (search.sort as string) || "";
  const selectedSizes = (search.size as string)?.split(",").filter(Boolean) || [];
  const selectedColors = (search.color as string)?.split(",").filter(Boolean) || [];
  const priceMin = search.priceMin ? Number(search.priceMin) : undefined;
  const priceMax = search.priceMax ? Number(search.priceMax) : undefined;
  const page = Math.max(1, Number(search.page) || 1);
  const categorySlug = search.category as string | undefined;
  const perPage = 12;

  // Build where clause
  const where: Record<string, unknown> = {
    gender: genderInfo.gender,
    active: true,
  };

  if (categorySlug) {
    where.category = { slug: categorySlug };
  }

  if (selectedColors.length > 0 || selectedSizes.length > 0 || priceMin !== undefined || priceMax !== undefined) {
    where.variants = {
      some: {
        active: true,
        ...(selectedColors.length > 0 && { color: { in: selectedColors } }),
        ...(selectedSizes.length > 0 && { size: { in: selectedSizes } }),
      },
    };
  }

  if (priceMin !== undefined || priceMax !== undefined) {
    where.basePrice = {
      ...(priceMin !== undefined && { gte: priceMin }),
      ...(priceMax !== undefined && { lte: priceMax }),
    };
  }

  // Sort
  let orderBy: Record<string, string> = { createdAt: "desc" };
  if (sort === "price_asc") orderBy = { basePrice: "asc" };
  else if (sort === "price_desc") orderBy = { basePrice: "desc" };
  else if (sort === "newest") orderBy = { createdAt: "desc" };

  const [products, totalCount, categories] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        category: true,
        variants: {
          where: { active: true },
          orderBy: { size: "asc" },
        },
      },
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.product.count({ where }),
    db.category.findMany({
      where: { gender: genderInfo.gender, active: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / perPage);

  const bannerImage = genderKey === "erkek" ? "/images/banner-erkek.png" : "/images/banner-kadin.png";

  return (
    <div>
      {/* Category Banner */}
      <div className="relative h-[200px] w-full overflow-hidden md:h-[280px]">
        <img
          src={bannerImage}
          alt={genderInfo.label}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A1A]/60 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-7xl px-4">
            <h1 className="text-3xl font-bold text-white md:text-4xl">{genderInfo.label}</h1>
            <p className="mt-2 text-sm text-gray-200">{genderInfo.description}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Ana Sayfa", href: "/" },
          { label: genderInfo.label },
        ]}
      />

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={`/${genderKey}-ic-giyim`}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              !categorySlug
                ? "bg-[#1A1A1A] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Tümü
          </a>
          {categories.map((cat) => (
            <a
              key={cat.id}
              href={`/${genderKey}-ic-giyim?category=${cat.slug}`}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                categorySlug === cat.slug
                  ? "bg-[#1A1A1A] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.name}
            </a>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="mt-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{totalCount} ürün</p>
        </div>
        <div className="flex items-center gap-3">
          <Suspense>
            <SortDropdown />
          </Suspense>
          <FilterToggle />
        </div>
      </div>

      {/* Content */}
      <div className="mt-6 flex gap-8">
        {/* Filter sidebar (desktop) */}
        <div className="hidden w-64 shrink-0 lg:block">
          <DesktopFilter />
        </div>

        {/* Products */}
        <div className="flex-1">
          <ProductGrid products={products} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <a
                  key={p}
                  href={`?${new URLSearchParams({
                    ...Object.fromEntries(
                      Object.entries(search).filter(([, v]) => typeof v === "string") as [string, string][]
                    ),
                    page: String(p),
                  }).toString()}`}
                  className={`flex h-10 w-10 items-center justify-center rounded text-sm transition-colors ${
                    p === page
                      ? "bg-[#1A1A1A] text-white"
                      : "border border-gray-300 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {p}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
