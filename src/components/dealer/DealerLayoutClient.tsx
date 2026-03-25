"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { DealerSidebar } from "./DealerSidebar";

interface DealerLayoutClientProps {
  dealer: { companyName: string; dealerCode: string };
  children: React.ReactNode;
}

export function DealerLayoutClient({ dealer, children }: DealerLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#F5F6FA]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — desktop: static, mobile: slide-in overlay */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <DealerSidebar dealer={dealer} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-gray-100 bg-white px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Menüyü aç"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-[13px] text-gray-500">
              Hoş geldiniz, <span className="font-medium text-gray-700">{dealer.companyName}</span>
            </h2>
          </div>
          <span className="rounded-lg bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-600 ring-1 ring-purple-100">
            {dealer.dealerCode}
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
