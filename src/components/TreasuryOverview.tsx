/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ExternalLink,
  Plus, 
  Briefcase,
  Layers,
  Coins
} from "lucide-react";
import { TreasuryToken } from "../types";

interface TreasuryOverviewProps {
  tokens: TreasuryToken[];
  onDeposit: (symbol: string, amount: number) => void;
  onWithdraw: (symbol: string, amount: number) => void;
  agentAddress: string;
  ownerAddress: string;
}

export function TreasuryOverview({ 
  tokens, 
  onDeposit, 
  onWithdraw, 
  agentAddress, 
  ownerAddress 
}: TreasuryOverviewProps) {
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState(tokens[0]?.symbol || "USDC");
  const [transactionAmount, setTransactionAmount] = useState("");

  const totalUSD = tokens.reduce((acc, t) => acc + (t.balance * t.usdPrice), 0);

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(transactionAmount);
    if (!isNaN(val) && val > 0) {
      onDeposit(selectedToken, val);
      setTransactionAmount("");
      setShowDepositModal(false);
    }
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(transactionAmount);
    const tokenObj = tokens.find(t => t.symbol === selectedToken);
    if (!isNaN(val) && val > 0 && tokenObj && tokenObj.balance >= val) {
      onWithdraw(selectedToken, val);
      setTransactionAmount("");
      setShowWithdrawModal(false);
    } else {
      alert("Insufficient treasury balance!");
    }
  };

  const activeTokenObj = tokens.find(t => t.symbol === selectedToken);

  return (
    <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-6 backdrop-blur-md relative overflow-hidden text-[#c9d1d9] shadow-lg">
      {/* Background graphic */}
      <div className="absolute right-0 top-0 w-32 h-32 bg-[#28a0f0]/10 rounded-full blur-3xl opacity-40 -mr-6 -mt-6"></div>
      
      <div className="relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div 
              className="flex items-center gap-2 text-xs font-mono text-[#28a0f0] uppercase tracking-widest font-semibold cursor-help"
              title="Secured by on-chain smart contract code rules on the Arbitrum network."
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Smart Wallet Vault</span>
            </div>
            <h2 
              className="text-3xl font-bold font-display text-white tracking-tight mt-1 cursor-help"
              title="The aggregate USD value of all ERC-20 tokens currently held by the CFO Smart Contract, calculated based on live price feeds."
            >
              ${totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs font-normal text-slate-400 ml-2">USD Total Value</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!ownerAddress) {
                  alert("Wallet is disconnected! Please click 'Connect Wallet' in the top header first.");
                  return;
                }
                setSelectedToken(tokens[0]?.symbol || "USDC");
                setShowDepositModal(true);
              }}
              title="Add mock funds to the CFO Smart Contract to test automation rules and payroll strategies."
              className="flex items-center gap-2 px-4 py-2.5 bg-[#28a0f0] hover:bg-[#28a0f0]/90 text-[#0b0e14] rounded-xl text-xs font-extrabold active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-md"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Deposit</span>
            </button>
            <button
              onClick={() => {
                if (!ownerAddress) {
                  alert("Wallet is disconnected! Please click 'Connect Wallet' in the top header first.");
                  return;
                }
                setSelectedToken(tokens[0]?.symbol || "USDC");
                setShowWithdrawModal(true);
              }}
              title="Manually withdraw standard or stablecoin assets from the smart contract back to your owner's wallet."
              className="flex items-center gap-2 px-4 py-2.5 border border-[#30363d] text-white bg-[#0b0e14]/60 hover:bg-[#161b22] hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-300" />
              <span>Withdraw</span>
            </button>
          </div>
        </div>

        {/* Tokens Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {tokens.map((token) => {
            const tokenValue = token.balance * token.usdPrice;
            const logoColor = 
              token.symbol === "ETH" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
              token.symbol === "USDC" ? "bg-blue-500/10 text-[#28a0f0] border border-blue-500/20" :
              token.symbol === "USDT" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
              "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";

            return (
              <div 
                key={token.symbol}
                title={`${token.symbol} token holdings within the smart treasury wallet.`}
                className="p-4 border border-[#30363d] rounded-xl bg-[#0b0e14]/40 hover:bg-[#161b22] hover:border-[#28a0f0]/30 transition-all cursor-help"
              >
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-sm border ${logoColor}`}>
                    {token.logo}
                  </span>
                  <div>
                    <div className="font-bold text-sm text-white">{token.symbol}</div>
                    <div className="text-[10px] font-mono text-slate-400">
                      ${token.usdPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                <div className="mt-1">
                  <div className="text-base font-bold text-white font-mono">
                    {token.balance.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    ${tokenValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Addresses Footer */}
        <div className="mt-6 pt-5 border-t border-[#30363d] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-slate-400">
          <div 
            className="bg-[#0b0e14]/60 border border-[#30363d] rounded-lg p-2.5 flex items-center justify-between cursor-help"
            title="The owner's externally owned account (EOA) that authorizes rules and retains admin controls over the CFO contract."
          >
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ownerAddress ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Owner Wallet:</span>
              <span className={`truncate ${ownerAddress ? "text-slate-300" : "text-amber-500 italic"}`}>
                {ownerAddress || "Disconnected (No session active)"}
              </span>
            </div>
            {ownerAddress ? (
              <a 
                href={`https://sepolia.arbiscan.io/address/${ownerAddress}`}
                target="_blank" 
                rel="noreferrer" 
                className="text-slate-400 hover:text-white ml-2 flex-shrink-0 cursor-pointer"
                title="Verify owner EOA wallet balances and code controls on Arbiscan."
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="text-[10px] text-amber-500/80 font-bold px-1.5 py-0.5 rounded bg-amber-500/10 uppercase tracking-widest font-sans flex-shrink-0">Locked</span>
            )}
          </div>

          <div 
            className="bg-[#0b0e14]/60 border border-[#30363d] rounded-lg p-2.5 flex items-center justify-between cursor-help"
            title="The deployed Programmatic CFO Agent Smart Contract that executes verified automated payroll, sweeps, and rebalancing tasks."
          >
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="w-1.5 h-1.5 rounded-full bg-[#28a0f0] flex-shrink-0 animate-ping"></span>
              <span className="text-[10px] font-bold text-[#28a0f0] uppercase">CFO Smart Contract:</span>
              <span className="truncate text-slate-300">{agentAddress}</span>
            </div>
            <a 
              href={`https://sepolia.arbiscan.io/address/${agentAddress}`} 
              target="_blank" 
              rel="noreferrer" 
              className="text-slate-400 hover:text-white ml-2 flex-shrink-0 cursor-pointer"
              title="Inspect on-chain transactions, contract events, and state variables of the CFO Smart Contract on Arbiscan."
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      <AnimatePresence>
        {showDepositModal && (
          <div className="fixed inset-0 bg-[#0b0e14]/80 backdrop-blur-xs flex items-center justify-center z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#161b22] rounded-2xl p-6 border border-[#30363d] max-w-sm w-full mx-4 shadow-2xl text-[#c9d1d9]"
            >
              <h3 className="text-lg font-bold font-display text-white mb-2">Simulate Deposit</h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Simulate transfers of test tokens from your owner wallet into the CFO Agent Smart Contract treasury on Arbitrum.
              </p>

              <form onSubmit={handleDepositSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Select Currency
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {tokens.map(t => (
                      <button
                        key={t.symbol}
                        type="button"
                        onClick={() => setSelectedToken(t.symbol)}
                        className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                          selectedToken === t.symbol 
                            ? "bg-[#28a0f0] border-[#28a0f0] text-[#0b0e14]" 
                            : "bg-[#0b0e14] border-[#30363d] text-slate-300 hover:border-gray-500"
                        }`}
                      >
                        {t.symbol}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="0.00"
                      value={transactionAmount}
                      onChange={(e) => setTransactionAmount(e.target.value)}
                      className="w-full px-4 py-2.5 border border-[#30363d] bg-[#0b0e14] rounded-xl text-white focus:outline-none focus:border-[#28a0f0] text-sm font-mono placeholder-slate-600"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      {selectedToken}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDepositModal(false)}
                    className="flex-1 py-2.5 border border-[#30363d] text-slate-300 bg-transparent rounded-xl text-xs font-bold hover:bg-[#0b0e14] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#28a0f0] hover:bg-[#28a0f0]/90 text-[#0b0e14] rounded-xl text-xs font-bold transition-colors"
                  >
                    Confirm Deposit
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {showWithdrawModal && (
          <div className="fixed inset-0 bg-[#0b0e14]/80 backdrop-blur-xs flex items-center justify-center z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#161b22] rounded-2xl p-6 border border-[#30363d] max-w-sm w-full mx-4 shadow-2xl text-[#c9d1d9]"
            >
              <h3 className="text-lg font-bold font-display text-white mb-2">Simulate Manual Withdrawal</h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Pull funds directly out of the treasury smart contract back to your safe owner address.
              </p>

              <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Select Currency
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {tokens.map(t => (
                      <button
                        key={t.symbol}
                        type="button"
                        onClick={() => setSelectedToken(t.symbol)}
                        className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                          selectedToken === t.symbol 
                            ? "bg-[#28a0f0] border-[#28a0f0] text-[#0b0e14]" 
                            : "bg-[#0b0e14] border-[#30363d] text-slate-300 hover:border-gray-400"
                        }`}
                      >
                        {t.symbol}
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono text-right">
                    Vault Max: {activeTokenObj?.balance} {selectedToken}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="0.00"
                      value={transactionAmount}
                      onChange={(e) => setTransactionAmount(e.target.value)}
                      className="w-full px-4 py-2.5 border border-[#30363d] bg-[#0b0e14] rounded-xl text-white focus:outline-none focus:border-[#28a0f0] text-sm font-mono placeholder-slate-600"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      {selectedToken}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawModal(false)}
                    className="flex-1 py-2.5 border border-[#30363d] text-slate-300 bg-transparent rounded-xl text-xs font-bold hover:bg-[#0b0e14] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#28a0f0] hover:bg-[#28a0f0]/90 text-[#0b0e14] rounded-xl text-xs font-bold transition-colors"
                  >
                    Confirm Withdraw
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
