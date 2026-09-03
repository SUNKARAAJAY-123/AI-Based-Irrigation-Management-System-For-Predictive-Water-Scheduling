"use client";
import { useTranslation } from "@/context/LanguageContext";
import { Locale } from "@/lib/translations";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { 
  User, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  ShieldAlert, 
  Calendar,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

export default function ProfilePage() {
  const { t, setLocale } = useTranslation();
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const { isOnline } = useOfflineCache();
  const router = useRouter();

  // Form State
  const [formData, setFormData] = useState({
    full_name: "",
    phone_number: "",
    state: "",
    district: "",
    preferred_language: "en-IN",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        phone_number: user.phone_number || "",
        state: user.state || "",
        district: user.district || "",
        preferred_language: user.preferred_language || "en-IN",
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (formData.preferred_language) {
        setLocale(formData.preferred_language as Locale);
      }
      await api.put("/users/profile", formData);
      setSuccess(t("profile.profile_updated") || "Profile updated successfully!");
      await refreshProfile();
    } catch (err) {
      setError((err as Error).message || "Failed to update profile settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-[#090d0b] text-[#f2f7f4] px-4 py-8 sm:px-6 lg:px-8 pb-24 md:pb-8">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* Offline Alert Banner */}
        {!isOnline && (
          <div className="bg-amber-600 text-neutral-950 font-bold text-center py-2.5 px-4 rounded-2xl text-xs flex justify-center items-center gap-1.5 shadow-md">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{t("common.offline_banner")}</span>
          </div>
        )}
        
        {/* Header */}
        <div className="border-b border-neutral-900 pb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <User className="w-8 h-8 text-emerald-500" />
            {t("profile.title")}
          </h1>
          <p className="text-neutral-450 text-xs mt-1 font-semibold">
            {t("profile.subtitle")}
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-450" />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        <div className="glass-panel rounded-3xl p-6 shadow-xl border border-neutral-900">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <label htmlFor="prof-email" className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {t("profile.email")}
              </label>
              <input
                id="prof-email"
                type="email"
                disabled
                value={user?.email || ""}
                autoComplete="email"
                className="w-full bg-neutral-950 border border-neutral-900/60 text-xs text-neutral-550 rounded-xl px-4 py-3 outline-none cursor-not-allowed font-bold"
              />
            </div>

            <div>
              <label htmlFor="prof-fullname" className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {t("profile.full_name")}
              </label>
              <input
                id="prof-fullname"
                type="text"
                required
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                autoComplete="name"
                placeholder="Farmer Name"
                className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label htmlFor="prof-phone" className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                {t("profile.phone_number")}
              </label>
              <input
                id="prof-phone"
                type="tel"
                required
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                autoComplete="tel"
                placeholder="Mobile Number"
                className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label htmlFor="prof-lang" className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                {t("profile.preferred_lang")}
              </label>
              <select
                id="prof-lang"
                name="preferred_language"
                value={formData.preferred_language}
                onChange={handleChange}
                className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-350 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 font-bold"
              >
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">हिन्दी (Hindi)</option>
                <option value="te-IN">తెలుగు (Telugu)</option>
                <option value="kn-IN">ಕನ್ನಡ (Kannada)</option>
                <option value="ta-IN">தமிழ் (Tamil)</option>
                <option value="ml-IN">മലയാളം (Malayalam)</option>
                <option value="mr-IN">मराठी (Marathi)</option>
                <option value="bn-IN">বাংলা (Bengali)</option>
                <option value="gu-IN">ગુજરાતી (Gujarati)</option>
                <option value="pa-IN">ਪੰਜਾਬੀ (Punjabi)</option>
                <option value="or-IN">ଓଡ଼ିଆ (Odia)</option>
                <option value="as-IN">অসমীয়া (Assamese)</option>
                <option value="ur-IN">اردو (Urdu)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="prof-state" className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {t("profile.state")}
                </label>
                <input
                  id="prof-state"
                  type="text"
                  required
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  autoComplete="address-level1"
                  placeholder="e.g. Karnataka"
                  className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-200 rounded-xl px-3 py-3 outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label htmlFor="prof-district" className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {t("profile.district")}
                </label>
                <input
                  id="prof-district"
                  type="text"
                  required
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  autoComplete="address-level2"
                  placeholder="e.g. Bellary"
                  className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-200 rounded-xl px-3 py-3 outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-900 mt-6 grid grid-cols-2 text-[9px] text-neutral-500 font-bold uppercase tracking-wider gap-4">
              <div className="bg-neutral-950/40 border border-neutral-900/60 p-3 rounded-2xl">
                <span className="flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-neutral-555" />
                  Account Role
                </span>
                <span className="block text-white text-xs font-extrabold mt-1 capitalize">{user?.role}</span>
              </div>
              <div className="bg-neutral-950/40 border border-neutral-900/60 p-3 rounded-2xl">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-neutral-555" />
                  Joined Date
                </span>
                <span className="block text-white text-xs font-extrabold mt-1">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString("en-IN") : "—"}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !isOnline}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl transition-all duration-200 mt-6 cursor-pointer shadow-lg active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving..." : (!isOnline ? "Offline Mode (Cannot Update)" : "Save Settings")}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
