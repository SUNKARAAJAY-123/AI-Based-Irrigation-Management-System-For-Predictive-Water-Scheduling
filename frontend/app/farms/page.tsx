"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { 
  Sprout, 
  MapPin, 
  Trash2, 
  PlusCircle, 
  Navigation, 
  Layers, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";

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
    <div className="min-h-screen bg-[#090d0b] text-[#f2f7f4] px-4 py-8 sm:px-6 lg:px-8 pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-neutral-900 pb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Sprout className="w-8 h-8 text-emerald-500" />
            Manage Lands
          </h1>
          <p className="text-neutral-450 text-xs mt-1 font-semibold">
            Register, configure, and monitor your agricultural plots
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-450" />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Add Farm Form */}
          <div className="glass-panel rounded-3xl p-6 shadow-xl border border-neutral-900">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2 border-b border-neutral-900 pb-3">
              <PlusCircle className="w-5 h-5 text-emerald-400" />
              Register New Farm
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="farm-name" className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1.5">
                  Farm Name
                </label>
                <input
                  id="farm-name"
                  type="text"
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Green Valley Plot"
                  autoComplete="off"
                  className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 placeholder:text-neutral-600"
                />
              </div>

              <div>
                <label htmlFor="farm-area" className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1.5">
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
                  className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 placeholder:text-neutral-600"
                />
              </div>

              <div>
                <label htmlFor="farm-soil" className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1.5">
                  Soil Classification
                </label>
                <select
                  id="farm-soil"
                  name="soil_type"
                  value={formData.soil_type}
                  onChange={handleInputChange}
                  className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-350 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 font-bold"
                >
                  <option value="loam">Loam (Optimal)</option>
                  <option value="clay">Clay (High Retention)</option>
                  <option value="sandy">Sandy (Low Retention)</option>
                  <option value="silt">Silt</option>
                </select>
              </div>

              {/* Geolocation Section */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">
                    Coordinates GPS
                  </span>
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={isDetectingLocation}
                    className="text-[10px] font-extrabold text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center gap-1"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${isDetectingLocation ? "animate-spin" : ""}`} />
                    {isDetectingLocation ? "Locating..." : "Auto Detect"}
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
                    placeholder="Latitude"
                    aria-label="Farm Latitude"
                    autoComplete="off"
                    className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-200 rounded-xl px-3 py-3 outline-none focus:border-emerald-500/50 placeholder:text-neutral-600"
                  />
                  <input
                    id="farm-lon"
                    type="number"
                    step="0.000001"
                    required
                    name="location_longitude"
                    value={formData.location_longitude}
                    onChange={handleInputChange}
                    placeholder="Longitude"
                    aria-label="Farm Longitude"
                    autoComplete="off"
                    className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-200 rounded-xl px-3 py-3 outline-none focus:border-emerald-500/50 placeholder:text-neutral-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl transition-all duration-200 mt-4 cursor-pointer shadow-lg active:scale-98"
              >
                {isSubmitting ? "Adding Plot..." : "Register Plot"}
              </button>
            </form>
          </div>

          {/* Farm List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-base font-bold flex items-center gap-2 border-b border-neutral-900 pb-3">
              <Layers className="w-5 h-5 text-emerald-400" />
              Registered Fields ({farms.length})
            </h2>

            {loading ? (
              <div className="py-16 flex justify-center">
                <span className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : farms.length === 0 ? (
              <div className="bg-neutral-950/40 border border-neutral-900 rounded-3xl p-12 text-center text-neutral-500 text-xs font-semibold">
                No lands registered yet. Use the registration form to list your first plot.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {farms.map((f) => (
                  <div
                    key={f.id}
                    className="glass-panel p-5 rounded-3xl flex flex-col justify-between hover:border-emerald-500/20 transition-all duration-200 shadow-md relative overflow-hidden group"
                  >
                    <div>
                      <div className="flex justify-between items-start border-b border-neutral-900 pb-3 mb-3">
                        <div>
                          <h3 className="font-extrabold text-white text-base truncate">{f.name}</h3>
                          <span className="text-[10px] text-neutral-500 capitalize">Soil: {f.soil_type || "Loam"}</span>
                        </div>
                        
                        <button
                          onClick={() => handleDelete(f.id)}
                          className="p-1.5 hover:bg-rose-500/10 text-neutral-500 hover:text-rose-450 rounded-xl transition-colors cursor-pointer"
                          title="Delete Farm Plot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-2 text-xs bg-neutral-950/40 border border-neutral-900/60 p-3 rounded-2xl">
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Area Size:</span>
                          <span className="font-bold text-white">{f.area_hectares} ha</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-500">Coordinates:</span>
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${f.location_latitude},${f.location_longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono font-bold text-emerald-450 hover:underline flex items-center gap-1"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            {f.location_latitude.toFixed(4)}, {f.location_longitude.toFixed(4)}
                          </a>
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
