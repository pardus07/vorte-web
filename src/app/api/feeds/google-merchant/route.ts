import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Google Merchant Center XML Feed
// URL: /api/feeds/google-merchant
export const dynamic = "force-dynamic";

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.vorte.com.tr";

  const products = await db.product.findMany({
    where: { active: true },
    include: {
      variants: { where: { active: true } },
      category: true,
    },
  });

  // Google kategori eşleştirme (DB'de yoksa varsayılan)
  const DEFAULT_GOOGLE_CATEGORIES: Record<string, string> = {
    "ERKEK": "Giyim ve Aksesuarlar > Giyim > İç Giyim ve Çorap > İç Çamaşırı",
    "KADIN": "Giyim ve Aksesuarlar > Giyim > İç Giyim ve Çorap > İç Çamaşırı",
  };

  const items = products.flatMap((product) =>
    product.variants.map((variant) => {
      const price = variant.price || product.basePrice;
      const availability = variant.stock > 0 ? "in_stock" : "out_of_stock";
      const imageUrl = product.images[0]
        ? product.images[0].startsWith("http") ? product.images[0] : `${siteUrl}${product.images[0]}`
        : "";
      const additionalImages = product.images.slice(1).map((img) =>
        img.startsWith("http") ? img : `${siteUrl}${img}`
      );
      const googleCategory = product.googleCategory || DEFAULT_GOOGLE_CATEGORIES[product.gender] || "Giyim ve Aksesuarlar > Giyim > İç Giyim ve Çorap > İç Çamaşırı";

      // Description: ilk 5000 karakter (Google limiti)
      const desc = (product.description || product.name).substring(0, 5000);

      return `    <item>
      <g:id>${escapeXml(variant.sku)}</g:id>
      <g:title>${escapeXml(`${product.name} ${variant.size}`)}</g:title>
      <g:description>${escapeXml(desc)}</g:description>
      <g:link>${siteUrl}/urun/${product.slug}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
${additionalImages.map((img) => `      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`).join("\n")}
      <g:price>${price.toFixed(2)} TRY</g:price>
      <g:availability>${availability}</g:availability>
      <g:brand>Vorte</g:brand>
      <g:condition>new</g:condition>
${variant.gtinBarcode ? `      <g:gtin>${escapeXml(variant.gtinBarcode)}</g:gtin>` : `      <g:identifier_exists>no</g:identifier_exists>`}
      <g:google_product_category>${escapeXml(googleCategory)}</g:google_product_category>
      <g:item_group_id>${product.id}</g:item_group_id>
      <g:color>${escapeXml(variant.color)}</g:color>
      <g:size>${variant.size}</g:size>
      <g:gender>${product.gender === "ERKEK" ? "male" : "female"}</g:gender>
      <g:age_group>adult</g:age_group>
      <g:product_type>${escapeXml(product.category.name)}</g:product_type>
      <g:material>Pamuk</g:material>
      <g:shipping>
        <g:country>TR</g:country>
        <g:service>Kargo</g:service>
        <g:price>0 TRY</g:price>
      </g:shipping>
${product.weight ? `      <g:shipping_weight>${product.weight} kg</g:shipping_weight>` : ""}
    </item>`;
    })
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Vorte Tekstil</title>
    <link>${siteUrl}</link>
    <description>Vorte Tekstil - Kaliteli İç Giyim</description>
${items.join("\n")}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
