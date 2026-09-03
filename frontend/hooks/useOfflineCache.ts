"use client";

import { useState, useEffect } from "react";

export function useOfflineCache() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [cacheTime, setCacheTime] = useState<string | null>(null);

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

  const saveToCache = (key: string, data: unknown) => {
    if (typeof window !== "undefined") {
      const cacheObj = {
        data,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(key, JSON.stringify(cacheObj));
    }
  };

  const loadFromCache = <T>(key: string): { data: T | null; timestamp: string | null } => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(key);
      if (cached) {
        try {
          const cacheObj = JSON.parse(cached);
          return {
            data: cacheObj.data as T,
            timestamp: cacheObj.timestamp
          };
        } catch (e) {
          console.error("Failed to parse cached data:", e);
        }
      }
    }
    return { data: null, timestamp: null };
  };

  return {
    isOnline,
    saveToCache,
    loadFromCache
  };
}
