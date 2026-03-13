"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, ChevronRight, Store } from "lucide-react";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

const menuItems = [
  { label: "ERKEK İÇ GİYİM", href: "/erkek-ic-giyim" },
  { label: "KADIN İÇ GİYİM", href: "/kadin-ic-giyim" },
  { label: "TOPTAN SATIŞ", href: "/toptan" },
  { label: "BLOG", href: "/blog" },
  { label: "HAKKIMIZDA", href: "/hakkimizda" },
  { label: "İLETİŞİM", href: "/iletisim" },
];

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 z-50 h-full w-[280px] bg-white shadow-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
          <span className="text-lg font-bold text-[#7AC143]">VORTE</span>
          <button onClick={onClose} className="p-1 hover:opacity-70" aria-label="Menüyü kapat">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex flex-col py-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex items-center justify-between px-6 py-4 text-sm font-semibold tracking-wide text-[#1A1A1A] hover:bg-gray-50 transition-colors"
            >
              {item.label}
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </Link>
          ))}
        </nav>

        {/* Dealer Login */}
        <div className="mt-auto border-t border-gray-200 px-6 py-4">
          <Link
            href="/bayi-girisi"
            onClick={onClose}
            className="flex items-center gap-2 text-sm font-semibold text-[#7AC143] hover:underline"
          >
            <Store className="h-4 w-4" />
            BAYİ GİRİŞİ
          </Link>
        </div>

        {/* Bottom Links */}
        <div className="border-t border-gray-200 px-6 py-4 space-y-2">
          <Link href="/gizlilik-politikasi" onClick={onClose} className="block text-xs text-gray-500 hover:text-gray-700">
            Gizlilik Politikası
          </Link>
          <Link href="/kvkk" onClick={onClose} className="block text-xs text-gray-500 hover:text-gray-700">
            KVKK Aydınlatma Metni
          </Link>
          <Link href="/iade-politikasi" onClick={onClose} className="block text-xs text-gray-500 hover:text-gray-700">
            İade Politikası
          </Link>
        </div>
      </div>
    </>
  );
}
