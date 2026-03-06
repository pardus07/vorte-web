import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sıkça Sorulan Sorular",
  description:
    "Vorte Tekstil sıkça sorulan sorular. Sipariş, kargo, iade, beden ve ödeme hakkında merak ettikleriniz.",
  alternates: { canonical: "/sss" },
};

export default function SSSlayout({ children }: { children: React.ReactNode }) {
  return children;
}
