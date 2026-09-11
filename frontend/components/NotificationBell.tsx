"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { api } from "@/services/api";
import { useTranslation } from "@/context/LanguageContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useRouter } from "next/navigation";
import { NotificationPopover } from "./NotificationPopover";
import { MobileNotificationSheet } from "./MobileNotificationSheet";
import { subscribeToPushNotifications } from "@/lib/push";

export interface Notification {
  id: string;
  icon: string;
  severity: "Critical" | "Warning" | "Information";
  field: string;
  field_id?: string;
  title: string;
  time: string;
  message: string;
  recommended_action: string;
  is_read: boolean;
  type: string;
  metadata: Record<string, unknown>;
}

export const NotificationBell: React.FC = () => {
  const { isOnline } = useOfflineCache();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch unread count & latest notifications
  const refreshData = async () => {
    try {
      const countRes = await api.get<{ unread_count: number }>("/farmer/notifications/unread-count");
      setUnreadCount(countRes.unread_count);

      const notifsRes = await api.get<Notification[]>("/farmer/notifications");
      setNotifications(notifsRes);
    } catch (err) {
      console.error("Failed to fetch notifications info:", err);
    }
  };

  useEffect(() => {
    refreshData();
    
    // Set up standard periodic check (non-aggressive: every 60s)
    const interval = setInterval(refreshData, 60000);

    // Auto-subscribe to push notifications if permission is already granted
    if (typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "granted") {
      subscribeToPushNotifications();
    }

    // Listen for incoming real-time web push notification events
    const handlePushReceived = () => {
      refreshData();
    };
    window.addEventListener("notification-received", handlePushReceived);

    return () => {
      clearInterval(interval);
      window.removeEventListener("notification-received", handlePushReceived);
    };
  }, []);

  // Keyboard accessibility: close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Click outside to close desktop popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleMarkRead = async (id: string) => {
    // Optimistic UI updates
    const originalNotifs = [...notifications];
    const originalCount = unreadCount;

    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    if (!isOnline) return;

    try {
      await api.patch(`/farmer/notifications/${id}/read`, {});
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      // Rollback on failure
      setNotifications(originalNotifs);
      setUnreadCount(originalCount);
    }
  };

  const handleMarkAllRead = async () => {
    // Optimistic UI updates
    const originalNotifs = [...notifications];
    const originalCount = unreadCount;

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    if (!isOnline) return;

    try {
      await api.patch("/farmer/notifications/read-all", {});
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
      // Rollback
      setNotifications(originalNotifs);
      setUnreadCount(originalCount);
    }
  };

  const handleItemClick = async (n: Notification) => {
    // 1. Mark as read
    if (!n.is_read) {
      await handleMarkRead(n.id);
    }
    
    // 2. Close panel
    setIsOpen(false);

    // 3. Navigate/Deep-link using metadata
    const fieldId = (n.field_id || n.metadata?.field_id || "") as string;
    const type = (n.type || n.metadata?.type || "") as string;

    if (type.startsWith("sensor_failure") || type === "sensor_data_missing") {
      router.push("/sensors");
    } else if (type === "heavy_rainfall" || type.startsWith("extreme_")) {
      router.push("/weather");
    } else if (type.includes("completed") || type.includes("history")) {
      router.push("/history");
    } else if (fieldId) {
      router.push(`/fields/${fieldId}`);
    } else {
      router.push("/dashboard");
    }
  };

  // Badge content formatting (e.g. 99+)
  const badgeLabel = unreadCount > 99 ? "99+" : unreadCount.toString();
  const badgeAria = unreadCount > 99 ? "More than 99 unread notifications" : `${unreadCount} unread notifications`;

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 bg-neutral-900 border border-neutral-850 hover:border-neutral-800 rounded-2xl text-neutral-400 hover:text-white transition-all cursor-pointer flex items-center justify-center"
        aria-label={unreadCount > 0 ? badgeAria : "Notifications"}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" />
        
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-emerald-500 text-neutral-950 font-black text-[9px] rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center border border-neutral-950 animate-pulse shadow-sm">
            {badgeLabel}
          </span>
        )}
      </button>

      {/* Desktop Popover */}
      {isOpen && (
        <div className="hidden md:block">
          <NotificationPopover
            notifications={notifications}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onClose={() => setIsOpen(false)}
            onItemClick={handleItemClick}
          />
        </div>
      )}

      {/* Mobile Bottom Sheet */}
      {isOpen && (
        <div className="md:hidden">
          <MobileNotificationSheet
            notifications={notifications}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onClose={() => setIsOpen(false)}
            onItemClick={handleItemClick}
          />
        </div>
      )}
    </div>
  );
};
export default NotificationBell;
