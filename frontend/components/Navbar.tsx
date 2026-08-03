"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";
import Link from "next/link";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hide navigation on landing, login, and register pages
  const noNavPages = ["/", "/login", "/register"];
  if (!mounted) return null;
  if (noNavPages.includes(pathname)) return null;

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: "📊" },
    { name: "Farms", path: "/farms", icon: "🏡" },
    { name: "Fields", path: "/fields", icon: "🌱" },
    { name: "Sensors", path: "/sensors", icon: "⚡" },
    { name: "Weather", path: "/weather", icon: "🌤️" },
    { name: "AI recommendations", path: "/ai-recommendation", icon: "🧠" },
    { name: "History", path: "/history", icon: "📜" },
    { name: "Notifications", path: "/notifications", icon: "🔔" },
  ];

  if (user?.role === "admin") {
    navItems.push({ name: "Admin Panel", path: "/admin", icon: "🛡️" });
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-neutral-900 border-r border-neutral-800 text-neutral-200 h-screen sticky top-0 shrink-0">
        {/* Logo area */}
        <div className="p-6 border-b border-neutral-800 flex flex-col gap-1">
          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 w-fit tracking-wider uppercase">
            AI IRRIGATION
          </span>
          <h2 className="text-lg font-black bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">
            AgriSmart Pro
          </h2>
        </div>

        {/* User profile brief */}
        <div className="p-4 mx-4 my-4 bg-neutral-950/40 border border-neutral-800/80 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-neutral-900 text-sm">
            {user?.full_name?.charAt(0).toUpperCase() || "F"}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-neutral-200 truncate">{user?.full_name || "Farmer"}</h4>
            <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold block mt-0.5">
              {user?.role || "Farmer"} • {user?.preferred_language || "en-IN"}
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "hover:bg-neutral-800/50 text-neutral-400 hover:text-neutral-200 border border-transparent"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-neutral-800 space-y-2">
          <Link
            href="/profile"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              pathname === "/profile"
                ? "bg-neutral-800 text-neutral-200"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <span>⚙️</span>
            <span>Profile Settings</span>
          </Link>
          
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-all duration-200 text-left cursor-pointer"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-neutral-900/90 backdrop-blur-lg border-t border-neutral-800/80 px-2 py-1 flex justify-around items-center z-50 shadow-2xl">
        {navItems.slice(0, 5).map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-200 ${
                isActive ? "text-emerald-400" : "text-neutral-400"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[9px] font-bold tracking-wider">{item.name.split(" ")[0]}</span>
            </Link>
          );
        })}
        {/* Mobile More Button (leads to notifications/profile) */}
        <Link
          href="/profile"
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-200 ${
            pathname === "/profile" || pathname === "/notifications" || pathname === "/history" || pathname === "/ai-recommendation"
              ? "text-emerald-400" : "text-neutral-400"
          }`}
        >
          <span className="text-xl">⚙️</span>
          <span className="text-[9px] font-bold tracking-wider">More</span>
        </Link>
      </nav>
    </>
  );
};
export default Navbar;
