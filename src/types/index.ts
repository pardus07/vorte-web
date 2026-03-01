import type {
  User,
  Dealer,
  Product,
  Variant,
  Category,
  Order,
  OrderItem,
  Payment,
  Invoice,
  CartItem,
  Notification,
} from "@prisma/client";

// Re-export Prisma types
export type {
  User,
  Dealer,
  Product,
  Variant,
  Category,
  Order,
  OrderItem,
  Payment,
  Invoice,
  CartItem,
  Notification,
};

// Product with relations
export type ProductWithVariants = Product & {
  variants: Variant[];
  category: Category;
};

// Order with relations
export type OrderWithItems = Order & {
  items: (OrderItem & {
    product: Product;
    variant: Variant;
  })[];
  payment: Payment | null;
  invoice: Invoice | null;
};

// Cart item with product details
export type CartItemWithProduct = CartItem & {
  product: Product;
  variant: Variant;
};

// Dealer session data
export type DealerSession = {
  id: string;
  dealerCode: string;
  companyName: string;
  email: string;
  status: string;
};

// API response types
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

// Pagination
export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// Filter types for product listing
export type ProductFilters = {
  gender?: "erkek" | "kadin";
  category?: string;
  color?: string[];
  size?: string[];
  minPrice?: number;
  maxPrice?: number;
  sort?: "price-asc" | "price-desc" | "newest" | "popular";
  page?: number;
  pageSize?: number;
  search?: string;
};
