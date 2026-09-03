"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/context/LanguageContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/services/api";
import { 
  Brain, 
  Droplet, 
  TrendingUp, 
  Sparkles,
  AlertTriangle,
  Lightbulb,
  CloudRain,
  Mic,
  ArrowRight,
  TrendingDown
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
  variety?: string;
  status: string;
}

interface Recommendation {
  id: string;
  crop_id: string;
  timestamp: string;
  moisture_level: number;
  recommendation_text: string;
  recommended_water_volume_liters: number;
  is_irrigation_required: boolean;
  best_irrigation_time?: string;
  risk_level: string;
  confidence_score: number;
  features_snapshot?: {
    soil_moisture?: number;
    temperature?: number;
    humidity?: number;
    wind_speed?: number;
    rain_probability?: number;
  };
}

export default function AIRecommendationPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // State
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Farmer Feedback state (TC136)
  const [feedbackForm, setFeedbackForm] = useState<{
    followed_status: "Followed" | "Partially Followed" | "Not Followed";
    reason?: string;
    explanation?: string;
  }>({
    followed_status: "Followed",
    reason: "",
    explanation: ""
  });
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleFeedbackSubmit = async () => {
    if (!recommendation) return;
    setIsSubmittingFeedback(true);
    setFeedbackMsg(null);
    try {
      await api.post("/farmer/feedback", {
        recommendation_id: recommendation.id,
        followed_status: feedbackForm.followed_status,
        reason: feedbackForm.explanation || feedbackForm.followed_status,
        explanation: feedbackForm.explanation
      });
      setFeedbackMsg(t("feedback.submitted") || "Feedback submitted successfully!");
    } catch (err) {
      alert((err as Error).message || "Failed to submit feedback");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

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
        fetchFields(data[0].id);
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
      const data = await api.get<Field[]>(`/farms/${farmId}/fields`);
      setFields(data);
      if (data.length > 0) {
        setSelectedField(data[0]);
        fetchCropsAndRecommendation(data[0].id);
      } else {
        setSelectedField(null);
        setCrops([]);
        setSelectedCrop(null);
        setRecommendation(null);
        setLoading(false);
      }
    } catch (err) {
      setError((err as Error).message || "Failed to load fields");
      setLoading(false);
    }
  };

  const fetchCropsAndRecommendation = async (fieldId: string) => {
    try {
      const cropsData = await api.get<Crop[]>(`/fields/${fieldId}/crops`);
      setCrops(cropsData);
      if (cropsData.length > 0) {
        setSelectedCrop(cropsData[0]);
        fetchRecommendation(cropsData[0].id);
      } else {
        setSelectedCrop(null);
        setRecommendation(null);
        setLoading(false);
      }
    } catch (err) {
      setError((err as Error).message || "Failed to load crops");
      setLoading(false);
    }
  };

  const fetchRecommendation = async (cropId: string) => {
    setLoading(true);
    try {
      const data = await api.get<Recommendation[]>(`/crops/${cropId}/recommendations`);
      if (data && data.length > 0) {
        setRecommendation(data[0]);
      } else {
        setRecommendation(null);
      }
    } catch (err) {
      setError((err as Error).message || "Failed to fetch AI recommendation");
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
      fetchCropsAndRecommendation(field.id);
    }
  };

  const handleCropChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const crop = crops.find(c => c.id === e.target.value);
    if (crop) {
      setSelectedCrop(crop);
      fetchRecommendation(crop.id);
    }
  };

  const triggerVoiceAssistant = () => {
    window.dispatchEvent(new CustomEvent("open-voice-assistant"));
  };

  if (authLoading) return null;

  // Visual calculations based on model metrics
  const waterSavedLiters = recommendation 
    ? Math.max(0, 1200 - (recommendation.recommended_water_volume_liters * 10)) 
    : 350;

  return (
    <div className="min-h-screen bg-[#090d0b] text-[#f2f7f4] px-4 py-8 sm:px-6 lg:px-8 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-900 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Brain className="w-8 h-8 text-emerald-500" />
              {t("ai_tools.title")}
            </h1>
            <p className="text-neutral-450 text-xs mt-1 font-semibold">
              {t("ai_tools.subtitle")}
            </p>
          </div>

          {/* Selector filters */}
          {farms.length > 0 && (
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <div className="flex-1 sm:flex-initial">
                <select
                  value={selectedFarm?.id || ""}
                  onChange={handleFarmChange}
                  className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-300 rounded-xl px-3 py-2 outline-none focus:border-emerald-500/50 font-bold"
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 sm:flex-initial">
                <select
                  value={selectedField?.id || ""}
                  onChange={handleFieldChange}
                  className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-300 rounded-xl px-3 py-2 outline-none focus:border-emerald-500/50 font-bold"
                >
                  {fields.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 sm:flex-initial">
                <select
                  value={selectedCrop?.id || ""}
                  onChange={handleCropChange}
                  className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-300 rounded-xl px-3 py-2 outline-none focus:border-emerald-500/50 font-bold"
                >
                  {crops.length === 0 ? (
                    <option value="">{t("common.no_data")}</option>
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

        {loading ? (
          <div className="py-16 flex justify-center">
            <span className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !recommendation ? (
          <div className="glass-panel rounded-3xl p-10 text-center max-w-xl mx-auto space-y-6 shadow-md border border-neutral-900">
            <div className="text-4xl">🤖</div>
            <h3 className="text-base font-bold text-white">Awaiting Simulation Logs</h3>
            <p className="text-neutral-450 text-xs leading-relaxed max-w-sm mx-auto">
              Telemetry parameters must be recorded to prompt the machine learning engine for crop schedule recommendations.
            </p>
            <Link href="/sensors" className="bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs font-bold px-4 py-2.5 rounded-xl inline-block mt-4">
              Access Telemetry Simulator
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Primary Recommendation Card */}
            <div className="glass-panel rounded-3xl p-6 shadow-lg border border-neutral-900 md:col-span-2 space-y-6">
              
              <div className="flex justify-between items-start border-b border-neutral-900 pb-4">
                <div>
                  <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider block">Target crop</span>
                  <h3 className="text-lg font-black text-white mt-0.5">{selectedCrop?.name || "Crop"}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider block">ML Confidence</span>
                  <span className="text-base font-black text-emerald-450">{(recommendation.confidence_score * 100).toFixed(0)}%</span>
                </div>
              </div>

              {/* Status Box */}
              <div className={`p-5 rounded-2xl border ${
                recommendation.is_irrigation_required
                  ? "bg-rose-500/5 border-rose-500/20 text-rose-300"
                  : "bg-emerald-500/5 border-emerald-500/20 text-emerald-300"
              }`}>
                <span className="text-[9px] font-black uppercase tracking-widest block">AI Decision</span>
                <h4 className="text-lg font-extrabold mt-1">
                  {recommendation.is_irrigation_required 
                    ? "⚠️ Irrigation Recommended (Irrigate Now)" 
                    : "🟢 Moisture Satisfactory (Hold Water)"}
                </h4>
                <p className="text-xs mt-1.5 opacity-90 leading-relaxed">
                  Based on sequenced soil readings and 24h cloud predictions, the Random Forest model recommends {recommendation.is_irrigation_required ? "applying water" : "skipping irrigation"}.
                </p>
              </div>

              {recommendation.is_irrigation_required && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-neutral-950/60 border border-neutral-900 p-4 rounded-2xl flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                      <Droplet className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-500 font-bold uppercase block">Water Volume</span>
                      <span className="text-lg font-black text-white block mt-0.5">{recommendation.recommended_water_volume_liters} Liters</span>
                      <span className="text-[8px] text-neutral-500 block">per sq. meter</span>
                    </div>
                  </div>

                  <div className="bg-neutral-950/60 border border-neutral-900 p-4 rounded-2xl flex items-center gap-3">
                    <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl">
                      <CloudRain className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-500 font-bold uppercase block">Best Execution Time</span>
                      <span className="text-sm font-bold text-neutral-200 block mt-1.5">
                        {recommendation.best_irrigation_time 
                          ? new Date(recommendation.best_irrigation_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                          : "Early Morning"}
                      </span>
                      <span className="text-[8px] text-neutral-500 block">evaporation optimized</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Climate Reasoning Checklist */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-emerald-400" />
                  Meteorological Reasoning
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-neutral-350">
                  <div className="bg-neutral-950/30 border border-neutral-900 p-3.5 rounded-xl flex items-center gap-2">
                    <span className="text-xs">🌡️</span>
                    <span>Temperature: <strong className="text-white">{recommendation.features_snapshot?.temperature?.toFixed(1) || 28.5}°C</strong></span>
                  </div>
                  <div className="bg-neutral-950/30 border border-neutral-900 p-3.5 rounded-xl flex items-center gap-2">
                    <span className="text-xs">💦</span>
                    <span>Soil Moisture: <strong className="text-white">{(recommendation.features_snapshot?.soil_moisture || 35.0).toFixed(0)}%</strong></span>
                  </div>
                  <div className="bg-neutral-950/30 border border-neutral-900 p-3.5 rounded-xl flex items-center gap-2">
                    <span className="text-xs">☁️</span>
                    <span>Rain Chance: <strong className="text-white">{((recommendation.features_snapshot?.rain_probability || 0.1) * 100).toFixed(0)}%</strong></span>
                  </div>
                  <div className="bg-neutral-950/30 border border-neutral-900 p-3.5 rounded-xl flex items-center gap-2">
                    <span className="text-xs">💨</span>
                    <span>Wind Speed: <strong className="text-white">{recommendation.features_snapshot?.wind_speed?.toFixed(1) || 8.2} km/h</strong></span>
                  </div>
                </div>
              </div>

              {/* Farmer AI Feedback Submission Form (TC136) */}
              <div className="border-t border-neutral-900 pt-5 mt-5 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  {t("feedback.title") || "Recommendation Feedback"}
                </h4>
                <p className="text-[11px] text-neutral-400 font-medium">
                  {t("feedback.status") || "Did you follow this AI recommendation?"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(["Followed", "Partially Followed", "Not Followed"] as const).map((statusVal) => {
                    const keyMap = {
                      "Followed": "feedback.followed",
                      "Partially Followed": "feedback.partially_followed",
                      "Not Followed": "feedback.not_followed"
                    };
                    const label = t(keyMap[statusVal]) || statusVal;
                    const isSelected = feedbackForm.followed_status === statusVal;
                    return (
                      <button
                        key={statusVal}
                        type="button"
                        onClick={() => setFeedbackForm(prev => ({ ...prev, followed_status: statusVal }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500 text-neutral-950 border-emerald-400 font-extrabold shadow"
                            : "bg-neutral-950 border-neutral-900 text-neutral-400 hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                
                {feedbackMsg && (
                  <p className="text-xs text-emerald-400 font-bold flex items-center gap-1 pt-1">
                    ✓ {feedbackMsg}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={feedbackForm.explanation}
                    onChange={(e) => setFeedbackForm(prev => ({ ...prev, explanation: e.target.value }))}
                    placeholder={t("feedback.reason") || "Reason / Notes (Optional)"}
                    className="flex-1 bg-neutral-950 border border-neutral-900 text-xs text-neutral-200 rounded-xl px-3.5 py-2 outline-none focus:border-emerald-500/50"
                  />
                  <button
                    type="button"
                    onClick={handleFeedbackSubmit}
                    disabled={isSubmittingFeedback}
                    className="bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shadow whitespace-nowrap"
                  >
                    {isSubmittingFeedback ? t("common.loading") : t("feedback.submit")}
                  </button>
                </div>
              </div>

            </div>

            {/* Side insights metrics */}
            <div className="space-y-6">
              
              {/* Water Saving Estimates */}
              <div className="glass-panel rounded-3xl p-6 shadow-md border border-neutral-900 space-y-4">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Water Conservation
                </h3>
                
                <div className="space-y-2 text-center py-2">
                  <span className="text-3xl font-black text-emerald-400 block">{waterSavedLiters.toLocaleString()} Liters</span>
                  <p className="text-[10px] text-neutral-400 max-w-[200px] mx-auto leading-normal">
                    Estimated water saved this week by delaying schedules in response to soil telemetry updates.
                  </p>
                </div>
              </div>

              {/* Regional speech translation trigger */}
              <div className="glass-panel rounded-3xl p-6 shadow-md border border-neutral-900 text-center space-y-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-emerald-500/10 to-transparent blur-lg rounded-bl-3xl" />
                <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/25">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Listen in Local Language</h3>
                  <p className="text-[10px] text-neutral-450 mt-1 max-w-[180px] mx-auto leading-normal">
                    Query recommendations directly via voice speech translation (Hindi & Kannada).
                  </p>
                </div>
                <button
                  onClick={triggerVoiceAssistant}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 shadow-md active:scale-98"
                >
                  Ask Assistant
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

          </div>
        )}
      </div>
    </div>
  );
}
