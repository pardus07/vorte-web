"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface CartContextValue {
  cartCount: number;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue>({
  cartCount: 0,
  refreshCart: async () => {},
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartCount, setCartCount] = useState(0);

  const refreshCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data = await res.json();
        setCartCount(data.itemCount ?? 0);
      }
    } catch {
      // silently handle - cart count stays at current value
    }
  }, []);

  useEffect(() => {
    refreshCart();

    // Listen for custom cart-updated events from other components
    const handleCartUpdate = () => {
      refreshCart();
    };

    window.addEventListener("cart-updated", handleCartUpdate);
    return () => {
      window.removeEventListener("cart-updated", handleCartUpdate);
    };
  }, [refreshCart]);

  return (
    <CartContext.Provider value={{ cartCount, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
