"use client";

import { Suspense } from "react";
import { FilterSidebar } from "@/components/product/FilterSidebar";

export function DesktopFilter({ availableColors }: { availableColors: string[] }) {
  return (
    <Suspense>
      <FilterSidebar isOpen={false} onClose={() => {}} availableColors={availableColors} />
    </Suspense>
  );
}
