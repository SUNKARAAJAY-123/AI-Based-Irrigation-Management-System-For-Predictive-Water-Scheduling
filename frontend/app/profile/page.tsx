"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { useTranslation } from "@/context/LanguageContext";
import { Locale } from "@/lib/translations";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { 
  User, 
  CheckCircle2,
  AlertTriangle,
  Bell
} from "lucide-react";

import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import NotificationPreferences from "@/components/NotificationPreferences";
import ErrorState from "@/components/ui/ErrorState";
import StatusBadge from "@/components/ui/StatusBadge";

export default function ProfilePage() {
  const { t, setLocale } = useTranslation();
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const { isOnline } = useOfflineCache();
  const router = useRouter();

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
      setSuccess(t("profile.profile_updated") || "Profile settings updated successfully!");
      await refreshProfile();
    } catch (err) {
      setError((err as Error).message || "Failed to update profile settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-[#060a08] text-neutral-100 px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-8 max-w-4xl mx-auto space-y-6">
      
      <PageHeader
        title={t("profile.title") || "Farmer Profile & Preferences"}
        subtitle={t("profile.subtitle") || "Manage account details, preferred regional language, and notification alerts."}
        icon={<User className="w-6 h-6 stroke-[2.5]" />}
        action={<StatusBadge status={user?.role === "admin" ? "ATTENTION" : "GOOD"} label={user?.role === "admin" ? "Admin Account" : "Farmer Account"} size="sm" />}
      />

      {!isOnline && (
        <div className="bg-amber-500 text-neutral-950 font-black text-center py-2.5 px-4 rounded-2xl text-xs flex justify-center items-center gap-2 shadow-md">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Working offline. Profile updates require internet connection.</span>
        </div>
      )}

      {error && <ErrorState message={error} onRetry={() => setError(null)} />}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-3 rounded-2xl flex items-center gap-2 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Main Profile Settings Form */}
        <Card variant="glass" padding="lg" className="space-y-4">
          <CardHeader>
            <CardTitle>
              <User className="w-4.5 h-4.5 text-emerald-400" />
              Account & Regional Language
            </CardTitle>
          </CardHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="prof-email" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
                Email Address
              </label>
              <input
                id="prof-email"
                type="email"
                disabled
                value={user?.email || ""}
                autoComplete="email"
                className="w-full bg-neutral-950/60 border border-neutral-850 text-xs font-bold text-neutral-500 rounded-2xl px-4 py-3 outline-none cursor-not-allowed min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="prof-fullname" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
                Farmer Full Name
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
                className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="prof-phone" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
                Mobile Number
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
                className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="prof-lang" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
                Preferred Regional Language
              </label>
              <select
                id="prof-lang"
                name="preferred_language"
                value={formData.preferred_language}
                onChange={handleChange}
                className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
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
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="prof-state" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
                  State
                </label>
                <input
                  id="prof-state"
                  type="text"
                  required
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  autoComplete="address-level1"
                  placeholder="State"
                  className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-3 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="prof-district" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
                  District
                </label>
                <input
                  id="prof-district"
                  type="text"
                  required
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  autoComplete="address-level2"
                  placeholder="District"
                  className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-3 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
                />
              </div>
            </div>

            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={!isOnline}
              variant="primary"
              size="md"
              className="w-full"
            >
              Save Profile Preferences
            </Button>
          </form>
        </Card>

        {/* Push Notification Preferences Section */}
        <div className="space-y-4">
          <Card variant="glass" padding="lg" className="space-y-4">
            <CardHeader>
              <CardTitle>
                <Bell className="w-4.5 h-4.5 text-emerald-400" />
                Real-Time Notification Preferences
              </CardTitle>
            </CardHeader>
            <NotificationPreferences />
          </Card>
        </div>

      </div>
    </div>
  );
}
