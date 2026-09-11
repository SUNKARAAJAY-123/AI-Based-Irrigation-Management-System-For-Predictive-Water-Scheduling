"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { useTranslation } from "@/context/LanguageContext";
import { 
  Clock, 
  Calendar, 
  Search,
  Check
} from "lucide-react";

import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import StatusBadge from "@/components/ui/StatusBadge";

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
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<"all" | "7days" | "30days">("all");

  const [activeRecId, setActiveRecId] = useState<string | null>(null);
  const [appliedVolume, setAppliedVolume] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchRecommendations = useCallback(async (cropId: string) => {
    setLoading(true);
    try {
      const data = await api.get<Recommendation[]>(`/recommendations?crop_id=${cropId}`);
      setRecommendations(data);
    } catch (err) {
      setError((err as Error).message || "Failed to load history ledger");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCrops = useCallback(async (fieldId: string) => {
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
  }, [fetchRecommendations]);

  const fetchFields = useCallback(async (farmId: string) => {
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
  }, [fetchCrops]);

  const loadFarms = useCallback(async () => {
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
  }, [fetchFields]);

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
    <div className="min-h-screen bg-[#060a08] text-neutral-100 px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-8 max-w-5xl mx-auto space-y-6">
      
      <PageHeader
        title={t("history.title") || "Irrigation & Telemetry Log History"}
        subtitle={t("history.subtitle") || "Chronological record of water applications, AI advice, and soil readings."}
        icon={<Clock className="w-6 h-6 stroke-[2.5]" />}
        action={
          farms.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 bg-neutral-900 border border-neutral-850 p-2 rounded-2xl">
              <select
                value={selectedFarm?.id || ""}
                onChange={handleFarmChange}
                className="bg-transparent text-xs font-black text-white outline-none cursor-pointer"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id} className="bg-neutral-950 text-white">{f.name}</option>
                ))}
              </select>

              <select
                value={selectedField?.id || ""}
                onChange={handleFieldChange}
                className="bg-transparent text-xs font-black text-emerald-400 outline-none cursor-pointer"
              >
                {fields.map((f) => (
                  <option key={f.id} value={f.id} className="bg-neutral-950 text-white">{f.name}</option>
                ))}
              </select>

              <select
                value={selectedCrop?.id || ""}
                onChange={handleCropChange}
                className="bg-transparent text-xs font-black text-sky-400 outline-none cursor-pointer"
              >
                {crops.length === 0 ? (
                  <option value="">No Crop</option>
                ) : (
                  crops.map((c) => (
                    <option key={c.id} value={c.id} className="bg-neutral-950 text-white">{c.name}</option>
                  ))
                )}
              </select>
            </div>
          ) : undefined
        }
      />

      {error && <ErrorState message={error} onRetry={loadFarms} />}

      {/* Filter Tabs & History Timeline */}
      <Card variant="glass" padding="lg" className="space-y-4">
        <CardHeader>
          <CardTitle>
            <Calendar className="w-4.5 h-4.5 text-emerald-400" />
            Activity Timeline Logs
          </CardTitle>
          
          <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-850 p-1 rounded-2xl">
            {(["all", "7days", "30days"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  timeFilter === filter ? "bg-emerald-500 text-neutral-950 shadow-md" : "text-neutral-400 hover:text-white"
                }`}
              >
                {filter === "all" ? "All Logs" : (filter === "7days" ? "7 Days" : "30 Days")}
              </button>
            ))}
          </div>
        </CardHeader>

        {loading ? (
          <LoadingState message="Loading timeline history..." />
        ) : recommendations.length === 0 ? (
          <div className="py-10 text-center text-neutral-400 font-bold text-xs">
            <Search className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
            No history logs recorded for the selected crop yet.
          </div>
        ) : (
          <div className="relative border-l border-neutral-850 ml-3 pl-6 space-y-6">
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
                  <span className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-4 border-[#060a08] ${
                    rec.status === "applied" ? "bg-emerald-500" : "bg-amber-500"
                  } shadow-md`} />

                  <Card
                    variant="glass"
                    padding="md"
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-emerald-500/30 transition-all shadow-sm"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] text-neutral-400 font-bold block">{formattedDate}</span>
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-black ${
                          rec.is_irrigation_required ? "text-rose-400" : "text-emerald-400"
                        }`}>
                          {rec.is_irrigation_required ? "💧 Irrigation Applied / Required" : "🟢 Optimal Soil Moisture"}
                        </h4>
                        <StatusBadge status={rec.status === "applied" ? "GOOD" : "ATTENTION"} label={rec.status} size="sm" />
                      </div>
                      <p className="text-[11px] text-neutral-400 font-semibold">
                        Model Confidence: <b className="text-white">{(rec.confidence_score * 100).toFixed(0)}%</b>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      <div className="text-right text-xs bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-850 min-w-[100px] flex-1 sm:flex-initial">
                        <span className="text-[9px] text-neutral-400 font-bold uppercase block">Target Water</span>
                        <span className="font-mono font-black text-white">{rec.recommended_water_volume_liters} L/m²</span>
                      </div>

                      <div className="text-right text-xs bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-850 min-w-[100px] flex-1 sm:flex-initial">
                        <span className="text-[9px] text-neutral-400 font-bold uppercase block">Applied Volume</span>
                        <span className="font-mono font-black text-emerald-400">
                          {rec.status === "applied" ? `${rec.applied_water_volume_liters} L/m²` : "-"}
                        </span>
                      </div>

                      <div className="w-full sm:w-auto">
                        {rec.status === "pending" && rec.is_irrigation_required ? (
                          activeRecId === rec.id ? (
                            <div className="flex items-center gap-2 w-full">
                              <input
                                type="number"
                                placeholder="Volume"
                                value={appliedVolume}
                                onChange={(e) => setAppliedVolume(e.target.value)}
                                className="w-20 bg-neutral-950 border border-neutral-850 text-xs p-2 rounded-xl text-center font-black text-white outline-none min-h-[44px]"
                                aria-label="Applied Water Volume"
                              />
                              <Button
                                onClick={() => handleApplyIrrigation(rec)}
                                isLoading={isUpdating}
                                variant="primary"
                                size="sm"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => {
                                setActiveRecId(rec.id);
                                setAppliedVolume(rec.recommended_water_volume_liters.toString());
                              }}
                              variant="outline"
                              size="sm"
                              className="w-full sm:w-auto"
                            >
                              Log Water Applied
                            </Button>
                          )
                        ) : (
                          <StatusBadge status="GOOD" label="Completed" size="sm" />
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </Card>

    </div>
  );
}
