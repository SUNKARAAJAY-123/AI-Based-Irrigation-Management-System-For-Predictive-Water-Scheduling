"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { useTranslation } from "@/context/LanguageContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { 
  Droplet, 
  Sprout, 
  CloudSun, 
  Brain, 
  Volume2, 
  Mic, 
  AlertTriangle, 
  TrendingDown, 
  ChevronRight, 
  Settings, 
  FileText,
  Calendar,
  Layers,
  Globe
} from "lucide-react";
import Link from "next/link";
import { Locale } from "@/lib/translations";

interface Weather {
  temp: number;
  humidity: number;
  conditions: string;
  rain_probability: number;
}

interface ScheduleEvent {
  id: string;
  time: string;
  field_name: string;
  crop_name: string;
  duration: string;
  status: string;
  water_volume: number;
  is_required: boolean;
  recommendation_text: string;
}

interface CriticalAlert {
  id: string;
  field_id: string;
  field_name: string;
  alert_type: string;
  message: string;
  severity: string;
  time: string;
}

interface DashboardData {
  weather: Weather | null;
  soil_moisture: number | null;
  field_health: "OPTIMAL" | "WARNING" | "CRITICAL";
  today_schedule: ScheduleEvent[];
  next_irrigation: string;
  critical_alerts: CriticalAlert[];
  ai_recommendation: string;
  water_usage_liters: number;
}

interface UsageDay {
  day: string;
  water: number;
}

interface WaterUsagePayload {
  chart_data: UsageDay[];
  total_current: number;
  total_last: number;
  comparison_text: string;
}

