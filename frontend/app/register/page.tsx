"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  User, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  Lock, 
  Sparkles, 
  RefreshCw, 
  AlertCircle 
} from "lucide-react";

export default function RegisterPage() {
  const { register, user } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    password: "",
    confirm_password: "",
    phone_number: "",
    state: "",
    district: "",
    preferred_language: "en-IN",
    role: "FARMER" // Default registration role
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [pendingMessage, setPendingMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (user) {
      const roleLower = user.role.toLowerCase();
      if (roleLower === "admin" || roleLower === "super_admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Simple validations
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await register(formData);
      if (result && result.pending) {
        setIsPendingApproval(true);
        setPendingMessage(result.message || "Your Admin registration request has been submitted successfully. Your account will become active only after approval from the Super Admin.");
        setIsSubmitting(false);
      }
    } catch (err) {
      setError((err as Error).message || "Registration failed. Check your connection or email.");
      setIsSubmitting(false);
    }
  };

  if (isPendingApproval) {
    return (
      <div className="min-h-screen bg-[#090d0b] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
        {/* Background ambient light */}
        <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="w-full max-w-md glass-panel rounded-3xl p-8 shadow-2xl flex flex-col gap-6 border border-neutral-900 text-center animate-slide-up">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2 text-xl font-bold">
            ✓
          </div>
          <h2 className="text-xl font-black text-white">Request Submitted</h2>
          <p className="text-neutral-450 text-xs leading-relaxed">
            {pendingMessage}
          </p>
          <div className="pt-4 border-t border-neutral-900 mt-2">
            <Link href="/login" className="w-full inline-block bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-xs uppercase tracking-wider py-4 rounded-xl transition-all duration-200">
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d0b] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Onboarding Register Panel */}
      <div className="w-full max-w-xl glass-panel rounded-3xl p-8 shadow-2xl flex flex-col gap-6 border border-neutral-900 animate-slide-up">
        
        <div className="text-center">
          <span className="bg-emerald-500/10 text-emerald-455 text-[10px] font-black px-2.5 py-1 rounded-full border border-emerald-500/25 tracking-widest uppercase inline-flex items-center gap-1 mb-3">
            <Sparkles className="w-3 h-3 text-emerald-450" />
            AgriSmart Onboarding
          </span>
          <h2 className="text-2xl font-black text-white">Create Farmer Profile</h2>
          <p className="text-neutral-450 text-xs mt-1 leading-relaxed">
            Register your profile details to configure soil telemetry and crop recommendation.
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-350 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-455 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1">
              Register As
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, role: "FARMER" }))}
                className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  formData.role === "FARMER"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-neutral-950 border-neutral-900 text-neutral-450 hover:text-neutral-300"
                }`}
              >
                Farmer
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, role: "ADMIN" }))}
                className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  formData.role === "ADMIN"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-neutral-950 border-neutral-900 text-neutral-450 hover:text-neutral-300"
                }`}
              >
                Admin
              </button>
            </div>
            
            {/* Conditional helper message banner */}
            <div className="mt-2 p-3 bg-neutral-950 border border-neutral-900 rounded-xl text-[10px]">
              {formData.role === "FARMER" ? (
                <p className="text-emerald-500/70 font-semibold">
                  ℹ You can access your account immediately after registration.
                </p>
              ) : (
                <p className="text-sky-500/70 font-semibold">
                  ℹ Admin accounts require approval from the Super Admin before access is granted.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div>
              <label htmlFor="reg-fullname" className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-neutral-500" />
                Full Name
              </label>
              <input
                id="reg-fullname"
                type="text"
                required
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Ajay Sunkara"
                autoComplete="name"
                className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-205 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 placeholder:text-neutral-700"
              />
            </div>

            <div>
              <label htmlFor="reg-email" className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-neutral-500" />
                Email Address
              </label>
              <input
                id="reg-email"
                type="email"
                required
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="farmer@example.com"
                autoComplete="email"
                className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-205 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 placeholder:text-neutral-700"
              />
            </div>

            <div>
              <label htmlFor="reg-phone" className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-neutral-500" />
                Phone Number
              </label>
              <input
                id="reg-phone"
                type="tel"
                required
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="Mobile Number"
                autoComplete="tel"
                className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-205 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 placeholder:text-neutral-700"
              />
            </div>

            <div>
              <label htmlFor="reg-lang" className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-neutral-500" />
                Preferred Assist Language
              </label>
              <select
                id="reg-lang"
                name="preferred_language"
                value={formData.preferred_language}
                onChange={handleChange}
                className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-350 rounded-xl px-4 py-3.5 outline-none focus:border-emerald-500/50 font-bold"
              >
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">Hindi (हिन्दी)</option>
                <option value="kn-IN">Kannada (ಕನ್ನಡ)</option>
              </select>
            </div>

            <div>
              <label htmlFor="reg-state" className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                State
              </label>
              <input
                id="reg-state"
                type="text"
                required
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="e.g. Karnataka"
                autoComplete="address-level1"
                className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-205 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 placeholder:text-neutral-700"
              />
            </div>

            <div>
              <label htmlFor="reg-district" className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                District
              </label>
              <input
                id="reg-district"
                type="text"
                required
                name="district"
                value={formData.district}
                onChange={handleChange}
                placeholder="e.g. Bellary"
                autoComplete="address-level2"
                className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-205 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 placeholder:text-neutral-700"
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-neutral-500" />
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                required
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-205 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 placeholder:text-neutral-700"
              />
            </div>

            <div>
              <label htmlFor="reg-confirmpass" className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-neutral-500" />
                Confirm Password
              </label>
              <input
                id="reg-confirmpass"
                type="password"
                required
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-205 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 placeholder:text-neutral-700"
              />
            </div>

          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-xs uppercase tracking-wider py-4 px-4 rounded-xl transition-all duration-200 mt-6 cursor-pointer shadow-lg flex justify-center items-center gap-2 active:scale-98"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin stroke-[2.5]" />
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-neutral-450 border-t border-neutral-900 pt-4 mt-2">
          Already registered?{" "}
          <Link href="/login" className="text-emerald-450 font-bold hover:underline">
            Sign In
          </Link>
        </div>

      </div>
    </div>
  );
}
