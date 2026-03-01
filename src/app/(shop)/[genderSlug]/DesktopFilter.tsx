"use client";

import { Suspense } from "react";
import { FilterSidebar } from "@/components/product/FilterSidebar";

export function DesktopFilter() {
  return (
    <Suspense>
      <FilterSidebar isOpen={false} onClose={() => {}} />
    </Suspense>
  );
}
