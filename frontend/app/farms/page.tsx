"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";

interface Farm {
  id: string;
  name: string;
  location_latitude: number;
  location_longitude: number;
  area_hectares: number;
  soil_type?: string;
  created_at: string;
}

export default function FarmsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    location_latitude: "",
    location_longitude: "",
    area_hectares: "",
    soil_type: "loam",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchFarms();
    }
  }, [user]);

  const fetchFarms = async () => {
    setLoading(true);
    try {
      const data = await api.get<Farm[]>("/farms");
      setFarms(data);
    } catch (err) {
      setError((err as Error).message || "Failed to fetch farms");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const detectLocation = () => {
    if (!("geolocation" in navigator)) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          location_latitude: position.coords.latitude.toFixed(6),
          location_longitude: position.coords.longitude.toFixed(6),
        }));
        setIsDetectingLocation(false);
      },
      (error) => {
        console.error(`Error detecting location: [Code ${error.code}] ${error.message}`);
        alert("Failed to get location. Please input coordinates manually.");
        setIsDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        location_latitude: parseFloat(formData.location_latitude),
        location_longitude: parseFloat(formData.location_longitude),
        area_hectares: parseFloat(formData.area_hectares),
        soil_type: formData.soil_type,
      };

      await api.post("/farms", payload);
      setSuccess("Farm added successfully!");
      setFormData({
        name: "",
        location_latitude: "",
        location_longitude: "",
        area_hectares: "",
        soil_type: "loam",
      });
      fetchFarms();
    } catch (err) {
      setError((err as Error).message || "Failed to add farm");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this farm? This will delete all fields and sensors in it.")) return;
    setError(null);
    setSuccess(null);
    try {
      await api.delete(`/farms/${id}`);
      setSuccess("Farm deleted successfully");
      fetchFarms();
    } catch (err) {
      setError((err as Error).message || "Failed to delete farm");
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-8 sm:px-6 lg:px-8 pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Manage Farms</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Register and configure your agricultural lands
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs px-4 py-3 rounded-xl">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs px-4 py-3 rounded-xl">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Add Farm Form */}
          <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span>➕</span> Register New Farm
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="farm-name" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                  Farm Name
                </label>
                <input
                  id="farm-name"
                  type="text"
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Green Valley Farm"
                  autoComplete="off"
                  className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label htmlFor="farm-area" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                  Land Area (Hectares)
                </label>
                <input
                  id="farm-area"
                  type="number"
                  step="0.01"
                  required
                  name="area_hectares"
                  value={formData.area_hectares}
                  onChange={handleInputChange}
                  placeholder="2.5"
                  autoComplete="off"
                  className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label htmlFor="farm-soil" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                  Soil Type
                </label>
                <select
                  id="farm-soil"
                  name="soil_type"
                  value={formData.soil_type}
                  onChange={handleInputChange}
                  className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50"
                >
                  <option value="loam">Loam (Optimal)</option>
                  <option value="clay">Clay (High Water Retention)</option>
                  <option value="sandy">Sandy (Low Water Retention)</option>
                  <option value="silt">Silt</option>
                </select>
              </div>

              {/* Geolocation detection */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Geolocation
                  </span>
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={isDetectingLocation}
                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    {isDetectingLocation ? "Detecting..." : "🎯 Auto Detect GPS"}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <input
                    id="farm-lat"
                    type="number"
                    step="0.000001"
                    required
                    name="location_latitude"
                    value={formData.location_latitude}
                    onChange={handleInputChange}
                    placeholder="Latitude (e.g. 15.3)"
                    aria-label="Farm Latitude"
                    autoComplete="off"
                    className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-3 py-2.5 outline-none focus:border-emerald-500/50"
                  />
                  <input
                    id="farm-lon"
                    type="number"
                    step="0.000001"
                    required
                    name="location_longitude"
                    value={formData.location_longitude}
                    onChange={handleInputChange}
                    placeholder="Longitude (e.g. 76.9)"
                    aria-label="Farm Longitude"
                    autoComplete="off"
                    className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-3 py-2.5 outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-sm py-3 px-4 rounded-xl transition-all duration-200 mt-4 cursor-pointer"
              >
                {isSubmitting ? "Adding..." : "Add Farm"}
              </button>
            </form>
          </div>

          {/* Farm List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>🏡</span> Your Registered Lands ({farms.length})
            </h2>

            {loading ? (
              <div className="py-12 flex justify-center">
                <span className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : farms.length === 0 ? (
              <div className="bg-neutral-900/20 border border-neutral-800/80 rounded-3xl p-12 text-center text-neutral-500 text-xs">
                No farms registered yet. Please use the registration panel on the left to add one.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {farms.map((f) => (
                  <div
                    key={f.id}
                    className="bg-neutral-900/40 border border-neutral-800/80 p-5 rounded-3xl flex flex-col justify-between hover:border-neutral-700 transition-colors shadow-lg"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-extrabold text-white text-base truncate">{f.name}</h3>
                        <button
                          onClick={() => handleDelete(f.id)}
                          className="text-neutral-500 hover:text-rose-400 text-sm cursor-pointer"
                          title="Delete Farm"
                        >
                          🗑️
                        </button>
                      </div>
                      <p className="text-xs text-neutral-400 mt-1 capitalize">Soil: {f.soil_type || "Loam"}</p>
                      
                      <div className="mt-4 space-y-1.5 text-xs text-neutral-300 bg-neutral-950/60 border border-neutral-800/40 p-3 rounded-xl">
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Area:</span>
                          <span className="font-bold">{f.area_hectares} Hectares</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Latitude:</span>
                          <span className="font-mono">{f.location_latitude}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Longitude:</span>
                          <span className="font-mono">{f.location_longitude}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
