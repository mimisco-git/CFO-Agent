/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Coins, ShieldCheck, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { TreasuryToken } from "../types";

interface OracleFeedSimulatorProps {
  tokens: TreasuryToken[];
  onPriceChange: (symbol: string, newPrice: number) => void;
  onAddSystemLogMsg: (message: string, type: "info" | "success" | "warn" | "error") => void;
}

export function OracleFeedSimulator({ 
  tokens, 
  onPriceChange,
  onAddSystemLogMsg
}: OracleFeedSimulatorProps) {
  
  const handleScalePrice = (symbol: string, multiplier: number, actionName: string) => {
    const token = tokens.find(t => t.symbol === symbol);
    if (!token) return;
    const nextPrice = Math.max(0.01, parseFloat((token.usdPrice * multiplier).toFixed(2)));
    onPriceChange(symbol, nextPrice);
    
    const direction = multiplier > 1 ? "surged" : "dropped";
    const statusType = multiplier > 1 ? "success" : "warn";
    onAddSystemLogMsg(
      `[ORACLE FEEDS] Chainlink oracle dispatch: ${symbol} price estimated to have ${direction} to $${nextPrice} (${actionName})`,
      statusType
    );
  };

  return (
    <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-6 backdrop-blur-md text-[#c9d1d9] shadow-lg">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#28a0f0] uppercase tracking-widest font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Chainlink Oracle Hub</span>
          </div>
          <h3 className="text-lg font-bold font-display text-white mt-1">
            Oracle Price Feed Simulator
          </h3>
        </div>
        <span className="text-[10px] bg-[#28a0f0]/10 border border-[#28a0f0]/25 rounded-full px-2.5 py-0.5 text-[#28a0f0] font-mono font-bold animate-pulse">
          ● Decent Real-time
        </span>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed mb-5">
        Manipulate simulated off-chain token values to trigger on-chain automated sweep thresholds and track vault asset valuations in real-time.
      </p>

      <div className="space-y-4">
        {tokens.map(token => {
          if (token.symbol === "USDC" || token.symbol === "USDT") {
            // Stablecoins usually don't drift much, but let's give a small depeg option
            return (
              <div key={token.symbol} className="p-3 bg-[#0b0e14]/40 border border-[#30363d] rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-blue-500/10 text-[#28a0f0] border border-blue-500/20 flex items-center justify-center font-bold text-xs">{token.logo}</span>
                  <div>
                    <div className="text-xs font-bold text-white">{token.symbol} / USD</div>
                    <div className="text-[10px] font-mono text-slate-500">Fixed rate depeg test</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-extrabold text-slate-300">
                    ${token.usdPrice.toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleScalePrice(token.symbol, 0.96, "96% Depeg")}
                    title="Simulate peg shock"
                    className="p-1 px-1.5 text-[9px] font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-md transition-all cursor-pointer"
                  >
                    Depeg
                  </button>
                  <button
                    onClick={() => handleScalePrice(token.symbol, 1.0 / token.usdPrice, "Peg Restored")}
                    title="Restore stablecoin peg to exactly $1.00"
                    disabled={token.usdPrice === 1.0}
                    className="p-1 px-1.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-md disabled:opacity-40 transition-all cursor-pointer"
                  >
                    Restore
                  </button>
                </div>
              </div>
            );
          }

          // Volatile assets (ETH & ARB)
          return (
            <div key={token.symbol} className="p-3 bg-[#0b0e14]/40 border border-[#30363d] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-xs">{token.logo}</span>
                <div>
                  <div className="text-xs font-bold text-white">{token.symbol} / USD</div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Live Oracle Feed: <span className="text-emerald-400 font-extrabold">${token.usdPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Dump slider or quick action buttons */}
                <button
                  type="button"
                  onClick={() => handleScalePrice(token.symbol, 0.8, "20% Market Crash")}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg cursor-pointer transition-all"
                  title="Crash price of volatile cryptocurrency by 20%"
                >
                  <ArrowDownRight className="w-3 h-3" />
                  <span>Dump 20%</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleScalePrice(token.symbol, 1.25, "25% Market Rally")}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg cursor-pointer transition-all"
                  title="Boost price of volatile cryptocurrency by 25%"
                >
                  <ArrowUpRight className="w-3 h-3" />
                  <span>Pump 25%</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
