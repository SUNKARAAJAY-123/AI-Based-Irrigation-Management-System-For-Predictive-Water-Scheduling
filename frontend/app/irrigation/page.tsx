"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { useTranslation } from "@/context/LanguageContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { 
  Droplet, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  ChevronLeft
} from "lucide-react";
import Link from "next/link";

interface ScheduleEvent {
  id: string;
  time: string;
  field_id: string;
  field_name: string;
  crop_name: string;
  duration: string;
  status: string;
  water_volume: number;
  is_required: boolean;
  recommendation_text: string;
}

interface DashboardData {
  today_schedule: ScheduleEvent[];
  next_irrigation: string;
}

export default function IrrigationSchedulePage() {
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const { isOnline, saveToCache, loadFromCache } = useOfflineCache();
  const router = useRouter();

  const [schedule, setSchedule] = useState<ScheduleEvent[]>([]);
  const [nextIrrigation, setNextIrrigation] = useState<string>("No irrigation scheduled");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheTimestamp, setCacheTimestamp] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else {
      fetchSchedule();
    }
  }, [user, locale]);

  const fetchSchedule = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isOnline) {
        const dashboardPayload = await api.get<DashboardData>("/farmer/dashboard");
        setSchedule(dashboardPayload.today_schedule);
        setNextIrrigation(dashboardPayload.next_irrigation);
        
        // Cache the schedule specifically
        saveToCache("farmer_irrigation_schedule", dashboardPayload.today_schedule);
        saveToCache("farmer_next_irrigation", dashboardPayload.next_irrigation);
        setCacheTimestamp(null);
      } else {
        const cachedSchedule = loadFromCache<ScheduleEvent[]>("farmer_irrigation_schedule");
        const cachedNext = loadFromCache<string>("farmer_next_irrigation");
        
        if (cachedSchedule.data) {
          setSchedule(cachedSchedule.data);
          setNextIrrigation(cachedNext.data || "No irrigation scheduled");
          const time = cachedSchedule.timestamp ? new Date(cachedSchedule.timestamp) : new Date();
          setCacheTimestamp(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } else {
          setError("You are offline and no cached schedule is available.");
        }
      }
    } catch (err) {
      // Fallback
      const cachedSchedule = loadFromCache<ScheduleEvent[]>("farmer_irrigation_schedule");
      const cachedNext = loadFromCache<string>("farmer_next_irrigation");
      if (cachedSchedule.data) {
        setSchedule(cachedSchedule.data);
        setNextIrrigation(cachedNext.data || "No irrigation scheduled");
        const time = cachedSchedule.timestamp ? new Date(cachedSchedule.timestamp) : new Date();
        setCacheTimestamp(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else {
        setError("Failed to load irrigation schedule.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when online status changes
  useEffect(() => {
    if (user) {
      fetchSchedule();
    }
  }, [isOnline]);

  if (loading && schedule.length === 0) {
    return (
      <div className="min-h-screen bg-[#070a08] flex flex-col justify-center items-center gap-3">
        <span className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070a08] text-[#f2f7f4] pb-24 px-4 pt-6 space-y-6">
      
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-neutral-900 pb-4">
        <Link href="/dashboard" className="p-2 bg-neutral-900 border border-neutral-850 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white leading-none flex items-center gap-1.5">
            <Droplet className="w-6 h-6 text-emerald-450" /> {t("schedule.title")}
          </h1>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-1">
            {t("schedule.subtitle")}
          </p>
        </div>
      </header>

      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-neutral-950 font-bold text-center py-2.5 px-4 rounded-2xl text-xs flex justify-center items-center gap-1.5 shadow-md">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {t("common.offline_banner")} {cacheTimestamp && `(Last synced: ${cacheTimestamp})`}
          </span>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-450 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Next Irrigation Summary Box */}
      <div className="bg-gradient-to-br from-emerald-950/20 to-neutral-950 border border-emerald-900/20 rounded-3xl p-5 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-inner">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block">
              {t("dashboard.next_irrigation")}
            </span>
            <span className="text-sm font-black text-white mt-1 block">
              {nextIrrigation}
            </span>
          </div>
        </div>
      </div>

      {/* Today's Schedule Section */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider px-1">
          {t("dashboard.today_schedule")}
        </h3>

        {schedule.length === 0 ? (
          <div className="bg-neutral-950 border border-neutral-900 rounded-3xl p-8 text-center text-xs text-neutral-500 font-semibold">
            <Droplet className="w-10 h-10 text-neutral-800 mx-auto mb-3" />
            {t("dashboard.no_schedule")}
          </div>
        ) : (
          <div className="space-y-4">
            {schedule.map((event) => (
              <div 
                key={event.id}
                className="bg-neutral-950 border border-neutral-900 rounded-3xl p-5 space-y-4 hover:border-emerald-500/20 transition-colors shadow-md"
              >
                {/* Time & Status Badge */}
                <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Clock className="w-4 h-4 text-emerald-450" />
                    <span>{event.time}</span>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    event.status.toLowerCase() === "completed" || event.status.toLowerCase() === "applied"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  }`}>
                    {event.status}
                  </span>
                </div>

                {/* Field & Crop Details */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-500 font-bold block uppercase tracking-wider">{t("nav.fields")}</span>
                    <span className="text-sm font-extrabold text-white mt-0.5 block flex items-center gap-1.5">
                      💧 {event.field_name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-500 font-bold block uppercase tracking-wider">{t("fields.crop")}</span>
                    <span className="text-sm font-extrabold text-white mt-0.5 block">
                      🌾 {event.crop_name}
                    </span>
                  </div>
                </div>

                {/* Duration & Recommended water volume */}
                <div className="grid grid-cols-2 gap-4 bg-neutral-900/40 border border-neutral-900 p-3.5 rounded-2xl">
                  <div>
                    <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">{t("schedule.duration")}</span>
                    <span className="block text-xs font-extrabold text-white mt-1">
                      ⏱️ {event.duration}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">{t("schedule.water_vol")}</span>
                    <span className="block text-xs font-extrabold text-white mt-1">
                      {event.water_volume} Liters
                    </span>
                  </div>
                </div>

                {/* AI Recommendation */}
                <div className="bg-emerald-950/10 border border-emerald-950/20 p-3 rounded-2xl flex gap-2.5 items-start">
                  <span className="text-emerald-450 shrink-0 mt-0.5">✨</span>
                  <p className="text-[11px] text-neutral-350 leading-relaxed font-semibold">
                    <strong className="text-emerald-400">{t("dashboard.ai_recommendation")}:</strong> {event.recommendation_text}
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
