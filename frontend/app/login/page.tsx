"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, Sprout } from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ErrorState from "@/components/ui/ErrorState";
import StatusBadge from "@/components/ui/StatusBadge";

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
    <div className="min-h-screen bg-[#060a08] flex flex-col justify-center items-center px-4 relative overflow-hidden">
      
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <Sprout className="w-7 h-7 stroke-[2.5]" />
          </div>
          <StatusBadge status="GOOD" label="🌾 AgriSmart Pro Sign In" size="sm" />
          <h2 className="text-2xl font-black text-white">Welcome Back, Farmer</h2>
          <p className="text-xs text-neutral-400 font-semibold max-w-xs mx-auto">
            Access your field recommendations, weather forecast, and smart valve controls.
          </p>
        </div>

        {error && <ErrorState message={error} onRetry={() => setError(null)} />}

        <Card variant="glass" padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
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
                className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
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
                className="w-full bg-neutral-950 border border-neutral-850 text-xs font-bold text-white rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 min-h-[44px]"
              />
            </div>

            <Button
              type="submit"
              isLoading={isSubmitting}
              variant="primary"
              size="md"
              className="w-full"
              leftIcon={<LogIn className="w-4 h-4" />}
            >
              Sign In to Farm Panel
            </Button>
          </form>

          <div className="text-center text-xs text-neutral-400 font-semibold border-t border-neutral-900 pt-4 mt-4">
            New to AgriSmart?{" "}
            <Link href="/register" className="text-emerald-400 font-bold hover:underline">
              Create Farm Account
            </Link>
          </div>
        </Card>
      </div>

    </div>
  );
}
