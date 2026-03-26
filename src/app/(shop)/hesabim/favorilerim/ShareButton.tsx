"use client";

import { useState } from "react";
import { Share2, Check, Copy } from "lucide-react";

export function ShareFavoritesButton({ slugs }: { slugs: string[] }) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/favoriler?urunler=${slugs.join(",")}`
      : "";

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Vorte — Favori Ürünlerim",
          text: `${slugs.length} favori ürünüme göz at!`,
          url: shareUrl,
        });
        return;
      } catch {
        // Paylaşım iptal edildi veya desteklenmiyor
      }
    }

    // Fallback: URL kopyala
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard erişimi yok
    }
  };

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-[#7AC143] hover:text-[#7AC143]"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-[#7AC143]" />
          Kopyalandı!
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" />
          Paylaş
        </>
      )}
    </button>
  );
}
