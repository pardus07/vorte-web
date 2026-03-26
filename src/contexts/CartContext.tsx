"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface CartContextValue {
  cartCount: number;
  refreshCart: () => Promise<void>;
  cartBounce: boolean;
}

const CartContext = createContext<CartContextValue>({
  cartCount: 0,
  refreshCart: async () => {},
  cartBounce: false,
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartCount, setCartCount] = useState(0);
  const [cartBounce, setCartBounce] = useState(false);

  const refreshCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data = await res.json();
        const newCount = data.itemCount ?? 0;
        if (newCount > cartCount && cartCount > 0) {
          setCartBounce(true);
          setTimeout(() => setCartBounce(false), 600);
        }
        setCartCount(newCount);
      }
    } catch {
      // silently handle - cart count stays at current value
    }
  }, [cartCount]);

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
    <CartContext.Provider value={{ cartCount, refreshCart, cartBounce }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
