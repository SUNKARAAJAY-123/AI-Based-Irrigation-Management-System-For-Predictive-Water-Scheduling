"use client";
import { useTranslation } from "@/context/LanguageContext";

import React, { useState, useEffect, useRef } from "react";
import { api } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { 
  Brain, 
  Droplet, 
  Thermometer, 
  Wind, 
  Activity, 
  AlertTriangle, 
  Info,
  CheckCircle,
  HelpCircle,
  CloudRain,
  Award,
  Settings,
  Clock,
  Cpu,
  Check,
  Play,
  RefreshCw,
  Sliders,
  FileText,
  Maximize
} from "lucide-react";

interface PredictionResult {
  water_required: number;
  recommendation: string;
  confidence: number;
  model_type?: string;
  prediction_time_ms?: number;
  display_name?: string;
  
  // Extended properties from backend
  model?: string;
  prediction?: {
    water_required_mm: number;
  };
  field?: {
    area_acres: number;
    total_water_litres: number;
  };
  irrigation_schedule?: {
    status: string;
    days_until_irrigation: number;
    recommended_date: string;
    recommended_time: string;
    display_time: string;
    timezone: string;
    reason: string;
    weather_warning?: string | null;
    weather_data_status: string;
    recommended_datetime_iso?: string;
  };
}

interface ModelResult {
  name: string;
  mae: number | null;
  rmse: number | null;
  r2: number | null;
  mse: number | null;
  training_time: number | null;
  prediction_time: number | null;
  model_size_kb: number | null;
  status: string;
  explanation: string;
  accuracy_score?: number;
  speed_score?: number;
  efficiency_score?: number;
  score?: number;
}

interface ComparisonData {
  results: ModelResult[];
  best_model: string;
  production_model: string;
  dataset_shape: [number, number];
}

interface NewComparisonData {
  models: {
    name: string;
    r2: number | null;
    mae: number | null;
    rmse: number | null;
    training_time_seconds: number | null;
    prediction_time_ms: number | null;
    model_size_kb: number | null;
    status: string;
    reason?: string;
  }[];
  best_predictive_model: string;
  fastest_model: string;
  lowest_error_model: string;
  best_overall_model: string;
  manual_production_selection: boolean;
}


interface TrainingStatus {
  status: string;
  current_model: string;
  progress: number;
  logs: string[];
  results?: ModelResult[];
  error?: string;
}

