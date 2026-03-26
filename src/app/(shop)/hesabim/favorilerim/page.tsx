export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Heart, Share2 } from "lucide-react";
import Link from "next/link";
import { ShareFavoritesButton } from "./ShareButton";

export default async function FavoritesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const favorites = await db.favorite.findMany({
    where: { userId: session.user.id },
    include: {
      product: {
        include: {
          category: true,
          variants: { where: { active: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const products = favorites.map((f) => f.product);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Hesabım", href: "/hesabim" }, { label: "Favorilerim" }]} />
      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Favorilerim</h1>
        {products.length > 0 && (
          <ShareFavoritesButton slugs={products.map((p) => p.slug)} />
        )}
      </div>

      {products.length === 0 ? (
        <div className="mt-8 text-center">
          <Heart className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-gray-500">Favori listeniz boş.</p>
          <Link href="/erkek-ic-giyim" className="mt-3 inline-block text-sm text-[#7AC143] hover:underline">Ürünlere Göz At</Link>
        </div>
      ) : (
        <div className="mt-6">
          <ProductGrid products={products} />
        </div>
      )}
    </div>
  );
}
