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
        contactPhone: "+90 537 622 0694",
        contactAddress: "Dumlupınar Mah., Kayabaşı Sok., 17BG, Nilüfer/Bursa",
        freeShippingThreshold: 200,
        defaultShippingCost: 39.90,
      },
    });
  }

  return <SettingsForm initialData={settings} />;
}
