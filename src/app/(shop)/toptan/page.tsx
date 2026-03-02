import Image from "next/image";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Building2, Percent, Truck, Shield } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Toptan Satış",
  description: "Vorte Tekstil toptan satış ve bayilik fırsatları. Özel toptan fiyatlar, hızlı teslimat. Bayilik başvurusu.",
  alternates: { canonical: "/toptan" },
};

export default function WholesalePage() {
  return (
    <div>
      {/* Banner */}
      <div className="relative h-[250px] w-full overflow-hidden md:h-[350px]">
        <Image
          src="/images/toptan-banner.png"
          alt="Vorte Tekstil Toptan Satış"
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A1A]/70 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-4xl px-4">
            <h1 className="text-3xl font-bold text-white md:text-4xl">Toptan Satış & Bayilik</h1>
            <p className="mt-2 text-lg text-gray-200">Vorte Tekstil bayisi olun, özel toptan fiyatlardan yararlanın.</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Toptan Satış" }]} />

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {[
            { icon: Percent, title: "Özel Fiyatlar", desc: "Bayilerimize özel %40-45 indirimli toptan fiyatlar" },
            { icon: Truck, title: "Hızlı Teslimat", desc: "Bayi siparişlerine öncelikli kargo ve teslimat" },
            { icon: Shield, title: "Garanti", desc: "Tüm ürünlerde kalite garantisi ve kolay iade" },
            { icon: Building2, title: "Bayi Desteği", desc: "Özel bayi temsilcisi ve 7/24 destek hattı" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-lg border p-6">
              <Icon className="h-8 w-8 text-[#7AC143]" />
              <h3 className="mt-3 text-lg font-bold text-gray-900">{title}</h3>
              <p className="mt-1 text-sm text-gray-600">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-lg bg-[#333333] p-8 text-center text-white">
          <h2 className="text-2xl font-bold">Bayilik Başvurusu</h2>
          <p className="mt-2 text-gray-300">Perakende satış noktaları için bayilik başvurunuzu hemen yapın.</p>
          <div className="mt-6 flex justify-center gap-4">
            <Link href="/bayi-girisi"><Button variant="primary" size="lg">Bayi Girişi</Button></Link>
            <Link href="/iletisim"><Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10">Başvuru İçin İletişim</Button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
