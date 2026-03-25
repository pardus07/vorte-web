"use client";

import { useState, useEffect } from "react";
import { Bell, Menu, LogOut, User as UserIcon, Search } from "lucide-react";
import { signOut } from "next-auth/react";

interface AdminHeaderProps {
  user: { name?: string | null; email?: string | null };
  onMenuClick?: () => void;
}

export function AdminHeader({ user, onMenuClick }: AdminHeaderProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch("/api/admin/notifications/count")
      .then((r) => r.json())
      .then((data) => setUnreadCount(data.count || 0))
      .catch(() => {});
  }, []);

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-100 bg-white px-4 md:px-6">
      {/* Left: hamburger + search */}
      <div className="flex items-center gap-3">
        <button
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
          onClick={onMenuClick}
          aria-label="Menüyü aç"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Arama..."
            className="h-8 w-56 rounded-lg border-0 bg-gray-50 pl-8 pr-3 text-[13px] text-gray-700 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-200 lg:w-72"
          />
        </div>
      </div>

      {/* Right: notifications + user + logout */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <a
          href="/admin/bildirimler"
          className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </a>

        {/* Divider */}
        <div className="mx-2 h-6 w-px bg-gray-100" />

        {/* User */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7AC143]/15">
            <UserIcon className="h-3.5 w-3.5 text-[#7AC143]" />
          </div>
          <div className="hidden sm:block">
            <p className="text-[13px] font-medium leading-tight text-gray-800">
              {user.name || "Admin"}
            </p>
            <p className="text-[11px] leading-tight text-gray-400">{user.email}</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="ml-1 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
          title="Çıkış Yap"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}
