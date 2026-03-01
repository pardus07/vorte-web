export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ProductImages } from "@/components/product/ProductImages";
import { ProductInfo } from "./ProductInfo";
import { ProductAccordion } from "@/components/product/ProductAccordion";
import { ProductGrid } from "@/components/product/ProductGrid";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    select: { name: true, description: true, images: true },
  });

  if (!product) return {};

  return {
    title: product.name,
    description: product.description || `${product.name} - Vorte Tekstil`,
    openGraph: {
      images: product.images[0] ? [product.images[0]] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const product = await db.product.findUnique({
    where: { slug, active: true },
    include: {
      category: true,
      variants: {
        where: { active: true },
        orderBy: [{ color: "asc" }, { size: "asc" }],
      },
    },
  });

  if (!product) {
    notFound();
  }

  const genderKey = product.gender === "ERKEK" ? "erkek" : "kadin";

  // Related products
  const relatedProducts = await db.product.findMany({
    where: {
      categoryId: product.categoryId,
      active: true,
      id: { not: product.id },
    },
    include: {
      category: true,
      variants: { where: { active: true } },
    },
    take: 4,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Ana Sayfa", href: "/" },
          {
            label: product.gender === "ERKEK" ? "Erkek İç Giyim" : "Kadın İç Giyim",
            href: `/${genderKey}-ic-giyim`,
          },
          { label: product.category.name, href: `/${genderKey}-ic-giyim?category=${product.category.slug}` },
          { label: product.name },
        ]}
      />

      {/* Product section */}
      <div className="mt-6 grid gap-8 md:grid-cols-2 lg:gap-12">
        {/* Images */}
        <ProductImages images={product.images} productName={product.name} />

        {/* Info */}
        <div>
          <ProductInfo product={product} />
          <div className="mt-8">
            <ProductAccordion description={product.description} />
          </div>
        </div>
      </div>

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <div className="mt-16">
          <h2 className="mb-6 text-xl font-bold text-gray-900">Benzer Ürünler</h2>
          <ProductGrid products={relatedProducts} />
        </div>
      )}
    </div>
  );
}
