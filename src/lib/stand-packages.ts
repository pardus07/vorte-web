// Vorte Stand Paketleri — Sabit içerik tanımları
// Her beden 5 adet. Düzine kuralı GEÇERLİ DEĞİL.

export interface StandPackageItem {
  productSlug: string;
  color: string;
  sizes: Record<string, number>; // { S: 5, M: 5, ... }
}

export interface StandPackage {
  id: "A" | "B" | "C";
  name: string;
  subtitle: string;
  format: string;
  totalItems: number;
  items: StandPackageItem[];
}

const BEDEN_DAGILIMI = { S: 5, M: 5, L: 5, XL: 5, XXL: 5 }; // 25 adet/ürün

export const STAND_PACKAGES: StandPackage[] = [
  {
    id: "A",
    name: "Stand A",
    subtitle: "Başlangıç Paketi",
    format: "Kasa yanı veya duvar/masaüstü tipi, tek yönlü karton stand",
    totalItems: 50,
    items: [
      { productSlug: "vorte-premium-penye-erkek-boxer-siyah", color: "Siyah", sizes: BEDEN_DAGILIMI },
      { productSlug: "vorte-premium-penye-kadin-kulot-ten", color: "Ten", sizes: BEDEN_DAGILIMI },
    ],
  },
  {
    id: "B",
    name: "Stand B",
    subtitle: "Profesyonel Paket",
    format: "Orta boy, çift yönlü ada tipi karton stand",
    totalItems: 100,
    items: [
      { productSlug: "vorte-premium-penye-erkek-boxer-siyah", color: "Siyah", sizes: BEDEN_DAGILIMI },
      { productSlug: "vorte-premium-penye-erkek-boxer-lacivert", color: "Lacivert", sizes: BEDEN_DAGILIMI },
      { productSlug: "vorte-premium-penye-kadin-kulot-siyah", color: "Siyah", sizes: BEDEN_DAGILIMI },
      { productSlug: "vorte-premium-penye-kadin-kulot-ten", color: "Ten", sizes: BEDEN_DAGILIMI },
    ],
  },
  {
    id: "C",
    name: "Stand C",
    subtitle: "Premium Paket",
    format: "Tam boy, mağaza içi ada tipi (145x45x45 cm), çift yönlü karton stand",
    totalItems: 150,
    items: [
      { productSlug: "vorte-premium-penye-erkek-boxer-siyah", color: "Siyah", sizes: BEDEN_DAGILIMI },
      { productSlug: "vorte-premium-penye-erkek-boxer-lacivert", color: "Lacivert", sizes: BEDEN_DAGILIMI },
      { productSlug: "vorte-premium-penye-erkek-boxer-gri", color: "Gri", sizes: BEDEN_DAGILIMI },
      { productSlug: "vorte-premium-penye-kadin-kulot-siyah", color: "Siyah", sizes: BEDEN_DAGILIMI },
      { productSlug: "vorte-premium-penye-kadin-kulot-beyaz", color: "Beyaz", sizes: BEDEN_DAGILIMI },
      { productSlug: "vorte-premium-penye-kadin-kulot-ten", color: "Ten", sizes: BEDEN_DAGILIMI },
    ],
  },
];

export function getStandPackage(id: string): StandPackage | undefined {
  return STAND_PACKAGES.find((p) => p.id === id);
}
