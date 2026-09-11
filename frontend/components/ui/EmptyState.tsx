"use client";

import React from "react";
import Button from "./Button";

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  className = "",
}) => {
  return (
    <div className={`p-8 bg-neutral-950/60 border border-dashed border-neutral-850 rounded-3xl text-center flex flex-col items-center justify-center my-4 ${className}`}>
      <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-black text-white mb-1.5 break-words-regional">
        {title}
      </h3>
      <p className="text-xs text-neutral-400 font-semibold max-w-sm leading-relaxed mb-5 break-words-regional">
        {description}
      </p>
      {actionText && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
