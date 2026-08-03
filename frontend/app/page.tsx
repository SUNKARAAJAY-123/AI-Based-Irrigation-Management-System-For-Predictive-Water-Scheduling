"use client";

import React from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between relative overflow-hidden">
      
      {/* Background glow graphics */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Navigation bar */}
      <nav className="max-w-7xl mx-auto w-full px-6 py-6 flex justify-between items-center border-b border-neutral-900/60 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚜</span>
          <span className="font-extrabold text-lg bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent tracking-tight">
            AgriSmart Pro
          </span>
        </div>

        <div className="flex gap-4">
          {user ? (
            <Link
              href="/dashboard"
              className="bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-xs px-5 py-2.5 rounded-xl transition-all"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-xs text-neutral-300 font-bold px-4 py-2.5 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-xs px-5 py-2.5 rounded-xl transition-all"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero section */}
      <main className="max-w-7xl mx-auto w-full px-6 py-16 sm:py-24 z-10 flex-1 flex flex-col justify-center text-center gap-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <span className="bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-emerald-500/20 tracking-wider uppercase inline-block">
            Next Generation Smart Farming
          </span>
          
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            AI-Based Irrigation for <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 bg-clip-text text-transparent">
              Crop Yield Optimization
            </span>
          </h1>

          <p className="text-neutral-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Reduce water wastage by 40% using machine learning models, local weather forecast models, real-time soil moisture sensors, and regional voice controls in Hindi and Kannada.
          </p>
        </div>

        <div className="flex justify-center gap-4 mt-4">
          <Link
            href={user ? "/dashboard" : "/register"}
            className="bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-black text-sm px-8 py-3.5 rounded-2xl shadow-xl shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all hover:scale-[1.02] cursor-pointer"
          >
            {user ? "Enter Farm Panel" : "Register Your Farm Now"}
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-16 text-left">
          <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
            <div className="text-3xl mb-4">🧠</div>
            <h3 className="text-base font-bold text-white mb-2">Predictive AI Insights</h3>
            <p className="text-neutral-400 text-xs leading-relaxed">
              Scikit-learn random forest models predict exact crop water requirements based on real-time soil moisture and environmental logs.
            </p>
          </div>

          <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
            <div className="text-3xl mb-4">🎙️</div>
            <h3 className="text-base font-bold text-white mb-2">Regional Voice Assistant</h3>
            <p className="text-neutral-400 text-xs leading-relaxed">
              Ask questions naturally in Hindi or Kannada. Sarvam AI translates, synthesizes, and reads aloud irrigation recommendations.
            </p>
          </div>

          <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
            <div className="text-3xl mb-4">🌦️</div>
            <h3 className="text-base font-bold text-white mb-2">Meteorological Alerts</h3>
            <p className="text-neutral-400 text-xs leading-relaxed">
              Integrates with hyper-local weather feeds. Automatically pauses irrigation schedules when rainfall forecasts are high.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900/80 py-8 text-center text-xs text-neutral-500 z-10">
        <p>© 2026 AgriSmart Pro. All rights reserved. Final Year Internship Project.</p>
      </footer>

    </div>
  );
}
