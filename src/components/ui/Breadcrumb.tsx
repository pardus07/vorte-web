import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { JsonLd } from "@/components/seo/JsonLd";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.vorte.com.tr";

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.label,
            ...(item.href ? { item: `${baseUrl}${item.href}` } : {}),
          })),
        }}
      />
      <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1 text-sm", className)}>
        {items.map((item, index) => (
          <div key={item.label} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
            {item.href && index < items.length - 1 ? (
              <Link href={item.href} className="text-gray-500 hover:text-[#1A1A1A] transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-[#1A1A1A] font-medium">{item.label}</span>
            )}
          </div>
        ))}
      </nav>
    </>
  );
}
