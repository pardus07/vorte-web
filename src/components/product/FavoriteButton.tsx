"use client";

import { useState, useEffect, useCallback } from "react";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";

interface FavoriteButtonProps {
  productId: string;
  className?: string;
  /** Show label text next to the heart icon */
  showLabel?: boolean;
}

export function FavoriteButton({
  productId,
  className = "",
  showLabel = false,
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const checkFavorite = useCallback(async () => {
    try {
      const res = await fetch("/api/favorites");
      if (res.status === 401) {
        // Not logged in — fallback to localStorage
        const stored = localStorage.getItem("favorites");
        const favs: string[] = stored ? JSON.parse(stored) : [];
        setIsFavorited(favs.includes(productId));
        return;
      }
      if (res.ok) {
        const ids: string[] = await res.json();
        setIsFavorited(ids.includes(productId));
      }
    } catch {
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem("favorites");
        const favs: string[] = stored ? JSON.parse(stored) : [];
        setIsFavorited(favs.includes(productId));
      } catch {
        /* ignore */
      }
    }
  }, [productId]);

  useEffect(() => {
    checkFavorite();
  }, [checkFavorite]);

  // Listen for cross-component favorite updates
  useEffect(() => {
    const handler = () => checkFavorite();
    window.addEventListener("favorites-updated", handler);
    return () => window.removeEventListener("favorites-updated", handler);
  }, [checkFavorite]);

  const toggleFavorite = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (res.status === 401) {
        // Not logged in — use localStorage fallback
        try {
          const stored = localStorage.getItem("favorites");
          let favs: string[] = stored ? JSON.parse(stored) : [];
          if (favs.includes(productId)) {
            favs = favs.filter((id) => id !== productId);
            setIsFavorited(false);
          } else {
            favs.push(productId);
            setIsFavorited(true);
          }
          localStorage.setItem("favorites", JSON.stringify(favs));
          window.dispatchEvent(new CustomEvent("favorites-updated"));
        } catch {
          router.push("/giris");
        }
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setIsFavorited(data.favorited);
        window.dispatchEvent(new CustomEvent("favorites-updated"));
      }
    } catch {
      // Network error — try localStorage fallback
      try {
        const stored = localStorage.getItem("favorites");
        let favs: string[] = stored ? JSON.parse(stored) : [];
        if (favs.includes(productId)) {
          favs = favs.filter((id) => id !== productId);
          setIsFavorited(false);
        } else {
          favs.push(productId);
          setIsFavorited(true);
        }
        localStorage.setItem("favorites", JSON.stringify(favs));
        window.dispatchEvent(new CustomEvent("favorites-updated"));
      } catch {
        /* silently fail */
      }
    } finally {
      setLoading(false);
    }
  };

  if (showLabel) {
    return (
      <button
        onClick={toggleFavorite}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
          isFavorited
            ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
            : "border-gray-300 text-gray-700 hover:bg-gray-50"
        } ${loading ? "opacity-50" : ""} ${className}`}
        title={isFavorited ? "Favorilerden çıkar" : "Favorilere ekle"}
      >
        <Heart
          className={`h-4 w-4 ${isFavorited ? "fill-red-500 text-red-500" : ""}`}
        />
        {isFavorited ? "Favorilerde" : "Favorilere Ekle"}
      </button>
    );
  }

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={`inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 transition-colors hover:bg-gray-50 ${
        isFavorited ? "border-red-200 bg-red-50" : ""
      } ${loading ? "opacity-50" : ""} ${className}`}
      title={isFavorited ? "Favorilerden çıkar" : "Favorilere ekle"}
    >
      <Heart
        className={`h-5 w-5 ${
          isFavorited ? "fill-red-500 text-red-500" : "text-gray-600"
        }`}
      />
    </button>
  );
}
