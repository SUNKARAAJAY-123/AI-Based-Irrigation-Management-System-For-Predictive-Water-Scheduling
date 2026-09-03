"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCheck, Settings, X, ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { NotificationPreferences } from "./NotificationPreferences";

interface Notification {
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

interface MobileNotificationSheetProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
  onItemClick: (n: Notification) => void;
}

export const MobileNotificationSheet: React.FC<MobileNotificationSheetProps> = ({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClose,
  onItemClick
}) => {
  const { t } = useTranslation();
  const [showPrefs, setShowPrefs] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Disable body scroll when open
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Sheet Container */}
      <div className="relative w-full max-h-[85vh] bg-neutral-950 border-t border-neutral-900 rounded-t-[32px] z-10 shadow-2xl flex flex-col overflow-hidden animate-slide-up pb-safe">
        
        {/* Drag handle decorator */}
        <div className="mx-auto my-2.5 w-12 h-1 bg-neutral-800 rounded-full" />

        {showPrefs ? (
          <div className="p-5 flex-1 overflow-y-auto pb-8">
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => setShowPrefs(false)}
                className="flex items-center gap-1.5 text-xs font-black text-neutral-400 hover:text-white uppercase tracking-wider"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Notifications</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 bg-neutral-900 border border-neutral-800 rounded-2xl text-neutral-400 hover:text-white"
                aria-label="Close preferences"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <NotificationPreferences
              onSaveSuccess={() => setShowPrefs(false)}
              onCancel={() => setShowPrefs(false)}
            />
          </div>
        ) : (
          <>
            {/* Sheet Header */}
            <div className="px-5 pb-4 pt-1 border-b border-neutral-900 flex justify-between items-center bg-neutral-950">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">Notifications</h2>
                <button
                  onClick={() => setShowPrefs(true)}
                  className="p-2 bg-neutral-900 border border-neutral-800/80 rounded-2xl text-neutral-400 hover:text-emerald-450 transition-colors"
                  aria-label="Notification Preferences"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2">
                {notifications.some((n) => !n.is_read) && (
                  <button
                    onClick={onMarkAllRead}
                    className="text-[10px] font-black bg-emerald-500/10 border border-emerald-500/25 text-emerald-450 px-3 py-2.5 rounded-2xl flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    {t("notifications.mark_all_read")}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2.5 bg-neutral-900 border border-neutral-800/80 rounded-2xl text-neutral-400 hover:text-white"
                  aria-label="Close notification panel"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Notifications Scroll Area */}
            <div className="flex-1 overflow-y-auto px-5 py-2 divide-y divide-neutral-900/60 no-scrollbar pb-8">
              {notifications.length === 0 ? (
                <div className="py-16 text-center text-neutral-500 text-xs font-semibold space-y-3">
                  <p className="text-3xl">☀️</p>
                  <p>{t("notifications.empty_state")}</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => onItemClick(n)}
                    className={`py-4.5 flex gap-3.5 active:bg-neutral-900/40 transition-colors relative min-h-[80px] cursor-pointer ${
                      !n.is_read ? "" : "opacity-60"
                    }`}
                  >
                    {!n.is_read && (
                      <span className="absolute top-5 right-2 w-2 h-2 bg-emerald-500 rounded-full" />
                    )}

                    <div className="text-2xl pt-1 select-none shrink-0">
                      {n.severity === "Critical" ? "🔴" : n.severity === "Warning" ? "🟡" : "🔵"}
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex justify-between items-baseline gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${
                          n.severity === "Critical"
                            ? "text-rose-450"
                            : n.severity === "Warning"
                            ? "text-amber-450"
                            : "text-sky-450"
                        }`}>
                          {n.title || `${n.severity} Alert`} • {n.field}
                        </span>
                        <span className="text-[9px] text-neutral-500 font-bold">
                          {n.time}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-200 mt-1.5 font-bold leading-relaxed">
                        {n.message}
                      </p>

                      {n.recommended_action && (
                        <div className="mt-2.5 p-3 bg-neutral-900/50 border border-neutral-850/80 rounded-2xl text-[10px]">
                          <span className="text-emerald-450 font-bold block mb-0.5 uppercase tracking-wider text-[8px]">
                            Recommended Action:
                          </span>
                          <p className="text-neutral-300 font-semibold leading-normal">{n.recommended_action}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* View All Footer for Mobile */}
            <div className="p-4.5 border-t border-neutral-900 bg-neutral-950 text-center">
              <Link
                href="/notifications"
                onClick={onClose}
                className="w-full flex items-center justify-center gap-1.5 py-3.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs font-black text-neutral-350 uppercase tracking-wider transition-all rounded-2xl"
              >
                <span>View All Notifications</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
export default MobileNotificationSheet;
