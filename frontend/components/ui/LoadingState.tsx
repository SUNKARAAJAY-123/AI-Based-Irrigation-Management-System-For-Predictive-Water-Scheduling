"use client";

import React from "react";

export interface LoadingStateProps {
  message?: string;
  type?: "card" | "full" | "inline";
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading farm telemetry...",
  type = "card",
}) => {
  if (type === "full") {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center gap-3 p-6">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-neutral-400 font-extrabold uppercase tracking-widest animate-pulse">
          {message}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-neutral-950/80 border border-neutral-900 rounded-3xl space-y-4 animate-pulse">
      <div className="h-4 bg-neutral-900 rounded-full w-1/3" />
      <div className="h-10 bg-neutral-900 rounded-2xl w-2/3" />
      <div className="h-3 bg-neutral-900 rounded-full w-1/2" />
    </div>
  );
};

export default LoadingState;
