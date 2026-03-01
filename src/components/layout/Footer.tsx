import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";

const footerLinks = {
  kurumsal: [
    { label: "Hakkımızda", href: "/hakkimizda" },
    { label: "İletişim", href: "/iletisim" },
    { label: "Toptan Satış", href: "/toptan" },
  ],
  hesap: [
    { label: "Hesabım", href: "/hesabim" },
    { label: "Siparişlerim", href: "/hesabim/siparislerim" },
    { label: "Favorilerim", href: "/hesabim/favorilerim" },
    { label: "Bayi Girişi", href: "/bayi-girisi" },
  ],
  yardim: [
    { label: "Kargo ve Teslimat", href: "/kargo-teslimat" },
    { label: "İade ve Değişim", href: "/iade-politikasi" },
    { label: "Sıkça Sorulan Sorular", href: "/sss" },
  ],
  kategoriler: [
    { label: "Erkek Boxer", href: "/erkek-ic-giyim" },
    { label: "Kadın Külot", href: "/kadin-ic-giyim" },
  ],
};

export function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white">
      {/* Newsletter */}
      <div className="mx-auto max-w-[1440px] px-4 py-10 lg:px-8">
        <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-bold tracking-wide text-[#1A1A1A]">
              E-BÜLTENE KAYIT OLUN, GÜNCEL KALIN!
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Kampanya ve yeniliklerden ilk siz haberdar olun.
            </p>
          </div>
          <form className="flex w-full max-w-md gap-2">
            <input
              type="email"
              placeholder="E-posta adresiniz"
              className="h-11 flex-1 border-b border-gray-300 bg-transparent px-2 text-sm placeholder:text-gray-400 focus:border-[#1A1A1A] focus:outline-none"
            />
            <button
              type="submit"
              className="h-11 bg-[#1A1A1A] px-6 text-sm font-semibold text-white hover:bg-[#333333] transition-colors"
            >
              Kayıt Ol
            </button>
          </form>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Links */}
      <div className="mx-auto max-w-[1440px] px-4 py-10 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Image
              src="/logo-dark.jpg"
              alt="Vorte Tekstil"
              width={100}
              height={34}
              className="h-8 w-auto object-contain"
            />
            <p className="mt-4 text-xs leading-relaxed text-gray-500">
              Vorte Tekstil Toptan — Kaliteli iç giyim ürünleri. Nilüfer/Bursa, Türkiye.
            </p>
          </div>

          {/* Kurumsal */}
          <div>
            <h4 className="mb-4 text-sm font-bold text-[#1A1A1A]">Kurumsal</h4>
            <ul className="space-y-2.5">
              {footerLinks.kurumsal.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-500 hover:text-[#1A1A1A] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Hesap */}
          <div>
            <h4 className="mb-4 text-sm font-bold text-[#1A1A1A]">Hesap</h4>
            <ul className="space-y-2.5">
              {footerLinks.hesap.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-500 hover:text-[#1A1A1A] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Yardım */}
          <div>
            <h4 className="mb-4 text-sm font-bold text-[#1A1A1A]">Müşteri Hizmetleri</h4>
            <ul className="space-y-2.5">
              {footerLinks.yardim.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-500 hover:text-[#1A1A1A] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Kategoriler */}
          <div>
            <h4 className="mb-4 text-sm font-bold text-[#1A1A1A]">Kategoriler</h4>
            <ul className="space-y-2.5">
              {footerLinks.kategoriler.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-500 hover:text-[#1A1A1A] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-200">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-4 py-6 md:flex-row lg:px-8">
          {/* Social */}
          <div className="flex items-center gap-4">
            <a href="#" className="text-gray-400 hover:text-[#1A1A1A] transition-colors" aria-label="Facebook">
              <Facebook className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-[#1A1A1A] transition-colors" aria-label="X (Twitter)">
              <Twitter className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-[#1A1A1A] transition-colors" aria-label="Instagram">
              <Instagram className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-[#1A1A1A] transition-colors" aria-label="YouTube">
              <Youtube className="h-5 w-5" />
            </a>
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
            <Link href="/gizlilik-politikasi" className="hover:text-gray-600">Gizlilik Politikası</Link>
            <Link href="/kvkk" className="hover:text-gray-600">KVKK Aydınlatma Metni</Link>
            <Link href="/mesafeli-satis" className="hover:text-gray-600">Mesafeli Satış Sözleşmesi</Link>
            <Link href="/kullanim-kosullari" className="hover:text-gray-600">Kullanım Koşulları</Link>
          </div>

          {/* Copyright */}
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Vorte Tekstil - Tüm Hakları Saklıdır.
          </p>
        </div>
      </div>

      {/* ETBIS */}
      <div className="border-t border-gray-200">
        <div className="mx-auto flex max-w-[1440px] items-center justify-center px-4 py-4 lg:px-8">
          <div id="ETBIS">
            <div id="5383876846473146">
              <a
                href="https://etbis.eticaret.gov.tr/sitedogrulama/5383876846473146"
                target="_blank"
                rel="noopener noreferrer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  style={{ width: 100, height: 120 }}
                  alt="ETBIS - E-Ticaret Bilgi Sistemi"
                  src="/etbis-badge.png"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
