"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSpeech } from "@/hooks/useSpeech";
import { api } from "@/services/api";
import { useTranslation } from "@/context/LanguageContext";
import { Locale } from "@/lib/translations";
import { Mic, X, Globe, Sparkles, Send, Volume2, HelpCircle } from "lucide-react";
import Button from "./ui/Button";

interface AssistantResponse {
  reply: string;
  intent: string;
  language: string;
  conversation_id: string;
  context_used: boolean;
  audio_base64: string | null;
}

interface Message {
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
  intent?: string;
}

export const VoiceAssistant: React.FC = () => {
  const { locale, setLocale } = useTranslation();
  const { isListening, transcription, startListening, stopListening, speak, cancelSpeech } = useSpeech();
  
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState<string>("en-IN"); 
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !conversationId) {
      setConversationId(`conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    }
  }, [isOpen, conversationId]);

  useEffect(() => {
    if (locale) {
      setLanguage(locale);
    }
  }, [locale]);

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
    };
    window.addEventListener("open-voice-assistant", handleOpen);
    return () => window.removeEventListener("open-voice-assistant", handleOpen);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isListening, transcription, isLoading]);

  const handleClose = () => {
    cancelSpeech();
    stopListening();
    setIsOpen(false);
  };

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputText.trim();
    if (!query || isLoading) return;

    setInputText("");
    await processUserMessage(query);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      cancelSpeech();
      startListening(language, async (resultText) => {
        if (resultText.trim()) {
          await processUserMessage(resultText.trim());
        }
      });
    }
  };

  const processUserMessage = async (queryText: string) => {
    const userMsg: Message = { sender: "user", text: queryText, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await api.post<AssistantResponse>("/voice-assistant", {
        message: queryText,
        language: language,
        conversation_id: conversationId || undefined
      });

      if (response.conversation_id && !conversationId) {
        setConversationId(response.conversation_id);
      }

      const aiMsg: Message = { 
        sender: "ai", 
        text: response.reply, 
        timestamp: new Date(),
        intent: response.intent
      };
      setMessages((prev) => [...prev, aiMsg]);

      speak(response.reply, language, response.audio_base64);

    } catch (err) {
      console.error("Voice Assistant Request Failed:", err);
      
      let fallbackText = "I'm having trouble connecting right now. Please try again.";
      if (language === "hi-IN") {
        fallbackText = "मुझे कनेक्ट करने में समस्या हो रही है। कृपया पुनः प्रयास करें।";
      } else if (language === "te-IN") {
        fallbackText = "నాకు ప్రస్తుతం కనెక్ట్ చేయడంలో విఫలమైంది. దయచేసి మళ్ళీ ప్రయత్నించండి.";
      } else if (language === "kn-IN") {
        fallbackText = "ಸಂಪರ್ಕಿಸುವಲ್ಲಿ ತೊಂದರೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.";
      }

      const errorMsg: Message = { sender: "ai", text: fallbackText, timestamp: new Date() };
      setMessages((prev) => [...prev, errorMsg]);
      speak(fallbackText, language);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    { en: "When should I irrigate?", te: "నేను ఎప్పుడు నీరు పెట్టాలి?", hi: "मुझे सिंचाई कब करनी चाहिए?" },
    { en: "Is my crop healthy?", te: "నా పంట నిలకడగా ఉందా?", hi: "क्या मेरी फसल स्वस्थ है?" },
    { en: "What is the weather today?", te: "ఈ రోజు వాతావరణం ఎలా ఉంది?", hi: "आज का मौसम कैसा है?" },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-md animate-fade-in md:items-center">
      <div className="absolute inset-0" onClick={handleClose} aria-hidden="true" />

      <div className="relative w-full max-w-lg bg-neutral-950 border border-neutral-850 rounded-t-3xl shadow-2xl p-5 md:p-6 md:rounded-3xl animate-slide-up flex flex-col max-h-[90vh] z-10">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-neutral-900 pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <Sparkles className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">Ask AgriSmart AI</h3>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Voice & Regional Assistant</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2.5 hover:bg-neutral-900 text-neutral-400 hover:text-white rounded-2xl transition-colors cursor-pointer touch-target"
            aria-label="Close assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conversation Message List */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 min-h-[220px] max-h-[380px] no-scrollbar py-2">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-neutral-400 space-y-3">
              <div className="p-4 bg-neutral-900 border border-neutral-850 rounded-full text-emerald-400">
                <Mic className="w-8 h-8 stroke-[2]" />
              </div>
              <div>
                <p className="font-bold text-neutral-200 text-sm">Ask in your language 🎙️</p>
                <p className="text-neutral-400 text-xs mt-1 max-w-xs">
                  Tap the mic or select a quick question below to ask AgriSmart:
                </p>
              </div>

              {/* Quick Prompt Chips */}
              <div className="flex flex-col gap-2 w-full pt-2">
                {quickPrompts.map((prompt, idx) => {
                  const text = language.startsWith("te") ? prompt.te : (language.startsWith("hi") ? prompt.hi : prompt.en);
                  return (
                    <button
                      key={idx}
                      onClick={() => processUserMessage(text)}
                      className="w-full text-left p-3 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 rounded-2xl text-xs font-bold text-emerald-300 transition-colors flex items-center justify-between touch-target"
                    >
                      <span className="break-words-regional">&quot;{text}&quot;</span>
                      <HelpCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div 
              key={index}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
            >
              <div 
                className={`max-w-[88%] rounded-2xl p-4 text-xs font-semibold leading-relaxed shadow-md ${
                  msg.sender === "user"
                    ? "bg-emerald-500 text-neutral-950 font-extrabold"
                    : "bg-neutral-900/90 text-neutral-100 border border-neutral-850"
                }`}
              >
                <p className="whitespace-pre-wrap break-words-regional text-sm">{msg.text}</p>
                <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-black/10">
                  {msg.sender === "ai" && (
                    <button 
                      onClick={() => speak(msg.text, language)}
                      className="text-neutral-400 hover:text-emerald-400 p-1 flex items-center gap-1 text-[10px] font-bold"
                    >
                      <Volume2 className="w-3.5 h-3.5" /> Listen
                    </button>
                  )}
                  <span className={`text-[9px] font-bold block ml-auto ${
                    msg.sender === "user" ? "text-neutral-800" : "text-neutral-500"
                  }`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {isListening && (
            <div className="flex justify-end animate-pulse">
              <div className="bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 rounded-2xl p-4 text-xs max-w-[85%] font-bold">
                <p className="italic">🎙 Listening... {transcription}</p>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-neutral-900 border border-neutral-850 rounded-2xl px-4 py-3 flex items-center gap-2.5">
                <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-neutral-300 font-extrabold">AgriSmart is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar & Controls */}
        <div className="border-t border-neutral-900 pt-3 mt-1 space-y-3">
          
          {/* Main Voice Mic Button + Text Input */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleListening}
              className={`p-3.5 rounded-2xl flex items-center justify-center transition-all cursor-pointer touch-target ${
                isListening 
                  ? "bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/20" 
                  : "bg-emerald-500 text-neutral-950 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 font-black"
              }`}
              title={isListening ? "Stop listening" : "Tap to speak"}
            >
              <Mic className="w-6 h-6 stroke-[2.5]" />
            </button>

            <form onSubmit={handleSendText} className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Or type a question..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors font-medium min-h-[44px]"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                variant="primary"
                size="sm"
                className="shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>

          {/* Regional Language Picker */}
          <div className="flex justify-between items-center gap-2 bg-neutral-900/60 p-2.5 rounded-2xl border border-neutral-850 text-xs">
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-emerald-400" /> Language:
            </span>
            <select
              value={language}
              onChange={(e) => {
                const val = e.target.value;
                setLanguage(val);
                setLocale(val as Locale);
              }}
              className="bg-transparent text-emerald-400 border-none outline-none font-black cursor-pointer text-xs"
            >
              <option value="en-IN" className="bg-neutral-950 text-white">English (India)</option>
              <option value="hi-IN" className="bg-neutral-950 text-white">हिन्दी (Hindi)</option>
              <option value="te-IN" className="bg-neutral-950 text-white">తెలుగు (Telugu)</option>
              <option value="kn-IN" className="bg-neutral-950 text-white">ಕನ್ನಡ (Kannada)</option>
              <option value="ta-IN" className="bg-neutral-950 text-white">தமிழ் (Tamil)</option>
              <option value="ml-IN" className="bg-neutral-950 text-white">മലയാളം (Malayalam)</option>
              <option value="mr-IN" className="bg-neutral-950 text-white">मराठी (Marathi)</option>
              <option value="bn-IN" className="bg-neutral-950 text-white">বাংলা (Bengali)</option>
              <option value="gu-IN" className="bg-neutral-950 text-white">ગુજરાતી (Gujarati)</option>
              <option value="pa-IN" className="bg-neutral-950 text-white">ਪੰਜਾਬੀ (Punjabi)</option>
            </select>
          </div>

        </div>

      </div>
    </div>
  );
};

export default VoiceAssistant;
