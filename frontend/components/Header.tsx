"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePathname, useRouter } from "next/navigation";
import { Menu, User, Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { NotificationBell } from "./NotificationBell";
import { NetworkBadge } from "./NetworkStatus";
import { useTranslation } from "@/context/LanguageContext";

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const noHeaderPages = ["/", "/login", "/register"];
  if (!mounted) return null;
  if (noHeaderPages.includes(pathname)) return null;

  const toggleSidebar = () => {
    window.dispatchEvent(new CustomEvent("toggle-sidebar"));
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-neutral-950/80 backdrop-blur-md border-b border-neutral-900 px-4 md:px-6 h-16 flex items-center justify-between shadow-sm">
      {/* Mobile view: Hamburger + Title */}
      <div className="flex items-center gap-3.5 md:hidden">
        <button
          onClick={toggleSidebar}
          className="p-2 bg-neutral-900 border border-neutral-850 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-1.5">
          <span className="text-xl">🌾</span>
          <span className="text-sm font-black text-white tracking-wide uppercase">{t("header.brand")}</span>
        </Link>
      </div>

      {/* Desktop view: Brand / Logo */}
      <div className="hidden md:flex items-center gap-2">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl">🌾</span>
          <span className="text-base font-black text-white tracking-wide uppercase">{t("header.brand")}</span>
        </Link>
      </div>

      {/* Right Actions: Notification Bell + Avatar */}
      <div className="flex items-center gap-3.5">
        <NetworkBadge />
        <NotificationBell />

        {/* User Avatar & Menu (Mobile + Desktop) */}
        <div className="relative block">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-black text-neutral-950 text-sm shadow-md cursor-pointer select-none hover:scale-102 active:scale-98 transition-transform"
            aria-label="User Profile"
          >
            {user?.full_name?.charAt(0).toUpperCase() || "👤"}
          </button>

          {showProfileMenu && (
            <>
              {/* Overlay to close menu */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowProfileMenu(false)} 
              />
              <div className="absolute right-0 mt-3 w-48 bg-neutral-950 border border-neutral-900 rounded-2xl shadow-xl z-20 overflow-hidden py-1.5 animate-slide-up">
                <Link
                  href="/profile"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-neutral-300 hover:bg-neutral-900 transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>{t("header.profile_settings")}</span>
                </Link>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 text-left transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t("header.logout")}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
export default Header;
