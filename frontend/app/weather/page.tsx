"use client";
import { useTranslation } from "@/context/LanguageContext";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/services/api";
import { 
  CloudSun, 
  MapPin, 
  Navigation, 
  Sun, 
  CloudRain, 
  Cloud, 
  Droplet, 
  Wind, 
  Eye, 
  Compass, 
  Lightbulb, 
  RefreshCw, 
  AlertTriangle 
} from "lucide-react";

interface Farm {
  id: string;
  name: string;
}

interface WeatherForecastItem {
  dt_txt: string;
  temp: number;
  humidity: number;
  wind_speed: number;
  rain_probability: number;
  description: string;
}

interface WeatherHourlyItem {
  time: string;
  temperature: number;
  humidity: number;
  wind_speed: number;
  rain_probability: number;
  description: string;
}

interface WeatherDailyItem {
  date: string;
  temp_max: number;
  temp_min: number;
  rain_probability: number;
  wind_speed: number;
  uv_index?: number;
  sunrise?: string;
  sunset?: string;
  description: string;
}

interface Weather {
  temp: number;
  humidity: number;
  wind_speed: number;
  conditions: string;
  forecast: WeatherForecastItem[];
  current: {
    pressure?: number;
    cloud_cover?: number;
    uv_index?: number;
  };
  hourly: WeatherHourlyItem[];
  daily: WeatherDailyItem[];
}

