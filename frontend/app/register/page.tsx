"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
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
      await register(formData);
    } catch (err: any) {
      setError(err.message || "Registration failed. Check your connection or email.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background glowing elements */}
      <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Registration Card */}
      <div className="w-full max-w-xl bg-neutral-900/60 border border-neutral-800/80 backdrop-blur-md rounded-3xl p-8 shadow-2xl flex flex-col gap-6">
        <div className="text-center">
          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/20 tracking-wider uppercase inline-block mb-3">
            AgriSmart Onboarding
          </span>
          <h2 className="text-2xl font-black text-white">Create Farmer Profile</h2>
          <p className="text-neutral-400 text-xs mt-1">
            Register your profile to start optimizing your field irrigation
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-fullname" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
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
                className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="reg-email" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
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
                className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="reg-phone" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                Phone Number
              </label>
              <input
                id="reg-phone"
                type="tel"
                required
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="9876543210"
                autoComplete="tel"
                className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="reg-lang" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                Preferred Language
              </label>
              <select
                id="reg-lang"
                name="preferred_language"
                value={formData.preferred_language}
                onChange={handleChange}
                className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition-colors"
              >
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">Hindi (हिन्दी)</option>
                <option value="kn-IN">Kannada (ಕನ್ನಡ)</option>
              </select>
            </div>

            <div>
              <label htmlFor="reg-state" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                State
              </label>
              <input
                id="reg-state"
                type="text"
                required
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="Karnataka"
                autoComplete="address-level1"
                className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="reg-district" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                District
              </label>
              <input
                id="reg-district"
                type="text"
                required
                name="district"
                value={formData.district}
                onChange={handleChange}
                placeholder="Bellary"
                autoComplete="address-level2"
                className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
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
                className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="reg-confirmpass" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
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
                className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-sm py-3 px-4 rounded-xl transition-all duration-200 cursor-pointer mt-4 shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="text-center text-xs text-neutral-400">
          Already have an account?{" "}
          <Link href="/login" className="text-emerald-400 font-bold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
