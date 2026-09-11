"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";
import { useTranslation } from "@/context/LanguageContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { 
  Settings, 
  Cpu, 
  Droplet, 
  AlertTriangle, 
  Check, 
  Thermometer,
  Percent,
  Sliders
} from "lucide-react";

import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import StatusBadge from "@/components/ui/StatusBadge";

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

    const { critical_moisture, warning_moisture, overwatering_moisture } = thresholdForm;
    if (!(critical_moisture < warning_moisture && warning_moisture < overwatering_moisture)) {
      setError("Please ensure: Dry Limit < Warning Limit < Overwatering Limit.");
      return;
    }

    setIsUpdating(true);
    try {
      const updated = await api.put<Thresholds>(`/farmer/thresholds/${id}`, thresholdForm);
      setSuccess("Field moisture limits saved successfully!");
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

  const renderSVGLineChart = () => {
    if (!field || !field.timeline || field.timeline.length < 2) {
      return (
        <div className="h-32 flex items-center justify-center text-xs text-neutral-400 font-bold border border-dashed border-neutral-850 rounded-3xl">
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
      <div className="w-full bg-neutral-950 p-4 border border-neutral-850 rounded-3xl shadow-inner">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
          <defs>
            <linearGradient id="moistureGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#1f2923" strokeWidth="0.5" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#1f2923" strokeWidth="0.5" />

          <path d={areaD} fill="url(#moistureGradient)" />
          <path d={pathD} fill="none" stroke="#10b981" strokeWidth="3" />

          {points.map((pt, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle cx={pt.x} cy={pt.y} r="4" fill="#060a08" stroke="#10b981" strokeWidth="2.5" />
              <text 
                x={pt.x} 
                y={pt.y - 10} 
                textAnchor="middle" 
                className="text-[9px] fill-emerald-400 font-extrabold opacity-0 group-hover:opacity-100 transition-opacity"
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
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <LoadingState type="full" message="Loading field details..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a08] text-neutral-100 px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-8 max-w-4xl mx-auto space-y-6">
      
      {!isOnline && (
        <div className="bg-amber-500 text-neutral-950 font-black text-center py-2.5 px-4 rounded-2xl text-xs flex justify-center items-center gap-2 shadow-md">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Working offline. {cacheTimestamp && `(${cacheTimestamp})`}</span>
        </div>
      )}

      <PageHeader
        title={field?.name || "Field Overview"}
        subtitle={`Active Crop: ${field?.crop || "N/A"}`}
        backHref="/fields"
        icon={<Droplet className="w-6 h-6 stroke-[2.5]" />}
      />

      {error && <ErrorState message={error} onRetry={fetchFieldDetail} />}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-3 rounded-2xl flex items-center gap-2 font-bold">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {field && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            title="Soil Moisture"
            value={field.soil_moisture !== null ? `${field.soil_moisture}%` : "--"}
            icon={<Droplet className="w-4 h-4" />}
            status={field.soil_moisture && field.soil_moisture < 30 ? "ATTENTION" : "OPTIMAL"}
            statusLabel={field.soil_moisture && field.soil_moisture < 30 ? "Dry Soil" : "Healthy Soil"}
            progressPercent={field.soil_moisture ?? 35}
          />

          <MetricCard
            title="Temperature"
            value={field.ambient_temperature}
            unit="°C"
            icon={<Thermometer className="w-4 h-4 text-amber-400" />}
            status="INFO"
            statusLabel="Ambient"
          />

          <MetricCard
            title="Air Humidity"
            value={field.ambient_humidity}
            unit="%"
            icon={<Percent className="w-4 h-4 text-sky-400" />}
            status="INFO"
            statusLabel="Ambient"
          />
        </div>
      )}

      {/* Moisture Timeline Graph */}
      <Card variant="glass" padding="lg" className="space-y-4">
        <CardHeader>
          <CardTitle>
            <Droplet className="w-4.5 h-4.5 text-emerald-400" />
            7-Day Soil Moisture History
          </CardTitle>
        </CardHeader>
        {renderSVGLineChart()}
      </Card>

      {/* Deployed Sensors Status */}
      {field && (
        <Card variant="glass" padding="lg" className="space-y-4">
          <CardHeader>
            <CardTitle>
              <Cpu className="w-4.5 h-4.5 text-emerald-400" />
              Field Telemetry Sensors
            </CardTitle>
          </CardHeader>
          
          {field.sensors.length === 0 ? (
            <p className="text-xs text-neutral-400 font-bold italic">No sensors currently deployed in this field.</p>
          ) : (
            <div className="space-y-2.5">
              {field.sensors.map((sensor) => (
                <div key={sensor.id} className="p-3.5 bg-neutral-900/60 border border-neutral-850 rounded-2xl flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                      <Cpu className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">{sensor.name}</h4>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase">{sensor.sensor_type}</span>
                    </div>
                  </div>
                  <StatusBadge status={sensor.status} size="sm" />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Simple Farmer Thresholds Settings */}
      {isOnline && (
        <Card variant="glass" padding="lg" className="space-y-4">
          <CardHeader>
            <CardTitle>
              <Sliders className="w-4.5 h-4.5 text-emerald-400" />
              Soil Moisture Limits & Rules
            </CardTitle>
          </CardHeader>
          
          <form onSubmit={handleThresholdSubmit} className="space-y-4">
            
            <div>
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
                Dry Soil Alert Limit (%)
              </label>
              <input
                type="number"
                value={thresholdForm.critical_moisture}
                onChange={(e) => setThresholdForm(p => ({ ...p, critical_moisture: parseFloat(e.target.value) }))}
                className="w-full bg-neutral-950 border border-neutral-850 text-xs font-black text-white rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
              />
              <span className="text-[10px] text-neutral-400 font-bold block mt-1">
                Triggers an urgent alert when moisture drops below this limit.
              </span>
            </div>

            <div>
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
                Warning Moisture Limit (%)
              </label>
              <input
                type="number"
                value={thresholdForm.warning_moisture}
                onChange={(e) => setThresholdForm(p => ({ ...p, warning_moisture: parseFloat(e.target.value) }))}
                className="w-full bg-neutral-950 border border-neutral-850 text-xs font-black text-white rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
                Overwatering Upper Limit (%)
              </label>
              <input
                type="number"
                value={thresholdForm.overwatering_moisture}
                onChange={(e) => setThresholdForm(p => ({ ...p, overwatering_moisture: parseFloat(e.target.value) }))}
                className="w-full bg-neutral-950 border border-neutral-850 text-xs font-black text-white rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
              />
            </div>

            <Button
              type="submit"
              isLoading={isUpdating}
              variant="primary"
              size="md"
              className="w-full"
            >
              Save Moisture Rules
            </Button>

          </form>
        </Card>
      )}

    </div>
  );
}
