import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-8xl font-bold text-[#1A1A1A]">404</h1>
      <h2 className="mt-4 text-2xl font-semibold text-[#333333]">
        Sayfa Bulunamadı
      </h2>
      <p className="mt-3 max-w-md text-gray-500">
        Aradığınız sayfa kaldırılmış, adı değiştirilmiş veya geçici olarak kullanılamıyor olabilir.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/"
          className="bg-[#1A1A1A] px-8 py-3 text-sm font-semibold text-white hover:bg-[#333333] transition-colors"
        >
          Ana Sayfaya Dön
        </Link>
        <Link
          href="/erkek-ic-giyim"
          className="border border-[#1A1A1A] px-8 py-3 text-sm font-semibold text-[#1A1A1A] hover:bg-gray-50 transition-colors"
        >
          Erkek Koleksiyonu
        </Link>
        <Link
          href="/kadin-ic-giyim"
          className="border border-[#1A1A1A] px-8 py-3 text-sm font-semibold text-[#1A1A1A] hover:bg-gray-50 transition-colors"
        >
          Kadın Koleksiyonu
        </Link>
      </div>
    </div>
  );
}
