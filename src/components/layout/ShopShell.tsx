"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { CookieConsent } from "@/components/ui/CookieConsent";
import ChatWidget from "@/components/chat/ChatWidget";

export function ShopShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    // Admin panelinde mağaza header/footer gösterme
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <ScrollToTop />
      <CookieConsent />
      <ChatWidget />
    </div>
  );
}
