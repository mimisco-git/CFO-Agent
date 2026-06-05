/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  Clock, 
  DollarSign, 
  ChevronRight, 
  User, 
  X,
  Shuffle,
  ShieldCheck,
  Award,
  BookOpen,
  Sparkles,
  AlertTriangle,
  Activity,
  Zap,
  Check
} from "lucide-react";
import { PaymentRule, RuleType, RuleStatus, SpendCap, TreasuryToken } from "../types";

interface RuleRegistryViewProps {
  rules: PaymentRule[];
  onAddRule: (rule: Omit<PaymentRule, "id" | "createdTime">) => void;
  onToggleStatus: (id: string) => void;
  onDeleteRule: (id: string) => void;
  onExecuteRuleNow: (id: string) => void;
  spendCaps: SpendCap[];
  tokens: TreasuryToken[];
  baseGasPrice: number;
}

export function RuleRegistryView({
  rules,
  onAddRule,
  onToggleStatus,
  onDeleteRule,
  onExecuteRuleNow,
  spendCaps,
  tokens,
  baseGasPrice
}: RuleRegistryViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ruleType, setRuleType] = useState<RuleType>(RuleType.SINGLE_TRANSFER);
  const [recipient, setRecipient] = useState("");
  const [destinationName, setDestinationName] = useState("");
  const [token, setToken] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("Daily");

  // State for simulated live report
  interface LoggedSimulation {
    ruleName: string;
    token: string;
    ruleType: RuleType;
    transferAmount: number;
    estimatedGasLimit: number;
    estimatedFeeEth: number;
    estimatedFeeUsd: number;
    currentBalance: number;
    newBalance: number;
    isSolvent: boolean;
    hasCap: boolean;
    totalCap: number;
    currentSpent: number;
    remainingCap: number;
    newSpent: number;
    newRemainingCap: number;
    isCapExceeded: boolean;
    isSweep: boolean;
    sweepThreshold?: number;
    sweepExcess?: number;
  }
  const [simulationResult, setSimulationResult] = useState<LoggedSimulation | null>(null);

  const handleSimulate = (e: React.MouseEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!name || isNaN(parsedAmount) || parsedAmount <= 0 || !recipient) {
      alert("Please fill in Rule Identifier Name, Amount, and payee wallet address to simulate impact!");
      return;
    }

    // Get current token
    const currentTokenObj = tokens.find(t => t.symbol === token) || {
      balance: 0,
      usdPrice: token === "ETH" ? 3500 : 1.0
    };

    let transferAmount = parsedAmount;
    let isSweep = false;
    let sweepExcess = 0;

    if (ruleType === RuleType.SWEEP) {
      isSweep = true;
      if (currentTokenObj.balance > parsedAmount) {
        sweepExcess = currentTokenObj.balance - parsedAmount;
        transferAmount = sweepExcess;
      } else {
        sweepExcess = 0;
        transferAmount = 0;
      }
    }

    // Estimated Gas limit based on RuleType
    let estimatedGasLimit = 15000;
    if (ruleType === RuleType.PAYROLL) estimatedGasLimit = 48000;
    else if (ruleType === RuleType.SWEEP) estimatedGasLimit = 62000;
    else if (ruleType === RuleType.YIELD_REBALANCE) estimatedGasLimit = 75000;

    // Fees in ETH assuming $3500 ETH price
    const estimatedFeeEth = estimatedGasLimit * baseGasPrice * 1e-9;
    const ethPrice = 3500;
    const estimatedFeeUsd = estimatedFeeEth * ethPrice;

    // Get cap
    const currentCapObj = spendCaps.find(c => c.token === token);
    const hasCap = !!(currentCapObj && currentCapObj.enabled);
    const totalCap = currentCapObj?.cap || 0;
    const currentSpent = currentCapObj?.spent || 0;
    const remainingCap = hasCap ? Math.max(0, totalCap - currentSpent) : 0;
    const newSpent = currentSpent + transferAmount;
    const newRemainingCap = hasCap ? totalCap - newSpent : 0;
    const isCapExceeded = hasCap && (newSpent > totalCap);

    // Solvency check (only applies if transfer amount > 0)
    const newBalance = currentTokenObj.balance - transferAmount;
    const isSolvent = newBalance >= 0;

    setSimulationResult({
      ruleName: name,
      token,
      ruleType,
      transferAmount,
      estimatedGasLimit,
      estimatedFeeEth,
      estimatedFeeUsd,
      currentBalance: currentTokenObj.balance,
      newBalance,
      isSolvent,
      hasCap,
      totalCap,
      currentSpent,
      remainingCap,
      newSpent,
      newRemainingCap,
      isCapExceeded,
      isSweep,
      sweepThreshold: parsedAmount,
      sweepExcess
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!name || isNaN(parsedAmount) || parsedAmount <= 0 || !recipient) {
      alert("Please fill in all fields with valid values!");
      return;
    }

    let freqSeconds = 86400; // Daily default
    if (frequency === "Hourly") freqSeconds = 3600;
    else if (frequency === "Weekly") freqSeconds = 604800;
    else if (frequency === "Once") freqSeconds = 0;
    // For fast simulation demos: users can do a quick interval
    else if (frequency === "Short (30s)") freqSeconds = 30;
    else if (frequency === "Short (60s)") freqSeconds = 60;

    onAddRule({
      name,
      description: description || `Pay ${parsedAmount} ${token} on a ${frequency} schedule`,
      ruleType,
      status: RuleStatus.ACTIVE,
      recipient,
      token,
      amount: parsedAmount,
      frequency,
      frequencySeconds: freqSeconds,
      destinationName: destinationName || "Unknown Partner"
    });

    // Reset form
    setName("");
    setDescription("");
    setRecipient("");
    setDestinationName("");
    setAmount("");
    setFrequency("Daily");
    setRuleType(RuleType.SINGLE_TRANSFER);
    setShowAddForm(false);
    setSimulationResult(null);
  };

  const getRuleTypeBadge = (type: RuleType) => {
    switch (type) {
      case RuleType.SINGLE_TRANSFER:
        return "bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono";
      case RuleType.PAYROLL:
        return "bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono";
      case RuleType.SWEEP:
        return "bg-blue-500/10 text-[#28a0f0] border border-blue-500/20 font-mono";
      case RuleType.YIELD_REBALANCE:
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono";
    }
  };

  const getRuleTypeLabel = (type: RuleType) => {
    switch (type) {
      case RuleType.SINGLE_TRANSFER: return "One-time Send";
      case RuleType.PAYROLL: return "Regular Payroll";
      case RuleType.SWEEP: return "Treasury Sweep";
      case RuleType.YIELD_REBALANCE: return "Yield Compound";
    }
  };

  return (
    <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-6 backdrop-blur-md text-[#c9d1d9] shadow-lg">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h2 
            className="text-xl font-bold font-display text-white flex items-center gap-2 cursor-help"
            title="Registry of programmable rules. These enforce transfer limits, target addresses, and schedule frequencies on-chain."
          >
            <BookOpen className="w-5 h-5 text-slate-400" />
            <span>Treasury Rule Registry</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            On-chain smart contracts evaluate security rule-sets and automate payments.
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setSimulationResult(null);
          }}
          title="Open or close the configuration panel to deploy a custom spending restriction rule."
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#28a0f0] hover:bg-[#28a0f0]/90 text-[#0b0e14] text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          {showAddForm ? <X className="w-3.5 h-3.5 stroke-[2.5]" /> : <Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
          <span>{showAddForm ? "Close Form" : "Custom Rule"}</span>
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 p-5 border border-[#30363d] bg-[#0b0e14]/50 rounded-xl">
          <h3 className="text-sm font-bold font-display text-white mb-4 flex items-center gap-1.5">
            <Shuffle className="w-4 h-4 text-[#28a0f0]" />
            <span>Configure Rule Specification</span>
          </h3>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Rule Identifier Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Marketing Team Payroll"
                value={name}
                onChange={(e) => { setName(e.target.value); setSimulationResult(null); }}
                className="w-full px-3.5 py-2 border border-[#30363d] bg-[#0b0e14] text-white rounded-lg text-xs focus:outline-none focus:border-[#28a0f0] placeholder-slate-600"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Destination Entity Wallet Label
              </label>
              <input
                type="text"
                placeholder="e.g., Alex (designer), Yield Contract"
                value={destinationName}
                onChange={(e) => { setDestinationName(e.target.value); setSimulationResult(null); }}
                className="w-full px-3.5 py-2 border border-[#30363d] bg-[#0b0e14] text-white rounded-lg text-xs focus:outline-none focus:border-[#28a0f0] placeholder-slate-600"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Target Objective Rule Decription
              </label>
              <input
                type="text"
                placeholder="e.g., Send 150 USDC to marketing wallet every week"
                value={description}
                onChange={(e) => { setDescription(e.target.value); setSimulationResult(null); }}
                 className="w-full px-3.5 py-2 border border-[#30363d] bg-[#0b0e14] text-white rounded-lg text-xs focus:outline-none focus:border-[#28a0f0] placeholder-slate-600"
              />
            </div>

             <div>
              <label 
                className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 cursor-help"
                title="Categorize your rule: Single Payment, Periodic Payroll, Balance Excess Sweep (withdraws surplus above set limit), or Yield compounding."
              >
                Rule Strategy Category
              </label>
              <select
                value={ruleType}
                onChange={(e) => { setRuleType(e.target.value as RuleType); setSimulationResult(null); }}
                title="Classify this ruleset to apply standard limit-safeguards and transaction models."
                className="w-full px-3.5 py-2 border border-[#30363d] bg-[#0b0e14] text-white rounded-lg text-xs focus:outline-none focus:border-[#28a0f0]"
              >
                <option value={RuleType.SINGLE_TRANSFER}>One-time Payment</option>
                <option value={RuleType.PAYROLL}>Payroll Dispatch (Recurring)</option>
                <option value={RuleType.SWEEP}>Treasury Balance Excess Sweep</option>
                <option value={RuleType.YIELD_REBALANCE}>Yield Protocol Allocations</option>
              </select>
            </div>

            <div>
              <label 
                className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 cursor-help"
                title="The specific on-chain token key utilized inside the treasury ruleset."
              >
                Target Token Asset
              </label>
              <select
                value={token}
                onChange={(e) => { setToken(e.target.value); setSimulationResult(null); }}
                title="Choose from local verified ERC-20 token reserves."
                className="w-full px-3.5 py-2 border border-[#30363d] bg-[#0b0e14] text-white rounded-lg text-xs focus:outline-none focus:border-[#28a0f0]"
              >
                <option value="USDC">USDC (Stablecoin)</option>
                <option value="ETH">ETH (Ethereum Native)</option>
                <option value="USDT">USDT (Tether)</option>
                <option value="ARB">ARB (Arbitrum Utility Token)</option>
              </select>
            </div>

            <div>
              <label 
                className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 cursor-help"
                title="For Sweeps, any amount in the vault *exceeding* this threshold is swept. For others, this is the exact payment value."
              >
                {ruleType === RuleType.SWEEP ? "Excess Balance Cap Limit (Threshold)" : "Execution Payment Amount"}
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g., 500"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setSimulationResult(null); }}
                title="Define the numeric threshold or amount for programmed on-chain verification."
                className="w-full px-3.5 py-2 border border-[#30363d] bg-[#0b0e14] text-white rounded-lg text-xs focus:outline-none focus:border-[#28a0f0] placeholder-slate-600"
              />
            </div>

            <div>
              <label 
                className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 cursor-help"
                title="Select the automatic interval for execution checks (use short seconds for rapid simulation feedback)."
              >
                Check-cycle Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => { setFrequency(e.target.value); setSimulationResult(null); }}
                title="Determine how often the autonomous Off-Chain Keeper evaluates this condition."
                className="w-full px-3.5 py-2 border border-[#30363d] bg-[#0b0e14] text-white rounded-lg text-xs focus:outline-none focus:border-[#28a0f0]"
              >
                <option value="Once">One-time (Once)</option>
                <option value="Hourly">Hourly</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Short (30s)">Simulate Quick Interval (30 Seconds)</option>
                <option value="Short (60s)">Simulate Quick Interval (60 Seconds)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label 
                className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 cursor-help"
                title="The target EVM public key address that receives the funds."
              >
                Payee ERC20 Wallet Address
              </label>
              <input
                type="text"
                required
                placeholder="0x93F6... d12A (valid Arbitrum / EVM address)"
                value={recipient}
                onChange={(e) => { setRecipient(e.target.value); setSimulationResult(null); }}
                title="Make sure this EVM address is absolute and correct. Programmed rules cannot reverse on-chain events."
                className="w-full px-3.5 py-2 border border-[#30363d] bg-[#0b0e14] text-white rounded-lg text-xs font-mono focus:outline-none focus:border-[#28a0f0] placeholder-slate-600"
              />
            </div>

            <div className="md:col-span-2 flex justify-between gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleSimulate}
                className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-amber-400 hover:text-amber-350 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Simulate Impact</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setSimulationResult(null);
                  }}
                  className="px-4 py-2 border border-[#30363d] hover:bg-[#161b22] text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#28a0f0] text-[#0b0e14] rounded-lg text-xs font-extrabold hover:bg-[#28a0f0]/90 flex items-center gap-1 transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Publish to RuleRegistry</span>
                </button>
              </div>
            </div>

            {/* LIVE DRY RUN HIGHLIGHT REPORT */}
            {simulationResult && (
              <div className="md:col-span-2 border border-[#28a0f0]/25 bg-[#28a0f0]/5 rounded-xl p-4 mt-2 animate-toast-in text-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-white uppercase tracking-wider text-[10px]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Dry-Run Simulation Impact Report</span>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-[#28a0f0]/10 text-[#28a0f0] border border-[#28a0f0]/20 px-2.5 py-0.5 rounded-full uppercase select-none">
                    Sandbox (No Balances Altered)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Solvency Details */}
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-[9px] text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pb-1">
                      <Clock className="w-3.5 h-3.5 text-[#28a0f0]" />
                      <span>Financial Reserve Impact</span>
                    </h4>

                    <div className="p-3 bg-black/40 border border-slate-800/80 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Target Asset:</span>
                        <span className="font-bold text-white">{simulationResult.token}</span>
                      </div>

                      {simulationResult.isSweep ? (
                        <div className="space-y-1 bg-[#28a0f0]/5 border border-[#28a0f0]/10 p-2 rounded">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">Sweep Threshold:</span>
                            <span className="font-bold font-mono text-slate-200">&gt; {simulationResult.sweepThreshold?.toLocaleString()} {simulationResult.token}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">Current Balance:</span>
                            <span className="font-bold font-mono text-slate-300">{simulationResult.currentBalance?.toLocaleString()} {simulationResult.token}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] border-t border-slate-800/50 pt-1 mt-1">
                            <span className="text-slate-500 font-sans">Simulated Outflow:</span>
                            <span className="font-bold font-mono text-amber-500">{simulationResult.transferAmount?.toLocaleString()} {simulationResult.token}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between font-mono">
                          <span className="text-slate-400 font-sans">Dynamic Disbursement:</span>
                          <span className="font-bold text-white">{simulationResult.transferAmount?.toLocaleString()} {simulationResult.token}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t border-slate-800/60 pt-2 text-[10px]">
                        <span className="text-slate-450">Sanity Solvency:</span>
                        {simulationResult.isSolvent ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Solvent (+{(simulationResult.newBalance).toLocaleString()} remaining)
                          </span>
                        ) : (
                          <span className="text-red-400 font-bold flex items-center gap-1 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                            Insolvent (-{Math.abs(simulationResult.newBalance).toLocaleString()} short)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Spend Limit Cap Impact */}
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-[9px] text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pb-1">
                      <Activity className="w-3.5 h-3.5 text-[#28a0f0]" />
                      <span>Spend Cap Constraints</span>
                    </h4>

                    <div className="p-3 bg-black/40 border border-slate-800/80 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Daily Token limit:</span>
                        <span className="font-bold text-white">
                          {simulationResult.hasCap ? `${simulationResult.totalCap} ${simulationResult.token}` : "Uncapped"}
                        </span>
                      </div>

                      {simulationResult.hasCap ? (
                        <>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">Available Cap Before:</span>
                            <span className="font-mono text-slate-200">
                              {simulationResult.remainingCap} {simulationResult.token}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">Available Cap After:</span>
                            <span className={`font-bold font-mono ${simulationResult.isCapExceeded ? "text-red-400" : "text-emerald-400"}`}>
                              {simulationResult.newRemainingCap} {simulationResult.token}
                            </span>
                          </div>

                          <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${simulationResult.isCapExceeded ? "bg-red-500" : "bg-gradient-to-r from-emerald-500 to-[#28a0f0]"}`}
                              style={{ width: `${Math.max(0, Math.min(100, (simulationResult.newSpent / simulationResult.totalCap) * 100))}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-800/60 pt-1.5 text-[10px]">
                            <span className="text-slate-400">Cap Clearance:</span>
                            {simulationResult.isCapExceeded ? (
                              <span className="text-red-400 font-bold flex items-center gap-1 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                <AlertTriangle className="w-3 h-3" />
                                Reverts Cap
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                Safe Limit
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="text-[10px] text-slate-500 leading-normal pt-1.5">
                          No active spending threshold is mapped to {simulationResult.token}. Future dispatches run freely without cap check blocks.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Simulated L2 Gas Fees */}
                <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-bold text-white uppercase tracking-wider text-[9px]">L2 Automator Gas Advisory</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">{simulationResult.estimatedGasLimit.toLocaleString()} units</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2 pt-2 border-t border-slate-800/80 text-[10px]">
                    <div>
                      <div className="text-slate-500 font-sans">Gas rate assumption</div>
                      <div className="font-bold text-slate-200 mt-0.5 font-mono">{baseGasPrice} Gwei</div>
                    </div>
                    <div>
                      <div className="text-slate-500 font-sans">L2 Fee (ETH / USD)</div>
                      <div className="font-extrabold text-[#28a0f0] mt-0.5 font-mono">
                        {simulationResult.estimatedFeeEth.toFixed(6)} ETH <span className="text-slate-400 font-normal">(${simulationResult.estimatedFeeUsd.toFixed(3)})</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-emerald-400 font-semibold font-sans">Rollup Efficiency savings</div>
                      <div className="font-extrabold text-emerald-400 mt-0.5">
                        &gt; 97% Compression <span className="text-slate-500 font-normal text-[9px]" title="Vs Ethereum level-1 standard evaluation of $45.00">($45 Saved)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Rules Table */}
      {rules.length === 0 ? (
        <div className="border border-dashed border-[#30363d] rounded-xl p-8 text-center bg-[#0b0e14]/40">
          <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-300">No payment rules registered yet</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            Use the form above to deploy a custom transaction trigger or write a command below for the AI CFO agent to assist you!
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {rules.map((rule) => {
            const isActive = rule.status === RuleStatus.ACTIVE;
            return (
              <div
                key={rule.id}
                className={`p-4 border rounded-xl transition-all ${
                  isActive 
                    ? "border-[#30363d] bg-[#0b0e14]/40 hover:border-[#28a0f0]/30 hover:bg-[#0b0e14]/70" 
                    : "border-[#30363d] bg-[#0b0e14]/10 text-slate-500 opacity-60"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span 
                      className={`px-2 py-0.5 text-[9px] font-semibold rounded-md cursor-help ${getRuleTypeBadge(rule.ruleType)}`}
                      title={`Rule design format: ${getRuleTypeLabel(rule.ruleType)}. Guides how limits are measured.`}
                    >
                      {getRuleTypeLabel(rule.ruleType)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-bold ${isActive ? "text-white" : "text-slate-500"}`}>
                          {rule.name}
                        </h4>
                        <span 
                          className={`text-[9px] px-2 py-0.2 rounded-full border cursor-help ${
                            isActive 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono" 
                              : "bg-[#30363d]/40 text-slate-500 border-slate-700 font-mono"
                          }`}
                          title={isActive ? "Active: Keepers evaluate this rule periodically to disburse funds if trigger conditions pass." : "Deactivated: Programmatic dispatchers ignore this rule."}
                        >
                          {rule.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{rule.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-auto">
                    <div 
                      className="text-right font-mono cursor-help"
                      title={`Disburses exactly ${rule.amount.toLocaleString()} ${rule.token} on a scheduled ${rule.frequency} interval.`}
                    >
                      <div className={`text-sm font-extrabold ${isActive ? "text-[#28a0f0]" : "text-slate-500"}`}>
                        {rule.amount.toLocaleString()} {rule.token}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Cycle: {rule.frequency}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 border-l border-[#30363d] pl-4">
                      {/* Execute Now */}
                      <button
                        onClick={() => onExecuteRuleNow(rule.id)}
                        disabled={!isActive}
                        className={`p-2 rounded-lg transition-all cursor-pointer ${
                          isActive 
                            ? "hover:bg-blue-500/20 text-[#28a0f0] bg-blue-500/10" 
                            : "text-slate-600 pointer-events-none opacity-45"
                        }`}
                        title="Force trigger keeper execution: evaluate triggers and disburse funds immediately."
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>

                      {/* Power / Toggle state */}
                      <button
                        onClick={() => onToggleStatus(rule.id)}
                        className={`p-2 rounded-lg transition-all cursor-pointer ${
                          isActive 
                            ? "hover:bg-slate-800 text-slate-350" 
                            : "hover:bg-slate-700 text-white bg-slate-850"
                        }`}
                        title={isActive ? "Pause rule: keep the specification but prevent autonomous keeper execution." : "Resume rule: enable keepers to poll and process disbursements."}
                      >
                        {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => onDeleteRule(rule.id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                        title="Delete rule: permanently erase this automation rule schema from the registry."
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footnotes: Address labels */}
                <div className="mt-3.5 pt-3.5 border-t border-[#30363d] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-[#28a0f0]" />
                    <span>Payee Entity:</span>
                    <span className="font-bold text-slate-200">{rule.destinationName}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-[10px] text-slate-550 truncate max-w-[120px] md:max-w-xs">{rule.recipient}</span>
                  </div>

                  {rule.lastExecuted && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span>Last executed:</span>
                      <span className="text-[#28a0f0] font-semibold">{new Date(rule.lastExecuted).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