export default function WeatherPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [weatherData, setWeatherData] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selector states
  const [lookupMode, setLookupMode] = useState<"farm" | "gps">("farm");
  const [latitudeInput, setLatitudeInput] = useState("");
  const [longitudeInput, setLongitudeInput] = useState("");
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [customLocationName, setCustomLocationName] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadFarms();
    }
  }, [user]);

  const loadFarms = async () => {
    setLoading(true);
    try {
      const data = await api.get<Farm[]>("/farms");
      setFarms(data);
      if (data.length > 0) {
        setSelectedFarm(data[0]);
        setLookupMode("farm");
        fetchWeather(data[0].id);
      } else {
        setLookupMode("gps");
        setLoading(false);
      }
    } catch (err) {
      setError((err as Error).message || "Failed to load farms");
      setLookupMode("gps");
      setLoading(false);
    }
  };

  const fetchWeather = async (farmId: string | null, lat?: number, lon?: number) => {
    setLoading(true);
    setError(null);
    try {
      let url = "";
      if (farmId) {
        url = `/weather?farm_id=${farmId}`;
      } else if (lat !== undefined && lon !== undefined) {
        url = `/weather?latitude=${lat}&longitude=${lon}`;
      } else {
        throw new Error("No location parameters specified");
      }
      const data = await api.get<Weather>(url);
      setWeatherData(data);
    } catch (err) {
      setError((err as Error).message || "Failed to fetch weather forecast");
    } finally {
      setLoading(false);
    }
  };

  const handleFarmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const farm = farms.find(f => f.id === e.target.value);
    if (farm) {
      setSelectedFarm(farm);
      fetchWeather(farm.id);
    }
  };

  const detectLocation = () => {
    if (!("geolocation" in navigator)) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setLatitudeInput(lat.toFixed(6));
        setLongitudeInput(lon.toFixed(6));
        setIsDetectingLocation(false);
        setCustomLocationName(`Detected Coordinates (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
        fetchWeather(null, lat, lon);
      },
      (error) => {
        console.error(`Error detecting location: [Code ${error.code}] ${error.message}`);
        alert("Failed to get device location. Please input coordinates manually.");
        setIsDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleCustomCoordinatesFetch = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(latitudeInput);
    const lon = parseFloat(longitudeInput);
    if (isNaN(lat) || isNaN(lon)) {
      setError("Please enter valid latitude and longitude numbers.");
      return;
    }
    setCustomLocationName(`Coordinates (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
    fetchWeather(null, lat, lon);
  };

  if (authLoading) return null;

  // Render correct climate icon based on text
  const getWeatherIcon = (conditions: string, sizeClass = "w-8 h-8") => {
    const cond = conditions.toLowerCase();
    if (cond.includes("rain") || cond.includes("drizzle") || cond.includes("shower")) {
      return <CloudRain className={`${sizeClass} text-sky-400`} />;
    } else if (cond.includes("cloud") || cond.includes("overcast")) {
      return <Cloud className={`${sizeClass} text-neutral-400`} />;
    }
    return <Sun className={`${sizeClass} text-amber-400 animate-[spin_30s_linear_infinite]`} />;
  };

  return (
    <div className="min-h-screen bg-[#090d0b] text-[#f2f7f4] px-4 py-8 sm:px-6 lg:px-8 pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-900 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <CloudSun className="w-8 h-8 text-emerald-500" />
              {t("weather.title")}
            </h1>
            <p className="text-neutral-450 text-xs mt-1 font-semibold">
              {t("weather.subtitle")}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full md:w-auto">
            {/* Mode Select Buttons */}
            <div className="flex bg-neutral-950 border border-neutral-900 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setLookupMode("farm");
                  if (selectedFarm) fetchWeather(selectedFarm.id);
                }}
                disabled={farms.length === 0}
                className={`text-xs px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                  lookupMode === "farm"
                    ? "bg-emerald-500 text-neutral-950 shadow-md"
                    : "text-neutral-400 hover:text-white disabled:opacity-40"
                }`}
              >
                {t("nav.farms")}
              </button>
              <button
                type="button"
                onClick={() => setLookupMode("gps")}
                className={`text-xs px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                  lookupMode === "gps"
                    ? "bg-emerald-500 text-neutral-950 shadow-md"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {t("farms.coordinates")}
              </button>
            </div>

            {/* Farm Select Dropdown (only in Farm mode) */}
            {lookupMode === "farm" && farms.length > 0 && (
              <div>
                <select
                  value={selectedFarm?.id || ""}
                  onChange={handleFarmChange}
                  className="bg-neutral-950 border border-neutral-900 text-xs text-neutral-300 rounded-xl px-4 py-2.5 outline-none w-full sm:w-60 h-10 font-bold"
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* GPS Coordinate Input Form */}
        {lookupMode === "gps" && (
          <div className="glass-panel rounded-3xl p-5 shadow-xl border border-neutral-900">
            {farms.length === 0 && (
              <p className="text-[10px] text-amber-400/85 font-black uppercase tracking-widest mb-3 block">
                ⚠️ {t("farms.no_farms")}
              </p>
            )}
            <form onSubmit={handleCustomCoordinatesFetch} className="flex flex-col md:flex-row items-end gap-4">
              <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                <div>
                  <label htmlFor="gps-lat" className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1.5">
                    {t("farms.latitude")}
                  </label>
                  <input
                    id="gps-lat"
                    type="number"
                    step="0.000001"
                    required
                    placeholder="e.g. 15.3048"
                    value={latitudeInput}
                    onChange={(e) => setLatitudeInput(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-200 rounded-xl px-3 py-3 outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label htmlFor="gps-lon" className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1.5">
                    {t("farms.longitude")}
                  </label>
                  <input
                    id="gps-lon"
                    type="number"
                    step="0.000001"
                    required
                    placeholder="e.g. 76.9084"
                    value={longitudeInput}
                    onChange={(e) => setLongitudeInput(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-200 rounded-xl px-3 py-3 outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={isDetectingLocation}
                  className="flex-1 md:flex-initial bg-neutral-950 hover:bg-neutral-900 text-emerald-450 border border-neutral-900 font-bold text-xs px-4 py-3 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1"
                >
                  <Navigation className={`w-3.5 h-3.5 ${isDetectingLocation ? "animate-spin" : ""}`} />
                  {isDetectingLocation ? t("common.loading") : t("farms.auto_detect")}
                </button>
                <button
                  type="submit"
                  className="flex-1 md:flex-initial bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer uppercase tracking-wider"
                >
                  Get Weather
                </button>
              </div>
            </form>
          </div>
        )}

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs px-4 py-3 rounded-2xl flex justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-450" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (lookupMode === "farm" && selectedFarm) {
                  fetchWeather(selectedFarm.id);
                } else {
                  const lat = parseFloat(latitudeInput);
                  const lon = parseFloat(longitudeInput);
                  if (!isNaN(lat) && !isNaN(lon)) fetchWeather(null, lat, lon);
                }
              }}
              className="shrink-0 border border-rose-500/20 px-3 py-1.5 rounded-xl font-bold hover:bg-rose-500/10 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        {lookupMode === "farm" && farms.length === 0 ? (
          <div className="glass-panel rounded-3xl p-10 text-center max-w-xl mx-auto space-y-6 shadow-md border border-neutral-900">
            <h2 className="text-lg font-bold text-white">No Registered Plots</h2>
            <p className="text-neutral-450 text-xs max-w-xs mx-auto leading-relaxed">
              Setup a registered farm plot to view real-time weather analytics.
            </p>
            <Link href="/farms" className="bg-emerald-500 text-neutral-950 font-extrabold text-xs px-5 py-3 rounded-xl inline-block">
              Register a Farm
            </Link>
          </div>
        ) : loading ? (
          <div className="py-16 flex justify-center">
            <span className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : weatherData ? (
          <div className="space-y-6">
            
            {/* Live Weather & Tips */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Current Weather details */}
              <div className="lg:col-span-2 glass-panel rounded-3xl p-6 shadow-xl border border-neutral-900 flex flex-col sm:flex-row justify-between items-center gap-6 relative overflow-hidden">
                <div className="space-y-4 w-full">
                  <div>
                    <span className="text-[9px] text-emerald-450 font-bold uppercase tracking-wider block">Live Climate Feeds</span>
                    <h2 className="text-5xl font-black text-white mt-1">{weatherData.temp.toFixed(1)}°C</h2>
                    <p className="text-xs text-neutral-300 mt-1 capitalize font-bold flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                      {weatherData.conditions} in {lookupMode === "farm" ? selectedFarm?.name : customLocationName}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-neutral-950/40 border border-neutral-900 p-4 rounded-2xl text-xs text-neutral-400">
                    <div>
                      <span className="text-[9px] text-neutral-500 font-bold uppercase block">Humidity</span>
                      <span className="text-sm font-bold text-neutral-100 mt-1 block">{weatherData.humidity}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-500 font-bold uppercase block">Wind Velocity</span>
                      <span className="text-sm font-bold text-neutral-100 mt-1 block">{weatherData.wind_speed} km/h</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-500 font-bold uppercase block">Pressure</span>
                      <span className="text-sm font-bold text-neutral-100 mt-1 block">{weatherData.current.pressure ?? "—"} hPa</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-500 font-bold uppercase block">Cloud Cover</span>
                      <span className="text-sm font-bold text-neutral-100 mt-1 block">{weatherData.current.cloud_cover ?? "—"}%</span>
                    </div>
                  </div>
                </div>

                {/* Big Weather Icon */}
                <div className="w-32 h-32 rounded-3xl bg-neutral-950/60 border border-neutral-900 flex items-center justify-center shrink-0 shadow-inner">
                  {getWeatherIcon(weatherData.conditions, "w-16 h-16")}
                </div>
              </div>

              {/* Weather-based Agricultural recommendations */}
              <div className="glass-panel rounded-3xl p-6 shadow-xl border border-neutral-900 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-neutral-900 pb-2">
                    <Lightbulb className="w-4 h-4 text-emerald-400" />
                    Climate Advice
                  </h3>
                  
                  <div className="space-y-3.5">
                    {weatherData.forecast[0]?.rain_probability > 0.5 ? (
                      <div className="p-4 bg-sky-500/5 border border-sky-500/20 rounded-2xl text-xs text-sky-300 leading-relaxed">
                        <span className="font-bold block mb-1">🌧️ Rain Probabilities High</span>
                        Forecast shows a {((weatherData.forecast[0].rain_probability) * 100).toFixed(0)}% chance of rain. Pause irrigation setups to conserve water and prevent saturated soil.
                      </div>
                    ) : weatherData.temp > 33 ? (
                      <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-xs text-amber-300 leading-relaxed">
                        <span className="font-bold block mb-1">☀️ High Temperature Heat</span>
                        Ambient heat exceeds 33°C. Evaporative loss will be high. Apply irrigation schedules early mornings or post-sunset.
                      </div>
                    ) : (
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 leading-relaxed">
                        <span className="font-bold block mb-1">🟢 Normal Meteorological Climate</span>
                        No temperature warnings. Schedules will compute based on raw soil moisture telemetry.
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Hourly Forecast */}
            <div className="glass-panel rounded-3xl p-6 shadow-xl border border-neutral-900 space-y-4">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-900 pb-2">
                <Compass className="w-4 h-4 text-emerald-400" />
                Hourly Forecast Sequence
              </h3>
              
              <div className="flex gap-4 overflow-x-auto pb-3 no-scrollbar">
                {weatherData.hourly.slice(0, 15).map((hour) => (
                  <div key={hour.time} className="min-w-[130px] bg-neutral-950/65 border border-neutral-900 p-4 rounded-2xl text-center shrink-0">
                    <span className="text-[10px] text-neutral-500 font-bold block">
                      {new Date(hour.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <div className="my-3 flex justify-center">
                      {getWeatherIcon(hour.description, "w-8 h-8")}
                    </div>
                    <span className="text-lg font-black text-white block">{hour.temperature.toFixed(1)}°C</span>
                    <span className="text-[9px] text-sky-400 font-bold block mt-1.5">🌧️ {(hour.rain_probability * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 5-Day forecast grid */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-900 pb-2">
                <CloudSun className="w-4 h-4 text-emerald-400" />
                5-Day Outlook Grid
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {weatherData.forecast.slice(0, 5).map((f, idx) => {
                  const date = new Date(f.dt_txt);
                  const weekday = date.toLocaleDateString("en-IN", { weekday: "short" });
                  const dateString = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                  
                  return (
                    <div
                      key={idx}
                      className="glass-panel p-4 rounded-2xl text-center flex flex-col justify-between hover:border-emerald-500/20 transition-all duration-200 shadow-sm"
                    >
                      <div>
                        <span className="text-xs text-neutral-400 font-black block">{idx === 0 ? "Today" : weekday}</span>
                        <span className="text-[9px] text-neutral-550 block font-bold mt-0.5">{dateString}</span>
                      </div>
                      
                      <div className="my-4 flex justify-center">
                        {getWeatherIcon(f.description, "w-10 h-10")}
                      </div>
                      
                      <div>
                        <span className="text-xl font-black text-white block">{f.temp.toFixed(0)}°C</span>
                        <span className="text-[9px] text-neutral-500 font-bold block mt-1 capitalize truncate">{f.description}</span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-neutral-900 grid grid-cols-2 text-[9px] text-neutral-500 font-bold">
                        <div>
                          <span className="block text-[8px] text-neutral-550">Hum</span>
                          <span className="text-white">{f.humidity}%</span>
                        </div>
                        <div>
                          <span className="block text-[8px] text-sky-500">Rain%</span>
                          <span className="text-sky-400">{(f.rain_probability * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        ) : null}

      </div>
    </div>
  );
}
