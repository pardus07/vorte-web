import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { HeroSlider } from "@/components/home/HeroSlider";
import type { SlideData } from "@/components/home/HeroSlider";
import { PromoBanner } from "@/components/home/PromoBanner";
import type { BannerData } from "@/components/home/PromoBanner";
import { ProductGrid } from "@/components/product/ProductGrid";
import { JsonLd } from "@/components/seo/JsonLd";
import { HomepageClient } from "@/components/home/HomepageClient";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { TrustBadges } from "@/components/home/TrustBadges";
import { RecentlyViewed } from "@/components/home/RecentlyViewed";
import { CountdownBanner } from "@/components/home/CountdownBanner";
import { db } from "@/lib/db";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Vorte Tekstil | Kaliteli İç Giyim - Erkek Boxer & Kadın Külot",
  description:
    "Vorte Tekstil - Premium modal kumaştan erkek boxer ve kadın külot. Toptan ve perakende iç giyim. Hızlı kargo, güvenli ödeme, uygun fiyat. Bursa.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  // Fetch active sliders from DB
  let sliderData: SlideData[] = [];
  try {
    const now = new Date();
    const dbSliders = await db.slider.findMany({
      where: {
        active: true,
        OR: [{ startDate: null }, { startDate: { lte: now } }],
      },
      orderBy: { sortOrder: "asc" },
    });
    sliderData = dbSliders
      .filter((s) => !s.endDate || new Date(s.endDate) >= now)
      .map((s) => ({
        imageDesktop: s.imageDesktop,
        imageMobile: s.imageMobile,
        subtitle: s.subtitle,
        title: s.title,
        highlight: s.highlight,
        description: s.description,
        buttonText: s.buttonText,
        buttonLink: s.buttonLink,
        secondaryButtonText: s.secondaryButtonText,
        secondaryButtonLink: s.secondaryButtonLink,
        altText: s.altText,
      }));
  } catch {
    // DB unavailable - fallback slides will be used
  }

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

  // Fetch latest blog posts
  let blogPosts: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    coverImage: string | null;
    publishedAt: Date | null;
    authorName: string;
    tags: string | null;
  }[] = [];
  try {
    blogPosts = await db.blogPost.findMany({
      where: { published: true },
      orderBy: { publishedAt: "asc" },
      take: 3,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        publishedAt: true,
        authorName: true,
        tags: true,
      },
    });
  } catch {
    // DB unavailable during build
  }

  // Fetch testimonials
  let testimonials: { id: string; name: string; title: string | null; rating: number; comment: string }[] = [];
  try {
    testimonials = await db.testimonial.findMany({
      where: { featured: true, approved: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, title: true, rating: true, comment: true },
    });
  } catch {
    // DB unavailable during build
  }

  // Fetch active campaign end date for countdown
  let campaignEndDate: string | null = null;
  try {
    const activeCoupon = await db.coupon.findFirst({
      where: { active: true, expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: "asc" },
      select: { expiresAt: true, code: true },
    });
    if (activeCoupon?.expiresAt) {
      campaignEndDate = activeCoupon.expiresAt.toISOString();
    }
  } catch {
    // DB unavailable during build
  }

  // Fetch active banners by position
  const bannersByPosition: Record<string, BannerData[]> = {};
  try {
    const now = new Date();
    const dbBanners = await db.banner.findMany({
      where: {
        active: true,
        OR: [{ startDate: null }, { startDate: { lte: now } }],
      },
      orderBy: { sortOrder: "asc" },
    });
    const activeBanners = dbBanners.filter(
      (b) => !b.endDate || new Date(b.endDate) >= now
    );
    for (const b of activeBanners) {
      if (!bannersByPosition[b.position]) bannersByPosition[b.position] = [];
      bannersByPosition[b.position].push({
        id: b.id,
        name: b.name,
        position: b.position,
        imageDesktop: b.imageDesktop,
        imageMobile: b.imageMobile,
        link: b.link,
        altText: b.altText,
      });
    }
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

      {/* ── HERO ── */}
      <HeroSlider />

      {/* ── MARQUEE STRIP ── */}
      <div className="overflow-hidden border-b border-gray-100 bg-white py-3">
        <div className="animate-marquee flex whitespace-nowrap">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center gap-12 px-6">
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#1A1A1A]">
                Ücretsiz Kargo — 500₺ Üzeri Siparişlerde
              </span>
              <span className="text-[10px] text-gray-300">◆</span>
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#1A1A1A]">
                3D Secure Güvenli Ödeme
              </span>
              <span className="text-[10px] text-gray-300">◆</span>
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#1A1A1A]">
                14 Gün İçinde Kolay İade
              </span>
              <span className="text-[10px] text-gray-300">◆</span>
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#1A1A1A]">
                %95 Taranmış Penye Pamuk
              </span>
              <span className="text-[10px] text-gray-300">◆</span>
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#1A1A1A]">
                9 Taksit İmkanı
              </span>
              <span className="text-[10px] text-gray-300">◆</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── TRUST BADGES ── */}
      <TrustBadges />

      {/* ── COUNTDOWN BANNER ── */}
      {campaignEndDate && (
        <CountdownBanner
          endDate={campaignEndDate}
          title="Hoş Geldin Kampanyası"
          subtitle="HOSGELDIN koduyla %10 indirim"
        />
      )}

      {/* Homepage Top Banners */}
      {bannersByPosition["homepage-top"] && (
        <PromoBanner banners={bannersByPosition["homepage-top"]} />
      )}

      {/* ── BRAND STATEMENT ── */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <p
            className="text-[10px] font-medium uppercase text-gray-400 md:text-[11px]"
            style={{ letterSpacing: "0.35em" }}
          >
            Doğadan Teninize
          </p>
          <div className="divider-line mt-5 mb-6" />
          <h2
            className="text-2xl font-light text-[#1A1A1A] md:text-3xl lg:text-4xl"
            style={{ letterSpacing: "0.08em", lineHeight: 1.4 }}
          >
            35 yıllık deneyim, %95 taranmış penye pamuk.
            <br className="hidden md:block" />
            {" "}Konfor ve kalitenin buluştuğu nokta.
          </h2>
        </div>
      </section>

      {/* ── CATEGORY: ERKEK — Full Bleed ── */}
      <section className="relative">
        <Link
          href="/erkek-ic-giyim"
          className="group relative block h-[70vh] min-h-[500px] overflow-hidden md:h-[85vh]"
        >
          <Image
            src="/images/category-erkek.png"
            alt="Erkek İç Giyim Koleksiyonu"
            fill
            className="object-cover img-cover-zoom"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-16 md:pb-24">
            <p
              className="mb-3 text-[10px] font-light uppercase text-white/70 md:text-[11px]"
              style={{ letterSpacing: "0.35em" }}
            >
              Koleksiyon
            </p>
            <h2
              className="text-3xl font-light uppercase text-white md:text-5xl lg:text-6xl"
              style={{ letterSpacing: "0.15em" }}
            >
              Erkek
            </h2>
            <span
              className="mt-6 inline-flex items-center gap-2 border border-white/60 px-8 py-3 text-[10px] font-light uppercase text-white transition-all duration-500 group-hover:bg-white group-hover:text-[#1A1A1A] md:text-[11px]"
              style={{ letterSpacing: "0.25em" }}
            >
              Keşfet <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </Link>
      </section>

      {/* ── CATEGORY: KADIN — Full Bleed ── */}
      <section className="relative">
        <Link
          href="/kadin-ic-giyim"
          className="group relative block h-[70vh] min-h-[500px] overflow-hidden md:h-[85vh]"
        >
          <Image
            src="/images/category-kadin.png"
            alt="Kadın İç Giyim Koleksiyonu"
            fill
            className="object-cover img-cover-zoom"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-16 md:pb-24">
            <p
              className="mb-3 text-[10px] font-light uppercase text-white/70 md:text-[11px]"
              style={{ letterSpacing: "0.35em" }}
            >
              Koleksiyon
            </p>
            <h2
              className="text-3xl font-light uppercase text-white md:text-5xl lg:text-6xl"
              style={{ letterSpacing: "0.15em" }}
            >
              Kadın
            </h2>
            <span
              className="mt-6 inline-flex items-center gap-2 border border-white/60 px-8 py-3 text-[10px] font-light uppercase text-white transition-all duration-500 group-hover:bg-white group-hover:text-[#1A1A1A] md:text-[11px]"
              style={{ letterSpacing: "0.25em" }}
            >
              Keşfet <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </Link>
      </section>

      {/* Homepage Mid Banners */}
      {bannersByPosition["homepage-mid"] && (
        <PromoBanner banners={bannersByPosition["homepage-mid"]} />
      )}

      {/* ── FEATURED PRODUCTS ── */}
      {products.length > 0 && (
        <section className="bg-white py-20 md:py-28">
          <div className="mx-auto max-w-[1440px] px-4 lg:px-8">
            <div className="mb-12 text-center">
              <p
                className="text-[10px] font-medium uppercase text-gray-400 md:text-[11px]"
                style={{ letterSpacing: "0.35em" }}
              >
                Seçtiklerimiz
              </p>
              <div className="divider-line mt-4 mb-5" />
              <h2
                className="text-xl font-light uppercase text-[#1A1A1A] md:text-2xl"
                style={{ letterSpacing: "0.15em" }}
              >
                Öne Çıkan Ürünler
              </h2>
            </div>
            <ProductGrid products={products} />
            <div className="mt-12 flex justify-center gap-4">
              <Link
                href="/erkek-ic-giyim"
                className="border border-[#1A1A1A] px-8 py-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[#1A1A1A] transition-all duration-300 hover:bg-[#1A1A1A] hover:text-white"
              >
                Erkek Koleksiyonu
              </Link>
              <Link
                href="/kadin-ic-giyim"
                className="border border-[#1A1A1A] px-8 py-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[#1A1A1A] transition-all duration-300 hover:bg-[#1A1A1A] hover:text-white"
              >
                Kadın Koleksiyonu
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── SON GÖRÜNTÜLENEN ÜRÜNLER ── */}
      <RecentlyViewed />

      {/* Homepage Bottom Banners */}
      {bannersByPosition["homepage-bottom"] && (
        <PromoBanner banners={bannersByPosition["homepage-bottom"]} />
      )}

      {/* ── TESTIMONIALS ── */}
      {testimonials.length > 0 && (
        <TestimonialsSection testimonials={testimonials} />
      )}

      {/* ── BLOG — Editorial Style ── */}
      {blogPosts.length > 0 && (
        <section className="border-t border-gray-100 bg-[#FAFAFA] py-20 md:py-28">
          <div className="mx-auto max-w-[1440px] px-4 lg:px-8">
            <div className="mb-12 text-center">
              <p
                className="text-[10px] font-medium uppercase text-gray-400 md:text-[11px]"
                style={{ letterSpacing: "0.35em" }}
              >
                Editöryal
              </p>
              <div className="divider-line mt-4 mb-5" />
              <h2
                className="text-xl font-light uppercase text-[#1A1A1A] md:text-2xl"
                style={{ letterSpacing: "0.15em" }}
              >
                Blog
              </h2>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {blogPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                    {post.coverImage ? (
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-4xl font-light text-gray-200">V</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-5">
                    {post.publishedAt && (
                      <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">
                        {new Date(post.publishedAt).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    )}
                    <h3 className="mt-2 text-sm font-medium text-[#1A1A1A] transition-colors group-hover:text-gray-500 line-clamp-2">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="mt-2 text-xs leading-relaxed text-gray-400 line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-12 flex justify-center">
              <Link
                href="/blog"
                className="border border-[#1A1A1A] px-8 py-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[#1A1A1A] transition-all duration-300 hover:bg-[#1A1A1A] hover:text-white"
              >
                Tüm Yazılar
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── WHOLESALE CTA ── */}
      <section className="relative overflow-hidden bg-[#1A1A1A] py-24 md:py-32">
        <div className="mx-auto flex max-w-2xl flex-col items-center px-4 text-center">
          <p
            className="text-[10px] font-light uppercase text-white/40 md:text-[11px]"
            style={{ letterSpacing: "0.35em" }}
          >
            İş Ortaklığı
          </p>
          <div className="mx-auto mt-5 mb-6 h-px w-10 bg-white/20" />
          <h2
            className="text-2xl font-light uppercase text-white md:text-3xl lg:text-4xl"
            style={{ letterSpacing: "0.1em" }}
          >
            Toptan Satış Bayisi Olun
          </h2>
          <p className="mt-5 text-sm font-light leading-relaxed text-white/50">
            Vorte ürünlerini kendi satış noktanızda sunun.
            Özel toptan fiyatlar ve bayilik avantajlarından yararlanın.
          </p>
          <div className="mt-10 flex gap-4">
            <Link
              href="/toptan"
              className="border border-white/80 bg-white px-10 py-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[#1A1A1A] transition-all duration-300 hover:bg-transparent hover:text-white"
            >
              Başvuru Yap
            </Link>
            <Link
              href="/bayi-girisi"
              className="border border-white/30 px-10 py-3 text-[10px] font-medium uppercase tracking-[0.2em] text-white/70 transition-all duration-300 hover:border-white/60 hover:text-white"
            >
              Bayi Girişi
            </Link>
          </div>
        </div>
      </section>

      {/* Scroll reveal activator (client component) */}
      <HomepageClient />
    </>
  );
}
