"use client";

import React from "react";
import Card from "./Card";
import StatusBadge, { StatusLevel } from "./StatusBadge";
import Button from "./Button";
import { ChevronRight } from "lucide-react";

export interface AlertCardProps {
  id?: string;
  title: string;
  message: string;
  severity: "CRITICAL" | "WARNING" | "INFO" | string;
  time?: string;
  fieldName?: string;
  onAction?: () => void;
  actionText?: string;
  className?: string;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  title,
  message,
  severity,
  time,
  fieldName,
  onAction,
  actionText = "View Recommendation",
  className = "",
}) => {
  const normSeverity = severity.toUpperCase() as StatusLevel;

  return (
    <Card variant="glass" padding="md" className={`border-l-4 ${
      normSeverity === "CRITICAL" ? "border-l-rose-500" : (normSeverity === "WARNING" ? "border-l-amber-500" : "border-l-sky-500")
    } ${className}`}>
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="flex items-center gap-2">
          <StatusBadge status={normSeverity} size="sm" />
          {fieldName && (
            <span className="text-[10px] font-bold bg-neutral-900 border border-neutral-800 text-neutral-400 px-2 py-0.5 rounded-md">
              {fieldName}
            </span>
          )}
        </div>
        {time && (
          <span className="text-[10px] text-neutral-500 font-bold shrink-0">
            {time}
          </span>
        )}
      </div>

      <h4 className="text-sm font-black text-white mt-1 break-words-regional">
        {title}
      </h4>

      <p className="text-xs text-neutral-300 font-semibold leading-relaxed mt-1.5 break-words-regional">
        {message}
      </p>

      {onAction && (
        <div className="mt-3 pt-2 border-t border-neutral-900/60 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onAction}
            rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
          >
            {actionText}
          </Button>
        </div>
      )}
    </Card>
  );
};

export default AlertCard;
