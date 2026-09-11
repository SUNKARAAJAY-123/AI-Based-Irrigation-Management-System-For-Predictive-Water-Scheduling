"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  backHref?: string;
  action?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  backHref,
  action,
  className = "",
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-900 mb-6 ${className}`}>
      <div className="flex items-start gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-2xl text-neutral-400 hover:text-white transition-colors shrink-0 touch-target"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
        )}
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 break-words-regional">
            {icon && <span className="text-emerald-400">{icon}</span>}
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-neutral-400 font-bold mt-1 break-words-regional">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export default PageHeader;
