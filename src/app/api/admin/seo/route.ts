import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";

// GET — SEO dashboard data
export async function GET() {
  const admin = await requirePermission("products", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  // Product SEO status
  const products = await db.product.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      slug: true,
      seoTitle: true,
      seoDescription: true,
      googleCategory: true,
    },
  });

  const productStats = {
    total: products.length,
    withTitle: products.filter((p) => p.seoTitle).length,
    withDescription: products.filter((p) => p.seoDescription).length,
    withCategory: products.filter((p) => p.googleCategory).length,
    missingTitle: products.filter((p) => !p.seoTitle),
    missingDescription: products.filter((p) => !p.seoDescription),
  };

  // Blog SEO
  const blogPosts = await db.blogPost.findMany({
    where: { published: true },
    select: { id: true, title: true, slug: true, seoTitle: true, seoDescription: true },
  });

  const blogStats = {
    total: blogPosts.length,
    withTitle: blogPosts.filter((p) => p.seoTitle).length,
    withDescription: blogPosts.filter((p) => p.seoDescription).length,
  };

  // Pages SEO — DB sayfaları + hardcoded statik sayfalar
  const dbPages = await db.page.findMany({
    where: { published: true },
    select: { id: true, title: true, slug: true, seoTitle: true, seoDescription: true },
  });

  // Next.js dosya sistemindeki statik sayfalar (metadata export'lu)
  const staticPages = [
    { id: "static-hakkimizda", title: "Hakkımızda", slug: "hakkimizda", seoTitle: "Hakkımızda", seoDescription: "Vorte Tekstil hakkında. Bursa Nilüfer'de kaliteli iç giyim üretimi ve satış. Premium kumaş, uygun fiyat." },
    { id: "static-iletisim", title: "İletişim", slug: "iletisim", seoTitle: "İletişim", seoDescription: "Vorte Tekstil iletişim bilgileri. Adres, telefon, e-posta. Nilüfer, Bursa." },
    { id: "static-kvkk", title: "KVKK Aydınlatma Metni", slug: "kvkk", seoTitle: "KVKK Aydınlatma Metni", seoDescription: "Vorte Tekstil KVKK aydınlatma metni. 6698 sayılı kanun kapsamında kişisel veri işleme politikamız." },
    { id: "static-kullanim", title: "Kullanım Koşulları", slug: "kullanim-kosullari", seoTitle: "Kullanım Koşulları", seoDescription: "Vorte Tekstil web sitesi kullanım koşulları ve şartları." },
    { id: "static-gizlilik", title: "Gizlilik Politikası", slug: "gizlilik-politikasi", seoTitle: "Gizlilik Politikası", seoDescription: "Vorte Tekstil gizlilik politikası. Kişisel verilerin korunması ve gizlilik ilkelerimiz." },
    { id: "static-mesafeli", title: "Mesafeli Satış Sözleşmesi", slug: "mesafeli-satis", seoTitle: "Mesafeli Satış Sözleşmesi", seoDescription: "Vorte Tekstil mesafeli satış sözleşmesi. Online alışveriş koşulları ve haklarınız." },
    { id: "static-iade", title: "İade Politikası", slug: "iade-politikasi", seoTitle: "İade Politikası", seoDescription: "Vorte Tekstil iade ve değişim politikası. 14 gün içinde koşulsuz iade hakkı." },
    { id: "static-toptan", title: "Toptan Satış", slug: "toptan", seoTitle: "Toptan Satış", seoDescription: "Vorte Tekstil toptan satış ve bayilik fırsatları. Özel toptan fiyatlar, hızlı teslimat. Bayilik başvurusu." },
    { id: "static-kargo", title: "Kargo ve Teslimat", slug: "kargo-teslimat", seoTitle: "Kargo ve Teslimat", seoDescription: "Vorte Tekstil kargo ve teslimat bilgileri. Türkiye geneli 1-3 iş günü teslimat. 300 TL üzeri ücretsiz kargo." },
    { id: "static-sss", title: "Sıkça Sorulan Sorular", slug: "sss", seoTitle: "Sıkça Sorulan Sorular", seoDescription: "Vorte Tekstil sıkça sorulan sorular. Sipariş, kargo, iade, beden ve ödeme hakkında merak ettikleriniz." },
  ];

  // DB sayfalarının slug'larını al, çakışma olmasın
  const dbSlugs = new Set(dbPages.map(p => p.slug));
  const mergedPages = [
    ...dbPages,
    ...staticPages.filter(sp => !dbSlugs.has(sp.slug)),
  ];

  const pageStats = {
    total: mergedPages.length,
    withTitle: mergedPages.filter((p) => p.seoTitle).length,
    withDescription: mergedPages.filter((p) => p.seoDescription).length,
  };

  // Redirects
  const redirects = await db.redirect.findMany({ orderBy: { createdAt: "desc" } });

  // 404 logs
  const notFoundLogs = await db.notFoundLog.findMany({
    orderBy: { hits: "desc" },
    take: 50,
  });

  return NextResponse.json({
    products,
    productStats,
    blogPosts,
    blogStats,
    pages: mergedPages,
    pageStats,
    redirects,
    notFoundLogs,
  });
}

// POST — actions: bulk_seo_update, add_redirect, delete_redirect, clear_404
export async function POST(req: NextRequest) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const body = await req.json();

  if (body.action === "bulk_seo_update") {
    const { productIds, titleTemplate, descriptionTemplate } = body;
    if (!productIds?.length) return NextResponse.json({ error: "Ürün seçilmedi" }, { status: 400 });

    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });

    let updated = 0;
    for (const product of products) {
      const data: Record<string, string> = {};
      if (titleTemplate) {
        data.seoTitle = titleTemplate.replace("{name}", product.name);
      }
      if (descriptionTemplate) {
        data.seoDescription = descriptionTemplate.replace("{name}", product.name);
      }
      if (Object.keys(data).length > 0) {
        await db.product.update({ where: { id: product.id }, data });
        updated++;
      }
    }
    return NextResponse.json({ updated });
  }

  if (body.action === "add_redirect") {
    const { fromPath, toPath, permanent } = body;
    if (!fromPath || !toPath) return NextResponse.json({ error: "Yollar gerekli" }, { status: 400 });

    const redirect = await db.redirect.upsert({
      where: { fromPath },
      create: { fromPath, toPath, permanent: permanent !== false },
      update: { toPath, permanent: permanent !== false, active: true },
    });
    return NextResponse.json(redirect);
  }

  if (body.action === "delete_redirect") {
    await db.redirect.delete({ where: { id: body.id } });
    return NextResponse.json({ success: true });
  }

  if (body.action === "clear_404") {
    await db.notFoundLog.deleteMany();
    return NextResponse.json({ success: true });
  }

  if (body.action === "create_redirect_from_404") {
    const { path, toPath } = body;
    await db.redirect.upsert({
      where: { fromPath: path },
      create: { fromPath: path, toPath, permanent: true },
      update: { toPath, active: true },
    });
    await db.notFoundLog.deleteMany({ where: { path } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Geçersiz aksiyon" }, { status: 400 });
}
