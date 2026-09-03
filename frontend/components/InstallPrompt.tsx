"use client";

import React, { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser default mini-infobar
      e.preventDefault();
      // Store event for later trigger
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Check if user has already declined recently
      const hasDeclined = localStorage.getItem("pwa_install_declined");
      if (!hasDeclined) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show native prompt
    deferredPrompt.prompt();

    // Wait for response
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA installation outcome: ${outcome}`);

    // Clean up
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    // Save to localStorage to avoid annoying the user
    localStorage.setItem("pwa_install_declined", "true");
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:bottom-6 md:right-6 md:left-auto md:w-96 bg-neutral-900 border border-neutral-800 rounded-3xl p-4 shadow-2xl z-50 flex flex-col gap-3 animate-slide-up">
      <div className="flex justify-between items-start">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Install Kisan AI</h4>
            <p className="text-[10px] text-neutral-400 font-semibold leading-relaxed mt-1">
              Get faster access to your farm information and irrigation alerts directly from your home screen.
            </p>
          </div>
        </div>
        <button 
          onClick={handleDismiss}
          className="p-1 hover:bg-neutral-850 rounded-lg text-neutral-500 hover:text-white transition-colors"
          aria-label="Dismiss prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={handleDismiss}
          className="flex-1 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 font-black uppercase tracking-wider py-2.5 rounded-xl text-[10px] transition-colors cursor-pointer text-center"
        >
          Not now
        </button>
        <button
          onClick={handleInstallClick}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-black uppercase tracking-wider py-2.5 rounded-xl text-[10px] transition-all cursor-pointer text-center shadow-lg shadow-emerald-500/10"
        >
          Install
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
