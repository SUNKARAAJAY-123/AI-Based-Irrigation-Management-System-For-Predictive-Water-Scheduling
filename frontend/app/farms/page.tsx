"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { useTranslation } from "@/context/LanguageContext";
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

import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import StatusBadge from "@/components/ui/StatusBadge";

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
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      setSuccess("Farm registered successfully!");
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
    if (!confirm("Are you sure you want to remove this farm? All connected fields will also be deleted.")) return;
    setError(null);
    setSuccess(null);
    try {
      await api.delete(`/farms/${id}`);
      setSuccess("Farm removed successfully");
      fetchFarms();
    } catch (err) {
      setError((err as Error).message || "Failed to delete farm");
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-[#060a08] text-neutral-100 px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-8 max-w-6xl mx-auto space-y-6">
      
      <PageHeader
        title={t("farms.title") || "My Agricultural Farms"}
        subtitle={t("farms.subtitle") || "Manage your land plots, location coordinates, and soil types."}
        icon={<Sprout className="w-6 h-6 stroke-[2.5]" />}
      />

      {error && (
        <ErrorState message={error} onRetry={fetchFarms} />
      )}
      
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-3 rounded-2xl flex items-center gap-2 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Simple Add Farm Form Card */}
        <Card variant="glass" padding="lg">
          <CardHeader>
            <CardTitle>
              <PlusCircle className="w-4.5 h-4.5 text-emerald-400" />
              {t("farms.add_farm") || "+ Add New Farm"}
            </CardTitle>
          </CardHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="farm-name" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
                {t("farms.farm_name") || "Farm Name"}
              </label>
              <input
                id="farm-name"
                type="text"
                required
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g. Green Valley Farm"
                autoComplete="off"
                className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="farm-area" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
                {t("farms.land_area") || "Total Area (in Hectares)"}
              </label>
              <input
                id="farm-area"
                type="number"
                step="0.01"
                required
                name="area_hectares"
                value={formData.area_hectares}
                onChange={handleInputChange}
                placeholder="e.g. 2.5"
                autoComplete="off"
                className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="farm-soil" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
                {t("farms.soil_classification") || "Soil Type"}
              </label>
              <select
                id="farm-soil"
                name="soil_type"
                value={formData.soil_type}
                onChange={handleInputChange}
                className="w-full bg-neutral-950 border border-neutral-850 text-xs text-white rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 font-bold min-h-[44px]"
              >
                <option value="loam">Loam Soil (మట్టి / दोमट)</option>
                <option value="clay">Clay Soil (నల్లరేగడి / चिकनी)</option>
                <option value="sandy">Sandy Soil (ఇసుక నేల / बलुई)</option>
                <option value="silt">Silt Soil (గాదరు నేల / गाद)</option>
              </select>
            </div>

            {/* Location Section */}
            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">
                  GPS Location
                </span>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={isDetectingLocation}
                  className="text-xs font-black text-emerald-400 hover:text-emerald-300 flex items-center gap-1 touch-target cursor-pointer"
                >
                  <Navigation className={`w-3.5 h-3.5 ${isDetectingLocation ? "animate-spin" : ""}`} />
                  {isDetectingLocation ? "Detecting..." : "Auto-Detect Location"}
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <input
                  id="farm-lat"
                  type="number"
                  step="0.000001"
                  required
                  name="location_latitude"
                  value={formData.location_latitude}
                  onChange={handleInputChange}
                  placeholder="Latitude"
                  aria-label="Latitude"
                  autoComplete="off"
                  className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-3 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
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
                  aria-label="Longitude"
                  autoComplete="off"
                  className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-3 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
                />
              </div>
            </div>

            <Button
              type="submit"
              isLoading={isSubmitting}
              variant="primary"
              size="md"
              className="w-full mt-2"
            >
              Save Farm
            </Button>
          </form>
        </Card>

        {/* Registered Farm Cards List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
            <h2 className="text-sm font-black text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4.5 h-4.5 text-emerald-400" />
              Registered Farms ({farms.length})
            </h2>
          </div>

          {loading ? (
            <LoadingState message="Loading your farms..." />
          ) : farms.length === 0 ? (
            <EmptyState
              icon={<Sprout className="w-8 h-8" />}
              title="No Farms Registered Yet"
              description="Add your first farm plot to start monitoring soil moisture, crop health, and AI irrigation scheduling."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {farms.map((farm) => (
                <Card
                  key={farm.id}
                  variant="glass"
                  padding="md"
                  className="flex flex-col justify-between hover:border-emerald-500/30 transition-all shadow-md group"
                >
                  <div>
                    <div className="flex justify-between items-start border-b border-neutral-900 pb-3 mb-3">
                      <div>
                        <h3 className="font-black text-white text-base truncate">{farm.name}</h3>
                        <span className="text-[10px] font-bold text-neutral-400 capitalize">
                          Soil: <b className="text-emerald-400">{farm.soil_type || "Loam"}</b>
                        </span>
                      </div>
                      
                      <button
                        onClick={() => handleDelete(farm.id)}
                        className="p-2 text-neutral-500 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition-colors touch-target"
                        title="Remove Farm"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                    
                    <div className="space-y-2 text-xs bg-neutral-950/60 border border-neutral-850 p-3 rounded-2xl">
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-400 font-bold">Land Area:</span>
                        <span className="font-black text-white">{farm.area_hectares} Hectares</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-400 font-bold">GPS Location:</span>
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${farm.location_latitude},${farm.location_longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono font-extrabold text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          {farm.location_latitude.toFixed(4)}, {farm.location_longitude.toFixed(4)}
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-2 flex justify-between items-center">
                    <StatusBadge status="GOOD" label="Active Monitoring" size="sm" />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push("/fields")}
                    >
                      View Fields
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
