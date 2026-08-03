"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";

interface Notification {
  id: string;
  message: string;
  type: string; // "alert", "warning", "info"
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.get<Notification[]>("/notifications");
      setNotifications(data);
    } catch (err: any) {
      setError(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    setError(null);
    try {
      await api.put("/notifications/read", {});
      fetchNotifications();
    } catch (err: any) {
      setError(err.message || "Failed to clear notifications");
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-8 sm:px-6 lg:px-8 pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-neutral-800/80 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <span>🔔</span> Alert Center
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              Field alerts and predictive agricultural warnings
            </p>
          </div>

          {notifications.some(n => !n.is_read) && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-emerald-400 font-bold px-4.5 py-2 rounded-xl transition-all cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Notifications list */}
        {loading ? (
          <div className="py-12 flex justify-center">
            <span className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-neutral-900/20 border border-neutral-800/80 rounded-3xl p-12 text-center text-neutral-500 text-xs">
            No active alerts or warnings for your fields. Everything is optimal!
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-5 rounded-3xl border transition-all flex gap-4 ${
                  !n.is_read
                    ? "bg-neutral-900 border-neutral-700/80 shadow-md"
                    : "bg-neutral-900/40 border-neutral-800/60 opacity-60"
                }`}
              >
                {/* Type Icon indicator */}
                <div className="text-2xl mt-0.5">
                  {n.type === "alert" ? "🚨" : (n.type === "warning" ? "⚠️" : "ℹ️")}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      n.type === "alert" ? "text-rose-400" : (n.type === "warning" ? "text-amber-400" : "text-sky-400")
                    }`}>
                      {n.type} Log
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      {new Date(n.created_at).toLocaleDateString("en-IN")} {new Date(n.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-200 mt-2 font-medium leading-relaxed">
                    {n.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
