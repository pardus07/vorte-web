export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { MapPin } from "lucide-react";

export default async function AddressesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const addresses = await db.address.findMany({
    where: { userId: session.user.id },
    orderBy: { isDefault: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Hesabım", href: "/hesabim" }, { label: "Adreslerim" }]} />
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Adreslerim</h1>

      {addresses.length === 0 ? (
        <div className="mt-8 text-center">
          <MapPin className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-gray-500">Henüz kayıtlı adresiniz yok.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {addresses.map((addr) => (
            <div key={addr.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">{addr.title}</h3>
                {addr.isDefault && (
                  <span className="rounded bg-[#7AC143]/10 px-2 py-0.5 text-xs font-medium text-[#7AC143]">Varsayılan</span>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-600">{addr.fullName}</p>
              <p className="text-sm text-gray-600">{addr.address}</p>
              <p className="text-sm text-gray-600">{addr.district}/{addr.city}</p>
              <p className="text-sm text-gray-500">{addr.phone}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
