"use client";

import { useState, useEffect, useCallback } from "react";

export interface RecentlyViewedItem {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
}

const STORAGE_KEY = "recently-viewed";
const MAX_ITEMS = 12;

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {
      // localStorage erişim hatası
    }
  }, []);

  const addItem = useCallback((item: RecentlyViewedItem) => {
    setItems((prev) => {
      const filtered = prev.filter((p) => p.id !== item.id);
      const updated = [item, ...filtered].slice(0, MAX_ITEMS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // quota hatası
      }
      return updated;
    });
  }, []);

  return { items, addItem };
}
