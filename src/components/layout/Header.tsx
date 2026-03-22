"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Heart, User, ShoppingBag, X } from "lucide-react";
import { MobileMenu } from "./MobileMenu";
import { SearchBar } from "./SearchBar";
import { useCart } from "@/contexts/CartContext";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { cartCount } = useCart();

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 50);
  }, []);

  useEffect(() => {
    // Check initial scroll position
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ease-in-out ${
          scrolled
            ? "bg-white border-b border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-[1440px] items-center px-4 lg:px-8">
          {/* Left: Hamburger + Nav Links (desktop) */}
          <div className="flex items-center gap-6 flex-1">
            {/* Hamburger - visible on all screens (Zara style) */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="group p-1 hover:opacity-70 transition-opacity"
              aria-label="Men\u00fcy\u00fc a\u00e7"
            >
              <div className="flex flex-col gap-[5px]">
                <span
                  className={`block h-[1.5px] w-5 transition-all duration-300 ${
                    scrolled ? "bg-[#1A1A1A]" : "bg-white"
                  }`}
                />
                <span
                  className={`block h-[1.5px] w-5 transition-all duration-300 ${
                    scrolled ? "bg-[#1A1A1A]" : "bg-white"
                  }`}
                />
                <span
                  className={`block h-[1.5px] w-5 transition-all duration-300 ${
                    scrolled ? "bg-[#1A1A1A]" : "bg-white"
                  }`}
                />
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-6">
              <Link
                href="/erkek-ic-giyim"
                className={`text-xs font-medium uppercase tracking-[0.1em] transition-colors duration-300 hover:opacity-70 ${
                  scrolled ? "text-[#1A1A1A]" : "text-white"
                }`}
              >
                ERKEK
              </Link>
              <Link
                href="/kadin-ic-giyim"
                className={`text-xs font-medium uppercase tracking-[0.1em] transition-colors duration-300 hover:opacity-70 ${
                  scrolled ? "text-[#1A1A1A]" : "text-white"
                }`}
              >
                KADIN
              </Link>
              <Link
                href="/toptan"
                className={`text-xs font-medium uppercase tracking-[0.1em] transition-colors duration-300 hover:opacity-70 ${
                  scrolled ? "text-[#1A1A1A]" : "text-white"
                }`}
              >
                TOPTAN SATI\u015e
              </Link>
              <Link
                href="/blog"
                className={`text-xs font-medium uppercase tracking-[0.1em] transition-colors duration-300 hover:opacity-70 ${
                  scrolled ? "text-[#1A1A1A]" : "text-white"
                }`}
              >
                BLOG
              </Link>
            </nav>
          </div>

          {/* Center: Logo */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2 flex-shrink-0">
            <Image
              src="/logo-dark.jpg"
              alt="Vorte Tekstil"
              width={110}
              height={36}
              className={`h-9 w-auto object-contain transition-all duration-300 ${
                scrolled ? "" : "brightness-0 invert"
              }`}
              priority
            />
          </Link>

          {/* Right: Icons */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            {/* Search toggle */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className={`p-1.5 transition-all duration-300 hover:opacity-70 ${
                scrolled ? "text-[#1A1A1A]" : "text-white"
              }`}
              aria-label="Ara"
            >
              {searchOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Search className="h-5 w-5" />
              )}
            </button>

            {/* Bayi Girisi - minimal version */}
            <Link
              href="/bayi-girisi"
              className={`hidden sm:inline-flex items-center px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] transition-all duration-300 border ${
                scrolled
                  ? "border-[#1A1A1A]/20 text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white"
                  : "border-white/40 text-white hover:bg-white hover:text-[#1A1A1A]"
              }`}
            >
              BAY\u0130
            </Link>

            <Link
              href="/hesabim/favorilerim"
              className={`p-1.5 transition-all duration-300 hover:opacity-70 ${
                scrolled ? "text-[#1A1A1A]" : "text-white"
              }`}
            >
              <Heart className="h-5 w-5" />
            </Link>

            <Link
              href="/hesabim"
              className={`p-1.5 transition-all duration-300 hover:opacity-70 ${
                scrolled ? "text-[#1A1A1A]" : "text-white"
              }`}
            >
              <User className="h-5 w-5" />
            </Link>

            <Link
              href="/sepet"
              className={`relative p-1.5 transition-all duration-300 hover:opacity-70 ${
                scrolled ? "text-[#1A1A1A]" : "text-white"
              }`}
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#7AC143] text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Search bar dropdown */}
        {searchOpen && (
          <div
            className={`transition-all duration-300 px-4 py-3 ${
              scrolled
                ? "bg-white border-t border-gray-200"
                : "bg-black/30 backdrop-blur-md border-t border-white/10"
            }`}
          >
            <div className="mx-auto max-w-xl">
              <SearchBar />
            </div>
          </div>
        )}
      </header>

      {/* Spacer - prevents content from hiding behind fixed header
           This is intentionally NOT added here because the header should
           overlay the hero section. Pages that need spacing should add
           their own pt-16 or similar. */}

      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </>
  );
}
