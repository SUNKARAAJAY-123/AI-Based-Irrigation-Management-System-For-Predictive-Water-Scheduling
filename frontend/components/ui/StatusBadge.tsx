"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, AlertOctagon, Info } from "lucide-react";

export type StatusLevel = "OPTIMAL" | "GOOD" | "WARNING" | "ATTENTION" | "CRITICAL" | "INFO";

export interface StatusBadgeProps {
  status: StatusLevel | string;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = "md",
  className = "",
}) => {
  const normStatus = (status || "").toUpperCase();
  
  const isGood = normStatus === "OPTIMAL" || normStatus === "GOOD" || normStatus === "HEALTHY" || normStatus === "NORMAL";
  const isWarning = normStatus === "WARNING" || normStatus === "ATTENTION" || normStatus === "DRY" || normStatus === "MODERATE";
  const isCritical = normStatus === "CRITICAL" || normStatus === "DANGER" || normStatus === "URGENT" || normStatus === "VERY_DRY";
  
  const displayLabel = label || status;

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] gap-1 rounded-lg font-bold",
    md: "px-2.5 py-1 text-xs gap-1.5 rounded-xl font-black",
    lg: "px-3 py-1.5 text-sm gap-2 rounded-xl font-black",
  };

  if (isGood) {
    return (
      <span className={`inline-flex items-center bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 ${sizeStyles[size]} ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" aria-hidden="true" />
        <span className="uppercase tracking-wider">{displayLabel}</span>
      </span>
    );
  }

  if (isWarning) {
    return (
      <span className={`inline-flex items-center bg-amber-500/10 border border-amber-500/25 text-amber-400 ${sizeStyles[size]} ${className}`}>
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" aria-hidden="true" />
        <span className="uppercase tracking-wider">{displayLabel}</span>
      </span>
    );
  }

  if (isCritical) {
    return (
      <span className={`inline-flex items-center bg-rose-500/10 border border-rose-500/25 text-rose-400 ${sizeStyles[size]} ${className}`}>
        <AlertOctagon className="w-3.5 h-3.5 shrink-0 stroke-[2.5] animate-pulse" aria-hidden="true" />
        <span className="uppercase tracking-wider">{displayLabel}</span>
      </span>
    );
  }

  // Default / Info
  return (
    <span className={`inline-flex items-center bg-sky-500/10 border border-sky-500/25 text-sky-400 ${sizeStyles[size]} ${className}`}>
      <Info className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" aria-hidden="true" />
      <span className="uppercase tracking-wider">{displayLabel}</span>
    </span>
  );
};

export default StatusBadge;
