import { getDealerSession } from "@/lib/dealer-session";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";
import { Building2, MapPin, Phone, Mail, FileText } from "lucide-react";

export default async function DealerProfilePage() {
  const session = await getDealerSession();
  if (!session) return null;

  const dealer = await db.dealer.findUnique({
    where: { id: session.id },
  });

  if (!dealer) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Profilim</h1>
      <p className="mt-1 text-sm text-gray-500">Firma bilgileriniz</p>

      <div className="mt-6 space-y-6">
        {/* Company Info */}
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-3">
              <Building2 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{dealer.companyName}</h2>
              <p className="text-sm text-gray-500">Bayi Kodu: <span className="font-mono font-medium">{dealer.dealerCode}</span></p>
            </div>
            <Badge
              variant={dealer.status === "ACTIVE" ? "success" : "warning"}
              className="ml-auto"
            >
              {dealer.status === "ACTIVE" ? "Aktif" : dealer.status === "PENDING" ? "Bekliyor" : "Askıda"}
            </Badge>
          </div>
        </div>

        {/* Tax Info */}
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <FileText className="h-4 w-4" />
            Vergi Bilgileri
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-gray-500">Vergi Numarası</p>
              <p className="font-medium text-gray-900">{dealer.taxNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Vergi Dairesi</p>
              <p className="font-medium text-gray-900">{dealer.taxOffice}</p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <Phone className="h-4 w-4" />
            İletişim Bilgileri
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-gray-500">Yetkili Kişi</p>
              <p className="font-medium text-gray-900">{dealer.contactName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Telefon</p>
              <p className="font-medium text-gray-900">{dealer.phone}</p>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400" />
              <p className="font-medium text-gray-900">{dealer.email}</p>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <MapPin className="h-4 w-4" />
            Adres
          </h3>
          <p className="text-gray-700">{dealer.address}</p>
          <p className="mt-1 text-sm text-gray-500">{dealer.district} / {dealer.city}</p>
        </div>
      </div>
    </div>
  );
}
