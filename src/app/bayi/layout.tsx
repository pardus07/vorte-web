import { redirect } from "next/navigation";
import { getDealerSession } from "@/lib/dealer-session";
import { DealerSidebar } from "@/components/dealer/DealerSidebar";

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
    <div className="flex h-screen bg-gray-50">
      <DealerSidebar dealer={dealer} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b bg-white px-6">
          <h2 className="text-sm text-gray-600">
            Hoş geldiniz, <span className="font-medium">{dealer.companyName}</span>
          </h2>
          <span className="rounded bg-[#7AC143]/10 px-3 py-1 text-xs font-medium text-[#7AC143]">
            {dealer.dealerCode}
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
