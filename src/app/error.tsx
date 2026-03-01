"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-6xl font-bold text-[#1A1A1A]">Hata</h1>
      <h2 className="mt-4 text-xl font-semibold text-[#333333]">
        Bir şeyler yanlış gitti
      </h2>
      <p className="mt-3 max-w-md text-gray-500">
        Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin veya ana sayfaya dönün.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={reset}
          className="bg-[#1A1A1A] px-8 py-3 text-sm font-semibold text-white hover:bg-[#333333] transition-colors"
        >
          Tekrar Dene
        </button>
        <Link
          href="/"
          className="border border-[#1A1A1A] px-8 py-3 text-sm font-semibold text-[#1A1A1A] hover:bg-gray-50 transition-colors"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}
