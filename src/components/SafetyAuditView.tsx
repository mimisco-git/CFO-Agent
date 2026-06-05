/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  ShieldAlert, 
  ToggleLeft, 
  ToggleRight, 
  Sliders, 
  AlertTriangle, 
  Check, 
  Settings,
  HelpCircle
} from "lucide-react";
import { SpendCap } from "../types";

interface SafetyAuditViewProps {
  isKillSwitchActive: boolean;
  onToggleKillSwitch: () => void;
  spendCaps: SpendCap[];
  onUpdateCap: (token: string, cap: number) => void;
  onEmergencyWithdrawAll: () => void;
}

export function SafetyAuditView({
  isKillSwitchActive,
  onToggleKillSwitch,
  spendCaps,
  onUpdateCap,
  onEmergencyWithdrawAll
}: SafetyAuditViewProps) {
  const [editingToken, setEditingToken] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  const startEdit = (token: string, currentVal: number) => {
    setEditingToken(token);
    setEditingValue(currentVal.toString());
  };

  const saveEdit = (token: string) => {
    const val = parseFloat(editingValue);
    if (!isNaN(val) && val >= 0) {
      onUpdateCap(token, val);
    }
    setEditingToken(null);
  };

  return (
    <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-6 backdrop-blur-md text-[#c9d1d9] shadow-lg space-y-6">
      {/* Circuit Breaker Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 
              className="text-sm font-bold font-display text-white flex items-center gap-1.5 cursor-help"
              title="The security manager of the CFO agent, providing circuit breakers and spending limit protection."
            >
              <ShieldAlert className="w-4 h-4 text-[#28a0f0]" />
              <span>Safety Security Modules</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Instant on-chain defense filters against malicious rule hacks or overflow.
            </p>
          </div>
          <button
            onClick={onToggleKillSwitch}
            className="focus:outline-none cursor-pointer"
            title={isKillSwitchActive ? "Deactivate on-chain Circuit Breaker to resume automated payrolls" : "Instantly engage emergency Circuit Breaker to lock treasury dispatches"}
          >
            {isKillSwitchActive ? (
              <span className="text-red-400 hover:text-red-500 transition-colors">
                <ToggleRight className="w-11 h-11" />
              </span>
            ) : (
              <span className="text-slate-600 hover:text-slate-500 transition-colors">
                <ToggleLeft className="w-11 h-11" />
              </span>
            )}
          </button>
        </div>

        {isKillSwitchActive ? (
          <div 
            className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-300 flex items-start gap-2.5 cursor-help animate-pulse"
            title="Emergency circuit breaker activated. All transaction dispatches are blocked for safety."
          >
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-extrabold text-red-400 uppercase mr-1">Circuit Breaker Engaged.</span> Rules execution is suspended. The autonomous keeper bot cannot trigger any registered rules on-chain.
            </div>
          </div>
        ) : (
          <div 
            className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300 flex items-start gap-2.5 cursor-help"
            title="Your smart vault is armed and evaluating limit guards in real-time."
          >
            <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-extrabold text-emerald-400 uppercase mr-1">System Armed.</span> Security watchdogs running 24/7. Ready to automate rules safely with real-time spend limit enforcement.
            </div>
          </div>
        )}
      </div>

      {/* Spend Caps / Daily Limit Section */}
      <div className="pt-2">
        <h4 
          className="text-xs font-bold font-display text-white flex items-center gap-1.5 mb-3 cursor-help"
          title="Security thresholds restricting the maximum amount that can be moved per 24 hours per token, defending against sudden capital drain."
        >
          <Sliders className="w-3.5 h-3.5 text-[#28a0f0]" />
          <span>On-Chain Daily Spend Limits</span>
        </h4>

        <div className="space-y-3.5">
          {spendCaps.map((cap) => {
            const isEditing = editingToken === cap.token;
            const progress = cap.cap > 0 ? (cap.spent / cap.cap) * 100 : 0;
            const isOverLimit = progress >= 100;

            return (
              <div 
                key={cap.token} 
                className="p-3 border border-[#30363d] rounded-xl bg-[#0b0e14]/40"
              >
                <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                  <span className="font-bold text-slate-300">{cap.token} Daily Cap</span>
                  
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="w-16 px-1.5 py-0.5 border border-[#30363d] bg-[#0b0e14] text-white rounded-md text-[11px] font-mono focus:outline-none focus:border-[#28a0f0]"
                        placeholder="Limit"
                      />
                      <button
                        onClick={() => saveEdit(cap.token)}
                        title="Save daily spending limit"
                        className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded-md cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(cap.token, cap.cap)}
                      title="Click to redefine the automated daily maximum allow ceiling limit"
                      className="text-[10px] text-slate-400 hover:text-slate-200 font-bold cursor-pointer"
                    >
                      Limit: <span className="font-mono underline text-slate-200">${cap.cap.toLocaleString()}</span>
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                <div 
                  className="h-1.5 bg-[#161b22]/80 rounded-full overflow-hidden mb-1.5 cursor-help"
                  title={`Limit utilization metric: ${progress.toFixed(1)}% of your allowed ${cap.cap} ${cap.token} spent today.`}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOverLimit ? "bg-red-500" : progress > 80 ? "bg-amber-500" : "bg-[#28a0f0]"
                    }`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>Spent: {cap.spent} {cap.token}</span>
                  <span>{cap.cap > 0 ? `${progress.toFixed(0)}% used` : "Unlimited"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Emergency Close Room */}
      <div className="pt-2 border-t border-[#30363d]">
        <h4 
          className="text-xs font-bold font-display text-white mb-2 flex items-center gap-1 cursor-help"
          title="Emergency exit backdoor mechanism enabling you to secure funds immediately."
        >
          <Settings className="w-3.5 h-3.5 text-slate-400" />
          <span>Critical Fail-Safe Execution</span>
        </h4>
        <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
          Forces an atomic evacuation of all treasury holdings straight to your secure owner wallet. This triggers the contract "emergencyWithdraw" module directly.
        </p>

        {confirmWithdraw ? (
          <div className="p-3 border border-red-500/30 bg-red-550/10 bg-red-500/5 rounded-xl space-y-2.5 animate-fadeIn">
            <div className="text-[11px] text-red-300 font-bold leading-normal">
              Are you absolute sure you want to evacuate ALL treasury funds immediately?
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmWithdraw(false)}
                className="flex-1 py-1.5 border border-[#30363d] text-slate-300 bg-transparent rounded-md text-[10px] font-bold hover:bg-[#161b22] cursor-pointer"
                title="Abort emergency fund evacuation"
              >
                No, cancel
              </button>
              <button
                onClick={() => {
                  onEmergencyWithdrawAll();
                  setConfirmWithdraw(false);
                }}
                className="flex-1 py-1.5 bg-red-600 text-white rounded-md text-[10px] font-bold hover:bg-red-700 cursor-pointer"
                title="Proceed and evacuate all vault assets back to owner address on-chain"
              >
                Yes, evac funds
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmWithdraw(true)}
            title="Immediately empty the entire smart vault back to your owner wallet for absolute protection."
            className="w-full py-2.5 border border-red-900/30 text-red-400 hover:text-red-300 hover:bg-red-500/10 bg-transparent rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Simulate Emergency Withdrawal</span>
          </button>
        )}
      </div>
    </div>
  );
}