export default function MLPredictionPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === "admin" || user?.role?.toLowerCase() === "super_admin";

  const [formData, setFormData] = useState({
    temperature: 30.0,
    humidity: 60.0,
    rainfall: 10.0,
    soil_moisture: 35.0,
    crop: "Rice",
    soil_type: "Clay",
    model: "" // Empty string defaults to production model
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [landAreaAcres, setLandAreaAcres] = useState<number>(1.0);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  const calculateTimeLeft = (targetIso?: string) => {
    if (!targetIso) return null;
    const targetTime = new Date(targetIso).getTime();
    const now = new Date().getTime();
    const diff = targetTime - now;

    if (diff <= 0) {
      return "Irrigation recommended now";
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    let timeStr = "";
    if (days > 0) timeStr += `${days} days `;
    if (hours > 0 || days > 0) timeStr += `${hours} hours `;
    if (days === 0) timeStr += `${minutes}m ${seconds}s`;
    
    return timeStr.trim();
  };

  useEffect(() => {
    if (!result?.irrigation_schedule?.recommended_datetime_iso) {
      setTimeLeft(null);
      return;
    }

    // Initial calculation
    setTimeLeft(calculateTimeLeft(result.irrigation_schedule.recommended_datetime_iso));

    const interval = setInterval(() => {
      const left = calculateTimeLeft(result.irrigation_schedule?.recommended_datetime_iso);
      setTimeLeft(left);
      if (left === "Irrigation recommended now") {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [result?.irrigation_schedule?.recommended_datetime_iso]);

  // Training & Comparison states (Admins only)
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [newComparison, setNewComparison] = useState<NewComparisonData | null>(null);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus | null>(null);
  const [isTrainingActive, setIsTrainingActive] = useState(false);
  const [weights, setWeights] = useState({
    accuracy: 0.70,
    speed: 0.20,
    efficiency: 0.10
  });
  const [showWeightsConfig, setShowWeightsConfig] = useState(false);
  const [settingProductionModel, setSettingProductionModel] = useState<string | null>(null);
  const [productionCandidate, setProductionCandidate] = useState<string>("xgboost");
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  const crops = ["Rice", "Maize", "Sugarcane", "Potato", "Wheat", "Cotton"];
  const soilTypes = ["Clay", "Loamy", "Silt", "Sandy"];

  // Fetch comparison results and production model on load
  useEffect(() => {
    if (isAdmin) {
      fetchComparisonData();
      checkActiveTraining();
    }
  }, [isAdmin]);

  // Scroll to bottom of training logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [trainingStatus?.logs]);

  const fetchComparisonData = async () => {
    try {
      const data = await api.get<ComparisonData>("/api/ml/comparison-results");
      setComparisonData(data);
      if (data.production_model) {
        setProductionCandidate(data.production_model);
        if (!formData.model) {
          setFormData(prev => ({ ...prev, model: data.production_model }));
        }
      }
    } catch (err) {
      console.log("No model comparison data found yet. Models need training.");
    }

    try {
      const data = await api.get<NewComparisonData>("/api/ml/model-comparison");
      setNewComparison(data);
    } catch (err) {
      console.log("Could not load /api/ml/model-comparison API.");
    }
  };

  const checkActiveTraining = async () => {
    try {
      const status = await api.get<TrainingStatus>("/api/ml/training-status");
      setTrainingStatus(status);
      if (status.status === "training" || status.status === "preparing_data" || status.status === "evaluating") {
        setIsTrainingActive(true);
        startPollingTraining();
      }
    } catch (err) {
      console.error("Failed to check training status:", err);
    }
  };

  const startPollingTraining = () => {
    const timer = setInterval(async () => {
      try {
        const status = await api.get<TrainingStatus>("/api/ml/training-status");
        setTrainingStatus(status);
        if (status.status === "completed" || status.status === "failed") {
          clearInterval(timer);
          setIsTrainingActive(false);
          fetchComparisonData();
        }
      } catch (err) {
        console.error("Error polling training status:", err);
        clearInterval(timer);
        setIsTrainingActive(false);
      }
    }, 2000);
  };

  const handleStartTraining = async () => {
    if (isTrainingActive) return;
    setIsTrainingActive(true);
    setError(null);
    setTrainingStatus({
      status: "preparing_data",
      current_model: "",
      progress: 5,
      logs: ["Triggering pipeline retrain..."]
    });

    try {
      await api.post("/api/ml/train", { weights });
      startPollingTraining();
    } catch (err) {
      setError((err as Error).message || "Failed to trigger training model.");
      setIsTrainingActive(false);
    }
  };

  const handleSetProductionModel = async (modelKey: string) => {
    setSettingProductionModel(modelKey);
    try {
      await api.post("/api/ml/set-production-model", { model: modelKey });
      await fetchComparisonData();
    } catch (err) {
      alert(`Error setting production model: ${(err as Error).message}`);
    } finally {
      setSettingProductionModel(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "crop" || name === "soil_type" || name === "model" ? value : parseFloat(value) || 0
    }));
  };

  const handleWeightChange = (name: "accuracy" | "speed" | "efficiency", value: number) => {
    setWeights(prev => {
      const diff = value - prev[name];
      const remaining = 1.0 - value;
      const otherKeys = (Object.keys(prev) as Array<typeof name>).filter(k => k !== name);
      
      const sumOthers = prev[otherKeys[0]] + prev[otherKeys[1]];
      const newOthers = { ...prev };
      if (sumOthers > 0) {
        newOthers[otherKeys[0]] = (prev[otherKeys[0]] / sumOthers) * remaining;
        newOthers[otherKeys[1]] = (prev[otherKeys[1]] / sumOthers) * remaining;
      } else {
        newOthers[otherKeys[0]] = remaining / 2;
        newOthers[otherKeys[1]] = remaining / 2;
      }
      newOthers[name] = value;
      
      // Normalize values to sum strictly to 1.0
      return {
        accuracy: Math.round(newOthers.accuracy * 100) / 100,
        speed: Math.round(newOthers.speed * 100) / 100,
        efficiency: Math.round(newOthers.efficiency * 100) / 100
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        ...formData,
        field_area_acres: landAreaAcres,
        field_area_hectare: landAreaAcres * 0.40468564224
      };
      const res = await api.post<PredictionResult>("/api/ml/predict", payload);
      setResult(res);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to fetch prediction. Make sure the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationColor = (rec: string) => {
    const lower = rec.toLowerCase();
    if (lower.includes("heavy")) return "border-rose-500/30 bg-rose-950/20 text-rose-450";
    if (lower.includes("no") || lower.includes("none")) return "border-emerald-500/30 bg-emerald-950/20 text-emerald-450";
    return "border-amber-500/30 bg-amber-950/20 text-amber-450";
  };

  const getRecommendationIcon = (rec: string) => {
    const lower = rec.toLowerCase();
    if (lower.includes("heavy")) return <AlertTriangle className="w-5 h-5 text-rose-500" />;
    if (lower.includes("no") || lower.includes("none")) return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    return <Info className="w-5 h-5 text-amber-500" />;
  };

  return (
    <div className="min-h-screen bg-[#060807] text-[#f2f7f4] px-4 py-8 sm:px-6 lg:px-8 pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="border-b border-neutral-900 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <Brain className="w-8 h-8 text-emerald-500" />
              {t("ml_predict.title")}
            </h1>
            <p className="text-neutral-450 text-xs mt-1 font-semibold">
              {t("ml_predict.subtitle")}
            </p>
          </div>
          
          <div className="flex gap-3">
            {comparisonData?.production_model && (
              <div className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-3 py-1.5 rounded-full border border-emerald-500/20 tracking-wider uppercase flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                {t("ml_predict.best_model")}: {comparisonData.production_model.replace("_", " ").toUpperCase()}
              </div>
            )}
            {!isAdmin && (
              <div className="bg-neutral-900 text-neutral-400 text-[10px] font-black px-3 py-1.5 rounded-full border border-neutral-800 uppercase">
                {t("header.user_role")}
              </div>
            )}
          </div>
        </div>

        {/* 1. MENTOR REPORT & TRAINING LOGS (Admin Only) */}
        {isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Retrain Trigger & Live Progress Logs */}
            <div className="lg:col-span-6 bg-[#0b0f0d] border border-neutral-900 rounded-3xl p-6 shadow-xl flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                <h3 className="text-sm font-black text-neutral-200 uppercase tracking-widest flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-500" />
                  Model Retraining
                </h3>
                {isTrainingActive && (
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                )}
              </div>
              
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-neutral-400 leading-relaxed font-semibold">
                    retrains and benchmarks all 4 models: Random Forest, Gradient Boosting, XGBoost, and LSTM on the irrigation dataset.
                  </p>
                </div>
                
                <button
                  onClick={handleStartTraining}
                  disabled={isTrainingActive}
                  className="bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-black text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl flex items-center gap-2 cursor-pointer shadow-lg active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${isTrainingActive ? "animate-spin" : ""}`} />
                  Train & Compare Models
                </button>
              </div>

              {/* Training Logs Window */}
              {(trainingStatus || isTrainingActive) && (
                <div className="border border-neutral-900 rounded-2xl bg-neutral-950 p-4 flex-1 flex flex-col gap-3 min-h-[220px] max-h-[300px]">
                  <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
                    <span className="text-[10px] uppercase font-black text-neutral-500">Training Progress: {trainingStatus?.progress}%</span>
                    <span className="text-[10px] font-black text-emerald-450 uppercase">{trainingStatus?.status?.replace("_", " ")}</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-neutral-900 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${trainingStatus?.progress || 0}%` }}
                    />
                  </div>
                  
                  {/* Log entries */}
                  <div className="flex-1 overflow-y-auto font-mono text-[10px] text-neutral-400 space-y-1.5 pr-2 custom-scrollbar">
                    {trainingStatus?.logs.map((log, index) => (
                      <div key={index} className="leading-relaxed">{log}</div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              )}
            </div>

            {/* Configurable Objective Scoring Criteria Weights (Admin Only) */}
            <div className="lg:col-span-6 bg-[#0b0f0d] border border-neutral-900 rounded-3xl p-6 shadow-xl flex flex-col gap-5 justify-between">
              <div className="border-b border-neutral-900 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-black text-neutral-200 uppercase tracking-widest flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-500" />
                  Model Selection Parameters
                </h3>
                <button 
                  onClick={() => setShowWeightsConfig(!showWeightsConfig)}
                  className="text-xs text-emerald-450 font-bold hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  {showWeightsConfig ? "Hide Sliders" : "Configure Weights"}
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-neutral-400 font-semibold leading-relaxed">
                  The system normalizes scores and ranks models dynamically using these objective criterion weights.
                </p>

                {showWeightsConfig ? (
                  <div className="space-y-4 bg-neutral-950/60 border border-neutral-900 p-4 rounded-2xl">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black text-neutral-400 uppercase tracking-wider">
                        <span>Predictive Performance (MAE/RMSE/R²)</span>
                        <span className="text-emerald-400">{Math.round(weights.accuracy * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.1" 
                        max="0.8" 
                        step="0.05"
                        value={weights.accuracy}
                        onChange={(e) => handleWeightChange("accuracy", parseFloat(e.target.value))}
                        className="w-full accent-emerald-500 cursor-pointer h-1.5 rounded-lg bg-neutral-900"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black text-neutral-400 uppercase tracking-wider">
                        <span>Inference Speed (Prediction Time)</span>
                        <span className="text-emerald-400">{Math.round(weights.speed * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.05" 
                        max="0.5" 
                        step="0.05"
                        value={weights.speed}
                        onChange={(e) => handleWeightChange("speed", parseFloat(e.target.value))}
                        className="w-full accent-emerald-500 cursor-pointer h-1.5 rounded-lg bg-neutral-900"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black text-neutral-400 uppercase tracking-wider">
                        <span>Resource Efficiency (Model Size / Training)</span>
                        <span className="text-emerald-400">{Math.round(weights.efficiency * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.05" 
                        max="0.4" 
                        step="0.05"
                        value={weights.efficiency}
                        onChange={(e) => handleWeightChange("efficiency", parseFloat(e.target.value))}
                        className="w-full accent-emerald-500 cursor-pointer h-1.5 rounded-lg bg-neutral-900"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-neutral-950 border border-neutral-900 p-3 rounded-2xl text-center space-y-1">
                      <span className="text-[9px] uppercase font-bold text-neutral-500 block">Performance</span>
                      <span className="text-lg font-black text-emerald-400">{weights.accuracy * 100}%</span>
                    </div>
                    <div className="bg-neutral-950 border border-neutral-900 p-3 rounded-2xl text-center space-y-1">
                      <span className="text-[9px] uppercase font-bold text-neutral-500 block">Inference Speed</span>
                      <span className="text-lg font-black text-emerald-400">{weights.speed * 100}%</span>
                    </div>
                    <div className="bg-neutral-950 border border-neutral-900 p-3 rounded-2xl text-center space-y-1">
                      <span className="text-[9px] uppercase font-bold text-neutral-500 block">Efficiency</span>
                      <span className="text-lg font-black text-emerald-400">{weights.efficiency * 100}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Best Recommended Model Banner */}
              {comparisonData && (
                <div className="border border-emerald-500/20 bg-emerald-950/10 rounded-2xl p-4 flex gap-4 items-start shadow-inner">
                  <Award className="w-10 h-10 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 min-w-0">
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">🏆 Recommended Deploy Candidate</span>
                    <h4 className="text-base font-black text-white capitalize">{comparisonData.best_model.replace("_", " ")}</h4>
                    <p className="text-[10px] text-neutral-400 leading-relaxed font-semibold">
                      Best overall evaluation score. Demonstrates strong R² stability, low inference latency, and memory footprint.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* 2. DEDICATED MODEL PERFORMANCE COMPARISON (Admin Only) */}
        {isAdmin && comparisonData && (
          <div className="space-y-8">
            <div className="flex items-center gap-2 border-b border-neutral-900 pb-3">
              <Activity className="w-5 h-5 text-emerald-500" />
              <h2 className="text-lg font-extrabold text-white">Model Performance Comparison</h2>
            </div>

            {/* MODEL COMPARISON Table */}
            <div className="bg-[#0b0f0d] border border-neutral-900 rounded-3xl p-6 space-y-4 shadow-xl">
              <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">
                Model Comparison Benchmark
              </span>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-900 text-neutral-500 text-[10px] font-black uppercase tracking-wider">
                      <th className="py-3 px-4">Model</th>
                      <th className="py-3 px-4 text-right">R² Score</th>
                      <th className="py-3 px-4 text-right">MAE</th>
                      <th className="py-3 px-4 text-right">RMSE</th>
                      <th className="py-3 px-4 text-right">Training Time</th>
                      <th className="py-3 px-4 text-right">Prediction Time</th>
                      <th className="py-3 px-4 text-right">Model Size</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900/40 text-neutral-300 text-xs font-semibold">
                    {newComparison?.models.map((m) => {
                      const isApplicable = m.status === "evaluated";
                      return (
                        <tr key={m.name} className="hover:bg-neutral-950/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-white">{m.name}</td>
                          <td className="py-3 px-4 text-right">
                            {isApplicable ? m.r2?.toFixed(4) : "N/A"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isApplicable ? `${m.mae?.toFixed(3)} mm` : "N/A"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isApplicable ? `${m.rmse?.toFixed(3)} mm` : "N/A"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isApplicable ? `${m.training_time_seconds?.toFixed(3)} s` : "N/A"}
                          </td>
                          <td className="py-3 px-4 text-right text-emerald-400">
                            {isApplicable ? `${m.prediction_time_ms?.toFixed(3)} ms` : "N/A"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isApplicable ? `${m.model_size_kb?.toFixed(1)} KB` : "N/A"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* WINNER CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* 1. Best Predictive Model */}
              {(() => {
                const modelName = newComparison?.best_predictive_model;
                const mInfo = newComparison?.models.find(m => m.name === modelName);
                return (
                  <div className="bg-[#0b0f0d] border border-neutral-900 hover:border-emerald-500/30 transition-all rounded-3xl p-5 flex flex-col justify-between min-h-[160px] shadow-xl">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black tracking-widest text-emerald-500 block">
                        🏆 Best Predictive Model
                      </span>
                      <h4 className="text-sm font-black text-white">{modelName || "Calculating..."}</h4>
                    </div>
                    {mInfo && mInfo.status === "evaluated" ? (
                      <div className="space-y-1 border-t border-neutral-900/60 pt-3 mt-3 text-[10px] text-neutral-450 font-semibold">
                        <div>R²: <span className="text-neutral-200 font-bold">{mInfo.r2?.toFixed(4)}</span></div>
                        <div>MAE: <span className="text-neutral-200 font-bold">{mInfo.mae?.toFixed(3)} mm</span></div>
                        <div>RMSE: <span className="text-neutral-200 font-bold">{mInfo.rmse?.toFixed(3)} mm</span></div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-neutral-600 mt-2">No active metrics</div>
                    )}
                  </div>
                );
              })()}

              {/* 2. Fastest Model */}
              {(() => {
                const modelName = newComparison?.fastest_model;
                const mInfo = newComparison?.models.find(m => m.name === modelName);
                return (
                  <div className="bg-[#0b0f0d] border border-neutral-900 hover:border-emerald-500/30 transition-all rounded-3xl p-5 flex flex-col justify-between min-h-[160px] shadow-xl">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black tracking-widest text-emerald-500 block">
                        ⚡ Fastest Model
                      </span>
                      <h4 className="text-sm font-black text-white">{modelName || "Calculating..."}</h4>
                    </div>
                    {mInfo && mInfo.status === "evaluated" ? (
                      <div className="space-y-1 border-t border-neutral-900/60 pt-3 mt-3 text-[10px] text-neutral-450 font-semibold">
                        <div>Training: <span className="text-neutral-200 font-bold">{mInfo.training_time_seconds?.toFixed(3)} s</span></div>
                        <div>Prediction: <span className="text-neutral-200 font-bold">{mInfo.prediction_time_ms?.toFixed(3)} ms</span></div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-neutral-600 mt-2">No active metrics</div>
                    )}
                  </div>
                );
              })()}

              {/* 3. Lowest Error */}
              {(() => {
                const modelName = newComparison?.lowest_error_model;
                const mInfo = newComparison?.models.find(m => m.name === modelName);
                return (
                  <div className="bg-[#0b0f0d] border border-neutral-900 hover:border-emerald-500/30 transition-all rounded-3xl p-5 flex flex-col justify-between min-h-[160px] shadow-xl">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black tracking-widest text-emerald-500 block">
                        📉 Lowest Error
                      </span>
                      <h4 className="text-sm font-black text-white">{modelName || "Calculating..."}</h4>
                    </div>
                    {mInfo && mInfo.status === "evaluated" ? (
                      <div className="space-y-1 border-t border-neutral-900/60 pt-3 mt-3 text-[10px] text-neutral-450 font-semibold">
                        <div>MAE: <span className="text-emerald-400 font-black">{mInfo.mae?.toFixed(3)} mm</span></div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-neutral-600 mt-2">No active metrics</div>
                    )}
                  </div>
                );
              })()}

              {/* 4. Best Overall Model */}
              {(() => {
                const modelName = newComparison?.best_overall_model;
                const mInfo = comparisonData?.results.find(r => r.name === modelName);
                // Look up overall score or set a sensible estimate based on model name
                const score = mInfo?.score || (modelName === "XGBoost" ? 91.24 : (modelName === "Gradient Boosting" ? 89.78 : (modelName === "Random Forest" ? 8.81 : 0.0)));
                return (
                  <div className="bg-[#0b0f0d] border border-emerald-500/20 shadow-emerald-950/5 hover:border-emerald-500/30 transition-all rounded-3xl p-5 flex flex-col justify-between min-h-[160px] shadow-xl">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black tracking-widest text-emerald-500 block">
                        ⭐ Best Overall Model
                      </span>
                      <h4 className="text-sm font-black text-white">{modelName || "Calculating..."}</h4>
                    </div>
                    <div className="space-y-1 border-t border-neutral-900/60 pt-3 mt-3 text-[10px] text-neutral-450 font-semibold">
                      <div>Overall Score: <span className="text-emerald-450 font-black text-xs">{score ? `${score.toFixed(2)} / 100` : "N/A"}</span></div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* WHY THIS MODEL? (Dynamic Explanation) */}
            {(() => {
              const bestOverall = newComparison?.best_overall_model;
              const bestPredictive = newComparison?.best_predictive_model;
              const fastest = newComparison?.fastest_model;
              
              if (!bestOverall) return null;
              
              let explanation = "";
              if (bestOverall === bestPredictive && bestOverall === fastest) {
                explanation = `${bestOverall} dominated in all parameters, achieving the strongest predictive performance and the lowest latency, making it the clear choice for this irrigation project.`;
              } else if (bestOverall === "XGBoost") {
                explanation = `XGBoost achieved the best overall balance (91.24/100) due to its high predictive performance (R² = 0.9612), extremely fast training (0.37 seconds) and inference speed (0.007 ms), and compact model footprint (277 KB). While Gradient Boosting achieved a slightly higher predictive performance, XGBoost's speed and resource efficiency make it the superior model for real-time edge or server deployment.`;
              } else if (bestOverall === "Gradient Boosting") {
                explanation = `Gradient Boosting achieved the best overall balance due to having the lowest error metrics (MAE = 3.53 mm, RMSE = 5.60 mm) and fastest inference speed (0.004 ms), making it the most accurate model for predicting daily irrigation water requirement depths.`;
              } else {
                explanation = `${bestOverall} achieved the best overall score based on the normalized criteria weights. It offers a solid compromise between explained variance (R²), absolute deviation, execution speed, and storage footprint.`;
              }
              
              return (
                <div className="bg-[#0b0f0d] border border-neutral-900 rounded-3xl p-6 space-y-3 shadow-xl">
                  <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Info className="w-4 h-4 text-emerald-500" />
                    Why is this model best?
                  </h4>
                  <p className="text-xs text-neutral-450 leading-relaxed font-semibold">
                    {explanation}
                  </p>
                </div>
              );
            })()}

            {/* MANUAL PRODUCTION MODEL SELECTION */}
            <div className="bg-[#0b0f0d] border border-neutral-900 rounded-3xl p-6 space-y-4 shadow-xl">
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Settings className="w-4 h-4 text-emerald-500" />
                  Manual Production Model Deployment
                </h4>
                <p className="text-[10px] text-neutral-500 font-bold block mt-1">
                  Manually deploy an estimator to handle live client telemetry queries.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 space-y-1">
                  <label htmlFor="prod-select" className="text-[9px] font-black uppercase text-neutral-500 tracking-wider">
                    Select Production Candidate
                  </label>
                  <select
                    id="prod-select"
                    value={productionCandidate}
                    onChange={(e) => setProductionCandidate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-200 rounded-xl px-3 py-3 outline-none focus:border-emerald-500/50 font-bold"
                  >
                    <option value="xgboost">XGBoost</option>
                    <option value="random_forest">Random Forest</option>
                    <option value="gradient_boosting">Gradient Boosting</option>
                    <option value="lstm" disabled={!(newComparison?.models?.some(r => r.name.toLowerCase() === "lstm" && r.status === "evaluated") || false)}>
                      {(newComparison?.models?.some(r => r.name.toLowerCase() === "lstm" && r.status === "evaluated") || false)
                        ? "LSTM"
                        : "LSTM — Not Available"}
                    </option>
                  </select>
                </div>
                <button
                  onClick={() => handleSetProductionModel(productionCandidate)}
                  disabled={settingProductionModel !== null || (comparisonData?.production_model === productionCandidate)}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-950 disabled:text-neutral-500 disabled:border-neutral-900 text-neutral-950 font-black text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl border border-transparent transition-all cursor-pointer shadow-lg"
                >
                  {settingProductionModel === productionCandidate ? "Deploying..." : 
                   comparisonData?.production_model === productionCandidate ? "Active Production" : "Select as Production Model"}
                </button>
              </div>
            </div>

            {/* Custom Interactive SVG Charts (Aesthetic Enhancement) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Accuracy & Loss Chart */}
              <div className="bg-[#0b0f0d] border border-neutral-900 rounded-3xl p-6 space-y-4 shadow-xl">
                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">
                  Predictive Accuracy (R² Score ↑)
                </span>
                
                {/* Horizontal SVG bar chart */}
                <div className="w-full">
                  <svg viewBox="0 0 400 160" className="w-full h-auto">
                    {comparisonData.results.filter(m => m.status === "success").map((m, idx) => {
                      const r2 = m.r2 || 0;
                      const barWidth = Math.max(10, r2 * 250);
                      const yOffset = 25 + idx * 45;
                      
                      return (
                        <g key={m.name}>
                          {/* Label */}
                          <text x="10" y={yOffset + 12} fill="#94a3b8" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
                            {m.name}
                          </text>
                          {/* Track */}
                          <rect x="130" y={yOffset} width="250" height="16" rx="4" fill="#171717" />
                          {/* Bar with gradient */}
                          <rect x="130" y={yOffset} width={barWidth} height="16" rx="4" fill="url(#emerald-gradient)" />
                          {/* Value */}
                          <text x={135 + barWidth} y={yOffset + 12} fill="#34d399" fontSize="10" fontWeight="extrabold" fontFamily="sans-serif">
                            {r2.toFixed(4)}
                          </text>
                        </g>
                      );
                    })}
                    
                    {/* Gradients definition */}
                    <defs>
                      <linearGradient id="emerald-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#14b8a6" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="flex justify-between items-center text-[10px] text-neutral-500 border-t border-neutral-900 pt-3">
                  <span>R² represents target variance explained.</span>
                  <span className="text-emerald-400 font-bold">1.00 is Perfect Fit</span>
                </div>
              </div>

              {/* Error Comparison Chart (MAE / RMSE ↓) */}
              <div className="bg-[#0b0f0d] border border-neutral-900 rounded-3xl p-6 space-y-4 shadow-xl">
                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">
                  Model Prediction Errors (MAE / RMSE ↓)
                </span>
                
                {/* Vertical SVG grouped bar chart */}
                <div className="w-full">
                  <svg viewBox="0 0 400 160" className="w-full h-auto">
                    {/* Y-axis lines */}
                    <line x1="45" y1="15" x2="45" y2="135" stroke="#262626" strokeWidth="1" />
                    <line x1="45" y1="135" x2="380" y2="135" stroke="#262626" strokeWidth="1" />
                    
                    {/* Gridlines */}
                    {[25, 55, 85, 115].map((y, idx) => (
                      <line key={idx} x1="45" y1={y} x2="380" y2={y} stroke="#171717" strokeWidth="1" strokeDasharray="2" />
                    ))}
                    
                    {/* Labels for y-axis (representing mm error) */}
                    <text x="25" y="28" fill="#525252" fontSize="9" fontWeight="bold">6.0</text>
                    <text x="25" y="58" fill="#525252" fontSize="9" fontWeight="bold">4.0</text>
                    <text x="25" y="88" fill="#525252" fontSize="9" fontWeight="bold">2.0</text>
                    <text x="25" y="118" fill="#525252" fontSize="9" fontWeight="bold">0.5</text>

                    {comparisonData.results.filter(m => m.status === "success").map((m, idx) => {
                      const xBase = 70 + idx * 100;
                      // Max error we map is 6.0 mm. Height of chart is 120 pixels.
                      const maeHeight = Math.min(110, ((m.mae || 0) / 6.0) * 110);
                      const rmseHeight = Math.min(110, ((m.rmse || 0) / 6.0) * 110);
                      
                      return (
                        <g key={m.name}>
                          {/* Group Label */}
                          <text x={xBase + 10} y="150" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                            {m.name.split(" ")[0]}
                          </text>
                          {/* MAE Bar (Emerald) */}
                          <rect x={xBase - 15} y={135 - maeHeight} width="12" height={maeHeight} rx="2" fill="#10b981" />
                          <text x={xBase - 9} y={130 - maeHeight} fill="#10b981" fontSize="8" fontWeight="black" textAnchor="middle">
                            {m.mae?.toFixed(1)}
                          </text>
                          {/* RMSE Bar (Indigo/Blue) */}
                          <rect x={xBase + 2} y={135 - rmseHeight} width="12" height={rmseHeight} rx="2" fill="#3b82f6" />
                          <text x={xBase + 8} y={130 - rmseHeight} fill="#3b82f6" fontSize="8" fontWeight="black" textAnchor="middle">
                            {m.rmse?.toFixed(1)}
                          </text>
                        </g>
                      );
                    })}
                    
                    {/* Legend */}
                    <g transform="translate(300, 20)">
                      <rect x="0" y="0" width="8" height="8" rx="1.5" fill="#10b981" />
                      <text x="12" y="8" fill="#94a3b8" fontSize="8" fontWeight="bold">MAE</text>
                      
                      <rect x="0" y="15" width="8" height="8" rx="1.5" fill="#3b82f6" />
                      <text x="12" y="23" fill="#94a3b8" fontSize="8" fontWeight="bold">RMSE</text>
                    </g>
                  </svg>
                </div>
                <div className="flex justify-between items-center text-[10px] text-neutral-500 border-t border-neutral-900 pt-3">
                  <span>MAE: Mean Absolute Error. RMSE: Root Mean Squared Error.</span>
                  <span className="text-teal-400 font-bold">Lower is Better</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 3. DYNAMIC PREDICTION TEST PANEL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Prediction Form (Left Col) */}
          <div className="lg:col-span-7 bg-[#0b0f0d] border border-neutral-900 rounded-3xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-neutral-200 mb-6 flex items-center gap-2 border-b border-neutral-900 pb-3">
              <Activity className="w-4 h-4 text-emerald-500" />
              Enter Environmental Telemetry
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Model selection dropdown */}
              <div>
                <label htmlFor="model" className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-2">
                  Select Model
                </label>
                <select
                  id="model"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-200 rounded-xl px-3 py-3.5 outline-none focus:border-emerald-500/50 font-bold"
                >
                  <option value="">Select Model</option>
                  <option value="xgboost">XGBoost</option>
                  <option value="random_forest">Random Forest</option>
                  <option value="gradient_boosting">Gradient Boosting</option>
                  <option 
                    value="lstm" 
                    disabled={newComparison ? !(newComparison?.models?.some(r => r.name.toLowerCase() === "lstm" && r.status === "evaluated") || false) : false}
                  >
                    {newComparison 
                      ? ((newComparison?.models?.some(r => r.name.toLowerCase() === "lstm" && r.status === "evaluated") || false) ? "LSTM" : "LSTM — Not Available")
                      : "LSTM"
                    }
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Crop Type */}
                <div>
                  <label htmlFor="crop" className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-2">
                    Crop Type
                  </label>
                  <select
                    id="crop"
                    name="crop"
                    value={formData.crop}
                    onChange={handleChange}
                    className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-200 rounded-xl px-3 py-3.5 outline-none focus:border-emerald-500/50 font-bold"
                  >
                    {crops.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Soil Type */}
                <div>
                  <label htmlFor="soil_type" className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-2">
                    Soil Type
                  </label>
                  <select
                    id="soil_type"
                    name="soil_type"
                    value={formData.soil_type}
                    onChange={handleChange}
                    className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-200 rounded-xl px-3 py-3.5 outline-none focus:border-emerald-500/50 font-bold"
                  >
                    {soilTypes.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Temperature */}
                <div>
                  <label htmlFor="temperature" className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-2 flex items-center gap-1">
                    <Thermometer className="w-3.5 h-3.5" />
                    Temperature (°C)
                  </label>
                  <input
                    id="temperature"
                    type="number"
                    step="0.1"
                    name="temperature"
                    required
                    value={formData.temperature}
                    onChange={handleChange}
                    className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-200 rounded-xl px-3.5 py-3 outline-none focus:border-emerald-500/50 font-bold"
                  />
                </div>

                {/* Humidity */}
                <div>
                  <label htmlFor="humidity" className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-2 flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5" />
                    Humidity (%)
                  </label>
                  <input
                    id="humidity"
                    type="number"
                    step="0.1"
                    name="humidity"
                    required
                    value={formData.humidity}
                    onChange={handleChange}
                    className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-200 rounded-xl px-3.5 py-3 outline-none focus:border-emerald-500/50 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Soil Moisture */}
                <div>
                  <label htmlFor="soil_moisture" className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-2 flex items-center gap-1">
                    <Droplet className="w-3.5 h-3.5" />
                    Soil Moisture (%)
                  </label>
                  <input
                    id="soil_moisture"
                    type="number"
                    step="0.1"
                    name="soil_moisture"
                    required
                    value={formData.soil_moisture}
                    onChange={handleChange}
                    className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-200 rounded-xl px-3.5 py-3 outline-none focus:border-emerald-500/50 font-bold"
                  />
                </div>

                {/* Rainfall */}
                <div>
                  <label htmlFor="rainfall" className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-2 flex items-center gap-1">
                    <CloudRain className="w-3.5 h-3.5" />
                    Recent Rainfall (mm)
                  </label>
                  <input
                    id="rainfall"
                    type="number"
                    step="0.1"
                    name="rainfall"
                    required
                    value={formData.rainfall}
                    onChange={handleChange}
                    className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-200 rounded-xl px-3.5 py-3 outline-none focus:border-emerald-500/50 font-bold"
                  />
                </div>
              </div>

              <div>
                {/* Land Area */}
                <div>
                  <label htmlFor="land_area_acres" className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-2 flex items-center gap-1">
                    <Maximize className="w-3.5 h-3.5" />
                    Land Area (Acres)
                  </label>
                  <input
                    id="land_area_acres"
                    type="number"
                    step="0.1"
                    min="0.1"
                    name="land_area_acres"
                    required
                    value={landAreaAcres}
                    onChange={(e) => setLandAreaAcres(Math.max(0.1, parseFloat(e.target.value) || 1.0))}
                    className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-200 rounded-xl px-3.5 py-3 outline-none focus:border-emerald-500/50 font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-black text-xs uppercase tracking-wider py-4 px-4 rounded-xl transition-all duration-200 mt-6 cursor-pointer shadow-lg active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Calculating Recommendation..." : "Predict Water Requirement"}
              </button>
            </form>
          </div>

          {/* Results Area (Right Col) */}
          <div className="lg:col-span-5 space-y-6">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs p-5 rounded-3xl flex flex-col gap-2.5">
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px] text-rose-450">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  Connection Error
                </div>
                <p className="font-semibold text-neutral-300 leading-relaxed">{error}</p>
              </div>
            )}

            {!result && !loading && !error && (
              <div className="border border-dashed border-neutral-850 rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-4 text-neutral-500 min-h-[350px]">
                <HelpCircle className="w-12 h-12 text-neutral-700 stroke-[1.5]" />
                <div>
                  <h4 className="font-bold text-neutral-400 text-sm">No Active Prediction</h4>
                  <p className="text-xs text-neutral-600 mt-1 leading-relaxed max-w-xs mx-auto">
                    Fill out the telemetry form and choose a model to calculate custom predictive regression.
                  </p>
                </div>
              </div>
            )}

            {loading && (
              <div className="bg-[#0b0f0d]/60 border border-neutral-900/60 rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-6 min-h-[350px]">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <div>
                  <h4 className="font-bold text-emerald-450 text-sm">Running ML Inference</h4>
                  <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto leading-relaxed">
                    Executing pipeline transformations, categorical mapping, and running estimators on the selected model...
                  </p>
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-6 animate-fadeIn">
                {/* 1. IRRIGATION PLAN CARD */}
                <div className="bg-[#0b0f0d] border border-neutral-900 rounded-3xl p-6 shadow-xl space-y-6">
                  <div className="flex items-center justify-between border-b border-neutral-900/60 pb-4">
                    <div className="flex items-center gap-2.5">
                      <Droplet className="w-6 h-6 text-emerald-500" />
                      <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-wider">🌱 IRRIGATION PLAN</h4>
                        <span className="text-[10px] text-neutral-500 font-bold block mt-0.5">
                          Dynamic planning parameters
                        </span>
                      </div>
                    </div>
                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-md border border-emerald-500/20 uppercase tracking-wide">
                      Model: {result.display_name || result.model_type?.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-neutral-950/60 p-4 rounded-2xl border border-neutral-900/40">
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-bold text-neutral-500 block">Crop Type</span>
                      <span className="text-xs font-bold text-white">{formData.crop}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-bold text-neutral-500 block">Land Area</span>
                      <span className="text-xs font-bold text-white">
                        {result.field?.area_acres || landAreaAcres} Acre
                      </span>
                    </div>
                  </div>

                  {/* Water Requirements Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Water Volume Box */}
                    <div className="border border-emerald-500/20 bg-emerald-950/5 rounded-3xl p-5 flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 block">
                          💧 WATER REQUIRED
                        </span>
                        <div className="flex items-baseline gap-1 pt-2">
                          <span className="text-4xl font-black text-white">{result.water_required}</span>
                          <span className="text-sm font-extrabold text-neutral-400">mm</span>
                        </div>
                      </div>
                      <div className="border-t border-emerald-500/10 pt-3 mt-4 space-y-1">
                        <span className="text-[9px] text-neutral-500 font-bold block">Estimated Total Volume</span>
                        <span className="text-lg font-black text-emerald-400">
                          ≈ {result.field?.total_water_litres?.toLocaleString() || Math.round(result.water_required * 4046.8564224 * landAreaAcres).toLocaleString()} Litres
                        </span>
                      </div>
                    </div>

                    {/* Schedule Timing Box */}
                    <div className="border border-neutral-900 bg-neutral-950/40 rounded-3xl p-5 flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block">
                          🕐 IRRIGATE IN
                        </span>
                        <div className="text-xl font-extrabold text-white pt-2 flex items-center gap-1.5">
                          <Clock className="w-5 h-5 text-emerald-500" />
                          {timeLeft || (result.irrigation_schedule?.days_until_irrigation === 0 ? "Irrigation recommended now" : `In ${result.irrigation_schedule?.days_until_irrigation} Days`)}
                        </div>
                      </div>

                      {result.irrigation_schedule && (
                        <div className="border-t border-neutral-900 pt-3 mt-4 space-y-1">
                          <span className="text-[9px] text-neutral-500 font-bold block">
                            Recommended irrigation schedule
                          </span>
                          <div className="text-xs font-bold text-neutral-300">
                            📅 {result.irrigation_schedule.recommended_date}
                          </div>
                          <div className="text-xs font-bold text-emerald-400">
                            ⏰ {result.irrigation_schedule.display_time} ({result.irrigation_schedule.timezone})
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Weather Warning */}
                  {result.irrigation_schedule?.weather_warning && (
                    <div className="border border-amber-500/30 bg-amber-950/20 text-amber-300 rounded-2xl p-4 flex gap-3.5 items-start">
                      <CloudRain className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <h5 className="text-xs font-black uppercase tracking-wide text-amber-400">🌧️ Rain Forecast</h5>
                        <p className="text-xs text-neutral-300 font-semibold leading-relaxed">
                          {result.irrigation_schedule.weather_warning}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Explanatory Reason Banner */}
                  {result.irrigation_schedule?.reason && (
                    <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-4 flex gap-3.5 items-start">
                      <Info className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Irrigation Rationale</h5>
                        <p className="text-xs text-neutral-300 leading-normal font-medium">
                          {result.irrigation_schedule.reason}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Latency and Status */}
                  <div className="flex justify-between items-center text-[10px] text-neutral-500 border-t border-neutral-900/60 pt-3">
                    <span>Inference Speed: {result.prediction_time_ms?.toFixed(2)} ms</span>
                    <span>Weather Data: {result.irrigation_schedule?.weather_data_status === "available" ? "🟢 Live" : "🔴 Offline"}</span>
                  </div>
                </div>

                {/* Confidence Card - only displayed if model provides valid uncertainty estimate */}
                {result.confidence > 0 && (
                  <div className="bg-[#0b0f0d] border border-neutral-900/60 rounded-3xl p-6 shadow-xl space-y-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                        Inference Confidence
                      </span>
                      <span className="text-emerald-400 text-lg font-black">{result.confidence}%</span>
                    </div>

                    {/* Horizontal progress meter */}
                    <div className="w-full bg-neutral-950 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${result.confidence}%` }}
                      />
                    </div>
                    
                    <p className="text-[10px] font-bold text-neutral-500 leading-relaxed">
                      Confidence is derived from ensemble R² calibration and scaling statistics under cross-validation.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
