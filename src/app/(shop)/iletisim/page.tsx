import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İletişim",
  description: "Vorte Tekstil iletişim bilgileri. Adres, telefon, e-posta. Nilüfer, Bursa.",
  alternates: { canonical: "/iletisim" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "İletişim" }]} />
      <h1 className="mt-6 text-3xl font-bold text-gray-900">İletişim</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Bize Ulaşın</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-[#7AC143]" />
              <div><p className="font-medium">Adres</p><p className="text-sm text-gray-600">Dumlupınar Mah., Kayabaşı Sok., 17BG, Nilüfer/Bursa</p></div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-5 w-5 text-[#7AC143]" />
              <div><p className="font-medium">Telefon</p><p className="text-sm text-gray-600"><a href="tel:+905376220694" className="hover:text-[#7AC143]">0537 622 06 94</a></p></div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 text-[#7AC143]" />
              <div><p className="font-medium">E-posta</p><p className="text-sm text-gray-600">info@vorte.com.tr</p></div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 text-[#7AC143]" />
              <div><p className="font-medium">Çalışma Saatleri</p><p className="text-sm text-gray-600">Pazartesi - Cumartesi: 09:00 - 18:00</p></div>
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Mesaj Gönderin</h2>
          <form className="mt-4 space-y-4">
            <input type="text" placeholder="Ad Soyad" required className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]" />
            <input type="email" placeholder="E-posta" required className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]" />
            <input type="tel" placeholder="Telefon" className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]" />
            <textarea rows={4} placeholder="Mesajınız" required className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#7AC143] focus:outline-none focus:ring-1 focus:ring-[#7AC143]" />
            <button type="submit" className="rounded-lg bg-[#1A1A1A] px-6 py-2.5 text-sm font-medium text-white hover:bg-black">Gönder</button>
          </form>
        </div>
      </div>

      {/* Google Maps */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900">Konum</h2>
        <div className="mt-4 h-[300px] w-full overflow-hidden rounded-lg md:h-[400px]">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1523!2d28.8313634!3d40.2295192!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14ca0fdfe4833a67%3A0xcf4970ae2fd2138e!2sVorte%20Tekstil%20%C4%B0%C3%A7%20Giyim%20%26%20%C3%87orap%20Toptan!5e0!3m2!1str!2str!4v1"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Vorte Tekstil Konum - Nilüfer, Bursa"
          />
        </div>
      </div>
    </div>
  );
}
