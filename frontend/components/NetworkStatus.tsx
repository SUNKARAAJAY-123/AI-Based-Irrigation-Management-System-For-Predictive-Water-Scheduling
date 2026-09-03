"use client";

import React, { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";

export const NetworkStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [showRestored, setShowRestored] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        setShowRestored(true);
        setTimeout(() => setShowRestored(false), 3000);
      };

      const handleOffline = () => {
        setIsOnline(false);
        setWasOffline(true);
        setShowRestored(false);
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  if (isOnline && !showRestored) return null;

  if (!isOnline) {
    return (
      <div className="bg-amber-600 text-neutral-950 font-black text-center py-2 px-4 text-[10px] uppercase tracking-widest sticky top-0 z-50 flex justify-center items-center gap-1.5 shadow-md animate-fade-in select-none">
        <WifiOff className="w-3.5 h-3.5 shrink-0" />
        <span>⚠️ You are offline. Showing last synchronized information.</span>
      </div>
    );
  }

  if (showRestored && wasOffline) {
    return (
      <div className="bg-emerald-500 text-neutral-950 font-black text-center py-2 px-4 text-[10px] uppercase tracking-widest sticky top-0 z-50 flex justify-center items-center gap-1.5 shadow-md animate-fade-in select-none">
        <Wifi className="w-3.5 h-3.5 shrink-0" />
        <span>Connection restored</span>
      </div>
    );
  }

  return null;
};

export const NetworkBadge: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
      isOnline 
        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
        : "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse"
    }`}>
      <span>{isOnline ? "🟢 Online" : "🔴 Offline"}</span>
    </span>
  );
};

export default NetworkStatus;
