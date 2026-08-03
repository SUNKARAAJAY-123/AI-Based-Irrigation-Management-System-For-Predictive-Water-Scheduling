"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/services/api";

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
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [weatherData, setWeatherData] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Location/GPS selector states
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
        setCustomLocationName(`Detected GPS Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
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

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-8 sm:px-6 lg:px-8 pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Meteorological Telemetry</h1>
            <p className="text-neutral-400 text-sm mt-1">
              Weather forecasting and local climate indicators
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full md:w-auto">
            {/* Mode Select Buttons */}
            <div className="flex bg-neutral-900 border border-neutral-800/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setLookupMode("farm");
                  if (selectedFarm) {
                    fetchWeather(selectedFarm.id);
                  }
                }}
                disabled={farms.length === 0}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                  lookupMode === "farm"
                    ? "bg-emerald-500 text-neutral-950 font-bold"
                    : "text-neutral-400 hover:text-white disabled:opacity-40"
                }`}
              >
                Farm Locations
              </button>
              <button
                type="button"
                onClick={() => setLookupMode("gps")}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                  lookupMode === "gps"
                    ? "bg-emerald-500 text-neutral-950 font-bold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Custom GPS / Coords
              </button>
            </div>

            {/* Farm Select Dropdown (only in Farm mode) */}
            {lookupMode === "farm" && farms.length > 0 && (
              <div>
                <select
                  value={selectedFarm?.id || ""}
                  onChange={handleFarmChange}
                  className="bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-xl px-4 py-2 outline-none w-full sm:w-60 h-9"
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
          <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-5 shadow-xl backdrop-blur-md">
            {farms.length === 0 && (
              <p className="text-[10px] text-amber-400/80 font-bold uppercase tracking-wider mb-3">
                ⚠️ No farms registered yet. You can still query live weather by coordinates below!
              </p>
            )}
            <form onSubmit={handleCustomCoordinatesFetch} className="flex flex-col md:flex-row items-end gap-4">
              <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                <div>
                  <label htmlFor="gps-lat" className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
                    Latitude
                  </label>
                  <input
                    id="gps-lat"
                    type="number"
                    step="0.000001"
                    required
                    placeholder="e.g. 15.3048"
                    value={latitudeInput}
                    onChange={(e) => setLatitudeInput(e.target.value)}
                    className="w-full bg-neutral-950/80 border border-neutral-800 text-xs text-neutral-200 rounded-xl px-3 py-2 h-9 outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label htmlFor="gps-lon" className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
                    Longitude
                  </label>
                  <input
                    id="gps-lon"
                    type="number"
                    step="0.000001"
                    required
                    placeholder="e.g. 76.9084"
                    value={longitudeInput}
                    onChange={(e) => setLongitudeInput(e.target.value)}
                    className="w-full bg-neutral-950/80 border border-neutral-800 text-xs text-neutral-200 rounded-xl px-3 py-2 h-9 outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={isDetectingLocation}
                  className="flex-1 md:flex-initial bg-neutral-850 hover:bg-neutral-800 text-emerald-400 border border-neutral-800 font-bold text-xs px-4 py-2 h-9 rounded-xl transition-all whitespace-nowrap cursor-pointer"
                >
                  {isDetectingLocation ? "🎯 Detecting..." : "🎯 Auto Detect GPS"}
                </button>
                <button
                  type="submit"
                  className="flex-1 md:flex-initial bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-xs px-6 py-2 h-9 rounded-xl transition-all cursor-pointer"
                >
                  Get Weather
                </button>
              </div>
            </form>
          </div>
        )}

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs px-4 py-3 rounded-xl">
            <div className="flex items-center justify-between gap-4">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => {
                  if (lookupMode === "farm" && selectedFarm) {
                    fetchWeather(selectedFarm.id);
                  } else if (lookupMode === "gps") {
                    const lat = parseFloat(latitudeInput);
                    const lon = parseFloat(longitudeInput);
                    if (!isNaN(lat) && !isNaN(lon)) {
                      fetchWeather(null, lat, lon);
                    } else {
                      loadFarms();
                    }
                  }
                }}
                className="shrink-0 border border-rose-400/40 px-3 py-1.5 rounded-lg font-bold hover:bg-rose-500/10"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {lookupMode === "farm" && farms.length === 0 ? (
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">No Farms Found</h2>
            <p className="text-xs text-neutral-400 mb-6">
              Register a farm to retrieve live weather coordinates forecast.
            </p>
            <Link href="/farms" className="bg-emerald-500 text-neutral-950 font-bold text-xs px-5 py-3 rounded-xl">
              Register a Farm
            </Link>
          </div>
        ) : loading ? (
          <div className="py-12 flex justify-center">
            <span className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : weatherData ? (
          <div className="space-y-8">
            
            {/* Live Weather & Tips */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Current Weather details */}
              <div className="lg:col-span-2 bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row justify-between items-center gap-6">
                <div>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Current Conditions</span>
                  <h2 className="text-5xl font-black text-white mt-2">{weatherData.temp.toFixed(1)}°C</h2>
                  <p className="text-sm text-neutral-300 mt-2 font-medium capitalize">
                    {weatherData.conditions} in {lookupMode === "farm" ? (selectedFarm?.name || "your farm") : (customLocationName || "Custom Location")}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6 text-xs text-neutral-400">
                    <div>
                      <span className="block font-semibold">Relative Humidity</span>
                      <span className="text-sm font-bold text-neutral-200 mt-1 block">{weatherData.humidity}%</span>
                    </div>
                    <div>
                      <span className="block font-semibold">Wind Velocity</span>
                      <span className="text-sm font-bold text-neutral-200 mt-1 block">{weatherData.wind_speed} km/h</span>
                    </div>
                    <div>
                      <span className="block font-semibold">Atmospheric Pressure</span>
                      <span className="text-sm font-bold text-neutral-200 mt-1 block">{weatherData.current.pressure?.toFixed(0) ?? "—"} hPa</span>
                    </div>
                    <div>
                      <span className="block font-semibold">Cloud Cover / UV</span>
                      <span className="text-sm font-bold text-neutral-200 mt-1 block">{weatherData.current.cloud_cover ?? "—"}% / {weatherData.current.uv_index?.toFixed(1) ?? "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Big Weather Icon / Graphic */}
                <div className="w-32 h-32 rounded-3xl bg-neutral-950/40 border border-neutral-800/50 flex items-center justify-center text-5xl">
                  {weatherData.conditions.toLowerCase().includes("rain") ? "🌧️" : (
                    weatherData.conditions.toLowerCase().includes("cloud") ? "⛅" : "☀️"
                  )}
                </div>
              </div>

              {/* Weather-based Agricultural recommendations */}
              <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-300 mb-4 flex items-center gap-2">
                    <span>💡</span> Meteorological Advice
                  </h3>
                  
                  <div className="space-y-3.5">
                    {weatherData.forecast[0]?.rain_probability > 0.5 ? (
                      <div className="p-3.5 bg-sky-500/10 border border-sky-500/25 rounded-2xl text-xs text-sky-300">
                        <span className="font-bold block mb-1">🌧️ High Precipitation Expected</span>
                        We predict a {(weatherData.forecast[0].rain_probability * 100).toFixed(0)}% chance of rain. Consider pausing automatic sprinkler schedules to prevent root rot and save water.
                      </div>
                    ) : weatherData.temp > 33 ? (
                      <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-xs text-amber-300">
                        <span className="font-bold block mb-1">☀️ High Ambient Temperatures</span>
                        Temperatures exceed 33°C. Evaporation loss is high. We recommend irrigating strictly in the early mornings or evenings.
                      </div>
                    ) : (
                      <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-xs text-emerald-300">
                        <span className="font-bold block mb-1">🟢 Standard Meteorological Settings</span>
                        Weather conditions are normal. Irrigation models will evaluate strictly on soil moisture sensor feeds.
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* 5-Day forecast grid */}
            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span>🗓️</span> 5-Day Forecast Grid
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                {weatherData.forecast.map((f, idx) => {
                  const date = new Date(f.dt_txt);
                  const weekday = date.toLocaleDateString("en-IN", { weekday: "long" });
                  const dateString = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                  
                  return (
                    <div
                      key={idx}
                      className="bg-neutral-900/40 border border-neutral-800/80 p-5 rounded-3xl text-center flex flex-col justify-between hover:border-neutral-700 transition-colors shadow-lg"
                    >
                      <div>
                        <span className="text-xs text-neutral-400 font-bold block">{idx === 0 ? "Today" : weekday}</span>
                        <span className="text-[10px] text-neutral-500 block mt-0.5">{dateString}</span>
                      </div>
                      
                      <div className="text-4xl my-4">
                        {f.description.toLowerCase().includes("rain") ? "🌧️" : (
                          f.description.toLowerCase().includes("cloud") ? "⛅" : "☀️"
                        )}
                      </div>
                      
                      <div>
                        <span className="text-2xl font-black text-white block">{f.temp.toFixed(1)}°C</span>
                        <span className="text-[10px] text-neutral-400 block capitalize mt-1 truncate">{f.description}</span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-neutral-800/80 grid grid-cols-2 text-[9px] text-neutral-400">
                        <div>
                          <span className="block font-bold">Hum</span>
                          <span>{f.humidity}%</span>
                        </div>
                        <div>
                          <span className="block font-bold text-sky-400">Rain%</span>
                          <span className="text-sky-300 font-bold">{(f.rain_probability * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">Hourly Forecast</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {weatherData.hourly.slice(0, 24).map((hour) => (
                  <div key={hour.time} className="min-w-32 bg-neutral-900/40 border border-neutral-800/80 p-4 rounded-2xl text-center">
                    <span className="text-[10px] text-neutral-400 block">{new Date(hour.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="text-xl font-black text-white block mt-2">{hour.temperature.toFixed(1)}°C</span>
                    <span className="text-[10px] text-sky-300 block mt-2">Rain {(hour.rain_probability * 100).toFixed(0)}%</span>
                    <span className="text-[10px] text-neutral-400 block">Hum {hour.humidity}% · Wind {hour.wind_speed} km/h</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : null}

      </div>
    </div>
  );
}
