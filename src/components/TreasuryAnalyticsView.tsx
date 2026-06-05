/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { TrendingDown, Calendar, BarChart3, AlertCircle, Clock } from "lucide-react";
import { PaymentRule, TreasuryToken, RuleStatus } from "../types";

interface TreasuryAnalyticsViewProps {
  tokens: TreasuryToken[];
  rules: PaymentRule[];
}

export function TreasuryAnalyticsView({ tokens, rules }: TreasuryAnalyticsViewProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<"24h" | "7d" | "30d">("7d");

  const totalUSD = tokens.reduce((acc, t) => acc + (t.balance * t.usdPrice), 0);

  // Compute live outflows from rules
  // Standard rule execution interval uses simulating seconds.
  // We can scale it to hours/days for treasury forecasting!
  let dailyOutflowUSD = 0;
  rules.forEach(rule => {
    if (rule.status === RuleStatus.ACTIVE) {
      const tokenObj = tokens.find(t => t.symbol === rule.token);
      const price = tokenObj ? tokenObj.usdPrice : 1.0;
      
      // Calculate how many times it executes in a day based on frequencySeconds
      // If frequencySeconds is 30, that's 2880 executions per day.
      // To prevent ridiculous scaling on mock 30s intervals, let's treat simulated frequency relative to real-time.
      // Let's assume daily frequency rate defined in the rule or scale frequencySeconds.
      if (rule.ruleType !== "SWEEP") {
        const executionsPerDay = (86400 / (rule.frequencySeconds || 300));
        dailyOutflowUSD += rule.amount * price * Math.min(executionsPerDay, 100); // capped for simulation safety
      }
    }
  });

  // Calculate Runway
  const runwayDays = dailyOutflowUSD > 0 ? (totalUSD / dailyOutflowUSD) : 999;
  const runwayLabel = runwayDays > 365 ? "365+ Days" : `${runwayDays.toFixed(1)} Days`;

  // Plot custom points for SVG Line Chart
  // Let's simulate a projection path based on the outflow
  const chartPoints = [];
  const totalSteps = 7;
  const decrement = dailyOutflowUSD * 0.15; // daily decay rate
  
  for (let i = 0; i < totalSteps; i++) {
    const val = Math.max(totalUSD - (decrement * i), 2000);
    chartPoints.push({
      day: `Day ${i + 1}`,
      value: val
    });
  }

  // Create SVG path coords
  const chartWidth = 500;
  const chartHeight = 120;
  const padding = 15;
  const minVal = Math.min(...chartPoints.map(p => p.value)) * 0.95;
  const maxVal = Math.max(...chartPoints.map(p => p.value)) * 1.05;
  const valRange = maxVal - minVal || 1;

  const pointsString = chartPoints.map((p, idx) => {
    const x = padding + (idx * (chartWidth - padding * 2) / (totalSteps - 1));
    const y = chartHeight - padding - ((p.value - minVal) * (chartHeight - padding * 2) / valRange);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-6 backdrop-blur-md text-[#c9d1d9] shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#28a0f0] uppercase tracking-widest font-semibold">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Treasury Analytics</span>
          </div>
          <h3 className="text-lg font-bold font-display text-white mt-1">
            Outflow Projection & Runway
          </h3>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0b0e14] border border-[#30363d] rounded-xl p-1">
          {(["24h", "7d", "30d"] as const).map(tf => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                selectedTimeframe === tf 
                  ? "bg-[#28a0f0] text-[#0b0e14]" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl border border-[#30363d] bg-[#0b0e14]/40">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            <span>Simulated Outflow Burn</span>
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1.5">
            ${dailyOutflowUSD.toLocaleString("en-US", { maximumFractionDigits: 2 })}/day
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Consolidated live smart rules
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#30363d] bg-[#0b0e14]/40">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#28a0f0]" />
            <span>Treasury Capital runway</span>
          </div>
          <div className={`text-xl font-bold font-mono mt-1.5 ${runwayDays < 10 ? "text-amber-400 animate-pulse" : "text-emerald-400"}`}>
            {runwayLabel}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Before standard vault depletion
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#30363d] bg-[#0b0e14]/40">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-purple-400" />
            <span>Active Spend Velocity</span>
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1.5">
            {(rules.filter(r => r.status === RuleStatus.ACTIVE).length)} / {rules.length} Rules
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Running smart disbursements
          </div>
        </div>
      </div>

      <div className="border border-[#30363d] rounded-xl bg-[#0b0e14]/50 p-4">
        <div className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5 justify-between">
          <span>Smart Treasury Forecast Curve ({selectedTimeframe})</span>
          <span className="text-[10px] text-slate-500 font-mono">Simulated Safe Run</span>
        </div>

        <div className="relative">
          {/* Custom interactive SVG Line Chart */}
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-32 overflow-visible">
            <defs>
              <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#28a0f0" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#28a0f0" stopOpacity="0" />
              </linearGradient>
            </defs>
            
            {/* Grid Lines */}
            <line x1="0" y1={padding} x2={chartWidth} y2={padding} stroke="#30363d" strokeDasharray="3,3" strokeWidth="0.5" />
            <line x1="0" y1={chartHeight/2} x2={chartWidth} y2={chartHeight/2} stroke="#30363d" strokeDasharray="3,3" strokeWidth="0.5" />
            <line x1="0" y1={chartHeight - padding} x2={chartWidth} y2={chartHeight - padding} stroke="#30363d" strokeDasharray="3,3" strokeWidth="0.5" />

            {/* Area Fill */}
            <path
              d={`M ${padding},${chartHeight - padding} L ${pointsString} L ${chartWidth - padding},${chartHeight - padding} Z`}
              fill="url(#chartGlow)"
            />

            {/* Main Line */}
            <polyline
              fill="none"
              stroke="#28a0f0"
              strokeWidth="2"
              points={pointsString}
            />

            {/* Point Glow Overlay */}
            {chartPoints.map((p, idx) => {
              const x = padding + (idx * (chartWidth - padding * 2) / (totalSteps - 1));
              const y = chartHeight - padding - ((p.value - minVal) * (chartHeight - padding * 2) / valRange);
              
              return (
                <g key={idx} className="group cursor-pointer">
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#28a0f0"
                    stroke="#161b22"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r="8"
                    fill="#28a0f0"
                    fillOpacity="0.1"
                    className="hover:scale-150 transition-all"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2">
          <span>Today (${totalUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })})</span>
          <span>End of Period (${Math.max(2000, totalUSD - (decrement * 6)).toLocaleString("en-US", { maximumFractionDigits: 0 })})</span>
        </div>
      </div>
    </div>
  );
}
