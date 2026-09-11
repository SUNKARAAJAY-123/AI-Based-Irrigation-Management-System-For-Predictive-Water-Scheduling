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
  Play, 
  Square,
  Sparkles,
  CheckCircle2
} from "lucide-react";

import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import StatusBadge from "@/components/ui/StatusBadge";

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
  const [success, setSuccess] = useState<string | null>(null);
  const [cacheTimestamp, setCacheTimestamp] = useState<string | null>(null);

  // Manual Irrigation Valve Control State
  const [isWatering, setIsWatering] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(20); // 20 mins default
  const [timerSeconds, setTimerSeconds] = useState<number>(0);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else {
      fetchSchedule();
    }
  }, [user, locale]);

  // Active watering countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWatering && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (isWatering && timerSeconds === 0) {
      setIsWatering(false);
      setSuccess("Irrigation cycle completed successfully!");
    }
    return () => clearInterval(interval);
  }, [isWatering, timerSeconds]);

  const fetchSchedule = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isOnline) {
        const dashboardPayload = await api.get<DashboardData>("/farmer/dashboard");
        setSchedule(dashboardPayload.today_schedule);
        setNextIrrigation(dashboardPayload.next_irrigation);
        
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

  useEffect(() => {
    if (user) {
      fetchSchedule();
    }
  }, [isOnline]);

  const handleStartManualIrrigation = () => {
    setIsWatering(true);
    setTimerSeconds(selectedDuration * 60);
    setSuccess(`Started manual irrigation valve for ${selectedDuration} minutes.`);
  };

  const handleStopManualIrrigation = () => {
    setIsWatering(false);
    setTimerSeconds(0);
    setSuccess("Irrigation valve turned off.");
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading && schedule.length === 0) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <LoadingState type="full" message="Loading irrigation schedule and valve controls..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a08] text-neutral-100 px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-8 max-w-4xl mx-auto space-y-6">
      
      <PageHeader
        title={t("schedule.title") || "Irrigation Control & Schedule"}
        subtitle={t("schedule.subtitle") || "Control water valves, set timers, and view automated AI water schedules."}
        icon={<Droplet className="w-6 h-6 stroke-[2.5]" />}
        backHref="/dashboard"
      />

      {!isOnline && (
        <div className="bg-amber-500 text-neutral-950 font-black text-center py-2.5 px-4 rounded-2xl text-xs flex justify-center items-center gap-2 shadow-md">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Working offline. {cacheTimestamp && `(${cacheTimestamp})`}</span>
        </div>
      )}

      {error && <ErrorState message={error} onRetry={fetchSchedule} />}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-3 rounded-2xl flex items-center gap-2 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Manual Valve Action Control Card */}
      <Card variant="accent" padding="lg" className="space-y-4">
        <CardHeader>
          <CardTitle>
            <Droplet className="w-5 h-5 text-sky-400" />
            Interactive Valve Control
          </CardTitle>
          <StatusBadge status={isWatering ? "ATTENTION" : "GOOD"} label={isWatering ? "Watering Active 💧" : "Valve Ready"} size="md" />
        </CardHeader>

        {isWatering ? (
          <div className="text-center py-6 space-y-4">
            <div className="relative inline-flex items-center justify-center">
              <span className="w-24 h-24 rounded-full bg-emerald-500/20 animate-ping absolute" />
              <div className="w-24 h-24 rounded-full bg-emerald-500/30 border-2 border-emerald-400 flex items-center justify-center relative shadow-xl">
                <Droplet className="w-10 h-10 text-emerald-300 animate-bounce" />
              </div>
            </div>

            <div>
              <span className="text-3xl font-black text-white font-mono">{formatTimer(timerSeconds)}</span>
              <p className="text-xs text-emerald-400 font-extrabold mt-1">Watering Field 01 in Progress...</p>
            </div>

            <Button
              variant="destructive"
              size="lg"
              onClick={handleStopManualIrrigation}
              leftIcon={<Square className="w-5 h-5 fill-current" />}
              className="w-full sm:w-auto"
            >
              Stop Irrigation Valve
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-2">
                Select Watering Duration:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 20, 30, 45].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setSelectedDuration(mins)}
                    className={`py-3 rounded-2xl text-xs font-black transition-all touch-target cursor-pointer border ${
                      selectedDuration === mins
                        ? "bg-emerald-500 text-neutral-950 border-emerald-400 shadow-md scale-102"
                        : "bg-neutral-900/80 text-neutral-300 border-neutral-800 hover:border-neutral-700"
                    }`}
                  >
                    {mins} Mins
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleStartManualIrrigation}
              leftIcon={<Play className="w-5 h-5 fill-current" />}
              className="w-full"
            >
              Start Irrigation Valve ({selectedDuration} mins)
            </Button>
          </div>
        )}
      </Card>

      {/* Next Irrigation Summary Box */}
      <Card variant="glass" padding="md" className="flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-inner shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">
              {t("dashboard.next_irrigation") || "Next Scheduled Irrigation"}
            </span>
            <span className="text-base font-black text-white mt-0.5 block">
              {nextIrrigation}
            </span>
          </div>
        </div>
      </Card>

      {/* Today's Irrigation Schedule */}
      <Card variant="glass" padding="lg" className="space-y-4">
        <CardHeader>
          <CardTitle>
            <Clock className="w-4.5 h-4.5 text-emerald-400" />
            {t("dashboard.today_schedule") || "Today's Irrigation Plan"}
          </CardTitle>
        </CardHeader>

        {schedule.length === 0 ? (
          <div className="bg-neutral-950 border border-neutral-850 rounded-2xl p-8 text-center text-xs text-neutral-400 font-bold">
            <Droplet className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
            No automated irrigation events needed for today. Soil moisture levels are healthy.
          </div>
        ) : (
          <div className="space-y-3">
            {schedule.map((event) => (
              <div 
                key={event.id}
                className="bg-neutral-950/80 border border-neutral-850 rounded-2xl p-4 space-y-3 hover:border-emerald-500/30 transition-colors shadow-sm"
              >
                <div className="flex justify-between items-center border-b border-neutral-900 pb-2.5">
                  <div className="flex items-center gap-2 text-xs font-black text-white">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>{event.time}</span>
                  </div>
                  <StatusBadge status={event.status} size="sm" />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold block uppercase">Field</span>
                    <span className="text-sm font-black text-white mt-0.5 block">
                      💧 {event.field_name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-400 font-bold block uppercase">Crop</span>
                    <span className="text-sm font-black text-white mt-0.5 block">
                      🌾 {event.crop_name}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-neutral-900/60 border border-neutral-850 p-3 rounded-xl text-xs">
                  <div>
                    <span className="text-[9px] text-neutral-400 font-bold uppercase">Duration</span>
                    <span className="block font-black text-white mt-0.5">⏱️ {event.duration}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-neutral-400 font-bold uppercase">Water Volume</span>
                    <span className="block font-black text-emerald-400 mt-0.5">{event.water_volume} Liters</span>
                  </div>
                </div>

                {event.recommendation_text && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex gap-2 items-start text-xs">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-neutral-200 font-semibold leading-relaxed">
                      <strong className="text-emerald-400">AI Reason:</strong> {event.recommendation_text}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

    </div>
  );
}
