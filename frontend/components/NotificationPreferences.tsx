"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/services/api";
import { useTranslation } from "@/context/LanguageContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { Settings, Save, AlertCircle, CheckCircle, Clock, Volume2, Globe } from "lucide-react";
import { Locale } from "@/lib/translations";
import { subscribeToPushNotifications } from "@/lib/push";

interface Preferences {
  push_enabled: boolean;
  sms_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  critical_alerts_only: boolean;
  preferred_language: string;
}

interface NotificationPreferencesProps {
  onSaveSuccess?: () => void;
  onCancel?: () => void;
}

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  onSaveSuccess,
  onCancel
}) => {
  const { t, setLocale } = useTranslation();
  const { isOnline } = useOfflineCache();
  const [prefs, setPrefs] = useState<Preferences>({
    push_enabled: true,
    sms_enabled: true,
    quiet_hours_start: "",
    quiet_hours_end: "",
    critical_alerts_only: false,
    preferred_language: "en-IN"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const data = await api.get<Preferences>("/farmer/notifications/preferences");
        setPrefs({
          ...data,
          quiet_hours_start: data.quiet_hours_start || "",
          quiet_hours_end: data.quiet_hours_end || ""
        });
      } catch (err) {
        setError((err as Error).message || "Failed to load preferences");
      } finally {
        setLoading(false);
      }
    };
    fetchPrefs();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
      setError("Cannot update preferences while offline.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.put("/farmer/notifications/preferences", {
        ...prefs,
        quiet_hours_start: prefs.quiet_hours_start || null,
        quiet_hours_end: prefs.quiet_hours_end || null
      });
      setSuccess(true);
      // Trigger browser push subscription if enabled
      if (prefs.push_enabled) {
        await subscribeToPushNotifications();
      }
      // Synchronize frontend i18n locale state
      if (prefs.preferred_language) {
        await setLocale(prefs.preferred_language as Locale);
      }
      setTimeout(() => {
        setSuccess(false);
        if (onSaveSuccess) onSaveSuccess();
      }, 1500);
    } catch (err) {
      setError((err as Error).message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-4">
        <span className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">
          {t("common.loading")}
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-5 text-neutral-200">
      <div className="flex items-center gap-2 pb-2 border-b border-neutral-900">
        <Settings className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
          Notification Preferences
        </span>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/25 text-rose-350 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-350 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Preferences updated successfully!</span>
        </div>
      )}

      {/* Language Setting */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-neutral-400" />
          {t("settings.language_selector")}
        </label>
        <select
          value={prefs.preferred_language}
          onChange={(e) => setPrefs(prev => ({ ...prev, preferred_language: e.target.value }))}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50 font-bold"
        >
          <option value="en-IN">English (India)</option>
          <option value="hi-IN">हिन्दी (Hindi)</option>
          <option value="te-IN">తెలుగు (Telugu)</option>
          <option value="kn-IN">ಕನ್ನಡ (Kannada)</option>
          <option value="ta-IN">தமிழ் (Tamil)</option>
          <option value="ml-IN">മലയാളം (Malayalam)</option>
          <option value="mr-IN">मराठी (Marathi)</option>
          <option value="bn-IN">বাংলা (Bengali)</option>
          <option value="gu-IN">ગુજરાતી (Gujarati)</option>
          <option value="pa-IN">ਪੰਜਾਬੀ (Punjabi)</option>
          <option value="or-IN">ଓଡ଼ିଆ (Odia)</option>
          <option value="as-IN">অসমীয়া (Assamese)</option>
          <option value="ur-IN">اردو (Urdu)</option>
        </select>
      </div>

      {/* Toggle Channels */}
      <div className="space-y-3 pt-1">
        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">
          Channels
        </label>
        
        <div className="flex justify-between items-center bg-neutral-900/40 border border-neutral-850 p-3.5 rounded-2xl">
          <div>
            <h4 className="text-xs font-bold text-neutral-200">Push Notifications</h4>
            <p className="text-[10px] text-neutral-500 font-semibold mt-0.5">Receive alerts on your browser screen</p>
          </div>
          <button
            type="button"
            onClick={() => setPrefs(prev => ({ ...prev, push_enabled: !prev.push_enabled }))}
            className={`w-11 h-6 rounded-full transition-colors relative outline-none flex items-center ${
              prefs.push_enabled ? "bg-emerald-500" : "bg-neutral-800"
            }`}
            aria-label="Toggle Push Notifications"
          >
            <span className={`w-4 h-4 rounded-full bg-neutral-950 absolute transition-transform ${
              prefs.push_enabled ? "translate-x-6" : "translate-x-1"
            }`} />
          </button>
        </div>

        <div className="flex justify-between items-center bg-neutral-900/40 border border-neutral-850 p-3.5 rounded-2xl">
          <div>
            <h4 className="text-xs font-bold text-neutral-200">SMS Critical Alerts</h4>
            <p className="text-[10px] text-neutral-500 font-semibold mt-0.5">Fallback messages direct to phone</p>
          </div>
          <button
            type="button"
            onClick={() => setPrefs(prev => ({ ...prev, sms_enabled: !prev.sms_enabled }))}
            className={`w-11 h-6 rounded-full transition-colors relative outline-none flex items-center ${
              prefs.sms_enabled ? "bg-emerald-500" : "bg-neutral-800"
            }`}
            aria-label="Toggle SMS Alerts"
          >
            <span className={`w-4 h-4 rounded-full bg-neutral-950 absolute transition-transform ${
              prefs.sms_enabled ? "translate-x-6" : "translate-x-1"
            }`} />
          </button>
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-neutral-400" />
          Quiet Hours (IST)
        </label>
        <p className="text-[10px] text-neutral-500 font-semibold leading-relaxed">
          Silences non-critical pushes and SMS during these hours. Safety-critical alerts will always be delivered.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
              Start Time
            </span>
            <input
              type="time"
              value={prefs.quiet_hours_start || ""}
              onChange={(e) => setPrefs(prev => ({ ...prev, quiet_hours_start: e.target.value }))}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500/50 font-bold"
            />
          </div>
          <div>
            <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
              End Time
            </span>
            <input
              type="time"
              value={prefs.quiet_hours_end || ""}
              onChange={(e) => setPrefs(prev => ({ ...prev, quiet_hours_end: e.target.value }))}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500/50 font-bold"
            />
          </div>
        </div>
      </div>

      {/* Critical Filter Only */}
      <div className="flex justify-between items-center bg-neutral-900/40 border border-neutral-850 p-3.5 rounded-2xl">
        <div className="flex gap-2">
          <Volume2 className="w-5 h-5 text-neutral-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-neutral-200">Critical Alerts Only</h4>
            <p className="text-[10px] text-neutral-500 font-semibold mt-0.5">Filter out all warnings and weekly logs</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPrefs(prev => ({ ...prev, critical_alerts_only: !prev.critical_alerts_only }))}
          className={`w-11 h-6 rounded-full transition-colors relative outline-none flex items-center ${
            prefs.critical_alerts_only ? "bg-emerald-500" : "bg-neutral-800"
          }`}
          aria-label="Toggle Critical Alerts Only"
        >
          <span className={`w-4 h-4 rounded-full bg-neutral-950 absolute transition-transform ${
            prefs.critical_alerts_only ? "translate-x-6" : "translate-x-1"
          }`} />
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-neutral-900 border border-neutral-850 hover:bg-neutral-850 text-xs font-black uppercase tracking-wider py-3 rounded-2xl transition-colors cursor-pointer"
          >
            {t("common.cancel")}
          </button>
        )}
        <button
          type="submit"
          disabled={saving || !isOnline}
          className="flex-1 bg-emerald-500 text-neutral-950 hover:bg-emerald-600 disabled:opacity-50 text-xs font-black uppercase tracking-wider py-3 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{t("common.save")}</span>
        </button>
      </div>
    </form>
  );
};
export default NotificationPreferences;
