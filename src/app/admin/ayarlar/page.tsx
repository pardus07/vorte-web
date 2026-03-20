import { db } from "@/lib/db";
import { SettingsForm } from "./SettingsForm";

export default async function AdminSettingsPage() {
  let settings = await db.siteSettings.findUnique({
    where: { id: "main" },
  });

  // Yoksa varsayılanlarla oluştur
  if (!settings) {
    settings = await db.siteSettings.create({
      data: {
        id: "main",
        siteName: "Vorte Tekstil",
        siteUrl: "https://www.vorte.com.tr",
        contactEmail: "info@vorte.com.tr",
        contactPhone: "+90 850 305 8635",
        contactAddress: "Dumlupınar Mah., Kayabaşı Sok., 17BG, Nilüfer/Bursa",
        freeShippingThreshold: 300,
        defaultShippingCost: 90,
      },
    });
  }

  return <SettingsForm initialData={settings} />;
}
