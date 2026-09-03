"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";
import { useTranslation } from "@/context/LanguageContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { 
  ArrowLeft, 
  Settings, 
  Cpu, 
  Droplet, 
  CloudSun, 
  AlertTriangle, 
  Check, 
  Info,
  Thermometer,
  Percent
} from "lucide-react";
import Link from "next/link";

interface Sensor {
  id: string;
  name: string;
  sensor_type: string;
  status: string;
}

interface TelemetryPoint {
  time: string;
  soil_moisture: number;
  temperature: number;
  humidity: number;
}

interface Thresholds {
  critical_moisture: number;
  warning_moisture: number;
  overwatering_moisture: number;
  rain_probability_threshold: number;
}

interface FieldDetail {
  id: string;
  name: string;
  crop: string;
  soil_moisture: number | null;
  ambient_temperature: number;
  ambient_humidity: number;
  weather_conditions: string;
  sensors: Sensor[];
  timeline: TelemetryPoint[];
  thresholds: Thresholds;
}

export default function FieldDetailPage() {
  const { id } = useParams() as { id: string };
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const { isOnline, saveToCache, loadFromCache } = useOfflineCache();
  const router = useRouter();

  const [field, setField] = useState<FieldDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cacheTimestamp, setCacheTimestamp] = useState<string | null>(null);

  // Threshold form edit state
  const [thresholdForm, setThresholdForm] = useState<Thresholds>({
    critical_moisture: 20,
    warning_moisture: 35,
    overwatering_moisture: 60,
    rain_probability_threshold: 0.6
  });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const fetchFieldDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isOnline) {
        const data = await api.get<FieldDetail>(`/farmer/fields/${id}`);
        setField(data);
        setThresholdForm(data.thresholds);
        saveToCache(`farmer_field_detail_${id}`, data);
        setCacheTimestamp(null);
      } else {
        const cached = loadFromCache<FieldDetail>(`farmer_field_detail_${id}`);
        if (cached.data) {
          setField(cached.data);
          setThresholdForm(cached.data.thresholds);
          const time = cached.timestamp ? new Date(cached.timestamp) : new Date();
          setCacheTimestamp(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } else {
          setError("You are offline and no cached information is available for this field.");
        }
      }
    } catch (err) {
      const cached = loadFromCache<FieldDetail>(`farmer_field_detail_${id}`);
      if (cached.data) {
        setField(cached.data);
        setThresholdForm(cached.data.thresholds);
        const time = cached.timestamp ? new Date(cached.timestamp) : new Date();
        setCacheTimestamp(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else {
        setError((err as Error).message || "Failed to load field details.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && id) {
      fetchFieldDetail();
    }
  }, [user, id, isOnline]);

  const handleThresholdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) return;
    setError(null);
    setSuccess(null);

    // Frontend Range Validations: critical < warning < overwatering
    const { critical_moisture, warning_moisture, overwatering_moisture } = thresholdForm;
    if (!(critical_moisture < warning_moisture && warning_moisture < overwatering_moisture)) {
      setError("Moisture range rule violated: Critical Moisture < Warning Moisture < Overwatering Moisture.");
      return;
    }

    setIsUpdating(true);
    try {
      const updated = await api.put<Thresholds>(`/farmer/thresholds/${id}`, thresholdForm);
      setSuccess("Moisture thresholds saved successfully!");
      if (field) {
        const updatedField = { ...field, thresholds: updated };
        setField(updatedField);
        saveToCache(`farmer_field_detail_${id}`, updatedField);
      }
    } catch (err) {
      setError((err as Error).message || "Failed to save threshold limits.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Custom SVG line chart
  const renderSVGLineChart = () => {
    if (!field || !field.timeline || field.timeline.length < 2) {
      return (
        <div className="h-32 flex items-center justify-center text-xs text-neutral-500 font-bold border border-dashed border-neutral-900 rounded-3xl">
          No moisture history readings logged yet
        </div>
      );
    }

    const width = 360;
    const height = 130;
    const padding = 20;

    const values = field.timeline.map(p => p.soil_moisture);
    const minM = Math.max(0, Math.min(...values) - 3);
    const maxM = Math.min(100, Math.max(...values) + 3);
    const range = maxM - minM || 1;

    const points = field.timeline.map((p, i) => {
      const x = padding + (i * (width - 2 * padding)) / (field.timeline.length - 1);
      const y = height - padding - ((p.soil_moisture - minM) * (height - 2 * padding)) / range;
      return { x, y, moisture: p.soil_moisture, time: p.time };
    });

    let pathD = `M ${points[0].x} ${points[0].y}`;
    let areaD = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
      areaD += ` L ${points[i].x} ${points[i].y}`;
    }

    areaD += ` L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
      <div className="w-full bg-neutral-950 p-4 border border-neutral-900 rounded-3xl shadow-inner">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
          <defs>
            <linearGradient id="moistureGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#1b2520" strokeWidth="0.5" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#1b2520" strokeWidth="0.5" />

          {/* Area fill */}
          <path d={areaD} fill="url(#moistureGradient)" />
          
          {/* Main line */}
          <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" />

          {/* Interactive dots */}
          {points.map((pt, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle cx={pt.x} cy={pt.y} r="3.5" fill="#070a08" stroke="#10b981" strokeWidth="2" />
              <circle cx={pt.x} cy={pt.y} r="7" fill="#10b981" className="opacity-0 hover:opacity-20 transition-opacity" />
              <text 
                x={pt.x} 
                y={pt.y - 8} 
                textAnchor="middle" 
                className="text-[8px] fill-emerald-400 font-bold opacity-0 group-hover:opacity-100 bg-neutral-950 transition-opacity pointer-events-none"
              >
                {pt.moisture}%
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  if (authLoading || (loading && !field)) {
    return (
      <div className="min-h-screen bg-[#070a08] flex flex-col justify-center items-center gap-3">
        <span className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070a08] text-[#f2f7f4] pb-24 relative">
      
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-neutral-950 font-bold text-center py-2.5 px-4 text-xs sticky top-0 z-50 flex justify-center items-center gap-1.5 shadow-md">
          <span>⚠️ {t("common.offline_banner")} {cacheTimestamp && `(${cacheTimestamp})`}</span>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
        
        {/* Header */}
        <header className="flex justify-between items-center pb-2 border-b border-neutral-900">
          <div className="flex items-center gap-3">
            <Link 
              href="/fields" 
              className="p-2.5 bg-neutral-900 border border-neutral-800/80 rounded-2xl text-neutral-400 hover:text-white"
              aria-label="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-white leading-tight tracking-tight">
                {field?.name}
              </h1>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">
                Crop: {field?.crop}
              </p>
            </div>
          </div>
        </header>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Telemetry quick status dials */}
        {field && (
          <div className="grid grid-cols-3 gap-3">
            
            <div className="bg-neutral-950 border border-neutral-900 rounded-3xl p-3.5 flex flex-col justify-between items-center text-center">
              <span className="text-[8px] font-black text-neutral-500 uppercase tracking-wider block mb-1">
                Moisture
              </span>
              <Droplet className="w-5 h-5 text-emerald-400 my-1" />
              <span className="text-sm font-black text-white">
                {field.soil_moisture !== null ? `${field.soil_moisture}%` : "--"}
              </span>
            </div>

            <div className="bg-neutral-950 border border-neutral-900 rounded-3xl p-3.5 flex flex-col justify-between items-center text-center">
              <span className="text-[8px] font-black text-neutral-500 uppercase tracking-wider block mb-1">
                Temperature
              </span>
              <Thermometer className="w-5 h-5 text-amber-500 my-1" />
              <span className="text-sm font-black text-white">
                {field.ambient_temperature}°C
              </span>
            </div>

            <div className="bg-neutral-950 border border-neutral-900 rounded-3xl p-3.5 flex flex-col justify-between items-center text-center">
              <span className="text-[8px] font-black text-neutral-500 uppercase tracking-wider block mb-1">
                Humidity
              </span>
              <Percent className="w-5 h-5 text-sky-400 my-1" />
              <span className="text-sm font-black text-white">
                {field.ambient_humidity}%
              </span>
            </div>

          </div>
        )}

        {/* Moisture Graph */}
        <div className="bg-neutral-950 border border-neutral-900 rounded-3xl p-5 space-y-4">
          <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider">
            Soil Moisture Timeline (7 Days)
          </h3>
          {renderSVGLineChart()}
        </div>

        {/* Sensor Health Status */}
        {field && (
          <div className="bg-neutral-950 border border-neutral-900 rounded-3xl p-5 space-y-4">
            <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider">
              Connected Sensors
            </h3>
            
            {field.sensors.length === 0 ? (
              <p className="text-xs text-neutral-550 italic">No telemetry sensors deployed in this partition.</p>
            ) : (
              <div className="space-y-2.5">
                {field.sensors.map((s) => (
                  <div key={s.id} className="p-3 bg-neutral-900/40 border border-neutral-900 rounded-2xl flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <Cpu className="w-4 h-4 text-emerald-450" />
                      <div>
                        <h4 className="text-xs font-black text-white">{s.name}</h4>
                        <span className="text-[8px] text-neutral-500 uppercase font-black tracking-widest">{s.sensor_type}</span>
                      </div>
                    </div>
                    
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      s.status === "ACTIVE" 
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                        : "bg-rose-500/10 border-rose-500/20 text-rose-450"
                    }`}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Threshold Configuration Form */}
        {isOnline && (
          <div className="bg-neutral-950 border border-neutral-900 rounded-3xl p-5 space-y-4">
            <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Settings className="w-4.5 h-4.5 text-neutral-500" />
              {t("fields.edit_thresholds")}
            </h3>
            
            <form onSubmit={handleThresholdSubmit} className="space-y-4">
              
              <div>
                <label className="text-[9px] font-black text-neutral-500 uppercase tracking-wider block mb-1.5">
                  Critical Moisture Lower Limit (%)
                </label>
                <input
                  type="number"
                  value={thresholdForm.critical_moisture}
                  onChange={(e) => setThresholdForm(p => ({ ...p, critical_moisture: parseFloat(e.target.value) }))}
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white rounded-xl px-3 py-2.5 outline-none font-bold"
                />
                <span className="text-[8px] text-neutral-550 block mt-1">
                  Triggers urgent CRITICAL SMS/push notification if soil moisture decays below this level.
                </span>
              </div>

              <div>
                <label className="text-[9px] font-black text-neutral-500 uppercase tracking-wider block mb-1.5">
                  Warning Moisture Lower Limit (%)
                </label>
                <input
                  type="number"
                  value={thresholdForm.warning_moisture}
                  onChange={(e) => setThresholdForm(p => ({ ...p, warning_moisture: parseFloat(e.target.value) }))}
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white rounded-xl px-3 py-2.5 outline-none font-bold"
                />
                <span className="text-[8px] text-neutral-550 block mt-1">
                  Triggers WARNING warnings if soil moisture drops below this point.
                </span>
              </div>

              <div>
                <label className="text-[9px] font-black text-neutral-500 uppercase tracking-wider block mb-1.5">
                  Overwatering Moisture Upper Limit (%)
                </label>
                <input
                  type="number"
                  value={thresholdForm.overwatering_moisture}
                  onChange={(e) => setThresholdForm(p => ({ ...p, overwatering_moisture: parseFloat(e.target.value) }))}
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white rounded-xl px-3 py-2.5 outline-none font-bold"
                />
                <span className="text-[8px] text-neutral-550 block mt-1">
                  Triggers alert if soil moisture exceeds this level, indicating pooling or leakage.
                </span>
              </div>

              <div>
                <label className="text-[9px] font-black text-neutral-500 uppercase tracking-wider block mb-1.5">
                  Rain Probability Bypass Threshold (0.0 to 1.0)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={thresholdForm.rain_probability_threshold}
                  onChange={(e) => setThresholdForm(p => ({ ...p, rain_probability_threshold: parseFloat(e.target.value) }))}
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white rounded-xl px-3 py-2.5 outline-none font-bold"
                />
                <span className="text-[8px] text-neutral-550 block mt-1">
                  Bypasses planned watering if forecast rain probability exceeds this threshold (e.g. 0.6 = 60%).
                </span>
              </div>

              <button
                type="submit"
                disabled={isUpdating}
                className="w-full text-center py-3 bg-emerald-500 text-neutral-950 font-black text-xs rounded-xl shadow-lg cursor-pointer transition-transform active:scale-98"
              >
                {isUpdating ? "Saving Thresholds..." : t("fields.save_thresholds")}
              </button>

            </form>
          </div>
        )}

      </div>
    </div>
  );
}
