"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  DollarSign,
  Truck,
  FileText,
  Tag,
  Bell,
  Settings,
  Building2,
  SlidersHorizontal,
  RectangleHorizontal,
  Users,
  UserCircle,
  BarChart3,
  Calculator,
  ShoppingBag,
  Mail,
  Inbox,
  ScrollText,
  Factory,
  PanelTop,
  BookOpen,
  Bot,
  Search,
} from "lucide-react";

const menuItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Ürünler", href: "/admin/urunler", icon: Package },
  { label: "Slider", href: "/admin/slider", icon: SlidersHorizontal },
  { label: "Bannerlar", href: "/admin/bannerlar", icon: RectangleHorizontal },
  { label: "Siparişler", href: "/admin/siparisler", icon: ShoppingCart },
  { label: "Bayiler", href: "/admin/bayiler", icon: Building2 },
  { label: "Fiyatlandırma", href: "/admin/fiyatlandirma", icon: DollarSign },
  { label: "Kargo", href: "/admin/kargo", icon: Truck },
  { label: "Faturalar", href: "/admin/faturalar", icon: FileText },
  { label: "Raporlar", href: "/admin/raporlar", icon: BarChart3 },
  { label: "Maliyet", href: "/admin/maliyet", icon: Calculator },
  { label: "Üretim", href: "/admin/uretim", icon: Factory },
  { label: "Merchant", href: "/admin/google-merchant", icon: ShoppingBag },
  { label: "Sayfalar", href: "/admin/sayfalar", icon: PanelTop },
  { label: "Blog", href: "/admin/blog", icon: BookOpen },
  { label: "Kuponlar", href: "/admin/kuponlar", icon: Tag },
  { label: "Chat", href: "/admin/chat", icon: Bot },
  { label: "SEO", href: "/admin/seo", icon: Search },
  { label: "Mesajlar", href: "/admin/mesajlar", icon: Inbox },
  { label: "E-posta Şablon", href: "/admin/email-sablonlari", icon: Mail },
  { label: "E-posta Log", href: "/admin/email-log", icon: ScrollText },
  { label: "Müşteriler", href: "/admin/musteriler", icon: UserCircle },
  { label: "Kullanıcılar", href: "/admin/kullanicilar", icon: Users },
  { label: "Bildirimler", href: "/admin/bildirimler", icon: Bell },
  { label: "Ayarlar", href: "/admin/ayarlar", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r bg-white lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b px-6">
        <Image src="/logo.png" alt="Vorte" width={80} height={28} />
        <span className="rounded bg-[#7AC143] px-2 py-0.5 text-[10px] font-bold text-white">
          ADMIN
        </span>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-[#7AC143]/10 font-medium text-[#7AC143]"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600"
        >
          ← Mağazaya Dön
        </Link>
        <p className="mt-2 text-[10px] text-gray-300">v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}</p>
      </div>
    </aside>
  );
}
