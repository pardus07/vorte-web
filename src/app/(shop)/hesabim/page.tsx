export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import {
  User,
  ShoppingBag,
  Heart,
  MapPin,
  LogOut,
  Package,
  Tag,
  Star,
  RotateCcw,
  Settings,
  ChevronRight,
  Eye,
} from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Bekliyor", color: "bg-yellow-100 text-yellow-700" },
  PAID: { label: "Ödendi", color: "bg-green-100 text-green-700" },
  PROCESSING: { label: "Hazırlanıyor", color: "bg-blue-100 text-blue-700" },
  SHIPPED: { label: "Kargoda", color: "bg-purple-100 text-purple-700" },
  DELIVERED: { label: "Teslim Edildi", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "İptal", color: "bg-red-100 text-red-700" },
};

const accountLinks = [
  { label: "Siparişlerim", href: "/hesabim/siparislerim", icon: ShoppingBag, desc: "Tüm siparişleriniz" },
  { label: "Adreslerim", href: "/hesabim/adreslerim", icon: MapPin, desc: "Teslimat adresleri" },
  { label: "Favorilerim", href: "/hesabim/favorilerim", icon: Heart, desc: "Beğendiğiniz ürünler" },
  { label: "İade Taleplerim", href: "/hesabim/iadelerim", icon: RotateCcw, desc: "İade ve değişim" },
  { label: "Yorumlarım", href: "/hesabim/yorumlarim", icon: Star, desc: "Ürün değerlendirmeleri" },
  { label: "Hesap Bilgilerim", href: "/hesabim/bilgilerim", icon: Settings, desc: "Profil ve şifre" },
];

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const [user, activeOrders, totalOrders, favCount, recentOrders] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, phone: true, createdAt: true, lastLoginAt: true },
    }),
    db.order.count({
      where: { userId: session.user.id, status: { in: ["PENDING", "PAID", "PROCESSING", "SHIPPED"] } },
    }),
    db.order.count({ where: { userId: session.user.id } }),
    db.favorite.count({ where: { userId: session.user.id } }),
    db.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, orderNumber: true, totalAmount: true, status: true, createdAt: true },
    }),
  ]);

  if (!user) redirect("/giris");

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Hesabım" }]} />

      {/* Welcome Card */}
      <div className="mt-4 rounded-lg border bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#7AC143]/10">
            <User className="h-7 w-7 text-[#7AC143]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Hoş geldin, {user.name || "Kullanıcı"}!
            </h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-gray-500">Aktif Siparişler</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{activeOrders}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-gray-500">Toplam Sipariş</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totalOrders}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-gray-500">Favori Ürün</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{favCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-gray-500">Üyelik Tarihi</p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {new Date(user.createdAt).toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Son Siparişler</h2>
            <Link href="/hesabim/siparislerim" className="text-xs text-[#7AC143] hover:underline">
              Tümünü Gör →
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="mt-3 rounded-lg border bg-white p-8 text-center">
              <Package className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm text-gray-400">Henüz siparişiniz yok</p>
              <Link href="/" className="mt-3 inline-block text-sm text-[#7AC143] hover:underline">
                Alışverişe Başla
              </Link>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {recentOrders.map((order) => {
                const st = STATUS_MAP[order.status] || { label: order.status, color: "bg-gray-100 text-gray-600" };
                return (
                  <Link
                    key={order.id}
                    href={`/hesabim/siparislerim/${order.id}`}
                    className="flex items-center justify-between rounded-lg border bg-white p-4 transition hover:border-[#7AC143]/30"
                  >
                    <div>
                      <span className="font-mono text-sm font-medium text-gray-900">#{order.orderNumber}</span>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-900">{formatPrice(order.totalAmount)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${st.color}`}>
                        {st.label}
                      </span>
                      <Eye className="h-4 w-4 text-gray-300" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <div>
          <h2 className="font-bold text-gray-900">Hesabım</h2>
          <div className="mt-3 space-y-2">
            {accountLinks.map(({ label, href, icon: Icon, desc }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-lg border bg-white p-3 transition hover:border-[#7AC143]/30"
              >
                <Icon className="h-5 w-5 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-700">{label}</p>
                  <p className="text-[11px] text-gray-400">{desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </Link>
            ))}
            <form action="/api/auth/signout" method="POST" className="mt-2">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg border border-red-100 p-3 text-left transition hover:bg-red-50"
              >
                <LogOut className="h-5 w-5 text-red-400" />
                <span className="text-sm font-medium text-red-600">Çıkış Yap</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
