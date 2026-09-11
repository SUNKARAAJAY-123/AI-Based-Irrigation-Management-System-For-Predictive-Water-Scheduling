"use client";

import React from "react";
import Button from "./Button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Unable to load information",
  message,
  onRetry,
  className = "",
}) => {
  return (
    <div className={`p-6 bg-rose-500/10 border border-rose-500/30 rounded-3xl text-center flex flex-col items-center justify-center my-4 ${className}`}>
      <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl mb-3">
        <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
      </div>
      <h3 className="text-sm font-black text-rose-200 mb-1 break-words-regional">
        {title}
      </h3>
      <p className="text-xs text-rose-300 font-medium max-w-md leading-relaxed mb-4 break-words-regional">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
