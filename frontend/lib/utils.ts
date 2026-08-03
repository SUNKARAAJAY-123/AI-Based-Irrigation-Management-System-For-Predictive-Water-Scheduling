import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to merge Tailwind CSS classes safely without duplication.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats water volume values nicely.
 */
export function formatLiters(liters: number): string {
  if (liters >= 1000) {
    return `${(liters / 1000).toFixed(2)} kL`;
  }
  return `${liters.toFixed(1)} L`;
}

/**
 * Formats dates consistently across the app.
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
