"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { useTranslation } from "@/context/LanguageContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { Bell, CheckCheck } from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import AlertCard from "@/components/ui/AlertCard";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";

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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isOnline) {
        const queryParam = filter !== "all" ? `?severity=${filter}` : "";
        const data = await api.get<Notification[]>(`/farmer/notifications${queryParam}`);
        setNotifications(data);
        saveToCache(`farmer_notifications_${filter}`, data);
      } else {
        const cached = loadFromCache<Notification[]>(`farmer_notifications_${filter}`);
        if (cached.data) {
          setNotifications(cached.data);
        } else {
          setError("You are offline and no cached notifications are available.");
        }
      }
    } catch (err) {
      const cached = loadFromCache<Notification[]>(`farmer_notifications_${filter}`);
      if (cached.data) {
        setNotifications(cached.data);
      } else {
        setError((err as Error).message || "Failed to load notifications.");
      }
    } finally {
      setLoading(false);
    }
  }, [filter, isOnline, loadFromCache, saveToCache]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  const handleMarkRead = async (id: string) => {
    if (!isOnline) return;
    try {
      await api.patch(`/farmer/notifications/${id}/read`, {});
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
    <div className="min-h-screen bg-[#060a08] text-neutral-100 px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-8 max-w-4xl mx-auto space-y-6">
      
      <PageHeader
        title={t("notifications.title") || "Field Notifications & Weather Alerts"}
        subtitle="Real-time alerts regarding soil moisture thresholds, heatwaves, and rain advisories."
        icon={<Bell className="w-6 h-6 stroke-[2.5]" />}
        backHref="/dashboard"
        action={
          isOnline && notifications.some(n => !n.is_read) ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              leftIcon={<CheckCheck className="w-4 h-4" />}
            >
              Mark All Read
            </Button>
          ) : undefined
        }
      />

      {error && <ErrorState message={error} onRetry={fetchNotifications} />}

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {(["all", "critical", "warning", "information"] as const).map((opt) => {
          const isActive = filter === opt;
          return (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all border uppercase tracking-wider shrink-0 cursor-pointer touch-target ${
                isActive
                  ? "bg-emerald-500 text-neutral-950 border-emerald-450 shadow-md"
                  : "bg-neutral-900 border-neutral-850 text-neutral-400 hover:text-white"
              }`}
            >
              {opt === "all" ? "All Alerts" : opt}
            </button>
          );
        })}
      </div>

      {loading ? (
        <LoadingState message="Fetching notifications..." />
      ) : notifications.length === 0 ? (
        <Card variant="glass" padding="lg" className="text-center py-12 space-y-3">
          <Bell className="w-10 h-10 text-neutral-600 mx-auto" />
          <h3 className="text-base font-black text-white">No Active Alerts</h3>
          <p className="text-xs text-neutral-400 font-semibold max-w-xs mx-auto">
            Your fields and weather forecasts are operating within optimal parameters.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((n) => {
            const alertType = n.severity === "Critical" 
              ? "CRITICAL" 
              : (n.severity === "Warning" ? "WARNING" : "INFO");

            return (
              <AlertCard
                key={n.id}
                title={`${n.title || n.severity} (${n.field})`}
                message={n.message}
                severity={alertType}
                time={n.time}
                fieldName={n.field}
                actionText={n.recommended_action || "Mark Read"}
                onAction={() => {
                  if (isOnline && !n.is_read) handleMarkRead(n.id);
                }}
              />
            );
          })}
        </div>
      )}

    </div>
  );
}
