"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading) {
      if (!user) {
        router.push("/login");
      } else {
        const roleLower = user.role.toLowerCase();
        if (roleLower !== "admin" && roleLower !== "super_admin") {
          router.push("/dashboard");
        }
      }
    }
  }, [user, loading, mounted, router]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Verifying Privileges...</p>
        </div>
      </div>
    );
  }

  if (!user || (user.role.toLowerCase() !== "admin" && user.role.toLowerCase() !== "super_admin")) {
    return null; // Prevents content flashing during redirect
  }

  return <>{children}</>;
}
