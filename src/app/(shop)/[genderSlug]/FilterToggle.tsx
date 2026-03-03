"use client";

import { useState, Suspense } from "react";
import { SlidersHorizontal } from "lucide-react";
import { FilterSidebar } from "@/components/product/FilterSidebar";

export function FilterToggle({ availableColors }: { availableColors: string[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:border-gray-400 lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filtrele
      </button>

      {/* Mobile filter sidebar */}
      <div className="lg:hidden">
        <Suspense>
          <FilterSidebar isOpen={isOpen} onClose={() => setIsOpen(false)} availableColors={availableColors} />
        </Suspense>
      </div>
    </>
  );
}
