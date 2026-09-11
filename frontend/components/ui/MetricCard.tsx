"use client";

import React from "react";
import Card from "./Card";
import StatusBadge, { StatusLevel } from "./StatusBadge";

export interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  status?: StatusLevel | string;
  statusLabel?: string;
  subtitle?: string;
  targetRange?: string;
  progressPercent?: number;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  icon,
  status,
  statusLabel,
  subtitle,
  targetRange,
  progressPercent,
  className = "",
}) => {
  return (
    <Card variant="glass" padding="md" className={`flex flex-col justify-between ${className}`}>
      <div>
        <div className="flex justify-between items-start mb-2">
          <span className="text-[11px] font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="p-1.5 bg-neutral-900 border border-neutral-800 rounded-xl text-emerald-400">
              {icon}
            </span>
            {title}
          </span>
          {status && <StatusBadge status={status} label={statusLabel} size="sm" />}
        </div>

        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-3xl font-black text-white tracking-tight">
            {value}
          </span>
          {unit && <span className="text-sm font-bold text-neutral-400">{unit}</span>}
        </div>

        {/* Visual Progress Bar if progressPercent is provided */}
        {typeof progressPercent === "number" && (
          <div className="w-full bg-neutral-900 h-2 rounded-full mt-3 overflow-hidden border border-neutral-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPercent < 25 
                  ? "bg-rose-500" 
                  : (progressPercent > 80 ? "bg-amber-500" : "bg-emerald-500")
              }`}
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        )}

        {targetRange && (
          <p className="text-[10px] text-neutral-400 font-bold mt-2">
            Target: <span className="text-emerald-400 font-extrabold">{targetRange}</span>
          </p>
        )}
      </div>

      {subtitle && (
        <p className="text-[11px] text-neutral-450 font-bold mt-4 pt-2 border-t border-neutral-900/60 leading-relaxed">
          {subtitle}
        </p>
      )}
    </Card>
  );
};

export default MetricCard;
