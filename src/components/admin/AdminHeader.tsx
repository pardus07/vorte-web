"use client";

import { useState, useEffect } from "react";
import { Bell, Menu, LogOut, User as UserIcon } from "lucide-react";
import { signOut } from "next-auth/react";

interface AdminHeaderProps {
  user: { name?: string | null; email?: string | null };
}

export function AdminHeader({ user }: AdminHeaderProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch("/api/admin/notifications/count")
      .then((r) => r.json())
      .then((data) => setUnreadCount(data.count || 0))
      .catch(() => {});
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <button className="lg:hidden">
        <Menu className="h-5 w-5 text-gray-600" />
      </button>

      <div className="flex items-center gap-4 ml-auto">
        {/* Notifications */}
        <a
          href="/admin/bildirimler"
          className="relative rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </a>

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7AC143]/20">
            <UserIcon className="h-4 w-4 text-[#7AC143]" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">{user.name || "Admin"}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          title="Çıkış Yap"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
