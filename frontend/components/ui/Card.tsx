"use client";

import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "heavy" | "accent";
  padding?: "none" | "sm" | "md" | "lg";
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "default",
  padding = "md",
  className = "",
  ...props
}) => {
  const baseStyles = "rounded-3xl border transition-all duration-200 overflow-hidden";
  
  const paddingStyles = {
    none: "p-0",
    sm: "p-4",
    md: "p-5",
    lg: "p-6",
  };

  const variantStyles = {
    default: "bg-neutral-950/80 border-neutral-900 shadow-md",
    glass: "glass-panel shadow-lg",
    heavy: "glass-panel-heavy shadow-xl",
    accent: "bg-gradient-to-br from-emerald-950/40 via-neutral-950 to-neutral-950 border-emerald-900/40 shadow-xl",
  };

  return (
    <div
      className={`${baseStyles} ${paddingStyles[padding]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <div className={`flex justify-between items-center pb-3 mb-4 border-b border-neutral-900/80 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <h3 className={`text-sm font-black text-neutral-300 uppercase tracking-wider flex items-center gap-2 ${className}`} {...props}>
    {children}
  </h3>
);

export default Card;
