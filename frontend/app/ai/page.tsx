"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSpeech } from "@/hooks/useSpeech";
import { api } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/context/LanguageContext";
import { Locale } from "@/lib/translations";
import { Mic, X, MessageSquare, Volume2, Sparkles, ChevronLeft, Send, Play } from "lucide-react";
import Link from "next/link";

interface Message {
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

interface VoiceItem {
  id: string;
  name: string;
}

interface VoiceRecommendation {
  id: string;
  crop_id: string;
  is_irrigation_required: boolean;
  recommended_water_volume_liters: number;
  status: string;
  timestamp: string;
}

interface Weather {
  temp: number;
  humidity: number;
  conditions: string;
  rain_probability: number;
}

interface DashboardData {
  weather: Weather | null;
  soil_moisture: number | null;
  ai_recommendation: string;
  next_irrigation: string;
}

export default function AIAssistantPage() {
  const { user } = useAuth();
  const { locale } = useTranslation();
  const { isListening, transcription, startListening, stopListening, speak, cancelSpeech } = useSpeech();

  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      text: "Hello! I am Kisan AI, your smart farming assistant. You can speak to me or type your question below.",
      timestamp: new Date()
    }
  ]);
  const [typedMessage, setTypedMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [recs, setRecs] = useState<VoiceRecommendation[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch telemetry context on mount to answer questions locally
    loadTelemetryContext();
  }, [locale]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isListening, transcription]);

  const loadTelemetryContext = async () => {
    try {
      const data = await api.get<DashboardData>("/farmer/dashboard");
      setDashboardData(data);

      const farms = await api.get<VoiceItem[]>("/farms");
      if (farms.length > 0) {
        const fields = await api.get<VoiceItem[]>(`/fields?farm_id=${farms[0].id}`);
        if (fields.length > 0) {
          const crops = await api.get<VoiceItem[]>(`/crops?field_id=${fields[0].id}`);
          if (crops.length > 0) {
            const fetchedRecs = await api.get<VoiceRecommendation[]>(`/recommendations?crop_id=${crops[0].id}`);
            setRecs(fetchedRecs);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load telemetry context for AI assistant", e);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    setIsLoading(true);

    // Add user message
    setMessages((prev) => [...prev, { sender: "user", text, timestamp: new Date() }]);
    setTypedMessage("");

    // Formulate answer based on user query and local context
    const cleanQuery = text.toLowerCase();
    let reply = "I am checking your farm details. Please make sure sensors and weather data are updated.";

    // Simple multi-lingual intent matching for common questions
    const isMoistureQuery = cleanQuery.includes("moisture") || cleanQuery.includes("नमी") || cleanQuery.includes("ತೇವಾಂಶ") || cleanQuery.includes("తేమ") || cleanQuery.includes("ஈரப்பதம்");
    const isIrrigateQuery = cleanQuery.includes("irrigate") || cleanQuery.includes("water") || cleanQuery.includes("सिंचाई") || cleanQuery.includes("पाणी") || cleanQuery.includes("ನೀರು") || cleanQuery.includes("నీరు");
    const isRainQuery = cleanQuery.includes("rain") || cleanQuery.includes("weather") || cleanQuery.includes("बारिश") || cleanQuery.includes("ಮಳೆ") || cleanQuery.includes("వర్షం") || cleanQuery.includes("மழை");
    const isAlertQuery = cleanQuery.includes("alert") || cleanQuery.includes("warning") || cleanQuery.includes("चेतावनी") || cleanQuery.includes("ಎಚ್ಚರಿಕೆ") || cleanQuery.includes("అలర్ట్") || cleanQuery.includes("எச்சரிக்கை");

    if (isMoistureQuery) {
      const moisture = dashboardData?.soil_moisture;
      if (moisture !== null && moisture !== undefined) {
        reply = locale === "hi-IN"
          ? `आपके खेत की वर्तमान मिट्टी की नमी ${moisture}% है।`
          : locale === "te-IN"
            ? `మీ పొలంలో ప్రస్తుత తేమ శాతం ${moisture}% గా ఉంది.`
            : `Your current soil moisture is ${moisture}%.`;
      } else {
        reply = "Soil moisture sensor telemetry is currently not available.";
      }
    } else if (isIrrigateQuery) {
      if (dashboardData?.ai_recommendation) {
        reply = dashboardData.ai_recommendation;
      } else if (recs.length > 0) {
        const latest = recs[0];
        reply = latest.is_irrigation_required
          ? `Irrigation is recommended. Target volume is ${latest.recommended_water_volume_liters} Liters.`
          : `Soil moisture levels are optimal. Irrigation is currently not required.`;
      }
    } else if (isRainQuery) {
      const weather = dashboardData?.weather;
      if (weather) {
        reply = locale === "hi-IN"
          ? `आज मौसम ${weather.conditions} रहेगा, तापमान ${weather.temp}°C है और बारिश की संभावना ${Math.round(weather.rain_probability * 100)}% है।`
          : locale === "te-IN"
            ? `ఈ రోజు వాతావరణం ${weather.conditions} గా ఉంటుంది, ఉష్ణోగ్రత ${weather.temp}°C మరియు వర్షం పడే అవకాశం ${Math.round(weather.rain_probability * 100)}% గా ఉంది.`
            : `Weather is currently ${weather.conditions} with a temperature of ${weather.temp}°C. The probability of rain is ${Math.round(weather.rain_probability * 100)}%.`;
      } else {
        reply = "Weather information is not available at the moment.";
      }
    } else if (isAlertQuery) {
      reply = dashboardData?.ai_recommendation || "All field conditions are currently normal.";
    } else {
      // General response fallback using Sarvam AI dynamic recommendation
      reply = dashboardData?.ai_recommendation || "I am here to help you optimize water. Please ask about soil moisture, weather forecasts, or irrigation requirements.";
    }

    // Call translation if target language is not English
    if (locale !== "en-IN") {
      try {
        // Translate reply via Sarvam AI or offline
        const translatedRes = await api.post("/users/profile", { preferred_language: locale }); // update preferred language
        // We can request audio translation if available
        if (recs.length > 0) {
          const audioRes = await api.get<{ text_translated: string }>(
            `/recommendations/${recs[0].id}/audio?target_lang=${locale}`
          );
          if (audioRes.text_translated && (isIrrigateQuery || isAlertQuery)) {
            reply = audioRes.text_translated;
          }
        }
      } catch (err) {
        console.error("Failed to fetch regional translation:", err);
      }
    }

    // Add AI response
    setMessages((prev) => [...prev, { sender: "ai", text: reply, timestamp: new Date() }]);
    setIsLoading(false);

    // Speech output
    speak(reply, locale);
  };

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      cancelSpeech();
      startListening(locale, (resultText) => {
        handleSendMessage(resultText);
      });
    }
  };

  const handlePlayVoice = (text: string) => {
    speak(text, locale);
  };

  return (
    <div className="min-h-screen bg-[#070a08] text-[#f2f7f4] flex flex-col pb-24 px-4 pt-6">
      
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-neutral-900 pb-4 shrink-0">
        <Link href="/dashboard" className="p-2 bg-neutral-900 border border-neutral-850 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white leading-none flex items-center gap-1.5">
            <Sparkles className="w-6 h-6 text-emerald-450" /> Kisan AI
          </h1>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-1">
            Regional Voice Assistant
          </p>
        </div>
      </header>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar min-h-[300px]">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[85%] rounded-3xl p-4 shadow-sm flex flex-col gap-2 ${
              msg.sender === "user" 
                ? "bg-emerald-500 text-neutral-950 rounded-tr-none font-bold text-xs" 
                : "bg-neutral-950 border border-neutral-900 text-neutral-250 rounded-tl-none text-xs"
            }`}>
              <p className="leading-relaxed">{msg.text}</p>
              
              {msg.sender === "ai" && (
                <button 
                  onClick={() => handlePlayVoice(msg.text)}
                  className="w-fit flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-400 hover:text-emerald-350 cursor-pointer pt-1"
                >
                  <Volume2 className="w-3.5 h-3.5" /> Speak
                </button>
              )}
            </div>
          </div>
        ))}
        {isListening && (
          <div className="flex justify-end">
            <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs rounded-3xl rounded-tr-none p-4 max-w-[80%] animate-pulse">
              {transcription || "Listening..."}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input controls panel */}
      <div className="mt-auto space-y-4 shrink-0 pt-4 border-t border-neutral-900">
        
        {/* Large Pulse-Animated Microphone Button */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative">
            {isListening && (
              <span className="absolute -inset-4 bg-emerald-500/25 rounded-full animate-ping pointer-events-none" />
            )}
            <button
              onClick={handleMicToggle}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-105 duration-200 active:scale-95 cursor-pointer relative ${
                isListening 
                  ? "bg-rose-500 text-white shadow-rose-500/20" 
                  : "bg-emerald-500 text-neutral-950 shadow-emerald-500/20"
              }`}
              aria-label={isListening ? "Stop listening" : "Start speaking"}
            >
              <Mic className="w-8 h-8 stroke-[2.5]" />
            </button>
          </div>
          <span className="text-[10px] text-neutral-450 uppercase font-black tracking-widest mt-4">
            {isListening ? "Tap to send" : "Tap & speak to AI"}
          </span>
        </div>

        {/* Text Input fallback */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(typedMessage);
          }}
          className="flex gap-2 bg-neutral-950 border border-neutral-900 rounded-2xl p-1.5 items-center"
        >
          <input
            type="text"
            value={typedMessage}
            onChange={(e) => setTypedMessage(e.target.value)}
            placeholder="Type your question..."
            className="flex-1 bg-transparent text-xs text-white outline-none px-3 font-semibold"
          />
          <button
            type="submit"
            className="p-3 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 rounded-xl cursor-pointer shadow-md transition-all active:scale-95"
            aria-label="Send query"
          >
            <Send className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>

      </div>

    </div>
  );
}
