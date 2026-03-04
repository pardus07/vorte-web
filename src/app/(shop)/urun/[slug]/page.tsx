export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ProductDetailClient } from "./ProductDetailClient";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductReviews } from "@/components/product/ProductReviews";
import { JsonLd } from "@/components/seo/JsonLd";
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

  const description = product.description || `${product.name} - Vorte Tekstil`;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/urun/${slug}` },
    openGraph: {
      title: `${product.name} | Vorte Tekstil`,
      description,
      images: product.images[0]
        ? [{ url: product.images[0], width: 800, height: 1067, alt: product.name }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
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

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.vorte.com.tr";
  const variantPrices = product.variants.filter(v => v.price).map(v => v.price!);
  const allPrices = [product.basePrice, ...variantPrices];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description || `${product.name} - Vorte Tekstil`,
          image: product.images.map(img => `${baseUrl}${img}`),
          brand: { "@type": "Brand", name: "Vorte" },
          category: product.category.name,
          sku: product.variants[0]?.sku,
          ...(product.variants[0]?.gtinBarcode && { gtin13: product.variants[0].gtinBarcode }),
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "TRY",
            lowPrice: Math.min(...allPrices),
            highPrice: Math.max(...allPrices),
            offerCount: product.variants.length,
            availability: product.variants.some(v => v.stock > 0)
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            url: `${baseUrl}/urun/${product.slug}`,
          },
        }}
      />
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
      <ProductDetailClient product={product} />

      {/* Reviews */}
      <ProductReviews productId={product.id} />

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
