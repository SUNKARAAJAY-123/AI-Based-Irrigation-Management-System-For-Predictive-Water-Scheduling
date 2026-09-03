"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSpeech } from "@/hooks/useSpeech";
import { api } from "@/services/api";
import { useTranslation } from "@/context/LanguageContext";
import { Locale } from "@/lib/translations";
import { Mic, X, MessageSquare, Globe, Sparkles, Send } from "lucide-react";

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

  // Initialize conversation ID when drawer opens
  useEffect(() => {
    if (isOpen && !conversationId) {
      setConversationId(`conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    }
  }, [isOpen, conversationId]);

  // Sync preferred language from global translation context
  useEffect(() => {
    if (locale) {
      setLanguage(locale);
    }
  }, [locale]);

  // Listen to global open event
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
    };
    window.addEventListener("open-voice-assistant", handleOpen);
    return () => window.removeEventListener("open-voice-assistant", handleOpen);
  }, []);

  // Scroll to bottom on new messages
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
    // 1. Add user message to UI state
    const userMsg: Message = { sender: "user", text: queryText, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // 2. Send structured request to Context-Aware Assistant Endpoint
      const response = await api.post<AssistantResponse>("/voice-assistant", {
        message: queryText,
        language: language,
        conversation_id: conversationId || undefined
      });

      if (response.conversation_id && !conversationId) {
        setConversationId(response.conversation_id);
      }

      // 3. Add AI message to UI state
      const aiMsg: Message = { 
        sender: "ai", 
        text: response.reply, 
        timestamp: new Date(),
        intent: response.intent
      };
      setMessages((prev) => [...prev, aiMsg]);

      // 4. Speak response (using Sarvam audio_base64 if available or browser TTS)
      speak(response.reply, language, response.audio_base64);

    } catch (err) {
      console.error("Voice Assistant Request Failed:", err);
      
      // Farmer-friendly localized error handling
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
              <h3 className="font-extrabold text-sm text-white">AgriSmart Voice & Chat Assistant</h3>
              <p className="text-[10px] text-neutral-400">Context-Aware Agricultural Assistant</p>
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
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[250px] max-h-[400px] no-scrollbar py-2">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-neutral-500 space-y-2">
              <MessageSquare className="w-10 h-10 text-neutral-800 stroke-[1.5]" />
              <p>Hello! Ask me a question about your farm:<br/>
                <span className="text-neutral-400 font-semibold mt-1 block">&quot;How is my tomato field?&quot; or &quot;When should I irrigate?&quot;</span>
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
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <div className="flex items-center justify-end gap-1.5 mt-1">
                  {msg.intent && msg.sender === "ai" && (
                    <span className="text-[7px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-neutral-800 text-emerald-400">
                      {msg.intent}
                    </span>
                  )}
                  <span className={`text-[8px] block ${
                    msg.sender === "user" ? "text-neutral-800" : "text-neutral-500"
                  }`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
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

          {/* Loading / Thinking State Bubble */}
          {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-neutral-900 border border-neutral-850 rounded-2xl px-4 py-3 flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-neutral-400 font-medium">Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Audio / Text Input Bar & Controls */}
        <div className="border-t border-neutral-900 pt-4 mt-2 space-y-3">
          
          {/* Text Input Form */}
          <form onSubmit={handleSendText} className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 text-neutral-950 rounded-xl transition-all cursor-pointer font-bold"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Language & Voice Controls Bar */}
          <div className="flex justify-between items-center gap-4 bg-neutral-950 p-2 rounded-xl border border-neutral-900">
            {/* Language Selector */}
            <div className="flex items-center gap-2 text-xs">
              <Globe className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={language}
                onChange={(e) => {
                  const val = e.target.value;
                  setLanguage(val);
                  setLocale(val as Locale);
                }}
                className="bg-transparent text-neutral-350 border-none outline-none font-bold cursor-pointer"
              >
                <option value="en-IN" className="bg-neutral-950 text-white">English (India)</option>
                <option value="hi-IN" className="bg-neutral-950 text-white">हिन्दी (Hindi)</option>
                <option value="te-IN" className="bg-neutral-950 text-white">తెలుగు (Telugu)</option>
                <option value="kn-IN" className="bg-neutral-950 text-white">ಕನ್ನಡ (Kannada)</option>
                <option value="ta-IN" className="bg-neutral-950 text-white">தமிழ் (Tamil)</option>
                <option value="mr-IN" className="bg-neutral-950 text-white">मराठी (Marathi)</option>
                <option value="bn-IN" className="bg-neutral-950 text-white">বাংলা (Bengali)</option>
                <option value="ml-IN" className="bg-neutral-950 text-white">മലയാളം (Malayalam)</option>
                <option value="gu-IN" className="bg-neutral-950 text-white">ગુજરાતી (Gujarati)</option>
                <option value="pa-IN" className="bg-neutral-950 text-white">ਪੰਜਾਬੀ (Punjabi)</option>
                <option value="or-IN" className="bg-neutral-950 text-white">ଓଡ଼ିଆ (Odia)</option>
                <option value="as-IN" className="bg-neutral-950 text-white">অসমীয়া (Assamese)</option>
                <option value="ur-IN" className="bg-neutral-950 text-white">اردو (Urdu)</option>
              </select>
            </div>
            
            {/* Central Mic Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isListening 
                  ? "bg-rose-500 text-white animate-pulse" 
                  : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
              }`}
              title={isListening ? "Stop listening" : "Speak your question"}
            >
              <Mic className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default VoiceAssistant;
