/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ShieldAlert, CheckCircle, Circle, UserCheck, Key, Lock, Unlock } from "lucide-react";

interface MultiSigDashboardProps {
  onAddSystemLogMsg: (message: string, type: "info" | "success" | "warn" | "error") => void;
  isKillSwitchActive: boolean;
}

interface Signer {
  id: string;
  name: string;
  role: string;
  address: string;
  signed: boolean;
}

export function MultiSigDashboard({ onAddSystemLogMsg, isKillSwitchActive }: MultiSigDashboardProps) {
  const [signers, setSigners] = useState<Signer[]>([
    { id: "owner", name: "You (Admin Owner)", role: "Treasury Governor", address: "0x51c7...Ba90", signed: true },
    { id: "alex", name: "Alex (Core Dev)", role: "Smart Contract Lead", address: "0x742d...f44e", signed: false },
    { id: "cfo_chief", name: "Elena (CFO Director)", role: "Financial Architect", address: "0xEda8...012A", signed: false }
  ]);

  const [pendingAction, setPendingAction] = useState({
    title: "Update daily USDC spending cap limit to $5,000",
    payloadHash: "0xfb69de2a30363dfd98dcd98a5e8e8f237ef110c7322bf2cda4a0e981881eac"
  });

  const activeSignatures = signers.filter(s => s.signed).length;
  const signatureRequired = 2; // 2-of-3 multisig scheme
  const canDispatch = activeSignatures >= signatureRequired;

  const handleToggleSignature = (id: string) => {
    // Prevent toggling owner if we want to simulate other signers
    if (id === "owner") return;

    setSigners(prev => prev.map(s => {
      if (s.id === id) {
        const nextSigned = !s.signed;
        onAddSystemLogMsg(
          `[MULTISIG] Key Holder ${s.name} (${s.role}) ${nextSigned ? "SIGNED" : "REVOKED LICENSE FOR"} pending operation hash.`,
          nextSigned ? "success" : "warn"
        );
        return { ...s, signed: nextSigned };
      }
      return s;
    }));
  };

  const handleDispatchTransaction = () => {
    if (!canDispatch) return;
    onAddSystemLogMsg(
      `[MULTISIG SUCCESS] Multi-key dispatch approved (Threshold: ${activeSignatures}/${signatureRequired}). Committing transaction hash ${pendingAction.payloadHash.slice(0, 10)}... to Arbitrum ledger.`,
      "success"
    );
    // Reset secondary signatures to make it repeatable
    setSigners(prev => prev.map(s => s.id === "owner" ? s : { ...s, signed: false }));
    
    // Propose new mock action
    const mocks = [
      { title: "Approve rule_4: Periodic payroll disbursement to Alex", hash: "0x12a8bc98d06c0532925a3b844bc454e4438f44e889d81d23b2c12481e1e938da" },
      { title: "Authorize Safe Vault Sweep reserve balance rebalance to protocol pool", hash: "0xb764128fac55938f3b25fe40aacc87fc8d98dcd98a5e8e8f237ef10f74decc5" },
      { title: "Instantly adjust safety daily spending caps across gas reserves", hash: "0xd8ca11ffd86bc7cd5c481dcc9c85ebe478a1c0b69fcbb91e1ffdcfaaeef7cc110" }
    ];
    const item = mocks[Math.floor(Math.random() * mocks.length)];
    setPendingAction(item);
  };

  return (
    <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-6 backdrop-blur-md text-[#c9d1d9] shadow-lg">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#28a0f0] uppercase tracking-widest font-semibold">
            <Lock className="w-3.5 h-3.5" />
            <span>On-Chain Governance</span>
          </div>
          <h3 className="text-lg font-bold font-display text-white mt-1">
            Autonomous Multi-Sig Safe
          </h3>
        </div>
        <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/25 rounded-full px-2.5 py-0.5 text-indigo-400 font-mono font-bold">
          2-of-3 Schema
        </span>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed mb-4">
        Protect critical operations with key-holder consensus. To execute high-safeguard rule modifications, simulated signatures must exceed the threshold.
      </p>

      {/* Signers Checklist */}
      <div className="space-y-3 mb-5 border border-[#30363d] rounded-xl p-4 bg-[#0b0e14]/40">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between mb-1">
          <span>Co-Signers Consent Watch</span>
          <span className="font-mono text-[#28a0f0] text-xs font-bold">{activeSignatures}/{signatureRequired} Signed</span>
        </div>

        {signers.map(s => {
          const isMe = s.id === "owner";
          return (
            <div 
              key={s.id}
              onClick={() => handleToggleSignature(s.id)}
              className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                s.signed 
                  ? "bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50" 
                  : "bg-[#0b0e14]/80 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1 px-1.5 rounded bg-slate-800 text-slate-350 font-mono font-bold text-[9px]">
                  {s.role}
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{s.name}</span>
                    {isMe && <span className="text-[9px] text-[#28a0f0] bg-blue-500/10 px-1 rounded-full font-normal">Active Session</span>}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">Address: {s.address}</div>
                </div>
              </div>

              <div>
                {s.signed ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-650" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending transaction payload */}
      <div className="p-4 rounded-xl border border-dashed border-[#30363d] bg-[#0b0e14]/60 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-purple-400" />
            <span>Pending MultiSig Proposal</span>
          </div>
          <span className={`text-[9px] font-bold uppercase rounded-md px-1.5 py-0.5 ${
            canDispatch ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
          }`}>
            {canDispatch ? "Authorized" : "Awaiting Signatures"}
          </span>
        </div>

        <div>
          <div className="text-xs font-semibold text-white tracking-wide">
            {pendingAction.title}
          </div>
          <div className="text-[9px] font-mono text-slate-500 mt-1 truncate">
            Payload digest: {pendingAction.payloadHash}
          </div>
        </div>

        {canDispatch ? (
          <button
            onClick={handleDispatchTransaction}
            className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg text-xs font-extrabold text-slate-950 hover:opacity-90 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Dispatch MultiSig Payload</span>
          </button>
        ) : (
          <div className="p-2.5 bg-[#161b22]/80 rounded-lg text-[10px] text-slate-450 border border-slate-800 leading-normal flex items-start gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <span>Consensus required to unlock payload. Ask Elena or Alex for verification by clicking on their cards above.</span>
          </div>
        )}
      </div>
    </div>
  );
}
