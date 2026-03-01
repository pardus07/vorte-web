import { db } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

const INVOICE_STATUS_MAP: Record<string, { label: string; variant: "success" | "warning" | "discount" | "outline" }> = {
  PENDING: { label: "Bekliyor", variant: "warning" },
  CREATED: { label: "Oluşturuldu", variant: "success" },
  SENT: { label: "Gönderildi", variant: "success" },
  ERROR: { label: "Hata", variant: "discount" },
};

export default async function AdminInvoicesPage() {
  const invoices = await db.invoice.findMany({
    include: {
      order: {
        select: {
          orderNumber: true,
          totalAmount: true,
          user: { select: { name: true, email: true } },
          dealer: { select: { companyName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Faturalar</h1>
      <p className="mt-1 text-sm text-gray-500">{invoices.length} fatura</p>

      <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700">Fatura No</th>
              <th className="px-4 py-3 font-medium text-gray-700">Sipariş</th>
              <th className="px-4 py-3 font-medium text-gray-700">Müşteri</th>
              <th className="px-4 py-3 font-medium text-gray-700">Tip</th>
              <th className="px-4 py-3 font-medium text-gray-700">Tutar</th>
              <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
              <th className="px-4 py-3 font-medium text-gray-700">Tarih</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {invoices.map((inv) => {
              const statusInfo = INVOICE_STATUS_MAP[inv.status] || { label: inv.status, variant: "outline" as const };
              return (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">
                    {inv.invoiceNo || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/siparisler/${inv.orderId}`} className="font-medium text-[#7AC143] hover:underline">
                      #{inv.order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {inv.order.dealer?.companyName || inv.order.user?.name || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px]">
                      {inv.invoiceType === "EFATURA" ? "E-Fatura" : inv.invoiceType === "EARSIV" ? "E-Arşiv" : "—"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatPrice(inv.order.totalAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(inv.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                </tr>
              );
            })}
            {invoices.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Henüz fatura yok</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
