"use client";

import { useEffect } from "react";
import { useRecentlyViewed, type RecentlyViewedItem } from "@/hooks/useRecentlyViewed";

export function RecentlyViewedTracker({ product }: { product: RecentlyViewedItem }) {
  const { addItem } = useRecentlyViewed();

  useEffect(() => {
    addItem(product);
  }, [product, addItem]);

  return null;
}
