"use client";

import { useEffect, useRef } from "react";
import { useRecentlyViewed, type RecentlyViewedItem } from "@/hooks/useRecentlyViewed";

export function RecentlyViewedTracker({ product }: { product: RecentlyViewedItem }) {
  const { addItem } = useRecentlyViewed();
  const addedRef = useRef(false);

  useEffect(() => {
    if (addedRef.current) return;
    addedRef.current = true;
    addItem(product);
  }, [product.id, addItem]);

  return null;
}
