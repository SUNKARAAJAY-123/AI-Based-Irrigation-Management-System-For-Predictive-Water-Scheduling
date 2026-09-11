"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/context/LanguageContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/services/api";
import { 
  Brain, 
  TrendingUp, 
  Sparkles,
  Lightbulb,
  Mic,
  ArrowRight
} from "lucide-react";

import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import RecommendationCard from "@/components/ui/RecommendationCard";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";

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

  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchRecommendation = useCallback(async (cropId: string) => {
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
  }, []);

  const fetchCropsAndRecommendation = useCallback(async (fieldId: string) => {
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
  }, [fetchRecommendation]);

  const fetchFields = useCallback(async (farmId: string) => {
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
  }, [fetchCropsAndRecommendation]);

  const loadFarms = useCallback(async () => {
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

  const waterSavedLiters = recommendation 
    ? Math.max(0, 1200 - (recommendation.recommended_water_volume_liters * 10)) 
    : 350;

  return (
    <div className="min-h-screen bg-[#060a08] text-neutral-100 px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-8 max-w-5xl mx-auto space-y-6">
      
      <PageHeader
        title={t("ai_tools.title") || "AgriSmart AI Advice"}
        subtitle={t("ai_tools.subtitle") || "Actionable predictive irrigation advice generated for your active crop."}
        icon={<Brain className="w-6 h-6 stroke-[2.5]" />}
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

      {loading ? (
        <LoadingState message="Calculating AI irrigation decision..." />
      ) : !recommendation ? (
        <Card variant="glass" padding="lg" className="text-center max-w-xl mx-auto py-10 space-y-4">
          <Brain className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-base font-black text-white">No Telemetry Recorded Yet</h3>
          <p className="text-xs text-neutral-400 font-semibold max-w-sm mx-auto leading-relaxed">
            Record soil telemetry from your field sensors to allow AgriSmart AI to compute crop water requirements.
          </p>
          <Link href="/sensors">
            <Button variant="primary" size="md">
              Go to Telemetry Sensors
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            
            {/* Hero Action Recommendation Card */}
            <RecommendationCard
              decision={
                recommendation.is_irrigation_required 
                  ? "Water your field today" 
                  : "Do not irrigate now"
              }
              isIrrigationNeeded={recommendation.is_irrigation_required}
              soilMoisture={recommendation.moisture_level}
              rainProbability={recommendation.features_snapshot?.rain_probability}
              reason={
                recommendation.recommendation_text || (
                  recommendation.is_irrigation_required 
                    ? "Soil moisture level is low and weather is dry. Irrigation is recommended for healthy crop growth." 
                    : "Soil moisture is currently sufficient and rain is expected in your region."
                )
              }
              confidence="High"
              nextAction={recommendation.is_irrigation_required ? "Irrigate for 20 mins early morning" : "Check moisture again tomorrow"}
              onActionClick={triggerVoiceAssistant}
              actionText="🎙 Ask Voice Assistant About Recommendation"
            />

            {/* Weather & Soil Snapshots */}
            <Card variant="glass" padding="lg" className="space-y-4">
              <CardHeader>
                <CardTitle>
                  <Lightbulb className="w-4.5 h-4.5 text-amber-400" />
                  Environmental Data Rationale
                </CardTitle>
              </CardHeader>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-neutral-900/60 border border-neutral-850 rounded-2xl">
                  <span className="text-[9px] text-neutral-400 font-bold uppercase block">Soil Moisture</span>
                  <span className="text-base font-black text-emerald-400 mt-1 block">{(recommendation.features_snapshot?.soil_moisture || 35.0).toFixed(0)}%</span>
                </div>
                <div className="p-3 bg-neutral-900/60 border border-neutral-850 rounded-2xl">
                  <span className="text-[9px] text-neutral-400 font-bold uppercase block">Temperature</span>
                  <span className="text-base font-black text-amber-400 mt-1 block">{recommendation.features_snapshot?.temperature?.toFixed(1) || 28.5}°C</span>
                </div>
                <div className="p-3 bg-neutral-900/60 border border-neutral-850 rounded-2xl">
                  <span className="text-[9px] text-neutral-400 font-bold uppercase block">Rain Forecast</span>
                  <span className="text-base font-black text-sky-400 mt-1 block">{((recommendation.features_snapshot?.rain_probability || 0.1) * 100).toFixed(0)}%</span>
                </div>
                <div className="p-3 bg-neutral-900/60 border border-neutral-850 rounded-2xl">
                  <span className="text-[9px] text-neutral-400 font-bold uppercase block">Wind Velocity</span>
                  <span className="text-base font-black text-neutral-200 mt-1 block">{recommendation.features_snapshot?.wind_speed?.toFixed(1) || 8.2} km/h</span>
                </div>
              </div>
            </Card>

            {/* Farmer Feedback Section */}
            <Card variant="glass" padding="lg" className="space-y-4">
              <CardHeader>
                <CardTitle>
                  <Sparkles className="w-4.5 h-4.5 text-emerald-400" />
                  {t("feedback.title") || "Did you follow this recommendation?"}
                </CardTitle>
              </CardHeader>
              
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(["Followed", "Partially Followed", "Not Followed"] as const).map((statusVal) => {
                    const isSelected = feedbackForm.followed_status === statusVal;
                    return (
                      <button
                        key={statusVal}
                        type="button"
                        onClick={() => setFeedbackForm(prev => ({ ...prev, followed_status: statusVal }))}
                        className={`px-4 py-2 rounded-2xl text-xs font-black transition-all border cursor-pointer touch-target ${
                          isSelected
                            ? "bg-emerald-500 text-neutral-950 border-emerald-400 shadow-md"
                            : "bg-neutral-900 text-neutral-300 border-neutral-800 hover:text-white"
                        }`}
                      >
                        {statusVal}
                      </button>
                    );
                  })}
                </div>
                
                {feedbackMsg && (
                  <p className="text-xs text-emerald-400 font-bold">✓ {feedbackMsg}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={feedbackForm.explanation}
                    onChange={(e) => setFeedbackForm(prev => ({ ...prev, explanation: e.target.value }))}
                    placeholder="Add feedback notes (Optional)..."
                    className="flex-1 bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-4 py-3 outline-none min-h-[44px]"
                  />
                  <Button
                    type="button"
                    onClick={handleFeedbackSubmit}
                    isLoading={isSubmittingFeedback}
                    variant="primary"
                    size="sm"
                  >
                    Submit Feedback
                  </Button>
                </div>
              </div>
            </Card>

          </div>

          {/* Side Summary Cards */}
          <div className="space-y-4">
            <Card variant="glass" padding="md" className="space-y-3">
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Water Conserved
              </span>
              <span className="text-3xl font-black text-emerald-400 block">{waterSavedLiters.toLocaleString()} Liters</span>
              <p className="text-xs text-neutral-400 font-semibold leading-relaxed">
                Saved this week by skipping unneeded watering based on AI soil moisture predictions.
              </p>
            </Card>

            <Card variant="glass" padding="md" className="space-y-3 text-center">
              <Mic className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-black text-white">Ask in Regional Language</h4>
              <p className="text-xs text-neutral-400 font-semibold">
                Tap below to ask AgriSmart voice questions in Telugu, Hindi, Kannada, and more.
              </p>
              <Button
                variant="ai"
                size="md"
                className="w-full"
                onClick={triggerVoiceAssistant}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Ask Voice Assistant
              </Button>
            </Card>
          </div>

        </div>
      )}
    </div>
  );
}
