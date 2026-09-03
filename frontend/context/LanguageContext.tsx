"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Locale, translations } from "@/lib/translations";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: (path: string, params?: Record<string, string | number>) => string;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // Initialize locale directly from localStorage on client, defaulting to en-IN
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("preferred_locale") as Locale;
      if (cached && Object.keys(translations).includes(cached)) {
        return cached;
      }
    }
    return "en-IN";
  });

  // Sync language with logged-in user profile if set on backend
  useEffect(() => {
    if (user && user.preferred_language && user.preferred_language !== locale) {
      setLocaleState(user.preferred_language as Locale);
      if (typeof window !== "undefined") {
        localStorage.setItem("preferred_locale", user.preferred_language);
      }
    }
  }, [user?.preferred_language]);

  const setLocale = async (newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== "undefined") {
      localStorage.setItem("preferred_locale", newLocale);
    }
    
    // Persist to user profile in DB if logged in
    if (user) {
      try {
        await api.put("/users/profile", { preferred_language: newLocale });
      } catch (err) {
        console.error("Failed to persist language setting to profile:", err);
      }
    }
  };

  const t = (path: string, params?: Record<string, string | number>): string => {
    if (!path) return "";
    const keys = path.split(".");
    let current: any = translations[locale] || translations["en-IN"];
    
    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        // Fallback to English dictionary if key is missing in target locale
        let fallback: any = translations["en-IN"];
        for (const fKey of keys) {
          if (fallback && typeof fallback === "object" && fKey in fallback) {
            fallback = fallback[fKey];
          } else {
            // Return formatted fallback string instead of raw path
            return path;
          }
        }
        current = fallback;
        break;
      }
    }

    let result = typeof current === "string" ? current : path;
    if (params && typeof result === "string") {
      Object.entries(params).forEach(([paramKey, paramVal]) => {
        result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      });
    }
    return result;
  };

  const isRtl = locale === "ur-IN"; // Urdu is RTL

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, isRtl }}>
      <div dir={isRtl ? "rtl" : "ltr"}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
};

