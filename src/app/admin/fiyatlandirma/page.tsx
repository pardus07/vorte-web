"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Save } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface Product {
  id: string;
  name: string;
  basePrice: number;
}

interface Dealer {
  id: string;
  companyName: string;
  dealerCode: string;
}

interface DealerPrice {
  id: string;
  productId: string;
  dealerId: string | null;
  wholesalePrice: number;
  minQuantity: number;
}

export default function AdminPricingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [prices, setPrices] = useState<DealerPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/pricing")
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products);
        setDealers(data.dealers);
        setPrices(data.prices);
        setLoading(false);
      });
  }, []);

  const getPrice = (productId: string, dealerId: string | null) => {
    return prices.find((p) => p.productId === productId && p.dealerId === dealerId);
  };

  const updatePrice = (productId: string, dealerId: string | null, value: string) => {
    const existing = prices.find((p) => p.productId === productId && p.dealerId === dealerId);
    if (existing) {
      setPrices(prices.map((p) =>
        p.productId === productId && p.dealerId === dealerId
          ? { ...p, wholesalePrice: parseFloat(value) || 0 }
          : p
      ));
    } else {
      setPrices([...prices, {
        id: `new-${productId}-${dealerId}`,
        productId,
        dealerId,
        wholesalePrice: parseFloat(value) || 0,
        minQuantity: 1,
      }]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prices: prices.filter((p) => p.wholesalePrice > 0) }),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fiyatlandırma</h1>
          <p className="mt-1 text-sm text-gray-500">Toptan fiyat matrisi</p>
        </div>
        <Button onClick={handleSave} loading={saving}>
          <Save className="mr-2 h-4 w-4" />
          Kaydet
        </Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700">Ürün</th>
              <th className="px-4 py-3 font-medium text-gray-700">Perakende</th>
              <th className="px-4 py-3 font-medium text-gray-700">
                <Badge variant="new" className="text-[10px]">Genel Toptan</Badge>
              </th>
              {dealers.map((d) => (
                <th key={d.id} className="px-4 py-3 font-medium text-gray-700">
                  <span className="text-xs">{d.companyName}</span>
                  <br />
                  <span className="font-mono text-[10px] text-gray-400">{d.dealerCode}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{product.name}</td>
                <td className="px-4 py-3 text-gray-500">
                  {product.basePrice.toFixed(2)} ₺
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    step="0.01"
                    value={getPrice(product.id, null)?.wholesalePrice || ""}
                    onChange={(e) => updatePrice(product.id, null, e.target.value)}
                    className="w-24 rounded border px-2 py-1 text-sm focus:border-[#7AC143] focus:outline-none"
                    placeholder="—"
                  />
                </td>
                {dealers.map((d) => (
                  <td key={d.id} className="px-4 py-3">
                    <input
                      type="number"
                      step="0.01"
                      value={getPrice(product.id, d.id)?.wholesalePrice || ""}
                      onChange={(e) => updatePrice(product.id, d.id, e.target.value)}
                      className="w-24 rounded border px-2 py-1 text-sm focus:border-[#7AC143] focus:outline-none"
                      placeholder="Genel"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
