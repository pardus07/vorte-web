"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, ArrowRight, Store } from "lucide-react";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

const menuItems = [
  { label: "ANASAYFA", href: "/" },
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
      <div
        className={`fixed inset-0 z-50 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 z-50 h-full w-[300px] bg-white transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <span
            className="text-lg tracking-[0.3em] text-[#1A1A1A]"
            style={{ fontFamily: "var(--font-baron), sans-serif" }}
          >
            VORTE
          </span>
          <button
            onClick={onClose}
            className="p-1 hover:opacity-50 transition-opacity"
            aria-label="Menüyü kapat"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-6 border-t border-gray-100" />

        {/* Menu Items */}
        <nav className="flex flex-col py-4">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="group flex items-center justify-between px-6 py-4 transition-colors hover:bg-gray-50"
            >
              <span
                className="text-[11px] font-medium tracking-[0.15em] text-[#1A1A1A]"
              >
                {item.label}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-gray-300 transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </nav>

        {/* Dealer Login */}
        <div className="mx-6 border-t border-gray-100" />
        <div className="px-6 py-5">
          <Link
            href="/bayi-girisi"
            onClick={onClose}
            className="flex items-center gap-2 text-[11px] font-medium tracking-[0.15em] text-gray-400 transition-colors hover:text-[#1A1A1A]"
          >
            <Store className="h-4 w-4" />
            BAYİ GİRİŞİ
          </Link>
        </div>

        {/* Bottom Links */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-100 px-6 py-5 space-y-2">
          {[
            { label: "Gizlilik Politikası", href: "/gizlilik-politikasi" },
            { label: "KVKK", href: "/kvkk" },
            { label: "İade Politikası", href: "/iade-politikasi" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="block text-[10px] tracking-[0.1em] text-gray-300 transition-colors hover:text-gray-500"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
