import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ProductGrid } from "@/components/product/ProductGrid";
import { db } from "@/lib/db";
import { Search } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() || "";

  return {
    title: query ? `"${query}" arama sonuçları` : "Arama",
    description: query
      ? `Vorte Tekstil - "${query}" için arama sonuçları.`
      : "Vorte Tekstil ürün arama sayfası.",
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q?.trim() || "";

  let products: {
    id: string;
    name: string;
    slug: string;
    basePrice: number;
    images: string[];
    featured: boolean;
    category: { name: string };
    variants: {
      id: string;
      color: string;
      colorHex: string;
      size: string;
      stock: number;
      price: number | null;
    }[];
  }[] = [];

  if (query) {
    // Arama sorgusunu logla (sonuç sayısı aşağıda güncellenir)
    const logSearchResults = (count: number) => {
      db.searchLog.create({ data: { query, results: count } }).catch(() => {});
    };

    products = await db.product.findMany({
      where: {
        active: true,
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      include: {
        category: { select: { name: true } },
        variants: {
          where: { active: true },
          select: {
            id: true,
            color: true,
            colorHex: true,
            size: true,
            stock: true,
            price: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    logSearchResults(products.length);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Ana Sayfa", href: "/" },
          { label: query ? `"${query}" Arama Sonuçları` : "Arama" },
        ]}
      />

      <div className="mt-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {query ? (
            <>
              &ldquo;{query}&rdquo; için arama sonuçları
            </>
          ) : (
            "Arama"
          )}
        </h1>
        {query && (
          <p className="mt-1 text-sm text-gray-500">
            {products.length > 0
              ? `${products.length} ürün bulundu.`
              : "Hiçbir sonuç bulunamadı."}
          </p>
        )}
      </div>

      <div className="mt-8">
        {!query ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
            <Search className="h-12 w-12 text-gray-300" />
            <p className="mt-4 text-lg font-medium text-gray-600">
              Ürün aramak için yukarıdaki arama çubuğunu kullanın
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Erkek boxer, kadın külot ve daha fazlasını arayın.
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
            <Search className="h-12 w-12 text-gray-300" />
            <p className="mt-4 text-lg font-medium text-gray-600">
              Sonuç bulunamadı
            </p>
            <p className="mt-1 text-sm text-gray-400">
              &ldquo;{query}&rdquo; ile eşleşen ürün bulunamadı. Farklı anahtar
              kelimeler deneyebilirsiniz.
            </p>
          </div>
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
    </div>
  );
}
