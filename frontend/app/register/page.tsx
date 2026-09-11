"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sprout } from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ErrorState from "@/components/ui/ErrorState";
import StatusBadge from "@/components/ui/StatusBadge";

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
    role: "FARMER"
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
        setPendingMessage(result.message || "Your Admin registration request has been submitted successfully. Account will activate after Super Admin approval.");
        setIsSubmitting(false);
      }
    } catch (err) {
      setError((err as Error).message || "Registration failed. Check your connection or email.");
      setIsSubmitting(false);
    }
  };

  if (isPendingApproval) {
    return (
      <div className="min-h-screen bg-[#060a08] flex flex-col justify-center items-center px-4 py-12">
        <Card variant="glass" padding="lg" className="w-full max-w-md text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-2xl font-black">
            ✓
          </div>
          <h2 className="text-xl font-black text-white">Registration Submitted</h2>
          <p className="text-xs text-neutral-400 font-semibold">{pendingMessage}</p>
          <Link href="/login" className="block pt-2">
            <Button variant="primary" size="md" className="w-full">
              Go to Sign In
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a08] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <Sprout className="w-7 h-7 stroke-[2.5]" />
          </div>
          <StatusBadge status="GOOD" label="🌾 Onboarding Profile Setup" size="sm" />
          <h2 className="text-2xl font-black text-white">Register Farm Profile</h2>
          <p className="text-xs text-neutral-400 font-semibold">
            Create an account to configure soil telemetry and regional voice advice.
          </p>
        </div>

        {error && <ErrorState message={error} onRetry={() => setError(null)} />}

        <Card variant="glass" padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: "FARMER" }))}
                  className={`py-2.5 px-4 rounded-2xl text-xs font-black transition-all border cursor-pointer touch-target ${
                    formData.role === "FARMER"
                      ? "bg-emerald-500 text-neutral-950 border-emerald-400 shadow-md"
                      : "bg-neutral-900 border-neutral-850 text-neutral-400"
                  }`}
                >
                  Farmer
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: "ADMIN" }))}
                  className={`py-2.5 px-4 rounded-2xl text-xs font-black transition-all border cursor-pointer touch-target ${
                    formData.role === "ADMIN"
                      ? "bg-emerald-500 text-neutral-950 border-emerald-400 shadow-md"
                      : "bg-neutral-900 border-neutral-850 text-neutral-400"
                  }`}
                >
                  Admin
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-fullname" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
                  Full Name
                </label>
                <input
                  id="reg-fullname"
                  type="text"
                  required
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Farmer Name"
                  autoComplete="name"
                  className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="reg-email" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
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
                  className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="reg-phone" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
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
                  className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="reg-lang" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
                  Language
                </label>
                <select
                  id="reg-lang"
                  name="preferred_language"
                  value={formData.preferred_language}
                  onChange={handleChange}
                  className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
                >
                  <option value="en-IN">English (India)</option>
                  <option value="hi-IN">Hindi (हिन्दी)</option>
                  <option value="te-IN">Telugu (తెలుగు)</option>
                  <option value="kn-IN">Kannada (ಕನ್ನಡ)</option>
                </select>
              </div>

              <div>
                <label htmlFor="reg-state" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
                  State
                </label>
                <input
                  id="reg-state"
                  type="text"
                  required
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="State"
                  autoComplete="address-level1"
                  className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="reg-district" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
                  District
                </label>
                <input
                  id="reg-district"
                  type="text"
                  required
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  placeholder="District"
                  autoComplete="address-level2"
                  className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="reg-password" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
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
                  className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="reg-confirmpass" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
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
                  className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
                />
              </div>
            </div>

            <Button
              type="submit"
              isLoading={isSubmitting}
              variant="primary"
              size="md"
              className="w-full mt-4"
            >
              Create Account
            </Button>
          </form>

          <div className="text-center text-xs text-neutral-400 font-semibold border-t border-neutral-900 pt-4 mt-4">
            Already registered?{" "}
            <Link href="/login" className="text-emerald-400 font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </Card>

      </div>
    </div>
  );
}
