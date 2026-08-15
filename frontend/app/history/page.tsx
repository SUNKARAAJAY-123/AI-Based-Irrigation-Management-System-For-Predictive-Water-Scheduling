"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { 
  Clock, 
  Droplet, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  ChevronRight, 
  Sparkles,
  Search,
  Check
} from "lucide-react";

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
    if (!appliedVolume || isNaN(parseFloat(appliedVolume)) || parseFloat(appliedVolume) < 0) {
      alert("Please specify a valid, positive volume of water.");
      return;
    }
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
    <div className="min-h-screen bg-[#090d0b] text-[#f2f7f4] px-4 py-8 sm:px-6 lg:px-8 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-900 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Clock className="w-8 h-8 text-emerald-500" />
              Irrigation History
            </h1>
            <p className="text-neutral-450 text-xs mt-1 font-semibold">
              Track recommended watering schedules and record your applications
            </p>
          </div>

          {/* Filtering selectors */}
          {farms.length > 0 && (
            <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
              <div className="flex-1 sm:flex-initial min-w-[100px]">
                <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1">Farm</label>
                <select
                  value={selectedFarm?.id || ""}
                  onChange={handleFarmChange}
                  className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-300 rounded-xl px-2.5 py-2 outline-none focus:border-emerald-500/50 font-bold"
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 sm:flex-initial min-w-[100px]">
                <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1">Field</label>
                <select
                  value={selectedField?.id || ""}
                  onChange={handleFieldChange}
                  className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-300 rounded-xl px-2.5 py-2 outline-none focus:border-emerald-500/50 font-bold"
                >
                  {fields.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 sm:flex-initial min-w-[100px]">
                <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1">Crop</label>
                <select
                  value={selectedCrop?.id || ""}
                  onChange={handleCropChange}
                  className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-300 rounded-xl px-2.5 py-2 outline-none focus:border-emerald-500/50 font-bold"
                >
                  {crops.length === 0 ? (
                    <option value="">None</option>
                  ) : (
                    crops.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  )}
                </select>
              </div>
            </div>
          )}
        </header>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-450 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Timeline Panel */}
        <div className="glass-panel rounded-3xl p-6 shadow-xl border border-neutral-900">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-400" />
              Watering Logs & Recommendations
            </h2>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center">
              <span className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : recommendations.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-xs font-semibold flex flex-col items-center gap-2">
              <Search className="w-8 h-8 text-neutral-800" />
              <span>No recommendations recorded. Active telemetry logs are needed.</span>
            </div>
          ) : (
            <div className="relative border-l border-neutral-800/80 ml-3 pl-6 space-y-6">
              {recommendations.map((rec) => {
                const date = new Date(rec.timestamp);
                const formattedDate = date.toLocaleString("en-IN", { 
                  month: "short", 
                  day: "numeric", 
                  hour: "2-digit", 
                  minute: "2-digit" 
                });

                return (
                  <div key={rec.id} className="relative group">
                    {/* Timeline bullet */}
                    <span className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-4 border-[#090d0b] ${
                      rec.status === "applied" ? "bg-emerald-500" : "bg-amber-500"
                    } shadow-md`} />

                    {/* Timeline Node Card */}
                    <div className="bg-neutral-900/30 border border-neutral-900/80 hover:border-neutral-800 p-5 rounded-2xl transition-all duration-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      
                      <div className="space-y-1">
                        <span className="text-[10px] text-neutral-500 font-bold block">{formattedDate}</span>
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-extrabold ${
                            rec.is_irrigation_required ? "text-rose-400" : "text-emerald-400"
                          }`}>
                            {rec.is_irrigation_required ? "⚠️ Irrigation Required" : "🟢 Optimal Moisture"}
                          </h4>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            rec.risk_level === "high"
                              ? "bg-rose-500/10 border-rose-500/25 text-rose-400"
                              : (rec.risk_level === "medium" ? "bg-amber-500/10 border-amber-500/25 text-amber-400" : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400")
                          }`}>
                            {rec.risk_level} Risk
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-400">
                          Confidence evaluation: <span className="font-semibold text-white">{(rec.confidence_score * 100).toFixed(0)}%</span>
                        </p>
                      </div>

                      {/* Right Data columns */}
                      <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto sm:justify-end">
                        <div className="text-right text-xs bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-900 min-w-[100px] flex-1 sm:flex-initial">
                          <span className="text-[8px] text-neutral-500 font-bold uppercase block">AI Rec Vol</span>
                          <span className="font-mono font-extrabold text-white">{rec.recommended_water_volume_liters} L/m²</span>
                        </div>

                        <div className="text-right text-xs bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-900 min-w-[100px] flex-1 sm:flex-initial">
                          <span className="text-[8px] text-neutral-500 font-bold uppercase block">Applied Vol</span>
                          <span className="font-mono font-extrabold text-emerald-450">
                            {rec.status === "applied" ? `${rec.applied_water_volume_liters} L/m²` : "-"}
                          </span>
                        </div>

                        {/* Actions block */}
                        <div className="w-full sm:w-auto">
                          {rec.status === "pending" && rec.is_irrigation_required ? (
                            activeRecId === rec.id ? (
                              <div className="flex items-center gap-2 w-full">
                                <input
                                  type="number"
                                  placeholder="Volume"
                                  value={appliedVolume}
                                  onChange={(e) => setAppliedVolume(e.target.value)}
                                  className="w-20 bg-neutral-950 border border-neutral-800 text-xs p-2 rounded-xl outline-none focus:border-emerald-500/50 text-center font-bold"
                                  aria-label="Applied Water Volume"
                                />
                                <button
                                  onClick={() => handleApplyIrrigation(rec)}
                                  disabled={isUpdating}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                                >
                                  {isUpdating ? "..." : <Check className="w-4 h-4 stroke-[3]" />}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveRecId(rec.id);
                                  setAppliedVolume(rec.recommended_water_volume_liters.toString());
                                }}
                                className="w-full sm:w-auto bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-[10px] font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition-all cursor-pointer text-center"
                              >
                                Log Watering
                              </button>
                            )
                          ) : (
                            <span className="w-full text-center sm:text-right block text-[10px] text-neutral-500 font-bold uppercase tracking-wider bg-neutral-950/20 px-2.5 py-1.5 border border-neutral-900 rounded-xl">
                              {rec.status === "applied" ? "✅ Completed" : "🟢 Satisfied"}
                            </span>
                          )}
                        </div>

                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
