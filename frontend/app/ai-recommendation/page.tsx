"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSpeech } from "@/hooks/useSpeech";
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
  is_irrigation_required: boolean;
  best_irrigation_time?: string;
  risk_level: string;
  confidence_score: number;
}

interface VoiceResponse {
  text_english: string;
  text_translated: string;
  audio_base64: string | null;
  language: string;
}

export default function AIRecommendationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Speech hooks
  const { isListening, startListening, stopListening, speak, cancelSpeech } = useSpeech();

  // State
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  
  const [language, setLanguage] = useState("hi-IN"); // Default to Hindi
  const [transcribedText, setTranscribedText] = useState("");
  const [aiTextResponse, setAiTextResponse] = useState("");
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      // Preset user preferred language if supported
      if (["hi-IN", "kn-IN", "en-IN"].includes(user.preferred_language)) {
        setLanguage(user.preferred_language);
      }
      loadFarms();
    }
  }, [user]);

  const loadFarms = async () => {
    try {
      const data = await api.get<Farm[]>("/farms");
      setFarms(data);
      if (data.length > 0) {
        setSelectedFarm(data[0]);
        fetchFields(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFields = async (farmId: string) => {
    try {
      const data = await api.get<Field[]>(`/fields?farm_id=${farmId}`);
      setFields(data);
      if (data.length > 0) {
        setSelectedField(data[0]);
        fetchCropsAndRecommendation(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCropsAndRecommendation = async (fieldId: string) => {
    try {
      const data = await api.get<Crop[]>(`/crops?field_id=${fieldId}`);
      setCrops(data);
      if (data.length > 0) {
        setSelectedCrop(data[0]);
        fetchRecommendation(data[0].id);
      } else {
        setSelectedCrop(null);
        setRecommendation(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecommendation = async (cropId: string) => {
    try {
      const data = await api.get<Recommendation[]>(`/recommendations?crop_id=${cropId}`);
      if (data.length > 0) {
        setRecommendation(data[0]);
      } else {
        setRecommendation(null);
      }
    } catch (err) {
      console.error(err);
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

  // Trigger Voice Input
  const handleMicClick = () => {
    if (isListening) {
      stopListening();
      return;
    }
    
    setError(null);
    setTranscribedText("");
    setAiTextResponse("");
    cancelSpeech();

    startListening(language, async (resultText) => {
      setTranscribedText(resultText);
      await processVoiceIntent(resultText);
    });
  };

  // Simple Intent Parser
  const processVoiceIntent = async (queryText: string) => {
    if (!recommendation) {
      const respText = "No telemetry logs found. Please simulate sensor values first.";
      setAiTextResponse(respText);
      speak(respText, language);
      return;
    }

    setLoadingAudio(true);
    try {
      // 1. Fetch translated recommendation details from backend
      const voiceRes = await api.get<VoiceResponse>(
        `/recommendations/${recommendation.id}/audio?target_lang=${language}`
      );
      
      const cleanQuery = queryText.toLowerCase();
      
      // Basic rule matching for specific questions:
      let customResponseEn = voiceRes.text_english;
      let isSpecificQuery = false;

      // check if user asked about water quantity only
      if (cleanQuery.includes("water") || cleanQuery.includes("quantity") || cleanQuery.includes("पानी") || cleanQuery.includes("ನೀರು") || cleanQuery.includes("ಪ್ರಮಾಣ")) {
        customResponseEn = recommendation.is_irrigation_required
          ? `The recommended water volume is ${recommendation.recommended_water_volume_liters} liters per square meter.`
          : `No water is needed. The soil moisture is optimal.`;
        isSpecificQuery = true;
      }
      // check if user asked about risk
      else if (cleanQuery.includes("risk") || cleanQuery.includes("जोखिम") || cleanQuery.includes("ಅಪಾಯ")) {
        customResponseEn = `The current crop risk level is ${recommendation.risk_level}.`;
        isSpecificQuery = true;
      }

      if (isSpecificQuery) {
        // Translate custom query text through backend if needed
        const transRes = await api.get<VoiceResponse>(
          `/recommendations/${recommendation.id}/audio?target_lang=${language}`
        );
        // We can translate offline or do a quick text request. For simplicity, translate offline/locally
        // Or fetch voiceRes directly
        const targetText = await translateTextOffline(customResponseEn, language);
        setAiTextResponse(targetText);
        speak(targetText, language);
      } else {
        // Speak the full translation
        setAiTextResponse(voiceRes.text_translated);
        speak(voiceRes.text_translated, language, voiceRes.audio_base64);
      }
    } catch (err: any) {
      setError("Failed to fetch audio from Sarvam AI backend. Check backend logs.");
      console.error(err);
    } finally {
      setLoadingAudio(false);
    }
  };

  // Local helper for offline query translation
  const translateTextOffline = async (text: string, lang: string): Promise<string> => {
    // Offline dictionary helper
    if (lang === "en-IN") return text;
    
    // Simple lookups
    const dict: { [key: string]: { [lang: string]: string } } = {
      "The recommended water volume is ": {
        "hi-IN": "सिफारिश की गई पानी की मात्रा ",
        "kn-IN": "ಶಿಫಾರಸು ಮಾಡಿದ ನೀರಿನ ಪ್ರಮಾಣ "
      },
      " liters per square meter.": {
        "hi-IN": " लीटर प्रति वर्ग मीटर है।",
        "kn-IN": " ಲೀಟರ್ ಪ್ರತಿ ಚದರ ಮೀಟರ್ ಆಗಿದೆ."
      },
      "No water is needed. The soil moisture is optimal.": {
        "hi-IN": "पानी की आवश्यकता नहीं है। मिट्टी की नमी अनुकूल है।",
        "kn-IN": "ನೀರಿನ ಅಗತ್ಯವಿಲ್ಲ. ಮಣ್ಣಿನ ತೇವಾಂಶವು ಸೂಕ್ತವಾಗಿದೆ."
      },
      "The current crop risk level is ": {
        "hi-IN": "वर्तमान फसल जोखिम स्तर ",
        "kn-IN": "ಪ್ರಸ್ತುತ ಬೆಳೆ ಅಪಾಯದ ಮಟ್ಟ "
      },
      "low": {
        "hi-IN": "निम्न है।",
        "kn-IN": "ಕಡಿಮೆ ಆಗಿದೆ."
      },
      "medium": {
        "hi-IN": "मध्यम है।",
        "kn-IN": "ಮಧ್ಯಮ ಆಗಿದೆ."
      },
      "high": {
        "hi-IN": "उच्च है।",
        "kn-IN": "ಹೆಚ್ಚು ಆಗಿದೆ."
      }
    };

    let result = text;
    for (const [key, langMap] of Object.entries(dict)) {
      if (langMap[lang]) {
        result = result.replace(key, langMap[lang]);
      }
    }
    return result;
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-8 sm:px-6 lg:px-8 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="border-b border-neutral-800/80 pb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span>🎙️</span> Regional Voice Assistant
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Speak to AgriSmart in your local language to get AI irrigation recommendations
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Selection filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-5 shadow-lg">
          <div>
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Language</label>
            <select
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                setTranscribedText("");
                setAiTextResponse("");
                cancelSpeech();
              }}
              className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 rounded-xl p-2.5 outline-none"
            >
              <option value="hi-IN">Hindi (हिन्दी)</option>
              <option value="kn-IN">Kannada (ಕನ್ನಡ)</option>
              <option value="en-IN">English (India)</option>
            </select>
          </div>

          <div>
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Farm</label>
            <select
              value={selectedFarm?.id || ""}
              onChange={handleFarmChange}
              className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 rounded-xl p-2.5 outline-none"
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Field</label>
            <select
              value={selectedField?.id || ""}
              onChange={handleFieldChange}
              className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 rounded-xl p-2.5 outline-none"
            >
              {fields.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Crop</label>
            <select
              value={selectedCrop?.id || ""}
              onChange={handleCropChange}
              className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 rounded-xl p-2.5 outline-none"
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

        {/* Voice Assistant Core panel */}
        <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center text-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-transparent blur-3xl rounded-bl-3xl pointer-events-none" />
          
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Ask AgriSmart Pro</h3>
            <p className="text-neutral-400 text-xs max-w-sm leading-relaxed">
              Click the microphone button and ask: <br />
              <span className="text-indigo-400 font-semibold italic">"Is irrigation required?"</span> or <br />
              <span className="text-indigo-400 font-semibold italic">"क्या सिंचाई की आवश्यकता है?"</span> or <br />
              <span className="text-indigo-400 font-semibold italic">"ನೀರಾವರಿ ಅಗತ್ಯವಿದೆಯೇ?"</span>
            </p>
          </div>

          {/* Microphone trigger */}
          <div className="flex flex-col items-center justify-center gap-3">
            <button
              onClick={handleMicClick}
              disabled={loadingAudio}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl cursor-pointer ${
                isListening
                  ? "bg-rose-500 shadow-rose-500/30 scale-95"
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30 hover:scale-105"
              }`}
            >
              {isListening ? (
                <div className="flex gap-1.5 justify-center items-center">
                  <span className="w-1.5 h-7 bg-white rounded-full animate-[bounce_0.8s_infinite_-0.2s]" />
                  <span className="w-1.5 h-10 bg-white rounded-full animate-[bounce_0.8s_infinite]" />
                  <span className="w-1.5 h-7 bg-white rounded-full animate-[bounce_0.8s_infinite_-0.2s]" />
                </div>
              ) : (
                <span className="text-3xl text-white">🎙️</span>
              )}
            </button>
            <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-widest mt-1">
              {isListening ? "Listening... Speak now" : "Click to Speak"}
            </span>
          </div>

          {/* Speech transcription & response displays */}
          {(transcribedText || aiTextResponse || loadingAudio) && (
            <div className="w-full space-y-4 text-left border-t border-neutral-800/80 pt-6 mt-2 max-w-lg">
              {transcribedText && (
                <div className="bg-neutral-950/60 border border-neutral-800/40 p-4 rounded-2xl">
                  <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider block">You Said</span>
                  <p className="text-sm font-semibold text-neutral-200 mt-1">{transcribedText}</p>
                </div>
              )}

              {loadingAudio && (
                <div className="flex items-center gap-2 text-xs text-neutral-400 px-4">
                  <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span>AI is thinking & translating...</span>
                </div>
              )}

              {aiTextResponse && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl">
                  <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block">Assistant response</span>
                  <p className="text-xs text-neutral-300 mt-1.5 leading-relaxed">{aiTextResponse}</p>
                  
                  <div className="flex items-center gap-2 mt-4 text-[9px] text-emerald-400 font-bold uppercase bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl w-fit">
                    <span className="animate-pulse">🔊</span> Speaking (Sarvam Voice TTS)
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
