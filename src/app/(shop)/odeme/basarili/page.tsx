import Link from "next/link";
import { CheckCircle, Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function PaymentSuccessPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <CheckCircle className="h-10 w-10 text-[#7AC143]" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900">
        Siparişiniz Alındı!
      </h1>
      <p className="mt-3 text-gray-600">
        Siparişiniz başarıyla oluşturuldu. Ödemeniz onaylandıktan sonra
        siparişiniz hazırlanmaya başlanacaktır.
      </p>

      <div className="mt-8 rounded-lg border bg-gray-50 p-6">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          <Package className="h-4 w-4" />
          <span>Tahmini teslimat: 1-3 iş günü</span>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/hesabim/siparislerim">
          <Button>
            Siparişlerimi Görüntüle
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline">Ana Sayfaya Dön</Button>
        </Link>
      </div>
    </div>
  );
}
