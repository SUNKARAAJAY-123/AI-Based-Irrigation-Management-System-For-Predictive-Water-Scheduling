"use client";

import React from "react";
import Card from "./Card";
import StatusBadge from "./StatusBadge";
import Button from "./Button";
import { Droplet, Brain, CheckCircle2, ArrowRight } from "lucide-react";

export interface RecommendationCardProps {
  decision: string;
  isIrrigationNeeded: boolean;
  soilMoisture: number | null;
  weatherCondition?: string;
  rainProbability?: number;
  reason: string;
  confidence?: string;
  nextAction?: string;
  onActionClick?: () => void;
  actionText?: string;
  className?: string;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  decision,
  isIrrigationNeeded,
  soilMoisture,
  weatherCondition,
  rainProbability,
  reason,
  confidence = "High",
  nextAction,
  onActionClick,
  actionText = "View Full AI Analysis",
  className = "",
}) => {
  const status = isIrrigationNeeded ? "ATTENTION" : "OPTIMAL";
  const statusLabel = isIrrigationNeeded ? "Irrigation Needed" : "Water Not Needed";

  return (
    <Card variant="accent" padding="lg" className={`relative border-2 ${isIrrigationNeeded ? "border-amber-500/40" : "border-emerald-500/40"} ${className}`}>
      {/* Glow background pill */}
      <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl pointer-events-none ${isIrrigationNeeded ? "bg-amber-500/10" : "bg-emerald-500/10"}`} />

      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-2xl ${isIrrigationNeeded ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
            <Droplet className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">
              AgriSmart AI Decision
            </span>
            <span className="text-[10px] font-bold text-neutral-500">
              Confidence: <b className="text-emerald-400">{confidence}</b>
            </span>
          </div>
        </div>
        <StatusBadge status={status} label={statusLabel} size="md" />
      </div>

      {/* Main Decision Title */}
      <h2 className="text-xl md:text-2xl font-black text-white leading-snug my-2 break-words-regional">
        {decision}
      </h2>

      {/* Moisture & Weather Context Row */}
      <div className="grid grid-cols-2 gap-3 my-4 p-3 bg-neutral-950/60 rounded-2xl border border-neutral-900">
        <div>
          <span className="text-[10px] font-bold text-neutral-500 uppercase block">Soil Moisture</span>
          <span className="text-base font-black text-emerald-400">
            {soilMoisture !== null ? `${soilMoisture}%` : "N/A"}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-neutral-500 uppercase block">Rain Forecast</span>
          <span className="text-base font-black text-sky-400">
            {typeof rainProbability === "number" ? `${Math.round(rainProbability * 100)}% Chance` : (weatherCondition || "Clear")}
          </span>
        </div>
      </div>

      {/* Why Explanation */}
      <div className="space-y-1.5 my-3">
        <h4 className="text-xs font-black text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
          <Brain className="w-4 h-4 text-emerald-400 shrink-0" />
          Why this recommendation?
        </h4>
        <p className="text-xs text-neutral-300 font-semibold leading-relaxed break-words-regional">
          {reason}
        </p>
      </div>

      {/* Next Action */}
      {nextAction && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl my-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-extrabold text-emerald-300 break-words-regional">
            Next: {nextAction}
          </span>
        </div>
      )}

      {/* Action button */}
      {onActionClick && (
        <div className="mt-4 pt-2">
          <Button
            variant="ai"
            size="md"
            className="w-full"
            onClick={onActionClick}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            {actionText}
          </Button>
        </div>
      )}
    </Card>
  );
};

export default RecommendationCard;
