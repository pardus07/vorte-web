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
  Star,
  RotateCcw,
  Settings,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Bekliyor", className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  PAID: { label: "Ödendi", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  PROCESSING: { label: "Hazırlanıyor", className: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
  SHIPPED: { label: "Kargoda", className: "bg-purple-50 text-purple-700 ring-1 ring-purple-200" },
  DELIVERED: { label: "Teslim Edildi", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  CANCELLED: { label: "İptal", className: "bg-red-50 text-red-700 ring-1 ring-red-200" },
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

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Günaydın";
    if (h < 18) return "Merhaba";
    return "İyi akşamlar";
  })();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Hesabım" }]} />

      {/* Welcome Card */}
      <div className="mt-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#7AC143] to-[#5B9A2E] shadow-lg shadow-[#7AC143]/20">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {greeting}, {user.name || "Kullanıcı"}!
            </h1>
            <p className="text-[13px] text-gray-500">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Aktif Siparişler</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{activeOrders}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Toplam Sipariş</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totalOrders}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Favori Ürün</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{favCount}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Üyelik Tarihi</p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {new Date(user.createdAt).toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-gray-900">Son Siparişler</h2>
            <Link href="/hesabim/siparislerim" className="text-[12px] font-medium text-[#7AC143] hover:underline">
              Tümünü Gör →
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="mt-3 flex flex-col items-center rounded-xl border border-gray-100 bg-white p-10 shadow-sm">
              <div className="rounded-full bg-gray-50 p-3">
                <Package className="h-6 w-6 text-gray-300" />
              </div>
              <p className="mt-3 text-[13px] text-gray-400">Henüz siparişiniz yok</p>
              <Link href="/" className="mt-3 text-[13px] font-medium text-[#7AC143] hover:underline">
                Alışverişe Başla →
              </Link>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {recentOrders.map((order) => {
                const st = STATUS_MAP[order.status] || { label: order.status, className: "bg-gray-50 text-gray-600 ring-1 ring-gray-200" };
                return (
                  <Link
                    key={order.id}
                    href={`/hesabim/siparislerim/${order.id}`}
                    className="group flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-gray-200 hover:shadow"
                  >
                    <div>
                      <span className="font-mono text-[13px] font-medium text-gray-900">#{order.orderNumber}</span>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-semibold text-gray-900">{formatPrice(order.totalAmount)}</span>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${st.className}`}>
                        {st.label}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-gray-300 transition-colors group-hover:text-gray-500" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <div>
          <h2 className="text-[14px] font-semibold text-gray-900">Hesabım</h2>
          <div className="mt-3 space-y-1.5">
            {accountLinks.map(({ label, href, icon: Icon, desc }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm transition-all hover:border-gray-200 hover:shadow"
              >
                <div className="rounded-lg bg-gray-50 p-2 transition-colors group-hover:bg-[#7AC143]/10">
                  <Icon className="h-4 w-4 text-gray-400 transition-colors group-hover:text-[#7AC143]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-gray-700">{label}</p>
                  <p className="text-[11px] text-gray-400">{desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-gray-500" />
              </Link>
            ))}
            <form action="/api/auth/signout" method="POST" className="mt-1">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl border border-red-50 bg-white p-3.5 text-left shadow-sm transition-all hover:border-red-100 hover:bg-red-50/50"
              >
                <div className="rounded-lg bg-red-50 p-2">
                  <LogOut className="h-4 w-4 text-red-400" />
                </div>
                <span className="text-[13px] font-medium text-red-600">Çıkış Yap</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
