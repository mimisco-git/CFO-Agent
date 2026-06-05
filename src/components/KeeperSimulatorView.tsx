/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Play, 
  Pause, 
  Activity, 
  Terminal, 
  ExternalLink,
  History,
  Trash2,
  Download,
  Search,
  Cpu,
  Layers,
  Sparkles,
  ShieldCheck,
  Check,
  Zap,
  Clock,
  Database
} from "lucide-react";
import { KeeperLog, TxLog } from "../types";

interface KeeperSimulatorViewProps {
  isKeeperAutoPolling: boolean;
  onToggleKeeperAutoPolling: () => void;
  onTriggerKeeperAuditNow: () => void;
  keeperLogs: KeeperLog[];
  onClearKeeperLogs: () => void;
  txHistory: TxLog[];
}

export function KeeperSimulatorView({
  isKeeperAutoPolling,
  onToggleKeeperAutoPolling,
  onTriggerKeeperAuditNow,
  keeperLogs,
  onClearKeeperLogs,
  txHistory
}: KeeperSimulatorViewProps) {
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "success" | "warn" | "system">("all");
  const [liveBlock, setLiveBlock] = useState(21814948);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal when new logs arrive
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [keeperLogs]);

  // Simulate on-chain block mining ticker
  useEffect(() => {
    const interval = setInterval(() => {
      if (isKeeperAutoPolling) {
        setLiveBlock(prev => prev + Math.floor(Math.random() * 2) + 1);
      }
    }, 7000);
    return () => clearInterval(interval);
  }, [isKeeperAutoPolling]);

  // Compute stats metrics dynamically
  const stats = useMemo(() => {
    const executedRules = txHistory.filter(tx => tx.type === "EXECUTE_RULE");
    const totalGasEstimated = txHistory.length * 0.000155 + (executedRules.length * 0.00034);
    const uptimePercentage = isKeeperAutoPolling ? "99.98%" : "Suspended";
    
    return {
      txMinedCount: txHistory.length,
      successCount: txHistory.filter(tx => tx.status === "SUCCESS").length,
      gasSpentEth: totalGasEstimated.toFixed(5),
      uptimePercentage,
      evalCount: keeperLogs.filter(l => l.message.includes("Polling") || l.message.includes("Evaluating")).length
    };
  }, [txHistory, keeperLogs, isKeeperAutoPolling]);

  // Advanced log filtering
  const filteredLogs = useMemo(() => {
    return keeperLogs.filter(log => {
      // Filter by text
      if (searchText && !log.message.toLowerCase().includes(searchText.toLowerCase())) {
        return false;
      }
      // Filter by tab type
      if (activeTab === "success") {
        return log.type === "success" || log.message.includes("SUCCESS") || log.message.includes("Executed");
      }
      if (activeTab === "warn") {
        return log.type === "warn" || log.type === "error" || log.message.includes("REVERT") || log.message.includes("EXCEEDED") || log.message.includes("Circuit");
      }
      if (activeTab === "system") {
        return log.type === "info" && (log.message.includes("crawling") || log.message.includes("Keeper") || log.message.includes("scheduler") || log.message.includes("Wallet"));
      }
      return true;
    });
  }, [keeperLogs, searchText, activeTab]);

  const handleDownloadCSV = () => {
    if (txHistory.length === 0) return;
    
    const headers = [
      "Timestamp",
      "Transaction ID",
      "Type",
      "Asset",
      "Amount",
      "Recipient",
      "Associated Rule Name",
      "Arbitrum Tx Hash",
      "Status"
    ];
    
    const rows = txHistory.map(tx => {
      const dateStr = new Date(tx.timestamp).toISOString();
      const escape = (val: string | number | undefined | null) => {
        if (val === undefined || val === null) return '""';
        const str = String(val);
        const formatted = str.replace(/"/g, '""');
        return `"${formatted}"`;
      };
      
      return [
        escape(dateStr),
        escape(tx.id),
        escape(tx.type),
        escape(tx.token),
        tx.amount,
        escape(tx.recipient),
        escape(tx.ruleName),
        escape(tx.txHash),
        escape(tx.status)
      ].join(",");
    });
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const datenow = new Date().toISOString().split("T")[0];
    link.setAttribute("download", `CFO_Treasury_Audit_Log_${datenow}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#11141b]/95 border border-[#1e2530] rounded-3xl overflow-hidden backdrop-blur-2xl text-[#c9d1d9] shadow-2xl space-y-0 transition-all duration-300">
      
      {/* Apple-style macOS Window Title Bar */}
      <div className="bg-[#0b0d12]/90 px-5 py-3.5 border-b border-[#1b212c] flex items-center justify-between select-none">
        <div className="flex items-center gap-6">
          {/* Traffic light buttons */}
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] border border-[#e0443e] cursor-pointer inline-block" title="Minimize Console" />
            <span className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] border border-[#dea123] cursor-pointer inline-block" title="Hide Session Logs" />
            <span className="w-3.5 h-3.5 rounded-full bg-[#27c93f] border border-[#1aab29] cursor-pointer inline-block" title="Maximize Window" />
          </div>

          {/* Network Ticker info */}
          <div className="hidden sm:flex items-center gap-2 text-[10px] uppercase tracking-wider font-mono text-[#28a0f0] font-bold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>Arbitrum One L2</span>
            <span className="text-[#303d4f] font-normal font-sans">|</span>
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Database className="w-3 h-3 text-cyan-400/80" />
              Block #{liveBlock.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[#28a0f0]/10 border border-[#28a0f0]/20 text-[9px] font-mono font-bold text-[#28a0f0] flex items-center gap-1 select-none">
            <Cpu className="w-2.5 h-2.5 animate-spin" />
            KEEPER PROXIED
          </span>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-6">
        {/* Bot Overview Dashboard Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 border-b border-[#1b212c]/60 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 
                className="text-base font-extrabold font-display text-white tracking-tight flex items-center gap-2 cursor-help"
                title="Off-Chain execution network of keepers designed to monitor local rule parameters and carry out target smart contracts actions."
              >
                Off-Chain Keeper Bot Command Center
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Deploys localized bots that spider your published RuleRegistry.sol restrictions, executing actions with L2 gas protection.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto self-stretch lg:self-auto justify-end">
            <button
              onClick={onToggleKeeperAutoPolling}
              title={isKeeperAutoPolling ? "Pause autonomous bot execution" : "Activate autonomous bot execution"}
              className={`flex-1 lg:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl cursor-pointer border transition-all duration-200 ${
                isKeeperAutoPolling 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 shadow-md shadow-emerald-950/20" 
                  : "bg-slate-900 border-[#1f2633] text-slate-300 hover:border-slate-500 hover:bg-slate-800"
              }`}
            >
              {isKeeperAutoPolling ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isKeeperAutoPolling ? "Keeper: Active" : "Keeper: Paused"}</span>
            </button>

            <button
              onClick={onTriggerKeeperAuditNow}
              title="Audit rule book parameters & process due smart wallet payouts instantly."
              className="px-4.5 py-2 bg-[#28a0f0] text-[#0b0e14] hover:bg-[#28a0f0]/90 text-xs font-extrabold rounded-xl cursor-pointer transition-all active:scale-95 shadow-lg flex items-center gap-1.5 font-sans"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
              Force Audit Now
            </button>
          </div>
        </div>

        {/* 4K Tech Metric Grid (Apple Cards Style) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-[#1b212c]/40 border border-[#1b212c] rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">Automator Heartbeat</span>
            <div className="flex items-center gap-2 mt-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isKeeperAutoPolling ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span className="text-sm font-extrabold text-white">
                {isKeeperAutoPolling ? "ACTIVE TICK" : "IDLE"}
              </span>
            </div>
          </div>

          <div className="p-4 bg-[#1b212c]/40 border border-[#1b212c] rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">Gas Dissipated (L2)</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-sm font-extrabold text-cyan-400 font-mono">{stats.gasSpentEth}</span>
              <span className="text-[9px] text-[#28a0f0] font-mono">ETH</span>
            </div>
          </div>

          <div className="p-4 bg-[#1b212c]/40 border border-[#1b212c] rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">Jobs Evaluated</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-sm font-extrabold text-white font-mono">{stats.evalCount}</span>
              <span className="text-[9px] text-slate-500">cycles</span>
            </div>
          </div>

          <div className="p-4 bg-[#1b212c]/40 border border-[#1b212c] rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">Automation Health</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-sm font-extrabold text-[#28a0f0] font-mono">100.0%</span>
              <span className="text-[9px] text-emerald-400 font-bold uppercase font-mono">Verified</span>
            </div>
          </div>
        </div>

        {/* Console Execution shell Logs component */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2.5 bg-slate-900 border border-[#1b212c] rounded-lg text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#28a0f0]" />
                <span>stdout telemetry terminal</span>
              </span>
            </div>

            {/* Terminal Tab Filter Selection */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <div className="flex bg-slate-900 border border-[#1b212c] p-0.5 rounded-lg text-[11px] font-semibold">
                {(["all", "success", "warn", "system"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-md transition-all uppercase text-[9px] font-bold ${
                      activeTab === tab 
                        ? "bg-[#28a0f0]/10 text-[#28a0f0] border border-[#28a0f0]/20" 
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab === "all" ? "All Output" : tab === "success" ? "Triggers 🟢" : tab === "warn" ? "Alerts ⚠️" : "System ⚙️"}
                  </button>
                ))}
              </div>

              <button
                onClick={onClearKeeperLogs}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-[#1b212c] hover:border-slate-600 text-[10px] text-slate-400 hover:text-white transition-colors rounded-lg flex items-center gap-1.5 font-mono cursor-pointer"
                title="Flush console log entries"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">Flush</span>
              </button>
            </div>
          </div>

          {/* Log Query Filter Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Filter logs by ruleset keyword, token name, trigger status, etc..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full px-9 py-2 bg-[#0b0d12] border border-[#1b212c] rounded-xl text-xs text-white focus:outline-none focus:border-[#28a0f0]/80 placeholder-slate-600 focus:ring-1 focus:ring-[#28a0f0]/30 font-mono"
            />
            {searchText && (
              <button
                onClick={() => setSearchText("")}
                className="absolute right-3 top-2 text-[10px] text-slate-500 hover:text-white font-mono font-bold"
              >
                ✖
              </button>
            )}
          </div>

          {/* Actual terminal output window */}
          <div className="bg-[#07090d] border border-[#18202d] rounded-2xl p-5 font-mono text-xs text-slate-350 min-h-[300px] max-h-[460px] overflow-y-auto space-y-1.5 scrollbar-thin select-all shadow-inner relative">
            
            {/* Ambient retro scan-line effect background */}
            <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] rounded-2xl" />

            {filteredLogs.length === 0 ? (
              <div className="text-slate-500 h-[260px] flex flex-col items-center justify-center text-center space-y-2">
                <Terminal className="w-6 h-6 text-slate-650" />
                <p className="text-[11px]">
                  {searchText || activeTab !== "all" 
                    ? "Log entry query returned no telemetries." 
                    : "Keeper core running... Telemetry awaits rule constraints verification."}
                </p>
                <span className="text-[10px] text-[#28a0f0]/60 max-w-xs font-sans">
                  Ensure Keeper bot is toggled to Active or simulate an Arbitrum wallet action to trace events here.
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredLogs.map((log) => {
                  let textColors = "text-slate-300";
                  let bgHighlight = "";
                  
                  if (log.type === "success") {
                    textColors = "text-emerald-400 font-bold";
                    bgHighlight = "bg-emerald-500/5 px-1 py-0.5 rounded";
                  } else if (log.type === "warn") {
                    textColors = "text-amber-400 font-bold";
                    bgHighlight = "bg-amber-500/5 px-1 py-0.5 rounded";
                  } else if (log.type === "error") {
                    textColors = "text-rose-400 font-bold";
                    bgHighlight = "bg-rose-500/5 px-1 py-0.5 rounded border border-rose-500/25";
                  }

                  return (
                    <div key={log.id} className={`leading-relaxed whitespace-pre-wrap flex items-start gap-1 p-0.5 ${bgHighlight}`}>
                      <span className="text-slate-600 font-semibold select-none flex-shrink-0 text-[10px] pt-0.5">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>
                      <span className={textColors}>{log.message}</span>
                    </div>
                  );
                })}
                <div ref={terminalEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Transaction History Logs */}
        <div className="pt-6 border-t border-[#1b212c]">
          <div className="flex items-center justify-between mb-4">
            <h4 
              className="text-xs font-extrabold font-display text-white uppercase tracking-wider flex items-center gap-2 cursor-help"
              title="Immutable record matching every simulated on-chain payment or parameter switch certified by the CFO core cryptographical wallet."
            >
              <History className="w-4 h-4 text-[#28a0f0]" />
              <span>CFO Smart Wallet Transaction Feeds ({txHistory.length})</span>
            </h4>

            {txHistory.length > 0 && (
              <button
                onClick={handleDownloadCSV}
                className="px-3 py-1.5 border border-[#1e2532] text-slate-300 hover:text-white hover:bg-slate-900 hover:border-[#28a0f0]/30 rounded-xl text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                title="Export complete session state metrics"
              >
                <Download className="w-3.5 h-3.5 text-[#28a0f0]" />
                <span>Export Audit Sheet</span>
              </button>
            )}
          </div>

          {txHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-[#1e2532] rounded-2xl bg-[#0b0e14]/30">
              No blockchain state updates synced to ledger yet. Run simulated transfers or automate rules to mine transactions.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto scrollbar-thin">
              {txHistory.map((tx) => {
                const isExec = tx.type === "EXECUTE_RULE";
                const isDep = tx.type === "DEPOSIT";
                const isWith = tx.type === "WITHDRAW" || tx.type === "EMERGENCY_WITHDRAW";

                const badgeColor = 
                  isDep ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                  isWith ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                  "bg-cyan-500/10 text-[#28a0f0] border-[#28a0f0]/20";

                return (
                  <div 
                    key={tx.id} 
                    className="p-3.5 border border-[#1e2532] bg-[#07090d]/60 hover:bg-[#1b212c]/30 hover:border-[#28a0f0]/25 rounded-xl text-xs flex flex-col gap-2 transition-all cursor-help"
                    title={`L2 Transaction verified. Block committed. Fee paid.`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(tx.timestamp).toLocaleTimeString()}
                      </span>
                      <span 
                        className={`px-2 py-0.5 rounded-md border text-[8px] font-mono font-extrabold ${badgeColor}`}
                      >
                        {tx.type}
                      </span>
                    </div>

                    <div className="flex justify-between items-end font-mono">
                      <div className="space-y-1">
                        <div className="text-xs font-black text-white flex items-center gap-1">
                          <span className={tx.type === "DEPOSIT" ? "text-emerald-400" : "text-rose-400"}>
                            {tx.type === "DEPOSIT" ? "+" : "-"}
                          </span>
                          <span>{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 1 })} {tx.token}</span>
                        </div>
                        {tx.recipient && (
                          <div className="text-[9px] text-slate-400">
                            Recipient: <span className="text-white select-all">{tx.recipient.slice(0, 8)}...{tx.recipient.slice(-6)}</span>
                            {tx.ruleName && <div className="text-[8px] text-[#28a0f0] mt-0.5 font-sans font-bold uppercase">{tx.ruleName}</div>}
                          </div>
                        )}
                      </div>
                      
                      <a
                        href={`https://sepolia.arbiscan.io/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[9px] text-slate-400 hover:text-slate-350 underline flex items-center gap-0.5 bg-slate-900 px-2 py-1 rounded border border-[#1e2532]"
                        title="Verify consensus signature on on-chain rollup database"
                      >
                        <span>{tx.txHash.substring(0, 10)}...</span>
                        <ExternalLink className="w-2.5 h-2.5 text-[#28a0f0]" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
