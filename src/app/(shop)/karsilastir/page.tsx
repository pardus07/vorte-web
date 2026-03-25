import { db } from "@/lib/db";
import { ComparePageClient } from "./ComparePageClient";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ürün Karşılaştırma | Vorte Tekstil",
  description: "Vorte ürünlerini yan yana karşılaştırın. Fiyat, kumaş, beden ve özellik karşılaştırması.",
};

interface PageProps {
  searchParams: Promise<{ ids?: string }>;
}

export default async function ComparePage({ searchParams }: PageProps) {
  const { ids } = await searchParams;
  const productIds = ids?.split(",").filter(Boolean) || [];

  let products: {
    id: string;
    name: string;
    slug: string;
    basePrice: number;
    images: string[];
    description: string | null;
    gender: string;
    category: { name: string };
    variants: { color: string; colorHex: string; size: string; stock: number; price: number | null }[];
  }[] = [];

  if (productIds.length > 0) {
    products = await db.product.findMany({
      where: { id: { in: productIds }, active: true },
      include: {
        category: { select: { name: true } },
        variants: {
          where: { active: true },
          select: { color: true, colorHex: true, size: true, stock: true, price: true },
        },
      },
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumb
        items={[
          { label: "Ana Sayfa", href: "/" },
          { label: "Karşılaştırma" },
        ]}
      />
      <ComparePageClient products={products} />
    </div>
  );
}
