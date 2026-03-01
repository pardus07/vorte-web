"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  Truck,
  FileText,
  Tag,
  Bell,
  Settings,
  Building2,
} from "lucide-react";

const menuItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Ürünler", href: "/admin/urunler", icon: Package },
  { label: "Siparişler", href: "/admin/siparisler", icon: ShoppingCart },
  { label: "Bayiler", href: "/admin/bayiler", icon: Building2 },
  { label: "Fiyatlandırma", href: "/admin/fiyatlandirma", icon: DollarSign },
  { label: "Kargo", href: "/admin/kargo", icon: Truck },
  { label: "Faturalar", href: "/admin/faturalar", icon: FileText },
  { label: "Kuponlar", href: "/admin/kuponlar", icon: Tag },
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
      </div>
    </aside>
  );
}
