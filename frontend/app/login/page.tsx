"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Incorrect email or password");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background glowing elements */}
      <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-neutral-900/60 border border-neutral-800/80 backdrop-blur-md rounded-3xl p-8 shadow-2xl flex flex-col gap-6">
        <div className="text-center">
          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/20 tracking-wider uppercase inline-block mb-3">
            AgriSmart Pro
          </span>
          <h2 className="text-2xl font-black text-white">Welcome Back</h2>
          <p className="text-neutral-400 text-xs mt-1">
            Access your AI irrigation assistant and field dashboard
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="farmer@example.com"
              autoComplete="email"
              className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-600"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-600"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-sm py-3 px-4 rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="text-center text-xs text-neutral-400">
          New to AgriSmart?{" "}
          <Link href="/register" className="text-emerald-400 font-bold hover:underline">
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
