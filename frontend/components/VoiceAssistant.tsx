"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSpeech } from "@/hooks/useSpeech";
import { api } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { Mic, X, MessageSquare, Volume2, Globe, Sparkles } from "lucide-react";

interface VoiceResponse {
  text_english: string;
  text_translated: string;
  audio_base64: string | null;
  language: string;
}

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
}

export const VoiceAssistant: React.FC = () => {
  const { user } = useAuth();
  const { isListening, transcription, startListening, stopListening, speak, cancelSpeech } = useSpeech();
  
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState("hi-IN"); // default to Hindi
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync preferred language from logged-in user profile
  useEffect(() => {
    if (user && ["hi-IN", "kn-IN", "en-IN"].includes(user.preferred_language)) {
      setLanguage(user.preferred_language);
    }
  }, [user]);

  // Listen to global open event
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setError(null);
    };
    window.addEventListener("open-voice-assistant", handleOpen);
    return () => window.removeEventListener("open-voice-assistant", handleOpen);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isListening, transcription]);

  const handleClose = () => {
    cancelSpeech();
    stopListening();
    setIsOpen(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      setError(null);
      cancelSpeech();
      startListening(language, async (resultText) => {
        // 1. Add user message
        const userMsg: Message = { sender: "user", text: resultText, timestamp: new Date() };
        setMessages((prev) => [...prev, userMsg]);
        
        // 2. Fetch AI translation response
        await fetchAIResponse(resultText);
      });
    }
  };

  const fetchAIResponse = async (queryText: string) => {
    setIsLoading(true);
    try {
      // Find the last recommendation or query backend
      // We'll fetch recommendations list first to obtain a crop recommendation context
      const farms = await api.get<VoiceItem[]>("/farms");
      if (farms.length === 0) {
        const fallbackMsg = "No farms registered yet. Please add a farm first.";
        addAIMessage(fallbackMsg);
        speak(fallbackMsg, language);
        setIsLoading(false);
        return;
      }

      const fields = await api.get<VoiceItem[]>(`/fields?farm_id=${farms[0].id}`);
      if (fields.length === 0) {
        const fallbackMsg = "No fields added. Please create fields under your farm.";
        addAIMessage(fallbackMsg);
        speak(fallbackMsg, language);
        setIsLoading(false);
        return;
      }

      const crops = await api.get<VoiceItem[]>(`/crops?field_id=${fields[0].id}`);
      if (crops.length === 0) {
        const fallbackMsg = "No crops planted. Please register a crop under your field.";
        addAIMessage(fallbackMsg);
        speak(fallbackMsg, language);
        setIsLoading(false);
        return;
      }

      const recs = await api.get<VoiceRecommendation[]>(`/recommendations?crop_id=${crops[0].id}`);
      if (recs.length === 0) {
        const fallbackMsg = "No recommendations computed. Simulate telemetry data first.";
        addAIMessage(fallbackMsg);
        speak(fallbackMsg, language);
        setIsLoading(false);
        return;
      }

      // Fetch the voice response from backend for the recommendation
      const voiceRes = await api.get<VoiceResponse>(
        `/recommendations/${recs[0].id}/audio?target_lang=${language}`
      );

      // Perform a simple intent parser locally to speak specific segments
      const cleanQuery = queryText.toLowerCase();
      let replyText = voiceRes.text_translated;

      if (cleanQuery.includes("water") || cleanQuery.includes("quantity") || cleanQuery.includes("पानी") || cleanQuery.includes("ನೀರು")) {
        replyText = language === "hi-IN" 
          ? `सिफारिश किया गया पानी: ${recs[0].recommended_water_volume_liters} लीटर।` 
          : language === "kn-IN" 
            ? `ಶಿಫಾರಸು ಮಾಡಿದ ನೀರಿನ ಪ್ರಮಾಣ: ${recs[0].recommended_water_volume_liters} ಲೀಟರ್.` 
            : `Recommended water volume is ${recs[0].recommended_water_volume_liters} Liters.`;
      }

      addAIMessage(replyText);
      speak(replyText, language, voiceRes.audio_base64);

    } catch (err) {
      console.error(err);
      const errMsg = "Apologies, could not process voice request at this moment.";
      addAIMessage(errMsg);
      speak(errMsg, language);
    } finally {
      setIsLoading(false);
    }
  };

  const addAIMessage = (text: string) => {
    const aiMsg: Message = { sender: "ai", text, timestamp: new Date() };
    setMessages((prev) => [...prev, aiMsg]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in md:items-center">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={handleClose} />

      {/* Main panel */}
      <div className="relative w-full max-w-lg bg-neutral-950 border border-neutral-800/80 rounded-t-3xl shadow-2xl p-6 md:rounded-3xl animate-slide-up flex flex-col max-h-[85vh] z-10">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-neutral-900 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm text-white">AgriSmart Voice Assistant</h3>
              <p className="text-[10px] text-neutral-400">Ask questions in your regional language</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-1.5 hover:bg-neutral-900 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[250px] no-scrollbar py-2">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-neutral-500 space-y-2">
              <MessageSquare className="w-10 h-10 text-neutral-800 stroke-[1.5]" />
              <p>Hello! Tap the microphone below and ask me:<br/>
                <span className="text-neutral-400 font-semibold mt-1 block">&quot;Should I water my crops today?&quot;</span>
              </p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div 
              key={index}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
            >
              <div 
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs ${
                  msg.sender === "user"
                    ? "bg-emerald-500 text-neutral-950 font-bold"
                    : "bg-neutral-900 text-neutral-200 border border-neutral-850"
                }`}
              >
                <p>{msg.text}</p>
                <span className={`text-[8px] mt-1 block text-right ${
                  msg.sender === "user" ? "text-neutral-800" : "text-neutral-500"
                }`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {/* Listening State Bubble */}
          {isListening && (
            <div className="flex justify-end animate-pulse">
              <div className="bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-2xl px-4 py-2.5 text-xs max-w-[85%]">
                <p className="italic">{transcription || "Listening..."}</p>
              </div>
            </div>
          )}

          {/* Loading Spinner Bubble */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-neutral-900 border border-neutral-850 rounded-2xl px-4 py-3 flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-neutral-400">Processing audio response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Audio / Mic Wave Controls */}
        <div className="border-t border-neutral-900 pt-4 mt-4 space-y-4">
          
          {/* Controls Bar */}
          <div className="flex justify-between items-center gap-4 bg-neutral-950 p-2.5 rounded-xl border border-neutral-900">
            {/* Language Selector */}
            <div className="flex items-center gap-2 text-xs">
              <Globe className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent text-neutral-350 border-none outline-none font-bold cursor-pointer"
              >
                <option value="hi-IN" className="bg-neutral-950 text-white">हिन्दी (Hindi)</option>
                <option value="kn-IN" className="bg-neutral-950 text-white">ಕನ್ನಡ (Kannada)</option>
                <option value="en-IN" className="bg-neutral-950 text-white">English (US)</option>
              </select>
            </div>
            <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
              {isListening ? "Listening" : "Ready"}
            </div>
          </div>

          {/* Listening Pulsing Wave */}
          {isListening && (
            <div className="flex justify-center items-center gap-1.5 h-8">
              {[0.4, 0.8, 0.5, 0.9, 0.3, 0.7, 0.4].map((delay, i) => (
                <span 
                  key={i}
                  className="w-1 bg-emerald-500 rounded-full animate-wave"
                  style={{ 
                    animationDelay: `${delay}s`,
                    height: '100%' 
                  }}
                />
              ))}
            </div>
          )}

          {/* Central Mic Button */}
          <div className="flex justify-center">
            <button
              onClick={toggleListening}
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl cursor-pointer transition-all duration-300 ${
                isListening 
                  ? "bg-rose-500 text-white animate-pulse-glow" 
                  : "bg-emerald-500 text-neutral-950 hover:scale-105"
              }`}
              aria-label={isListening ? "Stop listening" : "Start voice assistant microphone"}
            >
              <Mic className="w-7 h-7 stroke-[2.5]" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default VoiceAssistant;
