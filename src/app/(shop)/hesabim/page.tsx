export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import Link from "next/link";
import { User, ShoppingBag, Heart, MapPin, LogOut } from "lucide-react";

const accountLinks = [
  { label: "Siparişlerim", href: "/hesabim/siparislerim", icon: ShoppingBag },
  { label: "Favorilerim", href: "/hesabim/favorilerim", icon: Heart },
  { label: "Adreslerim", href: "/hesabim/adreslerim", icon: MapPin },
];

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true, createdAt: true },
  });

  if (!user) redirect("/giris");

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Hesabım" }]} />
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Hesabım</h1>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {/* Profile card */}
        <div className="rounded-lg border p-6 md:col-span-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7AC143]/10">
              <User className="h-6 w-6 text-[#7AC143]" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
          {user.phone && (
            <p className="mt-3 text-sm text-gray-500">{user.phone}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            Üyelik: {new Date(user.createdAt).toLocaleDateString("tr-TR")}
          </p>
        </div>

        {/* Quick links */}
        <div className="space-y-3 md:col-span-2">
          {accountLinks.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:border-[#7AC143] hover:bg-green-50/50"
            >
              <Icon className="h-5 w-5 text-gray-400" />
              <span className="font-medium text-gray-700">{label}</span>
            </Link>
          ))}
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-4 rounded-lg border border-red-100 p-4 text-left transition-colors hover:bg-red-50"
            >
              <LogOut className="h-5 w-5 text-red-400" />
              <span className="font-medium text-red-600">Çıkış Yap</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
