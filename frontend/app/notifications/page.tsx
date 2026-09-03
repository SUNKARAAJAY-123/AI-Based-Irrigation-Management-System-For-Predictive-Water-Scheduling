"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { useTranslation } from "@/context/LanguageContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { AlertCircle, Check, CheckCheck, Filter, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Notification {
  id: string;
  icon: string;
  severity: "Critical" | "Warning" | "Information";
  field: string;
  title?: string;
  time: string;
  message: string;
  recommended_action: string;
  is_read: boolean;
}

export default function FarmerNotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const { isOnline, saveToCache, loadFromCache } = useOfflineCache();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "information">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheTimestamp, setCacheTimestamp] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isOnline) {
        const queryParam = filter !== "all" ? `?severity=${filter}` : "";
        const data = await api.get<Notification[]>(`/farmer/notifications${queryParam}`);
        setNotifications(data);
        
        // Cache notifications
        saveToCache(`farmer_notifications_${filter}`, data);
        setCacheTimestamp(null);
      } else {
        const cached = loadFromCache<Notification[]>(`farmer_notifications_${filter}`);
        if (cached.data) {
          setNotifications(cached.data);
          const time = cached.timestamp ? new Date(cached.timestamp) : new Date();
          setCacheTimestamp(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } else {
          setError("You are offline and no cached notifications are available.");
        }
      }
    } catch (err) {
      const cached = loadFromCache<Notification[]>(`farmer_notifications_${filter}`);
      if (cached.data) {
        setNotifications(cached.data);
        const time = cached.timestamp ? new Date(cached.timestamp) : new Date();
        setCacheTimestamp(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else {
        setError((err as Error).message || "Failed to load notifications.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, filter, isOnline]);

  const handleMarkRead = async (id: string) => {
    if (!isOnline) return;
    try {
      await api.patch(`/farmer/notifications/${id}/read`, {});
      // Update local state directly for speedy feedback
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      setError((err as Error).message || "Failed to update notification status.");
    }
  };

  const handleMarkAllRead = async () => {
    if (!isOnline) return;
    try {
      await api.post("/farmer/notifications/read-all", {});
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      setError((err as Error).message || "Failed to mark all notifications as read.");
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-[#070a08] text-[#f2f7f4] pb-24">
      
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-neutral-950 font-bold text-center py-2.5 px-4 text-xs sticky top-0 z-50 flex justify-center items-center gap-1.5 shadow-md animate-fade-in">
          <span>⚠️ {t("common.offline_banner")} {cacheTimestamp && `(${cacheTimestamp})`}</span>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
        
        {/* Header */}
        <header className="flex justify-between items-center pb-3 border-b border-neutral-900">
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard" 
              className="p-2.5 bg-neutral-900 border border-neutral-800/80 rounded-2xl text-neutral-400 hover:text-white"
              aria-label="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">
                {t("notifications.title")}
              </h1>
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">
                Field Warnings & Insights
              </p>
            </div>
          </div>

          {isOnline && notifications.some(n => !n.is_read) && (
            <button
              onClick={handleMarkAllRead}
              className="text-[10px] font-black bg-emerald-500/10 border border-emerald-500/25 hover:border-emerald-500/55 text-emerald-450 px-3.5 py-2.5 rounded-2xl flex items-center gap-1 transition-all cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {t("notifications.mark_all_read")}
            </button>
          )}
        </header>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter Chips Bar */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(["all", "critical", "warning", "information"] as const).map((opt) => {
            const isActive = filter === opt;
            const labelKey = opt === "information" ? "notifications.info" : `notifications.${opt}`;
            const label = opt === "all" ? t("notifications.all") : t(labelKey);
            return (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border uppercase tracking-wider shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-emerald-500 text-neutral-950 border-emerald-450"
                    : "bg-neutral-900/50 border-neutral-900 text-neutral-450 hover:text-white"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Loading Spinner */}
        {loading && notifications.length === 0 ? (
          <div className="py-16 flex justify-center">
            <span className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-neutral-950 border border-neutral-900 rounded-3xl p-12 text-center text-neutral-500 text-xs font-semibold space-y-2">
            <p className="text-xl">☀️</p>
            <p>{t("notifications.empty_state")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (isOnline && !n.is_read) handleMarkRead(n.id);
                }}
                className={`p-4 rounded-3xl border transition-all flex gap-3.5 relative overflow-hidden cursor-pointer ${
                  !n.is_read
                    ? "bg-neutral-900 border-neutral-800 shadow-md scale-[1.01]"
                    : "bg-neutral-950/40 border-neutral-900/50 opacity-60 hover:opacity-100"
                }`}
              >
                {/* Visual Unread Indicator Dot */}
                {!n.is_read && (
                  <span className="absolute top-3.5 right-3.5 w-2 h-2 bg-emerald-500 rounded-full" />
                )}

                {/* Severity Badge / Icon */}
                <div className="text-2xl pt-1 select-none shrink-0">
                  {n.icon}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className={`text-[9px] font-black uppercase tracking-wider ${
                      n.severity === "Critical" 
                        ? "text-rose-400" 
                        : (n.severity === "Warning" ? "text-amber-400" : "text-sky-400")
                    }`}>
                      {n.title || `${n.severity} Alert`} • {n.field}
                    </span>
                    <span className="text-[8px] text-neutral-500 font-bold pr-3">
                      {n.time}
                    </span>
                  </div>
                  
                  <p className="text-xs text-neutral-200 mt-1.5 font-bold leading-relaxed">
                    {n.message}
                  </p>
                  
                  {n.recommended_action && (
                    <div className="mt-2.5 p-2 bg-neutral-950/60 border border-neutral-900 rounded-xl text-[10px]">
                      <span className="text-emerald-450 font-bold block mb-0.5 uppercase tracking-wider text-[8px]">
                        Recommended Action:
                      </span>
                      <p className="text-neutral-350 font-semibold">{n.recommended_action}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
