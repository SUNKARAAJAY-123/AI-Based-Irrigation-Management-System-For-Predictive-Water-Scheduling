"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckCheck, Settings, X, ArrowRight } from "lucide-react";
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

interface NotificationPopoverProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
  onItemClick: (n: Notification) => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  notifications,
  onMarkRead: _onMarkRead,
  onMarkAllRead,
  onClose,
  onItemClick
}) => {
  const { t } = useTranslation();
  const [showPrefs, setShowPrefs] = useState(false);

  return (
    <div className="absolute right-0 mt-3 w-96 bg-neutral-950/95 backdrop-blur-xl border border-neutral-900 rounded-3xl shadow-2xl z-50 overflow-hidden animate-slide-up max-h-[500px] flex flex-col">
      {showPrefs ? (
        <div className="p-5 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Preferences</h3>
            <button
              onClick={() => setShowPrefs(false)}
              className="p-1.5 hover:bg-neutral-900 rounded-xl text-neutral-500 hover:text-white"
              aria-label="Back to notifications"
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
          {/* Popover Header */}
          <div className="p-4 border-b border-neutral-900 flex justify-between items-center bg-neutral-950">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Notifications</span>
              <button
                onClick={() => setShowPrefs(true)}
                className="p-1.5 hover:bg-neutral-900 rounded-xl text-neutral-400 hover:text-emerald-450 transition-colors"
                aria-label="Notification Preferences"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
            
            {notifications.some((n) => !n.is_read) && (
              <button
                onClick={onMarkAllRead}
                className="text-[10px] font-black bg-emerald-500/10 border border-emerald-500/25 hover:border-emerald-500/50 text-emerald-450 px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                {t("notifications.mark_all_read")}
              </button>
            )}
          </div>

          {/* Notifications Scroll List */}
          <div className="flex-1 overflow-y-auto max-h-[350px] divide-y divide-neutral-900/60 no-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs font-semibold space-y-2 bg-neutral-950/20">
                <p className="text-xl">☀️</p>
                <p>{t("notifications.empty_state")}</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => onItemClick(n)}
                  className={`p-4 hover:bg-neutral-900/50 transition-all flex gap-3 cursor-pointer relative ${
                    !n.is_read ? "bg-neutral-900/10" : "opacity-60"
                  }`}
                >
                  {!n.is_read && (
                    <span className="absolute top-4 right-4 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  )}
                  
                  <div className="text-xl pt-0.5 select-none shrink-0">
                    {n.severity === "Critical" ? "🔴" : n.severity === "Warning" ? "🟡" : "🔵"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-1.5">
                      <span className={`text-[9px] font-black uppercase tracking-wider ${
                        n.severity === "Critical"
                          ? "text-rose-450"
                          : n.severity === "Warning"
                          ? "text-amber-450"
                          : "text-sky-450"
                      }`}>
                        {n.title || `${n.severity} Alert`} • {n.field}
                      </span>
                      <span className="text-[8px] text-neutral-500 font-bold shrink-0">
                        {n.time}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-200 mt-1 font-bold leading-relaxed whitespace-pre-wrap">
                      {n.message}
                    </p>

                    {n.recommended_action && (
                      <div className="mt-2 p-2 bg-neutral-950/60 border border-neutral-900 rounded-xl text-[9px]">
                        <span className="text-emerald-450 font-bold block mb-0.5 uppercase tracking-wider text-[7px]">
                          Action:
                        </span>
                        <p className="text-neutral-400 font-semibold whitespace-pre-wrap">{n.recommended_action}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* View All Footer */}
          <div className="p-3 border-t border-neutral-900 bg-neutral-950 text-center">
            <Link
              href="/notifications"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-1.5 text-[10px] font-black text-neutral-400 hover:text-white uppercase tracking-wider transition-colors"
            >
              <span>View All Notifications</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
};
export default NotificationPopover;
