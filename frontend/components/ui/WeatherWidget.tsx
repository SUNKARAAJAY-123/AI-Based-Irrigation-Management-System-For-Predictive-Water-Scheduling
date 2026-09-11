"use client";

import React from "react";
import Card from "./Card";
import { CloudSun, Droplet, Wind, Thermometer, CloudRain } from "lucide-react";

export interface ForecastDay {
  day: string;
  temp: number;
  conditions: string;
  rainProb: number;
}

export interface WeatherWidgetProps {
  temp: number;
  humidity: number;
  conditions: string;
  rainProbability: number;
  windSpeed?: number;
  forecast?: ForecastDay[];
  farmerAdvice?: string;
  className?: string;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  temp,
  humidity,
  conditions,
  rainProbability,
  windSpeed = 12,
  forecast,
  farmerAdvice,
  className = "",
}) => {
  const rainPercent = Math.min(100, Math.max(0, Math.round(rainProbability * 100)));

  return (
    <Card variant="glass" padding="lg" className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
        <span className="text-xs font-black text-neutral-400 uppercase tracking-wider flex items-center gap-2">
          <CloudSun className="w-4.5 h-4.5 text-amber-400" />
          Farm Weather Today
        </span>
        <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
          {conditions}
        </span>
      </div>

      {/* Primary Weather Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-3 bg-neutral-900/60 rounded-2xl border border-neutral-900 flex flex-col items-center">
          <Thermometer className="w-4 h-4 text-amber-400 mb-1" />
          <span className="text-xl font-black text-white">{temp}°C</span>
          <span className="text-[10px] text-neutral-500 font-bold uppercase">Temperature</span>
        </div>

        <div className="p-3 bg-neutral-900/60 rounded-2xl border border-neutral-900 flex flex-col items-center">
          <CloudRain className="w-4 h-4 text-sky-400 mb-1" />
          <span className="text-xl font-black text-sky-300">{rainPercent}%</span>
          <span className="text-[10px] text-neutral-500 font-bold uppercase">Rain Chance</span>
        </div>

        <div className="p-3 bg-neutral-900/60 rounded-2xl border border-neutral-900 flex flex-col items-center">
          <Droplet className="w-4 h-4 text-teal-400 mb-1" />
          <span className="text-xl font-black text-teal-300">{humidity}%</span>
          <span className="text-[10px] text-neutral-500 font-bold uppercase">Humidity</span>
        </div>

        <div className="p-3 bg-neutral-900/60 rounded-2xl border border-neutral-900 flex flex-col items-center">
          <Wind className="w-4 h-4 text-neutral-400 mb-1" />
          <span className="text-xl font-black text-neutral-200">{windSpeed} km/h</span>
          <span className="text-[10px] text-neutral-500 font-bold uppercase">Wind</span>
        </div>
      </div>

      {/* Farmer Irrigation Advice Banner */}
      {farmerAdvice && (
        <div className="p-3.5 bg-sky-500/10 border border-sky-500/25 rounded-2xl flex items-start gap-2.5">
          <CloudRain className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <p className="text-xs text-sky-200 font-bold leading-relaxed break-words-regional">
            {farmerAdvice}
          </p>
        </div>
      )}

      {/* 3-Day Forecast Row */}
      {forecast && forecast.length > 0 && (
        <div className="pt-2 border-t border-neutral-900">
          <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-2">
            Next 3 Days Forecast
          </span>
          <div className="grid grid-cols-3 gap-2">
            {forecast.slice(0, 3).map((day, idx) => (
              <div key={idx} className="p-2.5 bg-neutral-900/40 border border-neutral-900 rounded-xl text-center">
                <span className="text-[10px] font-black text-neutral-400 block uppercase">{day.day}</span>
                <span className="text-sm font-black text-white block my-0.5">{day.temp}°C</span>
                <span className="text-[9px] font-bold text-sky-400 block">☔ {Math.round(day.rainProb * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default WeatherWidget;
