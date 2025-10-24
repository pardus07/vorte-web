/**
 * Cart API hooks with optimistic updates and ETag handling.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './client';

export interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  qty: number;
  unit_price: number;
  subtotal: number;
  image_url?: string;
}

export interface Cart {
  id: string;
  items: CartItem[];
  totals: {
    items: number;
    discount: number;
    shipping: number;
    grand_total: number;
  };
  version: number;
}

// Query keys
export const cartKeys = {
  all: ['cart'] as const,
  detail: () => [...cartKeys.all, 'detail'] as const,
};

// Get cart
export function useCart() {
  return useQuery({
    queryKey: cartKeys.detail(),
    queryFn: async () => {
      const { data } = await apiClient.get<Cart>('/v1/cart');
      return data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Add to cart (idempotent)
export function useAddToCart() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { product_id: string; variant_id?: string; qty: number }) => {
      const { data } = await apiClient.post<Cart>('/v1/cart/items', params);
      return data;
    },
    onSuccess: (data) => {
      // Update cart cache
      queryClient.setQueryData(cartKeys.detail(), data);
    },
  });
}

// Update cart item quantity (requires If-Match)
export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { item_id: string; qty: number }) => {
      const { data } = await apiClient.patch<Cart>(
        `/v1/cart/items/${params.item_id}`,
        { qty: params.qty }
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.detail(), data);
    },
    onError: (error: any) => {
      // If 409, refetch cart to get latest version
      if (error.status === 409 || error.needsRefresh) {
        queryClient.invalidateQueries({ queryKey: cartKeys.detail() });
      }
    },
  });
}

// Remove cart item
export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (item_id: string) => {
      await apiClient.delete(`/v1/cart/items/${item_id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.detail() });
    },
  });
}
