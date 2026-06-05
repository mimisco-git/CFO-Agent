/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Zap, ShieldCheck, Gauge, HelpCircle, ArrowUpRight } from "lucide-react";

interface GasEfficiencyMeterProps {
  txCount: number;
  baseGasPrice: number;
  setBaseGasPrice: (newGas: number) => void;
}

export function GasEfficiencyMeter({ txCount, baseGasPrice, setBaseGasPrice }: GasEfficiencyMeterProps) {

  // Simulate metrics
  const gasSpentPerTxL1 = 120000; // standard gas cost for smart rule evaluate on Ethereum
  const gasSpentPerTxL2 = 8500;   // batch optimized evaluation on Arbitrum Sepolia

  const totalSimulatedTx = Math.max(1, txCount + 8); // seed some baseline transactions
  
  // Computations
  const l1CostUSD = totalSimulatedTx * (gasSpentPerTxL1 * 100 * 1e-9 * 3500); // 100 Gwei L1 base, $3500 ETH
  const l2CostUSD = totalSimulatedTx * (gasSpentPerTxL2 * baseGasPrice * 1e-9 * 3500);
  
  const savedUSD = l1CostUSD - l2CostUSD;
  const savingsPct = ((l1CostUSD - l2CostUSD) / l1CostUSD) * 100;

  return (
    <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-6 backdrop-blur-md text-[#c9d1d9] shadow-lg">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#28a0f0] uppercase tracking-widest font-semibold">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Resource Monitor</span>
          </div>
          <h3 className="text-lg font-bold font-display text-white mt-1">
            L2 Gas Efficiency Meter
          </h3>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-semibold">
          <Gauge className="w-3 h-3" />
          <span>Active Feed</span>
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed mb-5">
        Batch-processing automation limits through our smart wallet saves tremendous processing fees. Adjust gas assumptions below to test scaling costs.
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="p-3 bg-[#0b0e14]/40 border border-[#30363d] rounded-xl">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            Aggregated Gas Saved
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {(totalSimulatedTx * (gasSpentPerTxL1 - gasSpentPerTxL2)).toLocaleString()} Gas
          </div>
        </div>

        <div className="p-3 bg-[#0b0e14]/40 border border-[#30363d] rounded-xl">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            USD Fee Reduction
          </div>
          <div className="text-xl font-bold font-mono text-[#28a0f0] mt-1">
            ${savedUSD.toFixed(2)} ({savingsPct.toFixed(1)}%)
          </div>
        </div>
      </div>

      {/* Progress visual */}
      <div className="space-y-2 mb-5">
        <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400">
          <span>Fee Compression Performance Index</span>
          <span className="text-emerald-400">Ultra Highly Efficient</span>
        </div>
        
        <div className="h-2 bg-[#0b0e14] border border-[#30363d] rounded-full overflow-hidden p-0.5">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-[#28a0f0] to-emerald-400 transition-all duration-500"
            style={{ width: `${Math.min(100, savingsPct)}%` }}
          />
        </div>
        
        <div className="flex justify-between text-[9px] text-slate-500 font-mono">
          <span>Standard L1 Exec</span>
          <span>CFO Contract Batch Limit ({savingsPct.toFixed(0)}% Savings)</span>
        </div>
      </div>

      {/* Slider feed */}
      <div className="p-4 bg-[#0b0e14]/60 border border-[#30363d] rounded-xl space-y-3">
        <div className="flex justify-between items-center text-xs">
          <label htmlFor="gas-range" className="font-bold text-slate-300">
            Simulated L2 Gas Base-Fee
          </label>
          <span className="font-mono text-[#28a0f0] font-extrabold">{baseGasPrice} Gwei</span>
        </div>

        <input 
          id="gas-range"
          type="range"
          min="5"
          max="120"
          value={baseGasPrice}
          onChange={(e) => setBaseGasPrice(parseInt(e.target.value))}
          className="w-full accent-[#28a0f0] bg-slate-800 rounded-lg appearance-none h-1.5 cursor-pointer"
        />

        <div className="flex items-center gap-2 text-[10px] text-slate-400 leading-normal border-t border-slate-800/80 pt-2.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#28a0f0] flex-shrink-0" />
          <span>Lower Gwei fee feeds automatically lower the autonomous Keeper Gas subsidy costs.</span>
        </div>
      </div>
    </div>
  );
}
