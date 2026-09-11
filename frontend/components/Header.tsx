"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";
import { Menu, User, LogOut, Globe, Sprout } from "lucide-react";
import Link from "next/link";
import { NotificationBell } from "./NotificationBell";
import { NetworkBadge } from "./NetworkStatus";
import { useTranslation } from "@/context/LanguageContext";
import { Locale } from "@/lib/translations";

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, locale, setLocale } = useTranslation();
  const pathname = usePathname();
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

  const handleLangSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocale(e.target.value as Locale);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-neutral-950/90 backdrop-blur-md border-b border-neutral-900 px-4 md:px-6 h-16 flex items-center justify-between shadow-sm">
      {/* Left section: Hamburger (mobile) + Brand logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 bg-neutral-900 border border-neutral-850 hover:bg-neutral-800 rounded-xl text-neutral-300 hover:text-white transition-colors touch-target"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Sprout className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-sm font-black text-white tracking-wide uppercase block leading-none">
              AgriSmart
            </span>
            <span className="text-[9px] font-bold text-emerald-400 tracking-widest uppercase">
              Kisan Pro
            </span>
          </div>
        </Link>
      </div>

      {/* Right Actions: Language Selector + Network Badge + Notification Bell + Profile Avatar */}
      <div className="flex items-center gap-2.5">
        
        {/* Compact Regional Language Dropdown */}
        <div className="hidden sm:flex items-center gap-1.5 bg-neutral-900/80 border border-neutral-800 rounded-2xl px-2.5 py-1.5 text-xs">
          <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <select
            value={locale}
            onChange={handleLangSelect}
            className="bg-transparent text-xs text-white border-none outline-none font-bold cursor-pointer"
            aria-label="Select Language"
          >
            <option value="en-IN" className="bg-neutral-950 text-white">English</option>
            <option value="hi-IN" className="bg-neutral-950 text-white">हिन्दी</option>
            <option value="te-IN" className="bg-neutral-950 text-white">తెలుగు</option>
            <option value="kn-IN" className="bg-neutral-950 text-white">ಕನ್ನಡ</option>
            <option value="ta-IN" className="bg-neutral-950 text-white">தமிழ்</option>
            <option value="ml-IN" className="bg-neutral-950 text-white">മലയാളം</option>
            <option value="mr-IN" className="bg-neutral-950 text-white">मराठी</option>
            <option value="bn-IN" className="bg-neutral-950 text-white">বাংলা</option>
            <option value="gu-IN" className="bg-neutral-950 text-white">ગુજરાતી</option>
            <option value="pa-IN" className="bg-neutral-950 text-white">ਪੰਜਾਬੀ</option>
          </select>
        </div>

        <NetworkBadge />
        <NotificationBell />

        {/* User Avatar Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-black text-neutral-950 text-xs shadow-md cursor-pointer select-none touch-target"
            aria-label="User profile menu"
          >
            {user?.full_name?.charAt(0).toUpperCase() || "F"}
          </button>

          {showProfileMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowProfileMenu(false)} 
                aria-hidden="true"
              />
              <div className="absolute right-0 mt-3 w-52 bg-neutral-950 border border-neutral-850 rounded-2xl shadow-2xl z-20 overflow-hidden py-1.5 animate-slide-up">
                <div className="px-4 py-2.5 border-b border-neutral-900">
                  <p className="text-xs font-black text-white truncate">{user?.full_name || "Farmer User"}</p>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">{user?.email || "agri@kisan.in"}</p>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-3 text-xs font-bold text-neutral-300 hover:bg-neutral-900 transition-colors"
                >
                  <User className="w-4 h-4 text-emerald-400" />
                  <span>{t("header.profile_settings") || "Settings & Language"}</span>
                </Link>

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-bold text-rose-400 hover:bg-rose-500/10 text-left transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t("header.logout") || "Logout"}</span>
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
