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
  AlertTriangle, 
  TrendingDown, 
  FileText,
  Calendar,
  Sparkles,
  ChevronRight,
  ShieldAlert
} from "lucide-react";
import Link from "next/link";

// Reusable Farmer UI Components
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import MetricCard from "@/components/ui/MetricCard";
import RecommendationCard from "@/components/ui/RecommendationCard";
import AlertCard from "@/components/ui/AlertCard";
import WeatherWidget from "@/components/ui/WeatherWidget";
import StatusBadge from "@/components/ui/StatusBadge";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";

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
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const { isOnline, saveToCache, loadFromCache } = useOfflineCache();
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [usage, setUsage] = useState<WaterUsagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheTimestamp, setCacheTimestamp] = useState<string | null>(null);

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
        const dashboardPayload = await api.get<DashboardData>("/farmer/dashboard");
        const usagePayload = await api.get<WaterUsagePayload>("/farmer/water-usage");
        
        setData(dashboardPayload);
        setUsage(usagePayload);
        
        saveToCache("farmer_dashboard_data", dashboardPayload);
        saveToCache("farmer_usage_data", usagePayload);
        setCacheTimestamp(null);
      } else {
        const cachedDashboard = loadFromCache<DashboardData>("farmer_dashboard_data");
        const cachedUsage = loadFromCache<WaterUsagePayload>("farmer_usage_data");
        
        if (cachedDashboard.data && cachedUsage.data) {
          setData(cachedDashboard.data);
          setUsage(cachedUsage.data);
          const time = cachedDashboard.timestamp ? new Date(cachedDashboard.timestamp) : new Date();
          setCacheTimestamp(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } else {
          setError("You are offline and no cached information is available. Please connect to the internet.");
        }
      }
    } catch (err) {
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

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [isOnline]);

  const triggerVoiceAssistant = () => {
    window.dispatchEvent(new CustomEvent("open-voice-assistant"));
  };

  const handleDownloadReport = async (format: "pdf" | "csv") => {
    if (!isOnline) return;
    try {
      const blob = await api.getBlob(`/farmer/reports?format=${format}`);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `field_report_${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Error downloading report:", err);
      setError("Failed to download the agricultural report.");
    }
  };

  if (loading && !data) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <LoadingState type="full" message="Loading your farm's today status..." />
      </div>
    );
  }

  // SVG Bar Chart for Water Usage
  const renderSVGChart = () => {
    if (!usage || !usage.chart_data) return null;
    const chartHeight = 90;
    const maxVal = Math.max(...usage.chart_data.map(d => d.water), 10);

    return (
      <div className="w-full pt-2">
        <div className="flex justify-between items-end h-[110px] px-2 border-b border-neutral-850 pb-2">
          {usage.chart_data.map((day, idx) => {
            const barHeight = (day.water / maxVal) * chartHeight;
            return (
              <div key={idx} className="flex flex-col items-center flex-1 group">
                <span className="text-[10px] text-emerald-400 font-extrabold mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {day.water}L
                </span>
                <div 
                  className={`w-4 sm:w-6 rounded-t-lg transition-all duration-500 ${
                    day.water > 0 
                      ? "bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-md shadow-emerald-500/20" 
                      : "bg-neutral-800"
                  }`}
                  style={{ height: `${Math.max(6, barHeight)}px` }}
                />
                <span className="text-[10px] text-neutral-400 font-bold mt-2 uppercase">
                  {day.day.substring(0, 3)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Determine if irrigation is needed based on soil moisture
  const moistureVal = data?.soil_moisture ?? 35;
  const isNeeded = moistureVal < 30;
  const decisionText = isNeeded 
    ? "Your field needs irrigation today" 
    : "Water is not needed right now";
  const reasonText = data?.ai_recommendation || (isNeeded 
    ? "Soil moisture level is below optimal crop threshold (30%)." 
    : "Soil moisture level is healthy and adequate for your crop.");

  return (
    <div className="min-h-screen bg-[#060a08] text-neutral-100 pb-24 pt-4 px-4 md:px-8 max-w-5xl mx-auto space-y-6">
      
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-neutral-950 font-black text-center py-2.5 px-4 text-xs rounded-2xl flex justify-center items-center gap-2 shadow-md">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {t("common.offline_banner") || "Working Offline"} {cacheTimestamp && `(${cacheTimestamp})`}
          </span>
        </div>
      )}

      {error && (
        <ErrorState
          title="Telemetry Alert"
          message={error}
          onRetry={fetchDashboardData}
        />
      )}

      {/* 1. Farmer Today Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-900">
        <div>
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-0.5">
            AgriSmart Today Overview
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Good morning, {user?.full_name?.split(" ")[0] || "Farmer"} 👋</span>
          </h1>
        </div>

        {data && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <StatusBadge 
              status={data.field_health} 
              label={`Field Health: ${data.field_health}`} 
              size="lg" 
            />
          </div>
        )}
      </div>

      {/* 2. Primary Hero Recommendation Card (5-Second Decision) */}
      <RecommendationCard
        decision={decisionText}
        isIrrigationNeeded={isNeeded}
        soilMoisture={data?.soil_moisture ?? null}
        weatherCondition={data?.weather?.conditions}
        rainProbability={data?.weather?.rain_probability}
        reason={reasonText}
        confidence="High"
        nextAction={isNeeded ? "Irrigate for 20 minutes" : `Next check at ${data?.next_irrigation || "3:00 PM"}`}
        onActionClick={triggerVoiceAssistant}
        actionText="🎙 Ask Voice Assistant About Irrigation"
      />

      {/* 3. Critical Alerts Section */}
      {data && data.critical_alerts && data.critical_alerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              Critical Farm Alerts ({data.critical_alerts.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.critical_alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                title={alert.message}
                message={`Field: ${alert.field_name} • ${alert.alert_type}`}
                severity={alert.severity}
                time={alert.time}
                fieldName={alert.field_name}
                onAction={() => router.push("/irrigation")}
                actionText="Go to Irrigation"
              />
            ))}
          </div>
        </div>
      )}

      {/* 4. Weather & Moisture Metric Cards Row */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Soil Moisture Metric */}
          <MetricCard
            title="Soil Moisture Level"
            value={data.soil_moisture !== null ? `${data.soil_moisture}%` : "32%"}
            icon={<Droplet className="w-5 h-5" />}
            status={data.field_health}
            statusLabel={data.field_health}
            targetRange="30% – 45%"
            progressPercent={data.soil_moisture ?? 35}
            subtitle={
              data.field_health === "OPTIMAL" 
                ? "Soil moisture is in the healthy range for your active crop." 
                : "Moisture levels require attention to prevent crop stress."
            }
          />

          {/* Farm Weather Widget */}
          <WeatherWidget
            temp={data.weather?.temp ?? 28}
            humidity={data.weather?.humidity ?? 65}
            conditions={data.weather?.conditions ?? "Partly Cloudy"}
            rainProbability={data.weather?.rain_probability ?? 0.2}
            farmerAdvice={
              (data.weather?.rain_probability ?? 0) > 0.4 
                ? "Rain is expected in your region. You may delay irrigation to conserve water."
                : "No rain expected today. Maintain regular soil moisture monitoring."
            }
            forecast={[
              { day: "Today", temp: data.weather?.temp ?? 28, conditions: "Sun", rainProb: data.weather?.rain_probability ?? 0.2 },
              { day: "Tomorrow", temp: 29, conditions: "Rain", rainProb: 0.65 },
              { day: "Day 3", temp: 27, conditions: "Clouds", rainProb: 0.15 },
            ]}
          />

        </div>
      )}

      {/* 5. Field Partition Cards Summary */}
      <Card variant="glass" padding="lg" className="space-y-4">
        <CardHeader>
          <CardTitle>
            <Sprout className="w-4.5 h-4.5 text-emerald-400" />
            My Active Fields
          </CardTitle>
          <Link href="/fields">
            <Button variant="outline" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
              Manage Fields
            </Button>
          </Link>
        </CardHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/fields" className="block group">
            <div className="p-4 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-850 rounded-2xl transition-all flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <Sprout className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors">
                    Field 01 — Tomato
                  </h4>
                  <p className="text-xs text-neutral-400 font-semibold mt-0.5">
                    Area: 1.5 Acres • Moisture: {data?.soil_moisture || 35}%
                  </p>
                </div>
              </div>
              <StatusBadge status={data?.field_health || "OPTIMAL"} size="sm" />
            </div>
          </Link>

          <Link href="/irrigation" className="block group">
            <div className="p-4 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-850 rounded-2xl transition-all flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl">
                  <Droplet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white group-hover:text-sky-400 transition-colors">
                    Irrigation Valves
                  </h4>
                  <p className="text-xs text-neutral-400 font-semibold mt-0.5">
                    Next check: {data?.next_irrigation || "3:00 PM"}
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                Ready
              </span>
            </div>
          </Link>
        </div>
      </Card>

      {/* 6. Today's Irrigation Schedule */}
      {data && (
        <Card variant="glass" padding="lg" className="space-y-4">
          <CardHeader>
            <CardTitle>
              <Calendar className="w-4.5 h-4.5 text-sky-400" />
              Today&apos;s Water Schedule
            </CardTitle>
            <span className="text-xs text-neutral-400 font-bold">
              Next: <b className="text-emerald-400">{data.next_irrigation}</b>
            </span>
          </CardHeader>

          {data.today_schedule.length === 0 ? (
            <div className="text-center py-6 text-xs text-neutral-400 border border-dashed border-neutral-850 rounded-2xl bg-neutral-900/30 font-bold">
              💤 No scheduled watering events required for today.
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.today_schedule.map((event) => (
                <div key={event.id} className="p-4 bg-neutral-900/50 border border-neutral-850 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl">
                      <Droplet className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">
                        {event.field_name} ({event.crop_name})
                      </h4>
                      <p className="text-[11px] text-neutral-400 font-semibold mt-0.5">
                        Time: {event.time} • Duration: <b>{event.duration}</b>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <StatusBadge status={event.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 7. Weekly Water Usage & Report Download */}
      {usage && (
        <Card variant="glass" padding="lg" className="space-y-4">
          <CardHeader>
            <CardTitle>
              <TrendingDown className="w-4.5 h-4.5 text-emerald-400" />
              Weekly Water Conservation
            </CardTitle>
            <span className="text-xs bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 px-3 py-1 rounded-full font-black">
              {usage.total_current} Liters
            </span>
          </CardHeader>
          
          {renderSVGChart()}

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
            <p className="text-xs text-neutral-300 font-bold leading-relaxed flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{usage.comparison_text}</span>
            </p>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleDownloadReport("pdf")}
              disabled={!isOnline}
              leftIcon={<FileText className="w-4 h-4" />}
            >
              Download PDF Report
            </Button>
          </div>
        </Card>
      )}

    </div>
  );
}
