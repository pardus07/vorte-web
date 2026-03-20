import { getDealerSession } from "@/lib/dealer-session";
import { db } from "@/lib/db";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  FileText,
  Award,
  Shield,
  Store,
} from "lucide-react";

const TIER_LABELS: Record<string, string> = {
  standard: "Standart",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

const TIER_COLORS: Record<string, string> = {
  standard: "bg-gray-100 text-gray-700",
  silver: "bg-gray-200 text-gray-800",
  gold: "bg-yellow-100 text-yellow-800",
  platinum: "bg-purple-100 text-purple-800",
};

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
      <p className="mt-1 text-sm text-gray-500">Firma ve hesap bilgileriniz</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Company Info */}
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-3">
              <Building2 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{dealer.companyName}</h2>
              <p className="text-sm text-gray-500">
                Bayi Kodu: <span className="font-mono font-medium">{dealer.dealerCode}</span>
              </p>
            </div>
            <span className={`ml-auto rounded-full px-3 py-1 text-xs font-bold ${
              dealer.status === "ACTIVE"
                ? "bg-green-100 text-green-700"
                : dealer.status === "PENDING"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
            }`}>
              {dealer.status === "ACTIVE" ? "Aktif" : dealer.status === "PENDING" ? "Onay Bekliyor" : "Askıda"}
            </span>
          </div>
        </div>

        {/* Tier Info */}
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-100 p-3">
              <Award className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Bayi Seviyesi</h2>
              <div className="mt-1 flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${TIER_COLORS[dealer.dealerTier] || "bg-gray-100 text-gray-600"}`}>
                  {TIER_LABELS[dealer.dealerTier] || dealer.dealerTier} Bayi
                </span>
                <span className="text-sm font-bold text-[#7AC143]">
                  %{dealer.discountRate || 0} İskonto
                </span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Bayi seviyeniz sipariş hacminize göre otomatik güncellenir.
            Seviye yükseldikçe iskonto oranınız artar.
          </p>
        </div>

        {/* Tax Info */}
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <FileText className="h-4 w-4 text-gray-400" />
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
            <Phone className="h-4 w-4 text-gray-400" />
            İletişim Bilgileri
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Yetkili Kişi</p>
                <p className="font-medium text-gray-900">{dealer.contactName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Telefon</p>
                <p className="font-medium text-gray-900">{dealer.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">E-posta</p>
                <p className="font-medium text-gray-900">{dealer.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Registered Address */}
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <MapPin className="h-4 w-4 text-gray-400" />
            Kayıtlı Adres
          </h3>
          <p className="text-gray-700">{dealer.address}</p>
          <p className="mt-1 text-sm text-gray-500">{dealer.district} / {dealer.city}</p>
        </div>

        {/* Shop Address */}
        {dealer.shopAddress && (
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
              <Store className="h-4 w-4 text-gray-400" />
              Mağaza Adresi
            </h3>
            <p className="text-gray-700">{dealer.shopAddress}</p>
            <p className="mt-1 text-sm text-gray-500">
              {dealer.shopDistrict} / {dealer.shopCity}
            </p>
          </div>
        )}
      </div>

      {/* Info note */}
      <div className="mt-6 rounded-lg bg-blue-50 p-4">
        <p className="text-sm text-blue-700">
          <strong>Not:</strong> Firma bilgilerinizdeki değişiklikler için lütfen{" "}
          <a href="tel:+908503058635" className="font-medium underline">0850 305 86 35</a>{" "}
          numaralı telefondan veya{" "}
          <a href="mailto:info@vorte.com.tr" className="font-medium underline">info@vorte.com.tr</a>{" "}
          adresinden bizimle iletişime geçin.
        </p>
      </div>
    </div>
  );
}
