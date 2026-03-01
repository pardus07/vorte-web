import { getDealerSession } from "@/lib/dealer-session";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils";
import { FileText } from "lucide-react";

export default async function DealerInvoicesPage() {
  const dealer = await getDealerSession();
  if (!dealer) return null;

  const invoices = await db.invoice.findMany({
    where: { order: { dealerId: dealer.id } },
    include: {
      order: { select: { orderNumber: true, totalAmount: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Faturalarım</h1>
      <p className="mt-1 text-sm text-gray-500">{invoices.length} fatura</p>

      {invoices.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <FileText className="h-16 w-16 text-gray-300" />
          <h2 className="mt-4 text-lg font-bold text-gray-900">Henüz Fatura Yok</h2>
          <p className="mt-2 text-sm text-gray-500">Sipariş verdiğinizde faturalarınız burada görünecektir</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Fatura No</th>
                <th className="px-4 py-3 font-medium text-gray-700">Sipariş</th>
                <th className="px-4 py-3 font-medium text-gray-700">Tutar</th>
                <th className="px-4 py-3 font-medium text-gray-700">Durum</th>
                <th className="px-4 py-3 font-medium text-gray-700">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">{inv.invoiceNo || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">#{inv.order.orderNumber}</td>
                  <td className="px-4 py-3 font-medium">{formatPrice(inv.order.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={inv.status === "SENT" ? "success" : inv.status === "CREATED" ? "new" : "warning"}>
                      {inv.status === "SENT" ? "Gönderildi" : inv.status === "CREATED" ? "Hazır" : "Bekliyor"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(inv.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
