"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Heart, User, ShoppingBag, X } from "lucide-react";
import { MobileMenu } from "./MobileMenu";
import { SearchBar } from "./SearchBar";
import { useCart } from "@/contexts/CartContext";


export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { cartCount, cartBounce } = useCart();

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 50);
  }, []);

  useEffect(() => {
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const textColor = scrolled ? "text-[#1A1A1A]" : "text-white";
  const hoverColor = "hover:opacity-60";

  return (
    <>
      <header
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ease-out ${
          scrolled
            ? "bg-white/95 backdrop-blur-md border-b border-gray-100"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        {/* ─── Main Navigation ─── */}
        <div className="mx-auto flex h-14 max-w-[1440px] items-center px-4 lg:h-[60px] lg:px-8">
          {/* Left: Hamburger + Desktop Nav */}
          <div className="flex items-center gap-7 flex-1 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`p-1 ${hoverColor} transition-opacity`}
              aria-label="Menüyü aç"
            >
              <div className="flex flex-col gap-[5px]">
                <span className={`block h-[1.5px] w-5 transition-colors duration-500 ${scrolled ? "bg-[#1A1A1A]" : "bg-white"}`} />
                <span className={`block h-[1.5px] w-5 transition-colors duration-500 ${scrolled ? "bg-[#1A1A1A]" : "bg-white"}`} />
                <span className={`block h-[1.5px] w-5 transition-colors duration-500 ${scrolled ? "bg-[#1A1A1A]" : "bg-white"}`} />
              </div>
            </button>

            <nav className="hidden lg:flex items-center gap-7">
              {[
                { href: "/erkek-ic-giyim", label: "ERKEK" },
                { href: "/kadin-ic-giyim", label: "KADIN" },
                { href: "/toptan", label: "TOPTAN" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-[11px] font-medium uppercase tracking-[0.15em] transition-all duration-500 ${hoverColor} ${textColor}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Center: Logo */}
          <Link
            href="/"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <span
              className={`text-[22px] lg:text-[26px] tracking-[0.35em] transition-colors duration-500 ${textColor}`}
              style={{ fontFamily: "var(--font-baron), sans-serif", lineHeight: 1 }}
            >
              VORTE
            </span>
          </Link>

          {/* Right: Icons */}
          <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-end">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className={`p-2 transition-all duration-500 ${hoverColor} ${textColor}`}
              aria-label={searchOpen ? "Aramayı kapat" : "Ara"}
            >
              {searchOpen ? <X className="h-[18px] w-[18px]" /> : <Search className="h-[18px] w-[18px]" />}
            </button>

            <Link
              href="/hesabim/favorilerim"
              className={`hidden sm:flex p-2 transition-all duration-500 ${hoverColor} ${textColor}`}
              aria-label="Favorilerim"
            >
              <Heart className="h-[18px] w-[18px]" />
            </Link>

            <Link
              href="/hesabim"
              className={`p-2 transition-all duration-500 ${hoverColor} ${textColor}`}
              aria-label="Hesabım"
            >
              <User className="h-[18px] w-[18px]" />
            </Link>

            <Link
              href="/sepet"
              className={`relative p-2 transition-all duration-500 ${hoverColor} ${textColor}`}
              aria-label="Sepet"
            >
              <ShoppingBag className="h-[18px] w-[18px]" />
              {cartCount > 0 && (
                <span className={`absolute top-0.5 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-[#1A1A1A] text-[9px] font-medium text-white transition-transform duration-300 ${cartBounce ? "scale-150" : "scale-100"}`}>
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Search dropdown */}
        {searchOpen && (
          <div
            className={`transition-all duration-300 px-4 py-3 ${
              scrolled
                ? "bg-white border-t border-gray-100"
                : "bg-black/20 backdrop-blur-xl border-t border-white/10"
            }`}
          >
            <div className="mx-auto max-w-xl">
              <SearchBar />
            </div>
          </div>
        )}
      </header>

      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </>
  );
}
