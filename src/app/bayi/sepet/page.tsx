"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Trash2, Minus, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";

interface CartItemData {
  id: string;
  quantity: number;
  product: {
    name: string;
    basePrice: number;
    dealerPrices: { dealerId: string | null; wholesalePrice: number }[];
  };
  variant: {
    color: string;
    size: string;
    sku: string;
    stock: number;
  };
}

export default function DealerCartPage() {
  const [items, setItems] = useState<CartItemData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCart = () => {
    fetch("/api/dealer/cart")
      .then((r) => r.json())
      .then((data) => { setItems(data); setLoading(false); });
  };

  useEffect(() => { fetchCart(); }, []);

  const updateQty = async (id: string, quantity: number) => {
    if (quantity <= 0) return removeItem(id);
    await fetch(`/api/dealer/cart/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    fetchCart();
  };

  const removeItem = async (id: string) => {
    await fetch(`/api/dealer/cart/${id}`, { method: "DELETE" });
    fetchCart();
  };

  const getPrice = (item: CartItemData) => {
    const dealerPrice = item.product.dealerPrices.find((p) => p.dealerId !== null);
    const generalPrice = item.product.dealerPrices.find((p) => p.dealerId === null);
    return dealerPrice?.wholesalePrice || generalPrice?.wholesalePrice || item.product.basePrice;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7AC143]" />
      </div>
    );
  }

  const total = items.reduce((sum, item) => sum + getPrice(item) * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShoppingCart className="h-16 w-16 text-gray-300" />
        <h2 className="mt-4 text-lg font-bold text-gray-900">Sepetiniz Boş</h2>
        <p className="mt-2 text-sm text-gray-500">Ürün kataloğundan ürün ekleyin</p>
        <Link href="/bayi/urunler" className="mt-4">
          <Button>Ürünlere Git</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Sepetim</h1>
      <p className="mt-1 text-sm text-gray-500">{totalItems} ürün</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-700">Ürün</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Fiyat</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Adet</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Toplam</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => {
                  const price = getPrice(item);
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{item.product.name}</p>
                        <p className="text-xs text-gray-500">
                          {item.variant.color} / {item.variant.size} — {item.variant.sku}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-medium text-[#7AC143]">
                        {price.toFixed(2)} ₺
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQty(item.id, item.quantity - 1)}
                            className="rounded border p-1 hover:bg-gray-100"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQty(item.id, item.quantity + 1)}
                            className="rounded border p-1 hover:bg-gray-100"
                            disabled={item.quantity >= item.variant.stock}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {(price * item.quantity).toFixed(2)} ₺
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => removeItem(item.id)} className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-bold text-gray-900">Sipariş Özeti</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Toplam Ürün</span>
              <span>{totalItems} adet</span>
            </div>
            <div className="flex justify-between border-t pt-3 text-lg font-bold">
              <span>Toplam</span>
              <span className="text-[#7AC143]">{total.toFixed(2)} ₺</span>
            </div>
          </div>
          <Button className="mt-4 w-full" size="lg">
            Sipariş Ver
          </Button>
          <p className="mt-2 text-center text-xs text-gray-400">
            KDV dahil fiyatlar
          </p>
        </div>
      </div>
    </div>
  );
}
