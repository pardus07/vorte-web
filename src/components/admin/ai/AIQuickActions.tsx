"use client";

import {
  FileText,
  Package,
  Mail,
  BarChart3,
  Settings,
  ShoppingCart,
  Factory,
  Tag,
  Search,
  Users,
  Sparkles,
} from "lucide-react";

interface AIQuickActionsProps {
  shortcuts: string[];
  onAction: (text: string) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  blog: <FileText className="h-3.5 w-3.5" />,
  yazı: <FileText className="h-3.5 w-3.5" />,
  taslak: <FileText className="h-3.5 w-3.5" />,
  ürün: <Package className="h-3.5 w-3.5" />,
  stok: <Package className="h-3.5 w-3.5" />,
  fiyat: <Package className="h-3.5 w-3.5" />,
  mail: <Mail className="h-3.5 w-3.5" />,
  smtp: <Mail className="h-3.5 w-3.5" />,
  şablon: <Mail className="h-3.5 w-3.5" />,
  rapor: <BarChart3 className="h-3.5 w-3.5" />,
  kâr: <BarChart3 className="h-3.5 w-3.5" />,
  satış: <BarChart3 className="h-3.5 w-3.5" />,
  ayar: <Settings className="h-3.5 w-3.5" />,
  logo: <Settings className="h-3.5 w-3.5" />,
  kargo: <ShoppingCart className="h-3.5 w-3.5" />,
  sipariş: <ShoppingCart className="h-3.5 w-3.5" />,
  üretim: <Factory className="h-3.5 w-3.5" />,
  kampanya: <Tag className="h-3.5 w-3.5" />,
  kupon: <Tag className="h-3.5 w-3.5" />,
  indirim: <Tag className="h-3.5 w-3.5" />,
  seo: <Search className="h-3.5 w-3.5" />,
  meta: <Search className="h-3.5 w-3.5" />,
  bayi: <Users className="h-3.5 w-3.5" />,
  müşteri: <Users className="h-3.5 w-3.5" />,
  kullanıcı: <Users className="h-3.5 w-3.5" />,
};

function getIcon(text: string): React.ReactNode {
  const lower = text.toLowerCase();
  for (const [key, icon] of Object.entries(ICON_MAP)) {
    if (lower.includes(key)) return icon;
  }
  return <Sparkles className="h-3.5 w-3.5" />;
}

export function AIQuickActions({ shortcuts, onAction }: AIQuickActionsProps) {
  return (
    <div className="space-y-3 p-4">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">Vorte Asistan</h3>
        <p className="mt-1 text-xs text-gray-500">
          Admin panelinde istediğiniz her işlemi yapabilirim.
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider px-1">
          Hızlı Eylemler
        </p>
        {shortcuts.map((text) => (
          <button
            key={text}
            onClick={() => onAction(text)}
            className="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:border-green-300 hover:bg-green-50 hover:text-green-700"
          >
            <span className="text-gray-400">{getIcon(text)}</span>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
