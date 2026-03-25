import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDealerSession } from "@/lib/dealer-session";
import { DealerLayoutClient } from "@/components/dealer/DealerLayoutClient";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DealerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dealer = await getDealerSession();
  if (!dealer) {
    redirect("/bayi-girisi");
  }

  return (
    <DealerLayoutClient dealer={dealer}>
      {children}
    </DealerLayoutClient>
  );
}
