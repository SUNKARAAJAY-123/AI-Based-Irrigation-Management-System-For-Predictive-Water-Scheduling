"use client";

import { useState, useEffect } from "react";

export interface SpeechHook {
  isListening: boolean;
  transcription: string;
  startListening: (langCode: string, onResult: (text: string) => void) => void;
  stopListening: () => void;
  speak: (text: string, langCode: string, audioBase64?: string | null) => Promise<void>;
  cancelSpeech: () => void;
}

export const useSpeech = (): SpeechHook => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcription, setTranscription] = useState<string>("");
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        setRecognition(rec);
      }
    }
  }, []);

  const startListening = (langCode: string, onResult: (text: string) => void) => {
    if (!recognition) {
      alert("Speech recognition is not supported in this browser. Please try Chrome or Edge.");
      return;
    }

    recognition.lang = langCode;
    recognition.onstart = () => {
      setIsListening(true);
      setTranscription("Listening...");
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscription(text);
      onResult(text);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const speak = async (text: string, langCode: string, audioBase64?: string | null) => {
    // Cancel any ongoing speech
    cancelSpeech();

    // 1. If we have Sarvam AI pre-synthesized base64 audio, play it!
    if (audioBase64) {
      try {
        const audioUrl = `data:audio/wav;base64,${audioBase64}`;
        const audio = new Audio(audioUrl);
        await audio.play();
        return;
      } catch (err) {
        console.error("Failed to play Sarvam AI audio, falling back to browser TTS:", err);
      }
    }

    // 2. Fallback: Native Browser Text-to-Speech
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      
      // Attempt to find a matching voice for the language
      const voices = window.speechSynthesis.getVoices();
      let voice = voices.find(v => v.lang.startsWith(langCode));
      if (!voice) {
        // Broad language match (e.g. hi-IN vs hi)
        const primaryLang = langCode.split("-")[0];
        voice = voices.find(v => v.lang.startsWith(primaryLang));
      }
      
      if (voice) {
        utterance.voice = voice;
      }
      
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Speech synthesis not supported in this browser.");
    }
  };

  const cancelSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  return {
    isListening,
    transcription,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
  };
};
