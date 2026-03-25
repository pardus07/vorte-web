"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  Phone,
  ChevronDown,
  ClipboardList,
  Warehouse,
  CheckSquare,
  TrendingUp,
  Scissors,
  Ruler,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";

type MenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type MenuGroup = {
  label: string;
  icon: LucideIcon;
  children: MenuItem[];
};

type MenuEntry = MenuItem | MenuGroup;

type MenuSection = {
  title: string;
  items: MenuEntry[];
};

function isGroup(entry: MenuEntry): entry is MenuGroup {
  return "children" in entry;
}

const menuSections: MenuSection[] = [
  {
    title: "",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    title: "Mağaza",
    items: [
      { label: "Ürünler", href: "/admin/urunler", icon: Package },
      { label: "Siparişler", href: "/admin/siparisler", icon: ShoppingCart },
      { label: "Bayiler", href: "/admin/bayiler", icon: Building2 },
      { label: "Fiyatlandırma", href: "/admin/fiyatlandirma", icon: DollarSign },
      { label: "Kuponlar", href: "/admin/kuponlar", icon: Tag },
      { label: "Kargo", href: "/admin/kargo", icon: Truck },
      { label: "Faturalar", href: "/admin/faturalar", icon: FileText },
    ],
  },
  {
    title: "İçerik",
    items: [
      { label: "Slider", href: "/admin/slider", icon: SlidersHorizontal },
      { label: "Bannerlar", href: "/admin/bannerlar", icon: RectangleHorizontal },
      { label: "Sayfalar", href: "/admin/sayfalar", icon: PanelTop },
      { label: "Blog", href: "/admin/blog", icon: BookOpen },
    ],
  },
  {
    title: "Üretim",
    items: [
      {
        label: "Üretim Planlama",
        icon: Factory,
        children: [
          { label: "Üretim Siparişleri", href: "/admin/uretim", icon: ClipboardList },
          { label: "Kalıp Editörü", href: "/admin/kalip-editoru", icon: Scissors },
          { label: "Pastal Planlama", href: "/admin/pastal-planlama", icon: Ruler },
          { label: "Tedarikçiler", href: "/admin/tedarikciler", icon: Building2 },
          { label: "Malzeme Stok", href: "/admin/malzeme-stok", icon: Warehouse },
          { label: "Kalite Kontrol", href: "/admin/kalite", icon: CheckSquare },
          { label: "Raporlar", href: "/admin/uretim-rapor", icon: TrendingUp },
        ],
      },
      { label: "Maliyet", href: "/admin/maliyet", icon: Calculator },
    ],
  },
  {
    title: "Pazarlama",
    items: [
      { label: "Merchant", href: "/admin/google-merchant", icon: ShoppingBag },
      { label: "SEO", href: "/admin/seo", icon: Search },
      { label: "Raporlar", href: "/admin/raporlar", icon: BarChart3 },
    ],
  },
  {
    title: "İletişim",
    items: [
      { label: "Chat", href: "/admin/chat", icon: Bot },
      { label: "Sesli Aramalar", href: "/admin/sesli-aramalar", icon: Phone },
      { label: "Mesajlar", href: "/admin/mesajlar", icon: Inbox },
      { label: "E-posta Şablon", href: "/admin/email-sablonlari", icon: Mail },
      { label: "E-posta Log", href: "/admin/email-log", icon: ScrollText },
    ],
  },
  {
    title: "Yönetim",
    items: [
      { label: "Müşteriler", href: "/admin/musteriler", icon: UserCircle },
      { label: "Kullanıcılar", href: "/admin/kullanicilar", icon: Users },
      { label: "Bildirimler", href: "/admin/bildirimler", icon: Bell },
      { label: "Ayarlar", href: "/admin/ayarlar", icon: Settings },
    ],
  },
];

interface AdminSidebarProps {
  onClose?: () => void;
}

export function AdminSidebar({ onClose }: AdminSidebarProps = {}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col bg-[#0F1117]">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7AC143]">
          <span className="text-sm font-bold text-white">V</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold tracking-wide text-white">VORTE</span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-[#7AC143]">
            ADMIN
          </span>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
        {menuSections.map((section) => (
          <div key={section.title || "main"} className="mt-4 first:mt-2">
            {section.title && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((entry) => {
                if (isGroup(entry)) {
                  return (
                    <SidebarGroup
                      key={entry.label}
                      group={entry}
                      pathname={pathname}
                      onClose={onClose}
                    />
                  );
                }

                const Icon = entry.icon;
                const isActive =
                  entry.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(entry.href);

                return (
                  <li key={entry.href}>
                    <Link
                      href={entry.href}
                      onClick={onClose}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all duration-150 ${
                        isActive
                          ? "bg-[#7AC143]/15 font-medium text-[#7AC143]"
                          : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={isActive ? 2 : 1.5} />
                      {entry.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 px-3 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Mağazaya Dön
        </Link>
        <p className="mt-1 px-3 text-[10px] text-gray-600">
          v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}
        </p>
      </div>
    </aside>
  );
}

function SidebarGroup({ group, pathname, onClose }: { group: MenuGroup; pathname: string; onClose?: () => void }) {
  const isAnyChildActive = group.children.some((child) =>
    pathname.startsWith(child.href)
  );
  const [open, setOpen] = useState(isAnyChildActive);

  const Icon = group.icon;

  return (
    <li>
      <button
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all duration-150 ${
          isAnyChildActive
            ? "bg-[#7AC143]/15 font-medium text-[#7AC143]"
            : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" strokeWidth={isAnyChildActive ? 2 : 1.5} />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          open ? "mt-0.5 max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <ul className="ml-4 space-y-0.5 border-l border-white/10 pl-3">
          {group.children.map((child) => {
            const ChildIcon = child.icon;
            const isActive = pathname.startsWith(child.href);

            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  onClick={onClose}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] transition-all duration-150 ${
                    isActive
                      ? "font-medium text-[#7AC143]"
                      : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
                  }`}
                >
                  <ChildIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={isActive ? 2 : 1.5} />
                  {child.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </li>
  );
}
