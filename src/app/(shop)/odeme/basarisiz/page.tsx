import Link from "next/link";
import { XCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function PaymentFailedPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
        <XCircle className="h-10 w-10 text-red-500" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900">
        Ödeme Başarısız
      </h1>
      <p className="mt-3 text-gray-600">
        Ödemeniz işlenirken bir sorun oluştu. Lütfen tekrar deneyin veya farklı
        bir ödeme yöntemi kullanın.
      </p>

      <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">
          Kartınızdan herhangi bir tutar çekilmemiştir. Sorun devam ederse
          bankanız ile iletişime geçin.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/odeme">
          <Button>
            <RefreshCw className="mr-2 h-4 w-4" />
            Tekrar Dene
          </Button>
        </Link>
        <Link href="/sepet">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Sepete Dön
          </Button>
        </Link>
      </div>
    </div>
  );
}
