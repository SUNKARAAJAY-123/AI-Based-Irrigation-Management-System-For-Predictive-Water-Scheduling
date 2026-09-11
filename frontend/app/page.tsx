"use client";

import React from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { Brain, Mic, CloudSun, ArrowRight, Sprout } from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#060a08] text-neutral-100 flex flex-col justify-between relative overflow-hidden">
      
      {/* Background glow graphics */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Navigation bar */}
      <nav className="max-w-7xl mx-auto w-full px-6 py-6 flex justify-between items-center border-b border-neutral-900 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sprout className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="font-black text-xl bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent tracking-tight">
            AgriSmart Pro
          </span>
        </div>

        <div className="flex gap-3 items-center">
          {user ? (
            <Link href="/dashboard">
              <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" size="md">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="md">
                  Register Farm
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero section */}
      <main className="max-w-7xl mx-auto w-full px-6 py-16 sm:py-24 z-10 flex-1 flex flex-col justify-center text-center gap-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <StatusBadge status="GOOD" label="🌾 AI Irrigation Management System" size="md" />
          
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            Smart Irrigation & <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 bg-clip-text text-transparent">
              Crop Water Optimization
            </span>
          </h1>

          <p className="text-neutral-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed font-semibold">
            Simple, farmer-first platform built for low technical-literacy users. Understand in 5 seconds: &quot;Is my crop okay? Does my field need water today?&quot;
          </p>
        </div>

        <div className="flex justify-center gap-4 mt-2">
          <Link href={user ? "/dashboard" : "/register"}>
            <Button variant="ai" size="lg" className="px-8 py-4 text-base" rightIcon={<ArrowRight className="w-5 h-5" />}>
              {user ? "Enter Farm Panel" : "Register Your Farm Now"}
            </Button>
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-12 text-left">
          <Card variant="glass" padding="lg" className="space-y-3">
            <Brain className="w-8 h-8 text-emerald-400" />
            <h3 className="text-base font-black text-white">5-Second Hero Decisions</h3>
            <p className="text-neutral-400 text-xs leading-relaxed font-semibold">
              Machine learning models predict exact water needs based on real-time soil moisture telemetry and weather advisories.
            </p>
          </Card>

          <Card variant="glass" padding="lg" className="space-y-3">
            <Mic className="w-8 h-8 text-emerald-400" />
            <h3 className="text-base font-black text-white">Regional Voice Assistant</h3>
            <p className="text-neutral-400 text-xs leading-relaxed font-semibold">
              Ask questions in your native regional language (Telugu, Hindi, Kannada, etc.) and hear synthesized audio advice.
            </p>
          </Card>

          <Card variant="glass" padding="lg" className="space-y-3">
            <CloudSun className="w-8 h-8 text-emerald-400" />
            <h3 className="text-base font-black text-white">Meteorological Advisories</h3>
            <p className="text-neutral-400 text-xs leading-relaxed font-semibold">
              Integrates local rain forecasts to automatically skip unneeded irrigation and save up to 40% water.
            </p>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-8 text-center text-xs text-neutral-500 font-semibold z-10">
        <p>© 2026 AgriSmart Pro. All rights reserved. Springboard Internship 2026 Project.</p>
      </footer>

    </div>
  );
}
