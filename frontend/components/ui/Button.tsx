"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "destructive" | "ai" | "voice";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  ...props
}) => {
  // Enforce min 44px height touch targets for mobile accessibility
  const baseStyles = "inline-flex items-center justify-center font-extrabold rounded-2xl transition-all duration-200 active:scale-98 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 min-h-[44px] cursor-pointer select-none text-center";
  
  const sizeStyles = {
    sm: "px-3.5 py-2 text-xs gap-1.5 min-h-[44px]",
    md: "px-5 py-3 text-sm gap-2 min-h-[48px]",
    lg: "px-6 py-4 text-base gap-2.5 min-h-[52px]",
  };

  const variantStyles = {
    primary: "bg-emerald-500 hover:bg-emerald-600 text-neutral-950 shadow-lg shadow-emerald-500/15 border border-emerald-400/30",
    secondary: "bg-neutral-900 hover:bg-neutral-800 text-neutral-100 border border-neutral-800",
    outline: "bg-transparent hover:bg-neutral-900/60 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60",
    destructive: "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30",
    ai: "bg-gradient-to-r from-emerald-500 to-teal-500 text-neutral-950 hover:from-emerald-400 hover:to-teal-400 shadow-xl shadow-emerald-500/20 border border-emerald-300/40",
    voice: "bg-emerald-500 hover:bg-emerald-600 text-neutral-950 rounded-full shadow-2xl hover:scale-105",
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          <span className="break-words-regional">{children}</span>
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};

export default Button;
