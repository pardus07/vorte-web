"use client";

import { useEffect, useRef } from "react";

interface ConversionTrackingProps {
  orderId: string;
  totalAmount: number;
  currency?: string;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export function ConversionTracking({ orderId, totalAmount, currency = "TRY" }: ConversionTrackingProps) {
  const tracked = useRef(false);

  useEffect(() => {
    // Prevent duplicate tracking
    const storageKey = `conversion_tracked_${orderId}`;
    if (tracked.current || typeof window === "undefined") return;
    if (localStorage.getItem(storageKey)) return;

    tracked.current = true;
    localStorage.setItem(storageKey, "1");

    // Google Analytics 4 purchase event
    if (window.gtag) {
      window.gtag("event", "purchase", {
        transaction_id: orderId,
        value: totalAmount,
        currency,
      });
    }

    // Facebook Pixel purchase event
    if (window.fbq) {
      window.fbq("track", "Purchase", {
        value: totalAmount,
        currency,
        content_type: "product",
      });
    }
  }, [orderId, totalAmount, currency]);

  return null;
}
