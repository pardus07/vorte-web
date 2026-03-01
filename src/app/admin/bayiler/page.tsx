import Link from "next/link";
import { db } from "@/lib/db";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const STATUS_MAP: Record<string, { label: string; variant: "success" | "warning" | "discount" | "outline" }> = {
  ACTIVE: { label: "Aktif", variant: "success" },
  PENDING: { label: "Bekliyor", variant: "warning" },
  SUSPENDED: { label: "Askıda", variant: "discount" },
};

export default async function AdminDealersPage() {
  const dealers = await db.dealer.findMany({
    include: {
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bayiler</h1>
          <p className="mt-1 text-sm text-gray-500">{dealers.length} bayi</p>
        </div>
        <Link href="/admin/bayiler/yeni">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Bayi
          </Button>
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700">Firma</th>
              <th className="px-4 py-3 font-medium text-gray-700">Bayi Kodu</th>
              <th className="px-4 py-3 font-medium text-gray-700">İletişim</th>
              <th className="px-4 py-3 font-medium text-gray-700">Şehir</th>
              <th className="px-4 py-3 font-medium text-gray-700">Sipariş</th>
              <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {dealers.map((dealer) => {
              const statusInfo = STATUS_MAP[dealer.status] || { label: dealer.status, variant: "outline" as const };
              return (
                <tr key={dealer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/bayiler/${dealer.id}`}
                      className="font-medium text-gray-900 hover:text-[#7AC143]"
                    >
                      {dealer.companyName}
                    </Link>
                    <p className="text-xs text-gray-500">VKN: {dealer.taxNumber}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-600">
                    {dealer.dealerCode}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-600">{dealer.contactName}</p>
                    <p className="text-xs text-gray-400">{dealer.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {dealer.city}/{dealer.district}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{dealer._count.orders}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </td>
                </tr>
              );
            })}
            {dealers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  Henüz bayi eklenmemiş
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
