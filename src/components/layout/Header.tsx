"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, Search, Heart, User, ShoppingBag } from "lucide-react";
import { MobileMenu } from "./MobileMenu";
import { SearchBar } from "./SearchBar";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 lg:px-8">
          {/* Left: Hamburger + Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1 hover:opacity-70 transition-opacity lg:hidden"
              aria-label="Menüyü aç"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link href="/" className="flex-shrink-0">
              <Image
                src="/logo-dark.jpg"
                alt="Vorte Tekstil"
                width={120}
                height={40}
                className="h-10 w-auto object-contain"
                priority
              />
            </Link>
          </div>

          {/* Center: Navigation (desktop) */}
          <nav className="hidden lg:flex items-center gap-8">
            <Link
              href="/erkek-ic-giyim"
              className="text-sm font-semibold tracking-wide text-[#1A1A1A] hover:text-[#7AC143] transition-colors"
            >
              ERKEK
            </Link>
            <Link
              href="/kadin-ic-giyim"
              className="text-sm font-semibold tracking-wide text-[#1A1A1A] hover:text-[#7AC143] transition-colors"
            >
              KADIN
            </Link>
            <Link
              href="/toptan"
              className="text-sm font-semibold tracking-wide text-[#1A1A1A] hover:text-[#7AC143] transition-colors"
            >
              TOPTAN SATIŞ
            </Link>
          </nav>

          {/* Center: Search bar (desktop) */}
          <div className="hidden lg:block flex-1 max-w-md mx-8">
            <SearchBar />
          </div>

          {/* Right: Icons */}
          <div className="flex items-center gap-3">
            {/* Mobile search toggle */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-1.5 hover:opacity-70 transition-opacity lg:hidden"
              aria-label="Ara"
            >
              <Search className="h-5 w-5" />
            </button>

            <Link
              href="/bayi-girisi"
              className="hidden sm:inline-flex items-center gap-1.5 rounded border border-[#7AC143] px-3 py-1.5 text-xs font-semibold text-[#7AC143] hover:bg-[#7AC143] hover:text-white transition-colors"
            >
              BAYİ GİRİŞİ
            </Link>

            <Link href="/hesabim/favorilerim" className="p-1.5 hover:opacity-70 transition-opacity">
              <Heart className="h-5 w-5" />
            </Link>

            <Link href="/hesabim" className="p-1.5 hover:opacity-70 transition-opacity">
              <User className="h-5 w-5" />
            </Link>

            <Link href="/sepet" className="relative p-1.5 hover:opacity-70 transition-opacity">
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#7AC143] text-[10px] font-bold text-white">
                0
              </span>
            </Link>
          </div>
        </div>

        {/* Mobile search bar (shown on toggle) */}
        {searchOpen && (
          <div className="border-t border-gray-200 px-4 py-3 lg:hidden">
            <SearchBar />
          </div>
        )}
      </header>

      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
}
