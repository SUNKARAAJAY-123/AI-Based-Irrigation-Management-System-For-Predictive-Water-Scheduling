"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
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
  Plus
} from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pages where navbar should be hidden
  const noNavPages = ["/", "/login", "/register"];
  if (!mounted) return null;
  if (noNavPages.includes(pathname)) return null;

  // Primary navigation tabs
  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: "Farms", path: "/farms", icon: <Sprout className="w-5 h-5" /> },
    { name: "Fields", path: "/fields", icon: <Layers className="w-5 h-5" /> },
    { name: "Sensors", path: "/sensors", icon: <Radio className="w-5 h-5" /> },
    { name: "Weather", path: "/weather", icon: <CloudSun className="w-5 h-5" /> },
    { name: "AI Tools", path: "/ai-recommendation", icon: <Brain className="w-5 h-5" /> },
    { name: "ML Predict", path: "/ml-prediction", icon: <Brain className="w-5 h-5" /> },
    { name: "History", path: "/history", icon: <History className="w-5 h-5" /> },
  ];

  if (user?.role === "admin") {
    navItems.push({ name: "Admin", path: "/admin", icon: <span className="text-xs">🛡️</span> });
  }

  // Mobile Bottom Tab configuration
  const mobileTabs = [
    { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: "Farms", path: "/farms", icon: <Sprout className="w-5 h-5" /> },
    { name: "Weather", path: "/weather", icon: <CloudSun className="w-5 h-5" /> },
    { name: "ML Predict", path: "/ml-prediction", icon: <Brain className="w-5 h-5" /> },
    { name: "Profile", path: "/profile", icon: <User className="w-5 h-5" /> },
  ];

  const triggerVoiceAssistant = () => {
    window.dispatchEvent(new CustomEvent("open-voice-assistant"));
  };

  return (
    <>
      {/* 1. Mobile Sticky Top Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-900 px-4 flex justify-between items-center z-40 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-black text-neutral-950 text-xs shadow-sm">
            {user?.full_name?.charAt(0).toUpperCase() || "A"}
          </div>
          <span className="text-sm font-bold text-white tracking-wide">
            {user?.full_name || "Farmer"}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <Link href="/notifications" className="relative p-1.5 text-neutral-400 hover:text-emerald-400 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          </Link>
        </div>
      </header>

      {/* 2. Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-neutral-950 border-r border-neutral-900 text-neutral-200 h-screen sticky top-0 shrink-0">
        {/* Brand / Logo */}
        <div className="p-6 border-b border-neutral-900 flex flex-col gap-1.5">
          <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 w-fit tracking-widest uppercase">
            AI IRRIGATION
          </span>
          <h2 className="text-xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            AgriSmart Pro
          </h2>
        </div>

        {/* User Card */}
        <div className="p-4 mx-4 my-5 bg-neutral-900/40 border border-neutral-850 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-black text-neutral-950 text-sm shadow-md">
            {user?.full_name?.charAt(0).toUpperCase() || "A"}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-neutral-100 truncate">{user?.full_name || "Farmer"}</h4>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold block mt-0.5">
              {user?.role || "Farmer"} • {user?.preferred_language || "en-IN"}
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
            <span>Voice Assistant</span>
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
            <span>Profile Settings</span>
          </Link>
          
          <button
            onClick={logout}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-all duration-200 text-left cursor-pointer border border-transparent"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* 3. Mobile Bottom Tab Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-neutral-950/90 backdrop-blur-lg border-t border-neutral-900 px-2 py-1.5 flex justify-around items-center z-40 shadow-2xl">
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
