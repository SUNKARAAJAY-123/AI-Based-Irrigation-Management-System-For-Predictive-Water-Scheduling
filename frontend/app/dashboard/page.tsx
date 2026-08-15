"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import Link from "next/link";
import { 
  Droplet, 
  Sprout, 
  CloudSun, 
  Brain, 
  Volume2, 
  BarChart3, 
  Layers, 
  PlusCircle, 
  Compass, 
  AlertCircle 
} from "lucide-react";

interface Farm {
  id: string;
  name: string;
  location_latitude: number;
  location_longitude: number;
  area_hectares: number;
  soil_type?: string;
}

interface Field {
  id: string;
  name: string;
  area_hectares: number;
  soil_type?: string;
}

interface Crop {
  id: string;
  name: string;
  variety?: string;
  status: string;
}

interface Recommendation {
  id: string;
  crop_id: string;
  timestamp: string;
  recommended_water_volume_liters: number;
  is_irrigation_required: boolean;
  best_irrigation_time?: string;
  risk_level: string;
  confidence_score: number;
  features_snapshot?: {
    soil_moisture?: number;
    [key: string]: unknown;
  };
}

interface Weather {
  temp: number;
  humidity: number;
  wind_speed: number;
  conditions: string;
  forecast: Array<{
    dt_txt: string;
    temp: number;
    humidity: number;
    rain_probability: number;
    description: string;
  }>;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // State
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [weatherData, setWeatherData] = useState<Weather | null>(null);
  const [latestMoisture, setLatestMoisture] = useState<number | null>(null);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    setLoadingData(true);
    setError(null);
    try {
      const fetchedFarms = await api.get<Farm[]>("/farms");
      setFarms(fetchedFarms);
      
      if (fetchedFarms.length > 0) {
        const firstFarm = fetchedFarms[0];
        setSelectedFarm(firstFarm);
        await loadFarmDetails(firstFarm);
      } else {
        setLoadingData(false);
      }
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to load dashboard data");
      setLoadingData(false);
    }
  };

  const loadFarmDetails = async (farm: Farm) => {
    try {
      const fetchedFields = await api.get<Field[]>(`/fields?farm_id=${farm.id}`);
      setFields(fetchedFields);

      const weather = await api.get<Weather>(`/weather?farm_id=${farm.id}`);
      setWeatherData(weather);

      if (fetchedFields.length > 0) {
        const firstField = fetchedFields[0];
        setSelectedField(firstField);
        await loadFieldDetails(firstField);
      } else {
        setSelectedField(null);
        setCrop(null);
        setRecommendation(null);
        setLatestMoisture(null);
        setLoadingData(false);
      }
    } catch (err) {
      setError((err as Error).message || "Failed to load farm details");
      setLoadingData(false);
    }
  };

  const loadFieldDetails = async (field: Field) => {
    try {
      const crops = await api.get<Crop[]>(`/crops?field_id=${field.id}`);
      if (crops.length > 0) {
        const firstCrop = crops[0];
        setCrop(firstCrop);

        const recs = await api.get<Recommendation[]>(`/recommendations?crop_id=${firstCrop.id}`);
        if (recs.length > 0) {
          setRecommendation(recs[0]);
          const snapshot = recs[0].features_snapshot;
          if (snapshot && typeof snapshot.soil_moisture === "number") {
            setLatestMoisture(snapshot.soil_moisture);
          }
        } else {
          setRecommendation(null);
          setLatestMoisture(null);
        }
      } else {
        setCrop(null);
        setRecommendation(null);
        setLatestMoisture(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleFarmChange = async (farmId: string) => {
    const farm = farms.find(f => f.id === farmId);
    if (farm) {
      setLoadingData(true);
      setSelectedFarm(farm);
      await loadFarmDetails(farm);
    }
  };

  const handleFieldChange = async (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (field) {
      setLoadingData(true);
      setSelectedField(field);
      await loadFieldDetails(field);
    }
  };

  if (authLoading || (loadingData && farms.length === 0 && !error)) {
    return (
      <div className="min-h-screen bg-[#090d0b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Syncing telemetry data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d0b] text-[#f2f7f4] px-4 py-8 sm:px-6 lg:px-8 pb-24 md:pb-8">
      {/* Background radial highlight */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-neutral-900 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/25 tracking-widest uppercase">
                🛰️ AgriSmart Dashboard
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Predictive Telemetry
            </h1>
            <p className="text-neutral-400 text-xs mt-1 font-semibold">
              Hello, {user?.full_name}. Here is the active climate and field logs.
            </p>
          </div>

          {/* Farm and Field Selectors */}
          {farms.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="flex-1 sm:flex-initial">
                <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1">Active Farm</label>
                <select
                  value={selectedFarm?.id || ""}
                  onChange={(e) => handleFarmChange(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-300 rounded-xl px-3 py-2.5 outline-none focus:border-emerald-500/50 font-bold"
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              
              {fields.length > 0 && (
                <div className="flex-1 sm:flex-initial">
                  <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1">Active Partition</label>
                  <select
                    value={selectedField?.id || ""}
                    onChange={(e) => handleFieldChange(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-300 rounded-xl px-3 py-2.5 outline-none focus:border-emerald-500/50 font-bold"
                  >
                    {fields.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </header>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-450 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* If No Farms Exist */}
        {farms.length === 0 && !loadingData && (
          <div className="glass-panel rounded-3xl p-10 text-center max-w-xl mx-auto space-y-6 my-12 shadow-xl border border-neutral-900">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
              <Sprout className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Let&apos;s Set Up Your Farm</h2>
            <p className="text-neutral-450 text-xs leading-relaxed max-w-sm mx-auto">
              Get real-time AI-based recommendations, moisture dials, and meteorology updates by registering your land.
            </p>
            <div className="flex justify-center">
              <Link
                href="/farms"
                className="bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-extrabold text-xs px-6 py-3 rounded-xl transition-transform hover:scale-102"
              >
                Register Your Farm
              </Link>
            </div>
          </div>
        )}

        {/* Grid Layout */}
        {farms.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 1. Soil Moisture Gauge Card */}
            <div className="glass-panel rounded-3xl p-6 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                    <Droplet className="w-4 h-4 text-emerald-400" />
                    Soil Moisture VWC
                  </h3>
                  {latestMoisture !== null && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      latestMoisture < 35 
                        ? "bg-rose-500/10 border-rose-500/20 text-rose-450" 
                        : latestMoisture < 70 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                          : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                    }`}>
                      {latestMoisture < 35 ? "Dry" : latestMoisture < 70 ? "Optimal" : "Saturated"}
                    </span>
                  )}
                </div>

                <div className="flex flex-col items-center justify-center py-6">
                  {latestMoisture !== null ? (
                    <div className="relative flex items-center justify-center w-36 h-36">
                      {/* Gauge Ring background */}
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <circle className="text-neutral-900" strokeWidth="2.5" stroke="currentColor" fill="none" r="16" cx="18" cy="18" />
                        <circle 
                          className="text-emerald-500 transition-all duration-700 ease-out" 
                          strokeDasharray={`${latestMoisture}, 100`} 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                          stroke="currentColor" 
                          fill="none" 
                          r="16" cx="18" cy="18" 
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-3xl font-black text-white">{latestMoisture.toFixed(0)}%</span>
                        <span className="block text-[8px] font-black text-neutral-500 uppercase tracking-widest mt-0.5">Volumetric</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-xs text-neutral-500 font-bold uppercase">No readings logged</p>
                      <Link href="/sensors" className="text-emerald-400 text-xs font-bold underline mt-2 inline-block">
                        Setup Sensors
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-neutral-900 pt-4 mt-2 flex justify-between text-xs text-neutral-450">
                <span>Soil Type:</span>
                <span className="font-bold text-white capitalize">{selectedField?.soil_type || "Loam"}</span>
              </div>
            </div>

            {/* 2. Crop Details Card */}
            <div className="glass-panel rounded-3xl p-6 shadow-md flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                  <Sprout className="w-4 h-4 text-emerald-400" />
                  Active Crop Growth
                </h3>

                {crop ? (
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] text-neutral-500 font-bold block uppercase">Planted Variety</span>
                      <h4 className="text-xl font-extrabold text-white mt-0.5">{crop.name}</h4>
                      <p className="text-xs text-neutral-450">{crop.variety || "Standard seed class"}</p>
                    </div>

                    <div className="bg-neutral-950/60 border border-neutral-900 p-3.5 rounded-2xl flex justify-between items-center">
                      <div>
                        <span className="text-[9px] text-emerald-400 font-black block uppercase tracking-wider">Growth Stage</span>
                        <span className="text-xs text-neutral-250 font-bold capitalize mt-0.5 block">{crop.status}</span>
                      </div>
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase px-2.5 py-1 rounded-full">
                        Healthy
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-xs text-neutral-500 font-bold uppercase mb-4">No Crop Added</p>
                    <Link
                      href="/fields"
                      className="bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs font-bold px-4 py-2.5 rounded-xl inline-block"
                    >
                      Register Crop
                    </Link>
                  </div>
                )}
              </div>

              {crop && (
                <div className="border-t border-neutral-900 pt-4 mt-2 flex justify-between text-xs text-neutral-450">
                  <span>Field Area:</span>
                  <span className="font-bold text-white">{selectedField?.area_hectares} ha</span>
                </div>
              )}
            </div>

            {/* 3. AI recommendation Decision Card */}
            <div className="glass-panel rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between col-span-1 md:col-span-2 lg:col-span-1">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/5 to-transparent blur-xl rounded-bl-3xl" />
              
              <div>
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                  <Brain className="w-4 h-4 text-emerald-400" />
                  Predictive AI Schedules
                </h3>

                {recommendation ? (
                  <div className="space-y-4">
                    <div className={`p-4 rounded-2xl border ${
                      recommendation.is_irrigation_required
                        ? "bg-rose-500/5 border-rose-500/20 text-rose-350"
                        : "bg-emerald-500/5 border-emerald-500/20 text-emerald-350"
                    }`}>
                      <span className="text-[9px] font-black uppercase tracking-widest block">AI Decision</span>
                      <h4 className="text-base font-extrabold mt-0.5">
                        {recommendation.is_irrigation_required ? "Irrigation Required" : "Optimal (No Water Needed)"}
                      </h4>
                      <p className="text-[10px] mt-1 opacity-80 leading-relaxed">
                        Confidence evaluation: <span className="font-bold text-white">{(recommendation.confidence_score * 100).toFixed(0)}%</span>
                      </p>
                    </div>

                    {recommendation.is_irrigation_required && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-neutral-950/60 border border-neutral-900 p-3 rounded-xl">
                          <span className="text-[8px] text-neutral-500 font-bold uppercase block">Water Needed</span>
                          <span className="text-base font-black text-white block mt-1">{recommendation.recommended_water_volume_liters} L</span>
                          <span className="text-[8px] text-neutral-500 block">per sq. meter</span>
                        </div>
                        <div className="bg-neutral-950/60 border border-neutral-900 p-3 rounded-xl">
                          <span className="text-[8px] text-neutral-500 font-bold uppercase block">Best Time</span>
                          <span className="text-xs font-bold text-neutral-250 block mt-1 truncate">
                            {recommendation.best_irrigation_time 
                              ? new Date(recommendation.best_irrigation_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                              : "Early Morning"}
                          </span>
                          <span className="text-[8px] text-neutral-500 block">temp optimized</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-xs text-neutral-500 font-bold uppercase">No schedules computed</p>
                    <Link href="/sensors" className="bg-neutral-900 border border-neutral-800 text-[10px] font-bold px-3 py-2 rounded-xl mt-3 inline-block">
                      Simulate Readings
                    </Link>
                  </div>
                )}
              </div>

              {recommendation && (
                <div className="pt-4 border-t border-neutral-900 mt-4">
                  <Link
                    href="/ai-recommendation"
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4 stroke-[2.5]" />
                    Listen voice advice
                  </Link>
                </div>
              )}
            </div>

            {/* 4. Weather summary forecast card */}
            {weatherData && (
              <div className="glass-panel rounded-3xl p-6 shadow-md col-span-1 md:col-span-2 lg:col-span-3">
                <div className="flex justify-between items-center mb-5 border-b border-neutral-900/60 pb-3">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                    <CloudSun className="w-4 h-4 text-emerald-400" />
                    Local Weather Forecast
                  </h3>
                  <span className="text-xs font-bold text-sky-400 bg-sky-500/10 border border-sky-500/25 px-2.5 py-1 rounded-full">
                    {weatherData.conditions}
                  </span>
                </div>

                {/* Stacks vertically on phone (320px-414px), horizontal grid on larger screens */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {weatherData.forecast.slice(0, 5).map((f, idx) => {
                    const date = new Date(f.dt_txt);
                    const dayName = date.toLocaleDateString("en-IN", { weekday: "short" });
                    return (
                      <div key={idx} className="bg-neutral-950/60 border border-neutral-900/60 rounded-2xl p-4 text-center">
                        <span className="text-xs text-neutral-400 font-bold block">{idx === 0 ? "Today" : dayName}</span>
                        <span className="text-2xl font-black text-white block my-1">{f.temp.toFixed(0)}°</span>
                        <span className="text-[10px] text-neutral-500 block truncate">{f.description}</span>
                        <span className="text-[9px] text-sky-400 font-bold block mt-1.5">🌧️ {(f.rain_probability * 100).toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. Quick Stats Widget */}
            <div className="glass-panel rounded-3xl p-6 shadow-md col-span-1 md:col-span-2 lg:col-span-3">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                Land Telemetry Summary
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-neutral-950/40 border border-neutral-900 p-3 rounded-2xl">
                  <span className="text-neutral-500 block text-[9px] font-bold uppercase">Registered Farms</span>
                  <span className="text-base font-extrabold text-white block mt-1">{farms.length}</span>
                </div>
                <div className="bg-neutral-950/40 border border-neutral-900 p-3 rounded-2xl">
                  <span className="text-neutral-500 block text-[9px] font-bold uppercase">Active Fields</span>
                  <span className="text-base font-extrabold text-white block mt-1">{fields.length}</span>
                </div>
                <div className="bg-neutral-950/40 border border-neutral-900 p-3 rounded-2xl col-span-2 sm:col-span-1">
                  <span className="text-neutral-500 block text-[9px] font-bold uppercase">Soil Classification</span>
                  <span className="text-base font-extrabold text-white block mt-1 capitalize">{selectedFarm?.soil_type || "Loam"}</span>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
