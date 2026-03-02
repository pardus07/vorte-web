import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Truck, ShieldCheck, CreditCard, Headphones } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { HeroSlider } from "@/components/home/HeroSlider";
import { ProductGrid } from "@/components/product/ProductGrid";
import { JsonLd } from "@/components/seo/JsonLd";
import { db } from "@/lib/db";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const fetchProducts = () =>
    db.product.findMany({
      where: { active: true },
      include: {
        category: true,
        variants: { where: { active: true }, orderBy: { size: "asc" } },
      },
      orderBy: [{ gender: "asc" }, { featured: "desc" }, { createdAt: "desc" }],
    });

  let products: Awaited<ReturnType<typeof fetchProducts>> = [];
  try {
    products = await fetchProducts();
  } catch {
    // DB unavailable during build
  }
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Vorte Tekstil",
          url: "https://www.vorte.com.tr",
        }}
      />

      {/* Hero Slider */}
      <HeroSlider />

      {/* Trust Bar */}
      <section className="border-b border-gray-200 bg-[#FAFAFA]">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-4 px-4 py-6 md:grid-cols-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6 text-[#7AC143] flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[#1A1A1A]">Hızlı Kargo</p>
              <p className="text-xs text-gray-500">1-3 iş günü teslimat</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-[#7AC143] flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[#1A1A1A]">Güvenli Ödeme</p>
              <p className="text-xs text-gray-500">3D Secure ile</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-[#7AC143] flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[#1A1A1A]">Taksit İmkanı</p>
              <p className="text-xs text-gray-500">9 taksit seçeneği</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Headphones className="h-6 w-6 text-[#7AC143] flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[#1A1A1A]">Müşteri Desteği</p>
              <p className="text-xs text-gray-500">7/24 destek hattı</p>
            </div>
          </div>
        </div>
      </section>

      {/* Category Grid - 2 column */}
      <section className="mx-auto max-w-[1440px] px-4 py-12 lg:px-8">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-wide text-[#1A1A1A]">
          KATEGORİLER
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Erkek */}
          <Link
            href="/erkek-ic-giyim"
            className="group relative flex h-[400px] items-end overflow-hidden bg-gray-100"
          >
            <Image
              src="/images/category-erkek.png"
              alt="Erkek İç Giyim"
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/70 to-transparent z-10 group-hover:from-[#1A1A1A]/80 transition-all" />
            <div className="relative z-20 p-8">
              <h3 className="text-3xl font-bold text-white">
                Erkek İç Giyim
              </h3>
              <p className="mt-2 text-sm text-gray-300">
                Premium boxer koleksiyonu
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#7AC143] group-hover:gap-3 transition-all">
                Keşfet <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>

          {/* Kadın */}
          <Link
            href="/kadin-ic-giyim"
            className="group relative flex h-[400px] items-end overflow-hidden bg-gray-100"
          >
            <Image
              src="/images/category-kadin.png"
              alt="Kadın İç Giyim"
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/70 to-transparent z-10 group-hover:from-[#1A1A1A]/80 transition-all" />
            <div className="relative z-20 p-8">
              <h3 className="text-3xl font-bold text-white">
                Kadın İç Giyim
              </h3>
              <p className="mt-2 text-sm text-gray-300">
                Konforlu külot koleksiyonu
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#7AC143] group-hover:gap-3 transition-all">
                Keşfet <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      {products.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-4 py-12 lg:px-8">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-wide text-[#1A1A1A]">
            ÖNE ÇIKAN ÜRÜNLER
          </h2>
          <ProductGrid products={products} />
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/erkek-ic-giyim">
              <Button variant="outline" size="lg">
                Erkek Koleksiyonu <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/kadin-ic-giyim">
              <Button variant="outline" size="lg">
                Kadın Koleksiyonu <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Wholesale CTA */}
      <section className="bg-[#1A1A1A]">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-6 px-4 py-16 text-center lg:px-8">
          <h2 className="text-3xl font-bold text-white">
            Toptan Satış Bayisi Olun
          </h2>
          <p className="max-w-lg text-gray-400">
            Vorte ürünlerini kendi satış noktanızda satmak ister misiniz?
            Bayilik başvurusu yapın, özel toptan fiyatlardan yararlanın.
          </p>
          <div className="flex gap-4">
            <Link href="/toptan">
              <Button variant="primary" size="lg">
                Başvuru Yap
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/bayi-girisi">
              <Button
                variant="outline"
                size="lg"
                className="border-[#7AC143] text-[#7AC143] hover:bg-[#7AC143] hover:text-white"
              >
                Bayi Girişi
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
