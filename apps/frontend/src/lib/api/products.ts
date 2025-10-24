/**
 * Product API hooks with TanStack Query.
 */
import { useQuery } from '@tanstack/react-query';
import apiClient from './client';

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  description?: string;
  images?: Array<{ url: string; alt?: string }>;
  status: string;
  version: number;
}

export interface ProductListParams {
  q?: string;
  category_ids?: string[];
  brand?: string;
  price_min?: number;
  price_max?: number;
  tags?: string[];
  limit?: number;
  cursor?: string;
}

export interface ProductListResponse {
  items: Product[];
  nextCursor?: string;
  prevCursor?: string;
  count: number;
  _links?: Array<{ url: string; rel: string }>;
}

// Query keys
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: ProductListParams) => [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

// List products
export function useProducts(params: ProductListParams = {}) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<ProductListResponse>('/v1/products', {
        params,
      });
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get product by ID
export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Product>(`/v1/products/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Get product by slug
export function useProductBySlug(slug: string) {
  return useQuery({
    queryKey: [...productKeys.all, 'slug', slug],
    queryFn: async () => {
      const { data } = await apiClient.get<Product>(`/v1/products/slug/${slug}`);
      return data;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}
