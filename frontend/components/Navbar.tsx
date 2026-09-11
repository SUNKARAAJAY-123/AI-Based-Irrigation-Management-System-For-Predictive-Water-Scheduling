"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/context/LanguageContext";
import { 
  Sprout, 
  CloudSun, 
  Brain, 
  User, 
  History, 
  LogOut, 
  Mic, 
  Layers, 
  Radio,
  X,
  Home,
  Droplet,
  Menu,
  ShieldAlert
} from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, locale } = useTranslation();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
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

  // Full Navigation list for Sidebar / Drawer
  const navItems = [
    { key: "dashboard", name: t("nav.dashboard") || "Dashboard", path: "/dashboard", icon: <Home className="w-5 h-5" /> },
    { key: "farms", name: t("nav.farms") || "Farms", path: "/farms", icon: <Sprout className="w-5 h-5" /> },
    { key: "fields", name: t("nav.fields") || "Fields", path: "/fields", icon: <Layers className="w-5 h-5" /> },
    { key: "irrigation", name: t("nav.irrigation") || "Irrigation", path: "/irrigation", icon: <Droplet className="w-5 h-5" /> },
    { key: "sensors", name: t("nav.sensors") || "Sensors", path: "/sensors", icon: <Radio className="w-5 h-5" /> },
    { key: "weather", name: t("nav.weather") || "Weather", path: "/weather", icon: <CloudSun className="w-5 h-5" /> },
    { key: "ai_tools", name: t("nav.ai_tools") || "AI Advice", path: "/ai-recommendation", icon: <Brain className="w-5 h-5" /> },
    { key: "ai_chat", name: t("nav.ai_assistant") || "AI Assistant", path: "/ai", icon: <Mic className="w-5 h-5" /> },
    { key: "ml_predict", name: t("nav.ml_predict") || "ML Insights", path: "/ml-prediction", icon: <Brain className="w-5 h-5" /> },
    { key: "history", name: t("nav.history") || "History", path: "/history", icon: <History className="w-5 h-5" /> },
  ];

  if (user?.role === "admin") {
    navItems.push({ key: "admin", name: t("nav.admin") || "Admin", path: "/admin", icon: <ShieldAlert className="w-5 h-5 text-amber-400" /> });
  }

  // Mobile Bottom Bar Tabs (5 primary tabs)
  const mobileTabs = [
    { key: "dashboard", name: t("nav.dashboard") || "Home", path: "/dashboard", icon: <Home className="w-5 h-5" /> },
    { key: "farms", name: t("nav.farms") || "Farms", path: "/farms", icon: <Sprout className="w-5 h-5" /> },
    { key: "irrigation", name: t("nav.irrigation") || "Water", path: "/irrigation", icon: <Droplet className="w-5 h-5" /> },
    { key: "ai_assistant", name: t("nav.ai_assistant") || "AI Assistant", path: "/ai", icon: <Brain className="w-5 h-5" /> },
    { key: "more", name: "Menu", path: "#menu", icon: <Menu className="w-5 h-5" />, isMenuTrigger: true },
  ];

  const triggerVoiceAssistant = () => {
    window.dispatchEvent(new CustomEvent("open-voice-assistant"));
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isDrawerOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/75 backdrop-blur-md z-50 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Desktop Sidebar / Mobile Overlay Drawer */}
      <aside 
        className={`${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } fixed md:sticky top-0 left-0 z-50 flex flex-col w-72 bg-neutral-950 border-r border-neutral-900 text-neutral-200 h-screen transition-transform duration-300 shrink-0`}
      >
        {/* Brand / Logo Header */}
        <div className="p-5 border-b border-neutral-900 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/25">
              <Sprout className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block">
                AgriSmart Pro
              </span>
              <h2 className="text-base font-black text-white">
                Kisan Assistant
              </h2>
            </div>
          </div>
          
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="md:hidden p-2.5 bg-neutral-900 border border-neutral-800 rounded-2xl text-neutral-400 hover:text-white touch-target"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Profile Card */}
        <div className="p-4 mx-4 my-4 bg-neutral-900/60 border border-neutral-850 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-black text-neutral-950 text-sm shadow-md shrink-0">
            {user?.full_name?.charAt(0).toUpperCase() || "F"}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-black text-white truncate">{user?.full_name || "Farmer User"}</h4>
            <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider block mt-0.5">
              {locale}
            </span>
          </div>
        </div>

        {/* Navigation items list */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all duration-200 border touch-target ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 font-black shadow-md shadow-emerald-500/5"
                    : "hover:bg-neutral-900/60 text-neutral-400 hover:text-white border-transparent"
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="break-words-regional">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-neutral-900 space-y-2">
          <button
            onClick={triggerVoiceAssistant}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-black bg-emerald-500 text-neutral-950 hover:bg-emerald-600 transition-all duration-200 text-left shadow-lg touch-target cursor-pointer"
          >
            <Mic className="w-5 h-5 stroke-[2.5] shrink-0" />
            <span className="break-words-regional">🎙 Ask Voice Assistant</span>
          </button>

          <Link
            href="/profile"
            className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 border touch-target ${
              pathname === "/profile"
                ? "bg-neutral-900 border-neutral-800 text-white"
                : "text-neutral-400 hover:text-white border-transparent"
            }`}
          >
            <User className="w-5 h-5 shrink-0" />
            <span className="break-words-regional">{t("header.profile_settings") || "Settings & Language"}</span>
          </Link>
          
          <button
            onClick={logout}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-all duration-200 text-left cursor-pointer border border-transparent touch-target"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="break-words-regional">{t("nav.logout") || "Logout"}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sticky Bottom Tab Bar (320px - 767px) */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 bg-neutral-950/95 backdrop-blur-xl border-t border-neutral-900 px-1 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex justify-around items-center z-45 shadow-2xl"
        aria-label="Mobile Navigation"
      >
        {mobileTabs.map((tab) => {
          if (tab.isMenuTrigger) {
            return (
              <button
                key={tab.key}
                onClick={() => setIsDrawerOpen(true)}
                className="flex flex-col items-center gap-1 py-1 px-2 text-neutral-400 touch-target active:scale-95"
                aria-label="Open navigation menu"
              >
                <Menu className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Menu</span>
              </button>
            );
          }

          const isActive = pathname === tab.path;
          return (
            <Link
              key={tab.key}
              href={tab.path}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all touch-target ${
                isActive ? "text-emerald-400 font-black scale-105" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <span>{tab.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider break-words-regional">{tab.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};

export default Navbar;
