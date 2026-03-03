"use client";

import { useState, useMemo } from "react";
import { ProductImages } from "@/components/product/ProductImages";
import { ProductInfo } from "./ProductInfo";
import { ProductAccordion } from "@/components/product/ProductAccordion";

interface Variant {
  id: string;
  color: string;
  colorHex: string;
  size: string;
  stock: number;
  price: number | null;
  sku: string;
  gtinBarcode: string | null;
}

interface ProductDetailClientProps {
  product: {
    id: string;
    name: string;
    basePrice: number;
    description: string | null;
    images: string[];
    category: { name: string };
    variants: Variant[];
  };
}

// Map color names to their lowercase equivalents used in filenames
function colorToFileKey(color: string): string {
  return color.toLocaleLowerCase("tr");
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const [selectedColor, setSelectedColor] = useState(
    product.variants[0]?.color || ""
  );

  // Filter images based on selected color
  const filteredImages = useMemo(() => {
    if (!selectedColor) return product.images;

    const colorKey = colorToFileKey(selectedColor);
    const matching = product.images.filter((img) =>
      img.toLocaleLowerCase("tr").includes(colorKey)
    );

    // If no images match the color, show all images (fallback)
    return matching.length > 0 ? matching : product.images;
  }, [product.images, selectedColor]);

  return (
    <div className="mt-6 grid gap-8 md:grid-cols-2 lg:gap-12">
      {/* Images — filtered by selected color */}
      <ProductImages images={filteredImages} productName={product.name} />

      {/* Info + Accordion */}
      <div>
        <ProductInfo
          product={product}
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
        />
        <div className="mt-8">
          <ProductAccordion description={product.description} />
        </div>
      </div>
    </div>
  );
}
