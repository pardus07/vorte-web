import Link from "next/link";
import { Instagram, Facebook } from "lucide-react";
import { NewsletterForm } from "./NewsletterForm";

const footerLinks = {
  kurumsal: [
    { label: "Hakkımızda", href: "/hakkimizda" },
    { label: "İletişim", href: "/iletisim" },
    { label: "Toptan Satış", href: "/toptan" },
    { label: "Blog", href: "/blog" },
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
};

export function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-100 bg-white">
      {/* Newsletter */}
      <div className="mx-auto max-w-[1440px] px-4 py-14 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <p
            className="text-[10px] font-medium uppercase text-gray-400"
            style={{ letterSpacing: "0.3em" }}
          >
            Bülten
          </p>
          <h3
            className="mt-3 text-lg font-light text-[#1A1A1A] md:text-xl"
            style={{ letterSpacing: "0.08em" }}
          >
            Yeniliklerden ilk siz haberdar olun
          </h3>
          <div className="mt-6">
            <NewsletterForm />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Links */}
      <div className="mx-auto max-w-[1440px] px-4 py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Kurumsal */}
          <div>
            <h4
              className="mb-5 text-[10px] font-semibold uppercase text-[#1A1A1A]"
              style={{ letterSpacing: "0.15em" }}
            >
              Kurumsal
            </h4>
            <ul className="space-y-3">
              {footerLinks.kurumsal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-gray-400 transition-colors hover:text-[#1A1A1A]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Hesap */}
          <div>
            <h4
              className="mb-5 text-[10px] font-semibold uppercase text-[#1A1A1A]"
              style={{ letterSpacing: "0.15em" }}
            >
              Hesap
            </h4>
            <ul className="space-y-3">
              {footerLinks.hesap.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-gray-400 transition-colors hover:text-[#1A1A1A]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Yardım */}
          <div>
            <h4
              className="mb-5 text-[10px] font-semibold uppercase text-[#1A1A1A]"
              style={{ letterSpacing: "0.15em" }}
            >
              Müşteri Hizmetleri
            </h4>
            <ul className="space-y-3">
              {footerLinks.yardim.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-gray-400 transition-colors hover:text-[#1A1A1A]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + Social */}
          <div>
            <h4
              className="mb-5 text-[10px] font-semibold uppercase text-[#1A1A1A]"
              style={{ letterSpacing: "0.15em" }}
            >
              İletişim
            </h4>
            <div className="space-y-3 text-xs text-gray-400">
              <p>Nilüfer, Bursa / Türkiye</p>
              <p>
                <a href="tel:+908503058635" className="transition-colors hover:text-[#1A1A1A]">
                  0850 305 86 35
                </a>
              </p>
              <p>
                <a href="mailto:info@vorte.com.tr" className="transition-colors hover:text-[#1A1A1A]">
                  info@vorte.com.tr
                </a>
              </p>
            </div>
            <div className="mt-5 flex items-center gap-4">
              <a
                href="https://www.instagram.com/vortetekstil"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 transition-colors hover:text-[#1A1A1A]"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://www.facebook.com/vortetekstil"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 transition-colors hover:text-[#1A1A1A]"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-100">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-3 px-4 py-6 md:flex-row lg:px-8">
          {/* Legal Links */}
          <div className="flex flex-wrap items-center gap-4">
            {[
              { label: "Gizlilik", href: "/gizlilik-politikasi" },
              { label: "KVKK", href: "/kvkk" },
              { label: "Mesafeli Satış", href: "/mesafeli-satis" },
              { label: "Koşullar", href: "/kullanim-kosullari" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[10px] uppercase tracking-[0.1em] text-gray-300 transition-colors hover:text-gray-500"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Copyright */}
          <p className="text-[10px] tracking-[0.1em] text-gray-300">
            © {new Date().getFullYear()} VORTE TEKSTİL
          </p>
        </div>
      </div>

      {/* ETBIS */}
      <div className="border-t border-gray-100">
        <div className="mx-auto flex max-w-[1440px] items-center justify-center px-4 py-4 lg:px-8">
          <a
            href="https://etbis.ticaret.gov.tr/tr/Anasayfa/SiteAraSonuc?siteId=cf878ba6-f7c6-4b18-a044-f683649d05be"
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              style={{ width: 80, height: 96 }}
              alt="ETBIS - E-Ticaret Bilgi Sistemi"
              src="/etbis-badge.png"
              className="opacity-50 transition-opacity hover:opacity-80"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
