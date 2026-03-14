"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ClipboardList,
  Factory,
  Wallet,
  FileText,
  Megaphone,
  User,
  LogOut,
} from "lucide-react";

const menuItems = [
  { label: "Dashboard", href: "/bayi", icon: LayoutDashboard },
  { label: "Ürünler", href: "/bayi/urunler", icon: Package },
  { label: "Sepet", href: "/bayi/sepet", icon: ShoppingCart },
  { label: "Siparişlerim", href: "/bayi/siparislerim", icon: ClipboardList },
  { label: "Üretim Takip", href: "/bayi/uretim", icon: Factory },
  { label: "Cari Hesap", href: "/bayi/cari-hesap", icon: Wallet },
  { label: "Faturalarım", href: "/bayi/faturalarim", icon: FileText },
  { label: "Duyurular", href: "/bayi/duyurular", icon: Megaphone },
  { label: "Profilim", href: "/bayi/profilim", icon: User },
];

interface DealerSidebarProps {
  dealer: { companyName: string; dealerCode: string };
}

export function DealerSidebar({ dealer }: DealerSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r bg-white lg:flex">
      <div className="flex h-16 items-center gap-3 border-b px-6">
        <Image src="/logo.png" alt="Vorte" width={80} height={28} />
        <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-600">
          BAYİ
        </span>
      </div>

      <div className="border-b px-6 py-3">
        <p className="text-sm font-medium text-gray-900">{dealer.companyName}</p>
        <p className="text-xs text-gray-500">{dealer.dealerCode}</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/bayi"
                ? pathname === "/bayi"
                : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-purple-50 font-medium text-purple-600"
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

      <div className="border-t p-4 space-y-2">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600"
        >
          ← Mağazaya Dön
        </Link>
        <a
          href="/api/auth/dealer/logout"
          className="flex items-center gap-2 text-xs text-red-400 hover:text-red-600"
        >
          <LogOut className="h-3 w-3" />
          Çıkış Yap
        </a>
      </div>
    </aside>
  );
}
