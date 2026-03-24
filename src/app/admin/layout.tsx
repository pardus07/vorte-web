import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";
import { AdminAIPanel } from "@/components/admin/ai/AdminAIPanel";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/giris");
  }

  const role = (session.user as unknown as { role: string }).role;
  if (!["ADMIN", "EDITOR", "VIEWER"].includes(role)) {
    redirect("/");
  }

  return (
    <AdminLayoutClient
      user={session.user}
      aiPanel={role === "ADMIN" ? <AdminAIPanel /> : undefined}
    >
      {children}
    </AdminLayoutClient>
  );
}
