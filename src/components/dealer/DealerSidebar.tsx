"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  ExternalLink,
  X,
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
  onClose?: () => void;
}

export function DealerSidebar({ dealer, onClose }: DealerSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col bg-[#0F1117]">
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500">
            <span className="text-sm font-bold text-white">V</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-semibold tracking-wide text-white">VORTE</span>
            <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-purple-400">
              BAYİ
            </span>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-white/10 lg:hidden">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dealer info */}
      <div className="mx-3 rounded-lg bg-white/5 px-3 py-2.5">
        <p className="text-[13px] font-medium text-gray-200">{dealer.companyName}</p>
        <p className="text-[11px] text-gray-500">{dealer.dealerCode}</p>
      </div>

      {/* Menu */}
      <nav className="mt-4 flex-1 overflow-y-auto px-3">
        <ul className="space-y-0.5">
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
                  onClick={onClose}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all duration-150 ${
                    isActive
                      ? "bg-purple-500/15 font-medium text-purple-400"
                      : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={isActive ? 2 : 1.5} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 px-3 py-3 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Mağazaya Dön
        </Link>
        <a
          href="/api/auth/dealer/logout"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-3.5 w-3.5" />
          Çıkış Yap
        </a>
      </div>
    </aside>
  );
}
