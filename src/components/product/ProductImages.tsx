"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { ImageLightbox } from "./ImageLightbox";

interface ProductImagesProps {
  images: string[];
  productName: string;
}

export function ProductImages({ images, productName }: ProductImagesProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const handleError = (index: number) => {
    setImageErrors((prev) => new Set(prev).add(index));
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  if (images.length === 0) {
    return (
      <div className="aspect-[3/4] rounded-lg bg-gray-100 flex items-center justify-center">
        <span className="text-6xl font-bold text-gray-300">V</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-4">
        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="hidden flex-col gap-2 md:flex">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedIndex(i)}
                className={`relative h-20 w-20 overflow-hidden rounded border-2 transition-colors ${
                  selectedIndex === i
                    ? "border-[#7AC143]"
                    : "border-transparent hover:border-gray-300"
                }`}
              >
                {!imageErrors.has(i) ? (
                  <img
                    src={img}
                    alt={`${productName} - ${i + 1}`}
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={() => handleError(i)}
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gray-200 text-gray-400 text-xs">
                    V
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Main image */}
        <div className="relative flex-1">
          <div
            className="group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-lg bg-gray-100"
            onClick={() => !imageErrors.has(selectedIndex) && openLightbox(selectedIndex)}
          >
            {!imageErrors.has(selectedIndex) ? (
              <>
                <img
                  src={images[selectedIndex]}
                  alt={`${productName} - ${selectedIndex + 1}`}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={() => handleError(selectedIndex)}
                />
                {/* Zoom icon overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/10">
                  <div className="rounded-full bg-white/80 p-3 opacity-0 shadow-lg transition-opacity duration-300 group-hover:opacity-100">
                    <ZoomIn className="h-6 w-6 text-gray-700" />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center bg-gray-200">
                <span className="text-6xl font-bold text-gray-300">V</span>
              </div>
            )}
          </div>

          {/* Mobile arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={() =>
                  setSelectedIndex(
                    selectedIndex > 0 ? selectedIndex - 1 : images.length - 1
                  )
                }
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-md backdrop-blur-sm md:hidden"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() =>
                  setSelectedIndex(
                    selectedIndex < images.length - 1 ? selectedIndex + 1 : 0
                  )
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-md backdrop-blur-sm md:hidden"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Mobile dots */}
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 md:hidden">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedIndex(i)}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      selectedIndex === i ? "bg-[#7AC143]" : "bg-white/70"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lightbox */}
      <ImageLightbox
        images={images}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        alt={productName}
      />
    </>
  );
}
