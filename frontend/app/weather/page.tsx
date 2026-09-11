"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { useTranslation } from "@/context/LanguageContext";
import { 
  CloudSun, 
  Navigation, 
  Sun, 
  CloudRain, 
  Cloud, 
  Compass
} from "lucide-react";

import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import WeatherWidget from "@/components/ui/WeatherWidget";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";

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

  const [lookupMode, setLookupMode] = useState<"farm" | "gps">("farm");
  const [latitudeInput, setLatitudeInput] = useState("");
  const [longitudeInput, setLongitudeInput] = useState("");
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [customLocationName, setCustomLocationName] = useState<string | null>(null);

  const fetchWeather = useCallback(async (farmId: string | null, lat?: number, lon?: number) => {
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
  }, []);

  const loadFarms = useCallback(async () => {
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
  }, [fetchWeather]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadFarms();
    }
  }, [user, loadFarms]);

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
        setCustomLocationName(`Detected Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
        fetchWeather(null, lat, lon);
      },
      (error) => {
        console.error(`Error detecting location: [Code ${error.code}] ${error.message}`);
        alert("Failed to get location. Please input coordinates manually.");
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
    setCustomLocationName(`Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
    fetchWeather(null, lat, lon);
  };

  if (authLoading) return null;

  const getWeatherIcon = (conditions: string, sizeClass = "w-8 h-8") => {
    const cond = conditions.toLowerCase();
    if (cond.includes("rain") || cond.includes("drizzle") || cond.includes("shower")) {
      return <CloudRain className={`${sizeClass} text-sky-400`} />;
    } else if (cond.includes("cloud") || cond.includes("overcast")) {
      return <Cloud className={`${sizeClass} text-neutral-400`} />;
    }
    return <Sun className={`${sizeClass} text-amber-400`} />;
  };

  return (
    <div className="min-h-screen bg-[#060a08] text-neutral-100 px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-8 max-w-6xl mx-auto space-y-6">
      
      <PageHeader
        title={t("weather.title") || "Agricultural Weather Forecast"}
        subtitle={t("weather.subtitle") || "Real-time rain forecast, temperature, humidity, and water-saving advice."}
        icon={<CloudSun className="w-6 h-6 stroke-[2.5]" />}
        action={
          <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-850 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setLookupMode("farm");
                if (selectedFarm) fetchWeather(selectedFarm.id);
              }}
              disabled={farms.length === 0}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-black transition-all cursor-pointer ${
                lookupMode === "farm" ? "bg-emerald-500 text-neutral-950 shadow-md" : "text-neutral-400 hover:text-white"
              }`}
            >
              My Farm
            </button>
            <button
              type="button"
              onClick={() => setLookupMode("gps")}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-black transition-all cursor-pointer ${
                lookupMode === "gps" ? "bg-emerald-500 text-neutral-950 shadow-md" : "text-neutral-400 hover:text-white"
              }`}
            >
              GPS
            </button>
          </div>
        }
      />

      {/* GPS Coordinate Form if in GPS mode */}
      {lookupMode === "gps" && (
        <Card variant="glass" padding="md">
          <form onSubmit={handleCustomCoordinatesFetch} className="flex flex-col md:flex-row items-end gap-3">
            <div className="flex-1 grid grid-cols-2 gap-2 w-full">
              <div>
                <label htmlFor="gps-lat" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
                  Latitude
                </label>
                <input
                  id="gps-lat"
                  type="number"
                  step="0.000001"
                  required
                  placeholder="15.3048"
                  value={latitudeInput}
                  onChange={(e) => setLatitudeInput(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-3 py-2.5 outline-none focus:border-emerald-500 min-h-[44px]"
                />
              </div>
              <div>
                <label htmlFor="gps-lon" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
                  Longitude
                </label>
                <input
                  id="gps-lon"
                  type="number"
                  step="0.000001"
                  required
                  placeholder="76.9084"
                  value={longitudeInput}
                  onChange={(e) => setLongitudeInput(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-3 py-2.5 outline-none focus:border-emerald-500 min-h-[44px]"
                />
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={detectLocation}
                isLoading={isDetectingLocation}
                leftIcon={<Navigation className="w-4 h-4" />}
              >
                Auto-Detect
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Get Weather
              </Button>
            </div>
          </form>
        </Card>
      )}

      {error && <ErrorState message={error} onRetry={loadFarms} />}

      {loading ? (
        <LoadingState message="Fetching weather forecast..." />
      ) : weatherData ? (
        <div className="space-y-6">
          
          {/* Main Weather Widget */}
          <WeatherWidget
            temp={weatherData.temp}
            humidity={weatherData.humidity}
            conditions={weatherData.conditions}
            rainProbability={weatherData.forecast[0]?.rain_probability ?? 0.2}
            windSpeed={weatherData.wind_speed}
            farmerAdvice={
              (weatherData.forecast[0]?.rain_probability ?? 0) > 0.4 
                ? "Rain is likely in your area today. Consider delaying planned irrigation to avoid overwatering."
                : "Weather is dry and stable. Continue regular soil moisture monitoring for optimal crop growth."
            }
            forecast={weatherData.forecast.slice(0, 3).map((f, i) => {
              const dt = new Date(f.dt_txt);
              return {
                day: i === 0 ? "Today" : dt.toLocaleDateString("en-IN", { weekday: "short" }),
                temp: Math.round(f.temp),
                conditions: f.description,
                rainProb: f.rain_probability
              };
            })}
          />

          {/* Hourly Forecast */}
          <Card variant="glass" padding="lg" className="space-y-4">
            <CardHeader>
              <CardTitle>
                <Compass className="w-4.5 h-4.5 text-emerald-400" />
                Hourly Forecast Sequence
              </CardTitle>
            </CardHeader>
            
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {weatherData.hourly.slice(0, 15).map((hour) => (
                <div key={hour.time} className="min-w-[120px] bg-neutral-950/80 border border-neutral-850 p-3.5 rounded-2xl text-center shrink-0">
                  <span className="text-[10px] text-neutral-400 font-bold block">
                    {new Date(hour.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div className="my-2.5 flex justify-center">
                    {getWeatherIcon(hour.description, "w-7 h-7")}
                  </div>
                  <span className="text-base font-black text-white block">{hour.temperature.toFixed(1)}°C</span>
                  <span className="text-[10px] text-sky-400 font-extrabold block mt-1">☔ {Math.round(hour.rain_probability * 100)}%</span>
                </div>
              ))}
            </div>
          </Card>

          {/* 5-Day Forecast Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <CloudSun className="w-4.5 h-4.5 text-emerald-400" />
              5-Day Outlook Grid
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {weatherData.forecast.slice(0, 5).map((f, idx) => {
                const date = new Date(f.dt_txt);
                const weekday = date.toLocaleDateString("en-IN", { weekday: "short" });
                const dateString = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                
                return (
                  <Card key={idx} variant="glass" padding="md" className="text-center flex flex-col justify-between">
                    <div>
                      <span className="text-xs text-neutral-300 font-black block">{idx === 0 ? "Today" : weekday}</span>
                      <span className="text-[9px] text-neutral-500 block font-bold mt-0.5">{dateString}</span>
                    </div>
                    
                    <div className="my-3 flex justify-center">
                      {getWeatherIcon(f.description, "w-8 h-8")}
                    </div>
                    
                    <div>
                      <span className="text-lg font-black text-white block">{f.temp.toFixed(0)}°C</span>
                      <span className="text-[10px] text-neutral-400 font-bold block mt-0.5 capitalize truncate">{f.description}</span>
                    </div>

                    <div className="mt-3 pt-2 border-t border-neutral-900 grid grid-cols-2 text-[10px] font-bold">
                      <div>
                        <span className="block text-[8px] text-neutral-500 uppercase">Hum</span>
                        <span className="text-white">{f.humidity}%</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-sky-400 uppercase">Rain</span>
                        <span className="text-sky-300">{Math.round(f.rain_probability * 100)}%</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

        </div>
      ) : null}

    </div>
  );
}
