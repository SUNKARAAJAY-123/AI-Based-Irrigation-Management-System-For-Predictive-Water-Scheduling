"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSpeech } from "@/hooks/useSpeech";
import { api } from "@/services/api";
import { useTranslation } from "@/context/LanguageContext";
import { Mic, Volume2, Sparkles, Send, HelpCircle } from "lucide-react";

import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";

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
  const { locale } = useTranslation();
  const { isListening, transcription, startListening, stopListening, speak, cancelSpeech } = useSpeech();

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      text: "Hello! I am AgriSmart AI, your farming assistant. Ask me questions about your soil moisture, weather forecast, or irrigation schedule.",
      timestamp: new Date()
    }
  ]);
  const [typedMessage, setTypedMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [recs, setRecs] = useState<VoiceRecommendation[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

    setMessages((prev) => [...prev, { sender: "user", text, timestamp: new Date() }]);
    setTypedMessage("");

    const cleanQuery = text.toLowerCase();
    let reply = "Checking your farm details...";

    const isMoistureQuery = cleanQuery.includes("moisture") || cleanQuery.includes("नमी") || cleanQuery.includes("తేవాంశ") || cleanQuery.includes("తేమ");
    const isIrrigateQuery = cleanQuery.includes("irrigate") || cleanQuery.includes("water") || cleanQuery.includes("सिंचाई") || cleanQuery.includes("నీరు");
    const isRainQuery = cleanQuery.includes("rain") || cleanQuery.includes("weather") || cleanQuery.includes("बारिश") || cleanQuery.includes("వర్షం");

    if (isMoistureQuery) {
      const moisture = dashboardData?.soil_moisture;
      if (moisture !== null && moisture !== undefined) {
        reply = locale === "hi-IN"
          ? `आपके खेत की वर्तमान मिट्टी की नमी ${moisture}% है।`
          : locale === "te-IN"
            ? `మీ పొలంలో ప్రస్తుత తేమ శాతం ${moisture}% గా ఉంది.`
            : `Your current soil moisture is ${moisture}%.`;
      } else {
        reply = "Soil moisture sensor readings are currently being synced.";
      }
    } else if (isIrrigateQuery) {
      if (dashboardData?.ai_recommendation) {
        reply = dashboardData.ai_recommendation;
      } else if (recs.length > 0) {
        const latest = recs[0];
        reply = latest.is_irrigation_required
          ? `Irrigation is recommended today. Target volume is ${latest.recommended_water_volume_liters} Liters.`
          : `Soil moisture levels are healthy. Irrigation is currently not required.`;
      }
    } else if (isRainQuery) {
      const weather = dashboardData?.weather;
      if (weather) {
        reply = locale === "hi-IN"
          ? `आज मौसम ${weather.conditions} रहेगा, तापमान ${weather.temp}°C है और बारिश की संभावना ${Math.round(weather.rain_probability * 100)}% है।`
          : locale === "te-IN"
            ? `ఈ రోజు వాతావరణం ${weather.conditions} గా ఉంటుంది, ఉష్ణోగ్రత ${weather.temp}°C మరియు వర్షం పడే అవకాశం ${Math.round(weather.rain_probability * 100)}% గా ఉంది.`
            : `Weather is currently ${weather.conditions} with a temperature of ${weather.temp}°C. Rain probability is ${Math.round(weather.rain_probability * 100)}%.`;
      } else {
        reply = "Weather information is available on the weather screen.";
      }
    } else {
      reply = dashboardData?.ai_recommendation || "I am here to assist your farm. You can ask me about soil moisture, rain forecast, or watering recommendations.";
    }

    setMessages((prev) => [...prev, { sender: "ai", text: reply, timestamp: new Date() }]);
    setIsLoading(false);
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

  const quickPrompts = [
    { label: "Does my field need water?", query: "Does my field need water?" },
    { label: "What is today's soil moisture?", query: "What is today's soil moisture?" },
    { label: "Will it rain today?", query: "Will it rain today?" },
  ];

  return (
    <div className="min-h-screen bg-[#060a08] text-neutral-100 px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-8 max-w-4xl mx-auto flex flex-col justify-between">
      
      <div>
        <PageHeader
          title="AgriSmart AI Assistant"
          subtitle="Ask question via voice or text in your regional language."
          icon={<Sparkles className="w-6 h-6 stroke-[2.5]" />}
          backHref="/dashboard"
          action={<StatusBadge status="GOOD" label="Online" size="sm" />}
        />

        {/* Message Log */}
        <div className="space-y-4 my-4 max-h-[50vh] overflow-y-auto no-scrollbar pr-1">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[85%] rounded-3xl p-4 shadow-md text-xs font-semibold leading-relaxed ${
                msg.sender === "user" 
                  ? "bg-emerald-500 text-neutral-950 font-extrabold" 
                  : "bg-neutral-950 border border-neutral-850 text-neutral-100"
              }`}>
                <p className="break-words-regional text-sm">{msg.text}</p>
                {msg.sender === "ai" && (
                  <button 
                    onClick={() => speak(msg.text, locale)}
                    className="w-fit flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 hover:text-emerald-300 cursor-pointer pt-2"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Listen
                  </button>
                )}
              </div>
            </div>
          ))}

          {isListening && (
            <div className="flex justify-end">
              <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs rounded-3xl p-4 max-w-[80%] animate-pulse">
                🎙 Listening... {transcription}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-3xl p-4 text-xs font-bold flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap gap-2 my-3">
          {quickPrompts.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip.query)}
              className="px-3.5 py-2 bg-neutral-950 hover:bg-neutral-900 border border-neutral-850 text-emerald-400 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 touch-target cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Controls */}
      <div className="space-y-4 pt-4 border-t border-neutral-900">
        <div className="flex flex-col items-center justify-center">
          <button
            onClick={handleMicToggle}
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-105 active:scale-95 cursor-pointer touch-target ${
              isListening ? "bg-rose-500 text-white animate-pulse" : "bg-emerald-500 text-neutral-950 font-black shadow-emerald-500/20"
            }`}
            aria-label={isListening ? "Stop listening" : "Tap to speak"}
          >
            <Mic className="w-8 h-8 stroke-[2.5]" />
          </button>
          <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mt-3">
            {isListening ? "Listening... Tap to send" : "Tap to Speak"}
          </span>
        </div>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(typedMessage);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={typedMessage}
            onChange={(e) => setTypedMessage(e.target.value)}
            placeholder="Type a question..."
            className="flex-1 bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
          />
          <Button
            type="submit"
            disabled={!typedMessage.trim() || isLoading}
            variant="primary"
            size="md"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>

    </div>
  );
}
