import Link from "next/link";
import Image from "next/image";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Abonelik İptal Edildi | Vorte Tekstil",
  robots: { index: false },
};

export default function UnsubscribePage() {
  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Image src="/logo.png" alt="Vorte" width={120} height={40} />
          </Link>
        </div>
        <div className="rounded-lg border p-8">
          <CheckCircle className="mx-auto h-12 w-12 text-[#7AC143]" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Abonelik İptal Edildi
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            E-bülten aboneliğiniz başarıyla iptal edildi. Artık bizden e-posta
            almayacaksınız.
          </p>
          <Link href="/">
            <Button className="mt-6" variant="outline">
              Ana Sayfaya Dön
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
