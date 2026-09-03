"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/context/LanguageContext";
import { 
  LayoutDashboard, 
  Sprout, 
  CloudSun, 
  Brain, 
  User, 
  History, 
  Bell, 
  LogOut, 
  Mic, 
  Layers, 
  Radio,
  Plus,
  X,
  Home,
  Droplet
} from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, locale } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleToggle = () => setIsDrawerOpen(prev => !prev);
    window.addEventListener("toggle-sidebar", handleToggle);
    return () => window.removeEventListener("toggle-sidebar", handleToggle);
  }, []);

  // Close drawer on navigation
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  // Pages where navbar should be hidden
  const noNavPages = ["/", "/login", "/register"];
  if (!mounted) return null;
  if (noNavPages.includes(pathname)) return null;

  // Primary navigation tabs
  const navItems = [
    { key: "dashboard", name: t("nav.dashboard"), path: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { key: "farms", name: t("nav.farms"), path: "/farms", icon: <Sprout className="w-5 h-5" /> },
    { key: "fields", name: t("nav.fields"), path: "/fields", icon: <Layers className="w-5 h-5" /> },
    { key: "sensors", name: t("nav.sensors"), path: "/sensors", icon: <Radio className="w-5 h-5" /> },
    { key: "weather", name: t("nav.weather"), path: "/weather", icon: <CloudSun className="w-5 h-5" /> },
    { key: "ai_tools", name: t("nav.ai_tools"), path: "/ai-recommendation", icon: <Brain className="w-5 h-5" /> },
    { key: "ml_predict", name: t("nav.ml_predict"), path: "/ml-prediction", icon: <Brain className="w-5 h-5" /> },
    { key: "history", name: t("nav.history"), path: "/history", icon: <History className="w-5 h-5" /> },
  ];

  if (user?.role === "admin") {
    navItems.push({ key: "admin", name: t("nav.admin"), path: "/admin", icon: <span className="text-xs">🛡️</span> });
  }

  // Mobile Bottom Tab configuration
  const mobileTabs = [
    { key: "dashboard", name: t("nav.dashboard"), path: "/dashboard", icon: <Home className="w-5 h-5" /> },
    { key: "fields", name: t("nav.fields"), path: "/fields", icon: <Sprout className="w-5 h-5" /> },
    { key: "irrigation", name: t("nav.irrigation"), path: "/irrigation", icon: <Droplet className="w-5 h-5" /> },
    { key: "ai_assistant", name: t("nav.ai_assistant"), path: "/ai", icon: <Brain className="w-5 h-5" /> },
    { key: "profile", name: t("nav.profile"), path: "/profile", icon: <User className="w-5 h-5" /> },
  ];

  const triggerVoiceAssistant = () => {
    window.dispatchEvent(new CustomEvent("open-voice-assistant"));
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isDrawerOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-45 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* 2. Responsive Sidebar (Desktop sidebar / Mobile overlay drawer) */}
      <aside 
        className={`${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } fixed md:sticky top-0 left-0 z-50 flex flex-col w-64 bg-neutral-950 border-r border-neutral-900 text-neutral-200 h-screen transition-transform duration-300 shrink-0`}
      >
        {/* Brand / Logo with Close option for mobile */}
        <div className="p-6 border-b border-neutral-900 flex justify-between items-start">
          <div className="flex flex-col gap-1.5">
            <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 w-fit tracking-widest uppercase">
              AI IRRIGATION
            </span>
            <h2 className="text-xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              AgriSmart Pro
            </h2>
          </div>
          
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="md:hidden p-2 bg-neutral-900 border border-neutral-850 rounded-xl text-neutral-400 hover:text-white"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 mx-4 my-5 bg-neutral-900/40 border border-neutral-850 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-black text-neutral-950 text-sm shadow-md">
            {user?.full_name?.charAt(0).toUpperCase() || "A"}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-neutral-100 truncate">{user?.full_name || t("header.user_role")}</h4>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold block mt-0.5">
              {user?.role === "admin" ? t("nav.admin") : t("header.user_role")} • {locale}
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 border ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                    : "hover:bg-neutral-900/50 text-neutral-400 hover:text-neutral-250 border-transparent"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Desktop Sidebar Footer */}
        <div className="p-4 border-t border-neutral-900 space-y-2">
          {/* Quick Mic Launch */}
          <button
            onClick={triggerVoiceAssistant}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold bg-emerald-500 text-neutral-950 hover:bg-emerald-600 transition-all duration-200 text-left shadow-lg cursor-pointer"
          >
            <Mic className="w-5 h-5 stroke-[2.5]" />
            <span>{t("nav.voice_assistant")}</span>
          </button>

          <Link
            href="/profile"
            className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 border ${
              pathname === "/profile"
                ? "bg-neutral-900 border-neutral-850 text-white"
                : "text-neutral-400 hover:text-neutral-200 border-transparent"
            }`}
          >
            <User className="w-5 h-5" />
            <span>{t("header.profile_settings")}</span>
          </Link>
          
          <button
            onClick={logout}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-all duration-200 text-left cursor-pointer border border-transparent"
          >
            <LogOut className="w-5 h-5" />
            <span>{t("nav.logout")}</span>
          </button>
        </div>
      </aside>

      {/* 3. Mobile Bottom Tab Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-neutral-950/90 backdrop-blur-lg border-t border-neutral-900 px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex justify-around items-center z-40 shadow-2xl">
        {mobileTabs.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center gap-1.5 py-1.5 px-3 rounded-xl transition-all duration-200 ${
                isActive ? "text-emerald-400 font-black" : "text-neutral-400"
              }`}
            >
              <span className={isActive ? "scale-105" : ""}>{item.icon}</span>
              <span className="text-[9px] uppercase tracking-wider font-bold">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* 4. Floating Action Button (FAB) - For Voice Assistant */}
      <div className="fixed bottom-20 right-5 z-45 md:bottom-6 md:right-6">
        <div className="relative">
          {/* Pulse ring */}
          <span className="absolute -inset-1.5 bg-emerald-500/30 rounded-full animate-ping pointer-events-none" />
          
          <button
            onClick={triggerVoiceAssistant}
            className="relative w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 rounded-full flex items-center justify-center shadow-2xl cursor-pointer transition-transform hover:scale-105 duration-200 active:scale-95"
            aria-label="Open voice command center"
          >
            <Mic className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </>
  );
};

export default Navbar;
