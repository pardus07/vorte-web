"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

interface CompareProduct {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  images: string[];
  description: string | null;
  gender: string;
  category: { name: string };
  variants: { color: string; colorHex: string; size: string; stock: number; price: number | null }[];
}

export function ComparePageClient({ products }: { products: CompareProduct[] }) {
  if (products.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <p className="text-lg font-light text-gray-400">Karşılaştıracak ürün bulunamadı</p>
        <p className="mt-2 text-sm text-gray-300">
          Ürün sayfalarından karşılaştırmak istediğiniz ürünleri ekleyin.
        </p>
        <Link
          href="/erkek-ic-giyim"
          className="mt-6 border border-[#1A1A1A] px-6 py-2.5 text-xs font-medium uppercase tracking-wider text-[#1A1A1A] transition-all hover:bg-[#1A1A1A] hover:text-white"
        >
          Ürünleri İncele
        </Link>
      </div>
    );
  }

  const specs = [
    {
      label: "Kategori",
      getValue: (p: CompareProduct) => p.category.name,
    },
    {
      label: "Cinsiyet",
      getValue: (p: CompareProduct) => p.gender === "ERKEK" ? "Erkek" : "Kadın",
    },
    {
      label: "Fiyat",
      getValue: (p: CompareProduct) => formatPrice(p.basePrice),
    },
    {
      label: "Renkler",
      getValue: (p: CompareProduct) => {
        const unique = Array.from(new Set(p.variants.map((v) => v.color)));
        return unique.join(", ");
      },
    },
    {
      label: "Bedenler",
      getValue: (p: CompareProduct) => {
        const unique = Array.from(new Set(p.variants.map((v) => v.size)));
        return unique.join(", ");
      },
    },
    {
      label: "Stok Durumu",
      getValue: (p: CompareProduct) => {
        const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
        return totalStock > 0 ? `${totalStock} adet stokta` : "Stokta yok";
      },
    },
  ];

  return (
    <div className="mt-6">
      <h1
        className="text-center text-2xl font-light uppercase text-[#1A1A1A] md:text-3xl"
        style={{ letterSpacing: "0.1em" }}
      >
        Ürün Karşılaştırma
      </h1>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse">
          {/* Ürün görselleri */}
          <thead>
            <tr>
              <th className="w-[160px] border-b border-gray-100 p-4" />
              {products.map((p) => (
                <th key={p.id} className="border-b border-gray-100 p-4 text-center">
                  <Link href={`/urun/${p.slug}`} className="group inline-block">
                    <div className="mx-auto h-32 w-32 overflow-hidden rounded-xl bg-gray-50">
                      {p.images[0] ? (
                        <Image
                          src={p.images[0]}
                          alt={p.name}
                          width={128}
                          height={128}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-3xl font-light text-gray-200">V</div>
                      )}
                    </div>
                    <p className="mt-3 text-sm font-medium text-[#1A1A1A] transition-colors group-hover:text-[#7AC143]">
                      {p.name}
                    </p>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {specs.map((spec, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-gray-50/50" : ""}>
                <td className="border-b border-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {spec.label}
                </td>
                {products.map((p) => (
                  <td key={p.id} className="border-b border-gray-50 px-4 py-3 text-center text-sm text-gray-700">
                    {spec.getValue(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