export default function FarmerDashboard() {
  const { user, logout } = useAuth();
  const { t, locale, setLocale } = useTranslation();
  const { isOnline, saveToCache, loadFromCache } = useOfflineCache();
  const router = useRouter();

  // Dashboard state
  const [data, setData] = useState<DashboardData | null>(null);
  const [usage, setUsage] = useState<WaterUsagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheTimestamp, setCacheTimestamp] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else {
      fetchDashboardData();
    }
  }, [user, locale]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isOnline) {
        // Fetch fresh data
        const dashboardPayload = await api.get<DashboardData>("/farmer/dashboard");
        const usagePayload = await api.get<WaterUsagePayload>("/farmer/water-usage");
        
        setData(dashboardPayload);
        setUsage(usagePayload);
        
        // Cache data
        saveToCache("farmer_dashboard_data", dashboardPayload);
        saveToCache("farmer_usage_data", usagePayload);
        setCacheTimestamp(null);
      } else {
        // Load from offline cache
        const cachedDashboard = loadFromCache<DashboardData>("farmer_dashboard_data");
        const cachedUsage = loadFromCache<WaterUsagePayload>("farmer_usage_data");
        
        if (cachedDashboard.data && cachedUsage.data) {
          setData(cachedDashboard.data);
          setUsage(cachedUsage.data);
          // Set cache timestamp from the newest cache entry
          const time = cachedDashboard.timestamp ? new Date(cachedDashboard.timestamp) : new Date();
          setCacheTimestamp(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } else {
          setError("You are offline and no cached information is available. Please connect to the internet.");
        }
      }
    } catch (err) {
      // Attempt cache recovery on failure
      const cachedDashboard = loadFromCache<DashboardData>("farmer_dashboard_data");
      const cachedUsage = loadFromCache<WaterUsagePayload>("farmer_usage_data");
      if (cachedDashboard.data && cachedUsage.data) {
        setData(cachedDashboard.data);
        setUsage(cachedUsage.data);
        const time = cachedDashboard.timestamp ? new Date(cachedDashboard.timestamp) : new Date();
        setCacheTimestamp(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else {
        setError((err as Error).message || "Failed to load dashboard statistics.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when online status changes
  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [isOnline]);

  const triggerVoiceAssistant = () => {
    window.dispatchEvent(new CustomEvent("open-voice-assistant"));
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocale(e.target.value as Locale);
  };

  const triggerManualAlertEvaluation = async () => {
    if (!isOnline) return;
    try {
      await api.post("/alerts/evaluate", {});
      fetchDashboardData();
    } catch (err) {
      console.error("Alert evaluation failed:", err);
    }
  };

  const handleDownloadReport = async (format: "pdf" | "csv") => {
    if (!isOnline) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const url = `${baseUrl}/farmer/reports?format=${format}`;
    
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error("Failed to download report");
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `field_report_${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error("Report download failed:", e);
      setError("Failed to download the agricultural report.");
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#070a08] flex flex-col justify-center items-center gap-3">
        <span className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">{t("common.loading")}</p>
      </div>
    );
  }

  // Custom SVG Bar Chart
  const renderSVGChart = () => {
    if (!usage || !usage.chart_data) return null;
    const chartHeight = 100;
    const maxVal = Math.max(...usage.chart_data.map(d => d.water), 10);

    return (
      <div className="w-full pt-4">
        <div className="flex justify-between items-end h-[120px] px-2 border-b border-neutral-800 pb-2">
          {usage.chart_data.map((day, idx) => {
            const barHeight = (day.water / maxVal) * chartHeight;
            return (
              <div key={idx} className="flex flex-col items-center flex-1 group">
                <span className="text-[9px] text-emerald-400 font-bold mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {day.water}L
                </span>
                <div 
                  className={`w-3.5 rounded-t-sm transition-all duration-500 ${
                    day.water > 0 
                      ? "bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-lg shadow-emerald-500/10" 
                      : "bg-neutral-800"
                  }`}
                  style={{ height: `${Math.max(4, barHeight)}px` }}
                />
                <span className="text-[9px] text-neutral-500 font-bold mt-2">
                  {day.day.substring(0, 3)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#070a08] text-[#f2f7f4] pb-24 relative">
      
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-neutral-950 font-bold text-center py-2.5 px-4 text-xs sticky top-0 z-50 flex justify-center items-center gap-1.5 shadow-md">
          <AlertTriangle className="w-4 h-4" />
          <span>
            {t("common.offline_banner")} {cacheTimestamp && `(${cacheTimestamp})`}
          </span>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
        
        {/* Header with Settings and Language Selector */}
        <header className="flex justify-between items-center pb-2 border-b border-neutral-900">
          <div>
            <h1 className="text-2xl font-black text-white leading-tight tracking-tight flex items-center gap-1">
              <span>🌾</span> {t("dashboard.title")}
            </h1>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">
              AgriSmart PWA Pro
            </p>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2.5 bg-neutral-900 border border-neutral-800/80 rounded-2xl hover:text-emerald-400 transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-4.5 h-4.5" />
            </button>
          </div>
        </header>

        {/* Floating Settings Pane */}
        {showSettings && (
          <div className="bg-neutral-950 border border-neutral-900 rounded-3xl p-5 shadow-xl space-y-4 animate-slide-up">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {t("settings.title")}
              </h3>
              <button 
                onClick={logout}
                className="text-[10px] font-bold bg-rose-500/10 border border-rose-500/25 text-rose-400 px-3 py-1.5 rounded-xl"
              >
                {t("nav.logout")}
              </button>
            </div>
            
            <div className="space-y-1">
              <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1">
                {t("settings.select_lang")}
              </label>
              <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800/80 rounded-2xl px-3 py-2.5">
                <Globe className="w-4 h-4 text-emerald-450 shrink-0" />
                <select
                  value={locale}
                  onChange={handleLanguageChange}
                  className="w-full bg-transparent text-xs text-white border-none outline-none font-bold cursor-pointer"
                >
                  <option value="en-IN" className="bg-neutral-950 text-white">English (India)</option>
                  <option value="hi-IN" className="bg-neutral-950 text-white">हिन्दी (Hindi)</option>
                  <option value="te-IN" className="bg-neutral-950 text-white">తెలుగు (Telugu)</option>
                  <option value="kn-IN" className="bg-neutral-950 text-white">ಕನ್ನಡ (Kannada)</option>
                  <option value="ta-IN" className="bg-neutral-950 text-white">தமிழ் (Tamil)</option>
                  <option value="ml-IN" className="bg-neutral-950 text-white">മലയാളം (Malayalam)</option>
                  <option value="mr-IN" className="bg-neutral-950 text-white">मराठी (Marathi)</option>
                  <option value="bn-IN" className="bg-neutral-950 text-white">বাংলা (Bengali)</option>
                  <option value="gu-IN" className="bg-neutral-950 text-white">ગુજરાતી (Gujarati)</option>
                  <option value="pa-IN" className="bg-neutral-950 text-white">ਪੰਜਾਬੀ (Punjabi)</option>
                  <option value="or-IN" className="bg-neutral-950 text-white">ଓଡ଼ିଆ (Odia)</option>
                  <option value="as-IN" className="bg-neutral-950 text-white">অসমীয়া (Assamese)</option>
                  <option value="ur-IN" className="bg-neutral-950 text-white">اردو (Urdu)</option>
                </select>
              </div>
            </div>
            
            {isOnline && (
              <button
                onClick={triggerManualAlertEvaluation}
                className="w-full text-center py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold rounded-2xl text-xs hover:bg-emerald-500/15"
              >
                {t("dashboard.sync_alerts")}
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. What to Do Today / Quick Summary Card */}
        {data && (
          <div className="bg-gradient-to-br from-emerald-950/45 to-neutral-950 border border-emerald-900/35 rounded-3xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-emerald-455" />
              {t("dashboard.what_to_do")}
            </h3>
            
            <p className="text-xs text-neutral-200 leading-relaxed font-semibold">
              {data.ai_recommendation}
            </p>

            <div className="mt-4 flex gap-3">
              <button 
                onClick={triggerVoiceAssistant}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-black text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 transition-transform active:scale-98 cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                {t("dashboard.ask_assistant")}
              </button>
              
              <button 
                onClick={() => handleDownloadReport("pdf")}
                disabled={!isOnline}
                className={`px-4 py-3.5 bg-neutral-900 border border-neutral-800 text-neutral-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 ${
                  !isOnline ? "opacity-50 cursor-not-allowed" : "hover:bg-neutral-800"
                }`}
              >
                <FileText className="w-4 h-4" />
                {t("dashboard.report_button")}
              </button>
            </div>
          </div>
        )}

        {/* 2. Today's Key Telemetry Metrics */}
        {data && (
          <div className="grid grid-cols-2 gap-4">
            
            {/* Soil moisture gauge card */}
            <div className="bg-neutral-950 border border-neutral-900 rounded-3xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-black text-neutral-500 uppercase tracking-wider block mb-1">
                  {t("dashboard.moisture")}
                </span>
                <span className="text-3xl font-black text-white flex items-baseline gap-0.5">
                  {data.soil_moisture !== null ? `${data.soil_moisture}%` : "--"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-4">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  data.field_health === "OPTIMAL" 
                    ? "bg-emerald-500" 
                    : (data.field_health === "WARNING" ? "bg-amber-500" : "bg-rose-500")
                }`} />
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-neutral-350">
                  {data.field_health === "OPTIMAL" 
                    ? t("dashboard.optimal") 
                    : (data.field_health === "WARNING" ? t("dashboard.warning") : t("dashboard.critical"))}
                </span>
              </div>
            </div>

            {/* Weather summary card */}
            <div className="bg-neutral-950 border border-neutral-900 rounded-3xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-black text-neutral-500 uppercase tracking-wider block mb-1">
                  {t("dashboard.weather")}
                </span>
                <span className="text-2xl font-black text-white flex items-baseline">
                  {data.weather ? `${data.weather.temp}°C` : "--"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-neutral-450 mt-4 font-bold">
                <span className="flex items-center gap-1">
                  <CloudSun className="w-3.5 h-3.5 text-neutral-500" />
                  {data.weather ? data.weather.conditions : "N/A"}
                </span>
                <span>
                  ☔ {data.weather ? `${intPercent(data.weather.rain_probability)}%` : "0%"}
                </span>
              </div>
            </div>

          </div>
        )}

        {/* 3. Field Partition Status list */}
        <div className="bg-neutral-950 border border-neutral-900 rounded-3xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
            <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider">
              {t("fields.title")}
            </h3>
            <Link href="/fields" className="text-[10px] text-emerald-450 font-bold hover:underline flex items-center gap-0.5">
              {t("dashboard.manage")} <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          
          <Link href="/fields" className="block group">
            <div className="flex items-center justify-between p-3.5 bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-900 rounded-2xl transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <Sprout className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white group-hover:text-emerald-400 transition-colors">
                    Field 01
                  </h4>
                  <p className="text-[10px] text-neutral-500 font-bold mt-0.5">
                    Crop: Rice • Moisture: {data?.soil_moisture || 35}%
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${
                  data?.field_health === "OPTIMAL"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : (data?.field_health === "WARNING"
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-400")
                }`}>
                  {data?.field_health || "OPTIMAL"}
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* 4. Today's Schedule Cards */}
        {data && (
          <div className="bg-neutral-950 border border-neutral-900 rounded-3xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
              <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4.5 h-4.5 text-neutral-500" />
                {t("schedule.title")}
              </h3>
              <span className="text-[10px] text-neutral-400 font-bold">
                {t("dashboard.next_irrigation")}: <b className="text-emerald-400">{data.next_irrigation}</b>
              </span>
            </div>

            {data.today_schedule.length === 0 ? (
              <div className="text-center py-6 text-xs text-neutral-550 border border-dashed border-neutral-900 rounded-2xl bg-neutral-900/10 font-medium">
                💤 No watering events computed for today.
              </div>
            ) : (
              <div className="space-y-3">
                {data.today_schedule.map((event) => (
                  <div key={event.id} className="p-3.5 bg-neutral-900/30 border border-neutral-900 rounded-2xl flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl text-xs font-black">
                        💧
                      </span>
                      <div>
                        <h4 className="text-xs font-black text-white">
                          {event.field_name} ({event.crop_name})
                        </h4>
                        <p className="text-[10px] text-neutral-450 mt-1">
                          {event.time} • Duration: <b>{event.duration}</b>
                        </p>
                      </div>
                    </div>
                    
                    <span className="text-[9px] font-black uppercase bg-neutral-950 border border-neutral-850 text-neutral-400 px-2.5 py-1.5 rounded-xl">
                      {event.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. Water Usage Chart */}
        {usage && (
          <div className="bg-neutral-950 border border-neutral-900 rounded-3xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
              <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider">
                {t("dashboard.water_usage")}
              </h3>
              <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 px-2.5 py-1.5 rounded-full font-bold uppercase">
                {usage.total_current} Liters
              </span>
            </div>
            
            {renderSVGChart()}

            <p className="text-[10px] text-neutral-400 leading-relaxed font-bold flex items-center gap-1.5 mt-2 bg-neutral-900/40 p-3 rounded-2xl border border-neutral-900">
              <TrendingDown className="w-4 h-4 text-emerald-450 shrink-0" />
              <span>{usage.comparison_text}</span>
            </p>
          </div>
        )}

      </div>

      {/* Floating Microphone Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={triggerVoiceAssistant}
          className="w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 rounded-full flex items-center justify-center shadow-2xl transition-transform active:scale-95 cursor-pointer"
          aria-label="AgriSmart voice queries microphone"
        >
          <Mic className="w-6.5 h-6.5 stroke-[2.5]" />
        </button>
      </div>

    </div>
  );
}

function intPercent(val: number): number {
  return Math.min(100, Math.max(0, Math.round(val * 100)));
}
