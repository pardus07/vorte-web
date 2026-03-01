export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Ayarlar</h1>
      <p className="mt-1 text-sm text-gray-500">Mağaza genel ayarları</p>

      <div className="mt-6 space-y-6">
        {/* Store Info */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Mağaza Bilgileri</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Mağaza Adı</label>
              <input defaultValue="Vorte Tekstil" className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none" readOnly />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Domain</label>
              <input defaultValue="vorte.com.tr" className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none" readOnly />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">E-posta</label>
              <input defaultValue="info@vorte.com.tr" className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none" readOnly />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Telefon</label>
              <input defaultValue="+90 224 XXX XX XX" className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none" readOnly />
            </div>
          </div>
        </div>

        {/* Shipping */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Kargo Ayarları</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Ücretsiz Kargo Limiti (₺)</label>
              <input type="number" defaultValue={200} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none" readOnly />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Standart Kargo Ücreti (₺)</label>
              <input type="number" defaultValue={39.90} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none" readOnly />
            </div>
          </div>
        </div>

        {/* Integrations */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Entegrasyonlar</h2>
          <div className="space-y-4">
            {[
              { name: "iyzico", desc: "Ödeme altyapısı", status: "Bağlı" },
              { name: "Geliver", desc: "Kargo entegrasyonu", status: "Yapılandırılacak" },
              { name: "DIA CRM", desc: "E-Fatura / E-Arşiv", status: "Yapılandırılacak" },
              { name: "Resend", desc: "E-posta gönderimi", status: "Yapılandırılacak" },
            ].map((integration) => (
              <div key={integration.name} className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900">{integration.name}</p>
                  <p className="text-xs text-gray-500">{integration.desc}</p>
                </div>
                <span className={`text-xs font-medium ${
                  integration.status === "Bağlı" ? "text-green-600" : "text-orange-500"
                }`}>
                  {integration.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
