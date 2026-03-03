export interface ProductWithVariants {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  images: string[];
  featured: boolean;
  category: { name: string };
  variants: {
    id: string;
    color: string;
    colorHex: string;
    size: string;
    stock: number;
    price: number | null;
  }[];
}
