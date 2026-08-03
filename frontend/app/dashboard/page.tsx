"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import Link from "next/link";

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
  const { user, loading: authLoading, logout } = useAuth();
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
      // 1. Fetch Farms
      const fetchedFarms = await api.get<Farm[]>("/farms");
      setFarms(fetchedFarms);
      
      if (fetchedFarms.length > 0) {
        const firstFarm = fetchedFarms[0];
        setSelectedFarm(firstFarm);
        await loadFarmDetails(firstFarm);
      } else {
        setLoadingData(false);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load dashboard data");
      setLoadingData(false);
    }
  };

  const loadFarmDetails = async (farm: Farm) => {
    try {
      // Fetch fields
      const fetchedFields = await api.get<Field[]>(`/fields?farm_id=${farm.id}`);
      setFields(fetchedFields);

      // Fetch Weather
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
    } catch (err: any) {
      setError(err.message || "Failed to load farm details");
      setLoadingData(false);
    }
  };

  const loadFieldDetails = async (field: Field) => {
    try {
      // Fetch crops
      const crops = await api.get<Crop[]>(`/crops?field_id=${field.id}`);
      if (crops.length > 0) {
        const firstCrop = crops[0];
        setCrop(firstCrop);

        // Fetch recommendations
        const recs = await api.get<Recommendation[]>(`/recommendations?crop_id=${firstCrop.id}`);
        if (recs.length > 0) {
          setRecommendation(recs[0]);
          // Set moisture snapshot from features if present
          const snapshot = (recs[0] as any).features_snapshot;
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
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Syncing dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-8 sm:px-6 lg:px-8 pb-24 md:pb-8">
      {/* Background glowing elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-neutral-800/80 pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-500/20 tracking-wider uppercase">
              AI Powered Irrigation
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 bg-clip-text text-transparent sm:text-4xl">
            Farmer Dashboard
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Welcome back, {user?.full_name}. Real-time analytics from your fields.
          </p>
        </div>

        {/* Farm & Field Selection Dropdowns */}
        {farms.length > 0 && (
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <div className="flex-1 sm:flex-initial">
              <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Select Farm</label>
              <select
                value={selectedFarm?.id || ""}
                onChange={(e) => handleFarmChange(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-500/50"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            
            {fields.length > 0 && (
              <div className="flex-1 sm:flex-initial">
                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Select Field</label>
                <select
                  value={selectedField?.id || ""}
                  onChange={(e) => handleFieldChange(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-500/50"
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

      {/* If No Farms Exist */}
      {farms.length === 0 && !loadingData && (
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-2xl backdrop-blur-md space-y-6">
          <div className="text-5xl">🚜</div>
          <h2 className="text-xl font-bold text-white">Let's Get Started!</h2>
          <p className="text-neutral-400 text-xs leading-relaxed">
            Welcome to AgriSmart Pro! To utilize the AI model recommendations, soil moisture tracking, and weather forecasts, you need to register a farm and add a field.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/farms"
              className="bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-sm px-6 py-3 rounded-xl transition-all duration-200"
            >
              Add Your Farm
            </Link>
          </div>
        </div>
      )}

      {/* Main Dashboard Layout */}
      {farms.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: Soil Moisture & Crop Overview */}
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Telemetry Card */}
              <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between">
                <h3 className="text-sm font-bold text-neutral-300 mb-4 flex items-center gap-2">
                  <span>💧</span> Soil Moisture Level
                </h3>
                
                <div className="flex flex-col items-center justify-center py-4">
                  {latestMoisture !== null ? (
                    <div className="relative flex items-center justify-center w-36 h-36">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path className="text-neutral-800" strokeWidth="2.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-emerald-500 transition-all duration-500" strokeDasharray={`${latestMoisture}, 100`} strokeWidth="2.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-3xl font-black text-white">{latestMoisture.toFixed(0)}%</span>
                        <span className="block text-[9px] font-bold text-emerald-400 uppercase tracking-widest mt-0.5">VWC</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-xs text-neutral-500 font-bold uppercase">No readings logged</p>
                      <Link href="/sensors" className="text-emerald-400 text-xs font-bold underline mt-2 inline-block">
                        Add/Simulate Sensor
                      </Link>
                    </div>
                  )}
                  
                  {latestMoisture !== null && (
                    <span className="text-xs text-neutral-300 mt-4 font-semibold">
                      {latestMoisture < 35 ? "🔴 Critical Dryness" : latestMoisture < 70 ? "🟢 Optimal Moisture" : "🔵 Waterlogged"}
                    </span>
                  )}
                </div>
                
                <div className="border-t border-neutral-800/80 pt-4 mt-2">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Field Status</span>
                  <p className="text-xs text-neutral-200 mt-1">
                    Soil: <span className="font-bold text-white capitalize">{selectedField?.soil_type || "Loam"}</span>
                  </p>
                </div>
              </div>

              {/* Crop Stats Card */}
              <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-300 mb-4 flex items-center gap-2">
                    <span>🌾</span> Crop Information
                  </h3>
                  
                  {crop ? (
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Active Crop</span>
                        <h4 className="text-xl font-extrabold text-white mt-1">{crop.name}</h4>
                        <span className="text-xs text-neutral-400">{crop.variety || "Local Variety"}</span>
                      </div>
                      
                      <div className="bg-neutral-950/60 border border-neutral-800/50 p-3.5 rounded-xl">
                        <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block">Crop Stage</span>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs font-semibold text-neutral-200 capitalize">{crop.status}</span>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">Growing Healthy</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-xs text-neutral-500 font-bold uppercase mb-3">No Crop Added</p>
                      <Link
                        href="/fields"
                        className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/60 text-xs font-bold px-4 py-2 rounded-xl"
                      >
                        Register Crop
                      </Link>
                    </div>
                  )}
                </div>

                <div className="border-t border-neutral-800/80 pt-4">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Area Size</span>
                  <p className="text-xs text-neutral-200 mt-1">
                    Hectares: <span className="font-bold text-white">{selectedField?.area_hectares} ha</span>
                  </p>
                </div>
              </div>

            </div>

            {/* Weather Forecast Summary */}
            {weatherData && (
              <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-neutral-300 flex items-center gap-2">
                    <span>🌤️</span> Weather & Meteorological Forecast
                  </h3>
                  <span className="text-xs font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/25 px-2.5 py-1 rounded-full">
                    {weatherData.conditions}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {weatherData.forecast.map((f, idx) => {
                    const date = new Date(f.dt_txt);
                    const dayName = date.toLocaleDateString("en-IN", { weekday: "short" });
                    return (
                      <div key={idx} className="bg-neutral-950/60 border border-neutral-800/60 rounded-2xl p-4 text-center">
                        <span className="text-xs text-neutral-400 font-bold block">{idx === 0 ? "Today" : dayName}</span>
                        <span className="text-2xl font-black text-white block my-2">{f.temp.toFixed(0)}°</span>
                        <span className="text-[10px] text-neutral-400 block truncate">{f.description}</span>
                        <span className="text-[9px] text-sky-400 font-semibold block mt-1.5">🌧️ {(f.rain_probability * 100).toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Column 2: AI Irrigation Recommendation Card */}
          <div className="space-y-8">
            <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/20 to-transparent blur-2xl rounded-bl-3xl" />
              
              <h3 className="text-sm font-bold text-neutral-300 mb-6 flex items-center gap-2">
                <span>🧠</span> Predictive AI Insights
              </h3>

              {recommendation ? (
                <div className="space-y-6">
                  {/* Status Box */}
                  <div className={`p-4 rounded-2xl border ${
                    recommendation.is_irrigation_required
                      ? "bg-rose-500/10 border-rose-500/25 text-rose-300"
                      : "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                  }`}>
                    <span className="text-[9px] font-black uppercase tracking-wider block">Decision</span>
                    <h4 className="text-lg font-black mt-1">
                      {recommendation.is_irrigation_required ? "⚠️ Irrigation Required" : "🟢 Optimal Moisture (No Irrigation)"}
                    </h4>
                    <p className="text-xs mt-1 opacity-90 leading-relaxed">
                      Confidence score is <span className="font-bold">{(recommendation.confidence_score * 100).toFixed(0)}%</span>. Model type: Random Forest classifier evaluation.
                    </p>
                  </div>

                  {recommendation.is_irrigation_required && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-neutral-950/60 border border-neutral-800/50 p-4 rounded-2xl">
                        <span className="text-[9px] text-neutral-400 font-bold uppercase block">Water quantity</span>
                        <span className="text-2xl font-black text-white block mt-1.5">{recommendation.recommended_water_volume_liters} L</span>
                        <span className="text-[9px] text-neutral-500 block">per square meter</span>
                      </div>
                      
                      <div className="bg-neutral-950/60 border border-neutral-800/50 p-4 rounded-2xl">
                        <span className="text-[9px] text-neutral-400 font-bold uppercase block">Best Time</span>
                        <span className="text-sm font-bold text-neutral-200 block mt-2.5">
                          {recommendation.best_irrigation_time 
                            ? new Date(recommendation.best_irrigation_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                            : "Early Morning"}
                        </span>
                        <span className="text-[9px] text-neutral-500 block">temperature optimized</span>
                      </div>
                    </div>
                  )}

                  {/* Regional voice advice shortcut button */}
                  <Link
                    href="/ai-recommendation"
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-xs py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mt-4 cursor-pointer"
                  >
                    <span>🎙️</span> Listen in Hindi / Kannada
                  </Link>

                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-xs text-neutral-500 font-bold uppercase">No recommendations generated</p>
                  <p className="text-[10px] text-neutral-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                    Once telemetry readings are logged from your sensor, the AI model will evaluate and post recommendations here.
                  </p>
                  <Link href="/sensors" className="bg-neutral-800 border border-neutral-700/60 text-xs font-bold px-4 py-2 rounded-xl mt-4 inline-block">
                    Go to Sensor Panel
                  </Link>
                </div>
              )}
            </div>
            
            {/* Quick Stats Widget */}
            <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
              <h3 className="text-sm font-bold text-neutral-300 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400">Total Farms Registered</span>
                  <span className="font-bold text-white">{farms.length}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400">Total Fields Configured</span>
                  <span className="font-bold text-white">{fields.length}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400">Current Soil Type</span>
                  <span className="font-bold text-white capitalize">{selectedFarm?.soil_type || "Loam"}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
