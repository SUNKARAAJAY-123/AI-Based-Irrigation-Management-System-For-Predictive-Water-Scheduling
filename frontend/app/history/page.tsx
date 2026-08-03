"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";

interface Farm {
  id: string;
  name: string;
}

interface Field {
  id: string;
  name: string;
}

interface Crop {
  id: string;
  name: string;
}

interface Recommendation {
  id: string;
  crop_id: string;
  timestamp: string;
  recommended_water_volume_liters: number;
  applied_water_volume_liters: number;
  is_irrigation_required: boolean;
  best_irrigation_time?: string;
  risk_level: string;
  status: string;
  model_type: string;
  confidence_score: number;
}

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // State
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual Water Application State
  const [activeRecId, setActiveRecId] = useState<string | null>(null);
  const [appliedVolume, setAppliedVolume] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

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
      const fetchedFarms = await api.get<Farm[]>("/farms");
      setFarms(fetchedFarms);
      if (fetchedFarms.length > 0) {
        setSelectedFarm(fetchedFarms[0]);
        await fetchFields(fetchedFarms[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError((err as Error).message || "Failed to load farms");
      setLoading(false);
    }
  };

  const fetchFields = async (farmId: string) => {
    try {
      const data = await api.get<Field[]>(`/fields?farm_id=${farmId}`);
      setFields(data);
      if (data.length > 0) {
        setSelectedField(data[0]);
        await fetchCrops(data[0].id);
      } else {
        setSelectedField(null);
        setCrops([]);
        setRecommendations([]);
        setLoading(false);
      }
    } catch (err) {
      setError((err as Error).message || "Failed to fetch fields");
      setLoading(false);
    }
  };

  const fetchCrops = async (fieldId: string) => {
    try {
      const data = await api.get<Crop[]>(`/crops?field_id=${fieldId}`);
      setCrops(data);
      if (data.length > 0) {
        setSelectedCrop(data[0]);
        await fetchRecommendations(data[0].id);
      } else {
        setSelectedCrop(null);
        setRecommendations([]);
        setLoading(false);
      }
    } catch (err) {
      setError((err as Error).message || "Failed to fetch crops");
      setLoading(false);
    }
  };

  const fetchRecommendations = async (cropId: string) => {
    setLoading(true);
    try {
      const data = await api.get<Recommendation[]>(`/recommendations?crop_id=${cropId}`);
      setRecommendations(data);
    } catch (err) {
      setError((err as Error).message || "Failed to load history ledger");
    } finally {
      setLoading(false);
    }
  };

  const handleFarmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const farm = farms.find(f => f.id === e.target.value);
    if (farm) {
      setSelectedFarm(farm);
      fetchFields(farm.id);
    }
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const field = fields.find(f => f.id === e.target.value);
    if (field) {
      setSelectedField(field);
      fetchCrops(field.id);
    }
  };

  const handleCropChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const crop = crops.find(c => c.id === e.target.value);
    if (crop) {
      setSelectedCrop(crop);
      fetchRecommendations(crop.id);
    }
  };

  const handleApplyIrrigation = async (rec: Recommendation) => {
    if (!appliedVolume) return;
    setError(null);
    setIsUpdating(true);
    try {
      await api.put(`/recommendations/${rec.id}?applied_volume=${parseFloat(appliedVolume)}`, {});
      setAppliedVolume("");
      setActiveRecId(null);
      if (selectedCrop) fetchRecommendations(selectedCrop.id);
    } catch (err) {
      setError((err as Error).message || "Failed to log irrigation");
    } finally {
      setIsUpdating(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-8 sm:px-6 lg:px-8 pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Irrigation Ledger</h1>
            <p className="text-neutral-400 text-sm mt-1">
              Historical logs of crop water applications and evaluations
            </p>
          </div>

          {farms.length > 0 && (
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="text-[9px] font-bold text-neutral-400 uppercase block mb-1">Farm</label>
                <select
                  value={selectedFarm?.id || ""}
                  onChange={handleFarmChange}
                  className="bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-xl px-3 py-1.5 outline-none"
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-neutral-400 uppercase block mb-1">Field</label>
                <select
                  value={selectedField?.id || ""}
                  onChange={handleFieldChange}
                  className="bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-xl px-3 py-1.5 outline-none"
                >
                  {fields.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-neutral-400 uppercase block mb-1">Crop</label>
                <select
                  value={selectedCrop?.id || ""}
                  onChange={handleCropChange}
                  className="bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-xl px-3 py-1.5 outline-none"
                >
                  {crops.length === 0 ? (
                    <option value="">No Active Crops</option>
                  ) : (
                    crops.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  )}
                </select>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Ledger Table */}
        <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md overflow-hidden">
          <h2 className="text-lg font-bold text-white mb-6">Recommendation Schedule</h2>

          {loading ? (
            <div className="py-12 flex justify-center">
              <span className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : recommendations.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-xs">
              No historical recommendations found for this crop. Pushing telemetry readings will generate records.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800 text-[10px] text-neutral-400 uppercase tracking-wider font-black">
                    <th className="pb-3">Timestamp</th>
                    <th className="pb-3">ML Decision</th>
                    <th className="pb-3 text-center">Risk Level</th>
                    <th className="pb-3 text-right">Recommended Vol</th>
                    <th className="pb-3 text-right">Applied Vol</th>
                    <th className="pb-3 text-center">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-xs text-neutral-200">
                  {recommendations.map((rec) => {
                    const date = new Date(rec.timestamp);
                    const formattedDate = `${date.toLocaleDateString("en-IN")} ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
                    
                    return (
                      <tr key={rec.id} className="hover:bg-neutral-950/20 transition-colors">
                        <td className="py-4 font-medium text-neutral-400">{formattedDate}</td>
                        <td className="py-4">
                          <span className={`font-bold ${
                            rec.is_irrigation_required ? "text-rose-400" : "text-emerald-400"
                          }`}>
                            {rec.is_irrigation_required ? "⚠️ Water Required" : "🟢 Optimal"}
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            rec.risk_level === "high"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/25"
                              : (rec.risk_level === "medium" ? "bg-amber-500/10 text-amber-400 border border-amber-500/25" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25")
                          }`}>
                            {rec.risk_level}
                          </span>
                        </td>
                        <td className="py-4 text-right font-semibold">{rec.recommended_water_volume_liters} L/m²</td>
                        <td className="py-4 text-right font-semibold text-neutral-300">
                          {rec.status === "applied" ? `${rec.applied_water_volume_liters} L/m²` : "-"}
                        </td>
                        <td className="py-4 text-center">
                          <span className={`capitalize font-bold text-[10px] ${
                            rec.status === "applied" ? "text-emerald-400" : "text-amber-400"
                          }`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          {rec.status === "pending" && rec.is_irrigation_required ? (
                            activeRecId === rec.id ? (
                              <div className="flex items-center justify-end gap-2">
                                <input
                                  type="number"
                                  placeholder="Vol L"
                                  value={appliedVolume}
                                  onChange={(e) => setAppliedVolume(e.target.value)}
                                  className="w-16 bg-neutral-950 border border-neutral-800 text-xs p-1 rounded outline-none focus:border-emerald-500/50 text-center"
                                />
                                <button
                                  onClick={() => handleApplyIrrigation(rec)}
                                  disabled={isUpdating}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-neutral-950 px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer"
                                >
                                  Log
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveRecId(rec.id);
                                  setAppliedVolume(rec.recommended_water_volume_liters.toString());
                                }}
                                className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-[10px] font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                              >
                                Log Watering
                              </button>
                            )
                          ) : (
                            <span className="text-neutral-500 italic text-[10px]">No Actions</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
