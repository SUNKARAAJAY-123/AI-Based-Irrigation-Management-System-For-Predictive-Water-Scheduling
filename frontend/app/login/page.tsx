"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, LogIn, Sparkles, RefreshCw, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err) {
      setError((err as Error).message || "Incorrect email or password");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d0b] flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Onboarding Panel */}
      <div className="w-full max-w-md glass-panel rounded-3xl p-8 shadow-2xl flex flex-col gap-6 border border-neutral-900 animate-slide-up">
        
        <div className="text-center">
          <span className="bg-emerald-500/10 text-emerald-450 text-[10px] font-black px-2.5 py-1 rounded-full border border-emerald-500/25 tracking-widest uppercase inline-flex items-center gap-1 mb-3">
            <Sparkles className="w-3 h-3 text-emerald-450" />
            AgriSmart Pro
          </span>
          <h2 className="text-2xl font-black text-white">Welcome Back</h2>
          <p className="text-neutral-450 text-xs mt-1 leading-relaxed">
            Sign in to access your automated crops recommendation and soil moisture dashboard.
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-350 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-450 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" />
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="farmer@example.com"
              autoComplete="email"
              className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-250 rounded-xl px-4 py-3.5 outline-none focus:border-emerald-500/50 placeholder:text-neutral-700"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              Security Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full bg-neutral-950 border border-neutral-900 text-xs text-neutral-250 rounded-xl px-4 py-3.5 outline-none focus:border-emerald-500/50 placeholder:text-neutral-700"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-xs uppercase tracking-wider py-4 px-4 rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-500/5 flex items-center justify-center gap-2 active:scale-98"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin stroke-[2.5]" />
            ) : (
              <>
                <LogIn className="w-4 h-4 stroke-[2.5]" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-neutral-450 border-t border-neutral-900 pt-4 mt-2">
          New to AgriSmart?{" "}
          <Link href="/register" className="text-emerald-450 font-bold hover:underline">
            Create Onboarding Profile
          </Link>
        </div>

      </div>
    </div>
  );
}
