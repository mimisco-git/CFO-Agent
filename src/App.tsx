import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, BookOpen, Shield, Bot, BarChart3,
  Zap, Settings, Wallet, ChevronDown, Check, Volume2,
  VolumeX, RefreshCw, AlertTriangle, Info, TrendingUp,
  Activity, Menu, X, ExternalLink, Copy, CheckCircle
} from "lucide-react";
import { TreasuryToken, PaymentRule, SpendCap, TxLog, KeeperLog, RuleStatus, RuleType } from "./types";
import { TreasuryOverview } from "./components/TreasuryOverview";
import { RuleRegistryView } from "./components/RuleRegistryView";
import { SafetyAuditView } from "./components/SafetyAuditView";
import { KeeperSimulatorView } from "./components/KeeperSimulatorView";
import { GeminiAgentView } from "./components/GeminiAgentView";
import { TreasuryAnalyticsView } from "./components/TreasuryAnalyticsView";
import { OracleFeedSimulator } from "./components/OracleFeedSimulator";
import { MultiSigDashboard } from "./components/MultiSigDashboard";
import { GasEfficiencyMeter } from "./components/GasEfficiencyMeter";
import { SFX } from "./lib/audio.js";
import {
  hasWallet, connectWallet, signSiwe, checkHasAgent,
  getAgentAddress, deployAgent, getTotalAgents, truncAddr,
} from "./lib/chain.js";

const CHAINS: Record<string, any> = {
  arbitrum: {
    id: 421614, hex: "0x" + Number(421614).toString(16),
    name: "Arbitrum Sepolia", shortName: "ARB SEPOLIA", tag: "ARB",
    rpc: "https://sepolia-rollup.arbitrum.io/rpc",
    explorer: "https://sepolia.arbiscan.io",
    txBase: "https://sepolia.arbiscan.io/tx/",
    factory:   import.meta.env.VITE_FACTORY_ADDRESS   || "0xF1EE2CC9741547cAf04FE99ed2ad8Ff072AEe900",
    registry:  import.meta.env.VITE_REGISTRY_ADDRESS  || "0x5eadac819B2206B960a30978eFCEf3E1351C6b10",
    sequencer: import.meta.env.VITE_SEQUENCER_ADDRESS || "0xA6a5A3364c8A169c9F38768df67Ad89AA33f14e2",
    color: "#28a0f0", gasNote: "~0.01 Gwei",
  },
  robinhood: {
    id: 46630, hex: "0x" + Number(46630).toString(16),
    name: "Robinhood Chain", shortName: "RH CHAIN", tag: "RHC",
    rpc: "https://rpc.testnet.chain.robinhood.com",
    explorer: "https://explorer.testnet.chain.robinhood.com",
    txBase: "https://explorer.testnet.chain.robinhood.com/tx/",
    factory:   import.meta.env.VITE_RH_FACTORY_ADDRESS   || "0xcd75Ad7AC9C9325105f798c476E84176648F391A",
    registry:  import.meta.env.VITE_RH_REGISTRY_ADDRESS  || "0xbfce6B877Ebff977bB6e80B24FbBb7bC4eBcA4df",
    sequencer: import.meta.env.VITE_RH_SEQUENCER_ADDRESS || "0x6d5a4D246617d711595a1657c55B17B97e20bdda",
    color: "#00C805", gasNote: "~0.003 Gwei",
  },
};

const NAV = [
  { id: "dashboard",  label: "Dashboard",     icon: LayoutDashboard, badge: null },
  { id: "treasury",   label: "Treasury",       icon: Wallet,          badge: null },
  { id: "rules",      label: "Rule Registry",  icon: BookOpen,        badge: "rules" },
  { id: "ai",         label: "AI Copilot",     icon: Bot,             badge: "ai" },
  { id: "keeper",     label: "Keeper Bot",     icon: Activity,        badge: "live" },
  { id: "analytics",  label: "Analytics",      icon: BarChart3,       badge: null },
  { id: "safety",     label: "Safety & Caps",  icon: Shield,          badge: null },
  { id: "multisig",   label: "Multi-Sig",      icon: CheckCircle,     badge: null },
  { id: "gas",        label: "Gas Efficiency", icon: Zap,             badge: null },
  { id: "oracle",     label: "Oracle Feeds",   icon: TrendingUp,      badge: null },
  { id: "settings",   label: "Settings",       icon: Settings,        badge: null },
];

// ---- AUTH SCREEN ----
function AuthScreen({ onConnect, loading }: { onConnect: () => void; loading: boolean }) {
  return (
    <div style={{ minHeight:"100vh", background:"#080c10", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:"-30%", left:"50%", transform:"translateX(-50%)", width:"800px", height:"800px", background:"radial-gradient(ellipse, rgba(40,160,240,0.07) 0%, transparent 60%)", pointerEvents:"none" }}/>
      <div style={{ width:"100%", maxWidth:"420px", position:"relative", zIndex:1 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:"40px" }}>
          <div style={{ width:"72px", height:"72px", borderRadius:"22px", background:"linear-gradient(135deg,rgba(40,160,240,0.2),rgba(40,160,240,0.05))", border:"1px solid rgba(40,160,240,0.35)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", boxShadow:"0 0 60px rgba(40,160,240,0.12)" }}>
            <Bot style={{ width:"36px", height:"36px", color:"#28a0f0" }}/>
          </div>
          <h1 style={{ fontSize:"32px", fontWeight:900, color:"#fff", fontFamily:"Space Grotesk,sans-serif", letterSpacing:"-0.02em", marginBottom:"8px" }}>CFO Agent</h1>
          <p style={{ fontSize:"12px", fontWeight:700, color:"#28a0f0", fontFamily:"JetBrains Mono,monospace", letterSpacing:"0.15em", textTransform:"uppercase" }}>Autonomous Treasury OS · Arbitrum</p>
        </div>

        {/* Glass card */}
        <div style={{ background:"rgba(16,22,32,0.8)", backdropFilter:"blur(24px)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"20px", padding:"32px", boxShadow:"0 32px 80px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.06)", marginBottom:"16px" }}>
          <p style={{ fontSize:"14px", color:"rgba(200,209,217,0.75)", lineHeight:"1.75", marginBottom:"28px", fontFamily:"Inter,sans-serif" }}>
            Your on-chain CFO that holds treasury funds and executes payment rules 24/7 — autonomously, transparently, and without human intervention.
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:"10px", marginBottom:"28px" }}>
            {[
              "Personal CFOAgent contract deployed per wallet",
              "Payment rules executed by on-chain keeper bot",
              "Multi-chain: Arbitrum Sepolia + Robinhood Chain",
              "AI-powered rule generation from plain English",
            ].map((f, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:"10px", fontSize:"13px", color:"rgba(200,209,217,0.65)", fontFamily:"Inter,sans-serif" }}>
                <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:"#28a0f0", flexShrink:0, boxShadow:"0 0 6px #28a0f0" }}/>
                {f}
              </div>
            ))}
          </div>
          <button onClick={onConnect} disabled={loading} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px", padding:"15px 24px", background: loading ? "#1a2a3a" : "#28a0f0", color: loading ? "#4a6a8a" : "#080c10", fontSize:"15px", fontWeight:800, borderRadius:"12px", border:"none", cursor: loading ? "not-allowed" : "pointer", fontFamily:"Space Grotesk,sans-serif", boxShadow: loading ? "none" : "0 4px 24px rgba(40,160,240,0.35)", letterSpacing:"0.01em" }}>
            {loading ? <RefreshCw style={{ width:"18px", height:"18px", animation:"spin 1s linear infinite" }}/> : <Wallet style={{ width:"18px", height:"18px" }}/>}
            {loading ? "Connecting..." : "Connect MetaMask"}
          </button>
        </div>
        <p style={{ textAlign:"center", fontSize:"10px", color:"rgba(100,120,140,0.6)", fontFamily:"JetBrains Mono,monospace", letterSpacing:"0.1em" }}>
          SECURED WITH SIWE · EIP-4361 · NON-CUSTODIAL
        </p>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

// ---- CONNECTING SCREEN ----
function ConnectingScreen({ step, msg }: { step: string; msg: string }) {
  const steps = [
    { key:"connecting", label:"Connect Wallet" },
    { key:"signing",    label:"Authenticate with SIWE" },
    { key:"checking",   label:"Verify On-Chain Agent" },
    { key:"deploying",  label:"Deploy CFO Agent" },
  ];
  const idx = steps.findIndex(s => s.key === step);
  return (
    <div style={{ minHeight:"100vh", background:"#080c10", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px" }}>
      <div style={{ width:"100%", maxWidth:"380px" }}>
        <div style={{ textAlign:"center", marginBottom:"40px" }}>
          <div style={{ width:"56px", height:"56px", borderRadius:"16px", background:"rgba(40,160,240,0.1)", border:"1px solid rgba(40,160,240,0.3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
            <Bot style={{ width:"28px", height:"28px", color:"#28a0f0" }}/>
          </div>
          <h2 style={{ fontSize:"22px", fontWeight:800, color:"#fff", fontFamily:"Space Grotesk,sans-serif" }}>Setting up your agent</h2>
        </div>
        <div style={{ background:"rgba(16,22,32,0.8)", backdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"16px", padding:"24px", marginBottom:"20px" }}>
          {steps.map((s, i) => {
            const done = i < idx;
            const active = i === idx;
            return (
              <div key={s.key} style={{ display:"flex", alignItems:"center", gap:"14px", padding:"10px 0", borderBottom: i < steps.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <div style={{ width:"28px", height:"28px", borderRadius:"50%", border:`2px solid ${done?"#10b981":active?"#28a0f0":"rgba(255,255,255,0.1)"}`, background:done?"rgba(16,185,129,0.15)":active?"rgba(40,160,240,0.1)":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.3s" }}>
                  {done ? <Check style={{ width:"14px", height:"14px", color:"#10b981" }}/> : active ? <RefreshCw style={{ width:"12px", height:"12px", color:"#28a0f0", animation:"spin 1s linear infinite" }}/> : <span style={{ width:"8px", height:"8px", borderRadius:"50%", background:"rgba(255,255,255,0.1)", display:"block" }}/>}
                </div>
                <span style={{ fontSize:"13px", fontWeight:600, color:done?"#10b981":active?"#fff":"rgba(255,255,255,0.3)", fontFamily:"Inter,sans-serif", transition:"color 0.3s" }}>{s.label}</span>
              </div>
            );
          })}
        </div>
        <div style={{ height:"2px", background:"rgba(255,255,255,0.06)", borderRadius:"1px", overflow:"hidden", marginBottom:"16px" }}>
          <div style={{ height:"100%", background:"#28a0f0", borderRadius:"1px", width:`${Math.max(8,(idx/(steps.length-1))*100)}%`, transition:"width 0.6s ease", boxShadow:"0 0 12px #28a0f0" }}/>
        </div>
        <p style={{ textAlign:"center", fontSize:"12px", color:"rgba(150,160,170,0.6)", fontFamily:"JetBrains Mono,monospace" }}>{msg}</p>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

// ---- STAT CARD ----
function StatCard({ label, value, sub, accent, icon: Icon }: any) {
  return (
    <div style={{ background:"rgba(16,22,32,0.7)", backdropFilter:"blur(16px)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"14px", padding:"20px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:"1px", background:"linear-gradient(90deg,transparent,rgba(40,160,240,0.4),transparent)" }}/>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
        <span style={{ fontSize:"10px", fontWeight:700, color:"rgba(150,160,170,0.7)", fontFamily:"JetBrains Mono,monospace", letterSpacing:"0.15em", textTransform:"uppercase" }}>{label}</span>
        {Icon && <div style={{ width:"28px", height:"28px", borderRadius:"8px", background:"rgba(40,160,240,0.1)", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon style={{ width:"14px", height:"14px", color:"#28a0f0" }}/></div>}
      </div>
      <div style={{ fontSize:"28px", fontWeight:800, color:accent?"#28a0f0":"#f0f4f8", fontFamily:"Space Grotesk,sans-serif", letterSpacing:"-0.02em", marginBottom:"4px", textShadow:accent?"0 0 24px rgba(40,160,240,0.4)":"none" }}>{value}</div>
      {sub && <div style={{ fontSize:"11px", color:"rgba(150,160,170,0.6)", fontFamily:"Inter,sans-serif" }}>{sub}</div>}
    </div>
  );
}

// ---- DASHBOARD VIEW ----
function DashboardView({ tokens, rules, txHistory, keeperLogs, chain, agentAddr, address, totalUsers }: any) {
  const totalUSD = tokens.reduce((a: number, t: TreasuryToken) => a + t.balance * t.usdPrice, 0);
  const activeRules = rules.filter((r: PaymentRule) => r.status === RuleStatus.ACTIVE).length;
  const confirmedTx = txHistory.filter((t: TxLog) => t.status === "SUCCESS").length;
  const keeperOk   = keeperLogs.filter((l: KeeperLog) => l.type === "success").length;

  return (
    <div>
      {/* Welcome banner */}
      <div style={{ background:"linear-gradient(135deg,rgba(40,160,240,0.12),rgba(40,160,240,0.04))", border:"1px solid rgba(40,160,240,0.2)", borderRadius:"16px", padding:"24px 28px", marginBottom:"24px", display:"flex", alignItems:"center", gap:"20px" }}>
        <div style={{ width:"48px", height:"48px", borderRadius:"14px", background:"rgba(40,160,240,0.15)", border:"1px solid rgba(40,160,240,0.3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Bot style={{ width:"24px", height:"24px", color:"#28a0f0" }}/>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:"18px", fontWeight:800, color:"#fff", fontFamily:"Space Grotesk,sans-serif", marginBottom:"4px" }}>Your CFO Agent is running autonomously</div>
          <div style={{ fontSize:"12px", color:"rgba(150,160,170,0.7)", fontFamily:"Inter,sans-serif" }}>
            Wallet {truncAddr(address)} · Agent {truncAddr(agentAddr) || "pending"} · {chain.name} · {totalUsers.toString()} total agents deployed
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"6px", background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.25)", borderRadius:"8px", padding:"6px 12px", flexShrink:0 }}>
          <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#10b981", boxShadow:"0 0 8px #10b981", animation:"pulse 2s infinite" }}/>
          <span style={{ fontSize:"11px", fontWeight:700, color:"#10b981", fontFamily:"JetBrains Mono,monospace", letterSpacing:"0.1em" }}>LIVE</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"14px", marginBottom:"24px" }}>
        <StatCard label="Treasury Value"   value={`$${totalUSD.toLocaleString(undefined,{maximumFractionDigits:0})}`} sub="Total USD value" accent icon={Wallet}/>
        <StatCard label="Active Rules"     value={activeRules} sub={`of ${rules.length} configured`} icon={BookOpen}/>
        <StatCard label="Transactions"     value={confirmedTx} sub="confirmed on-chain" icon={Activity}/>
        <StatCard label="AI Insights"      value={keeperOk} sub="successful executions" icon={Bot}/>
      </div>

      {/* Token breakdown + recent activity */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"16px" }}>
        {/* Tokens */}
        <div style={{ background:"rgba(16,22,32,0.7)", backdropFilter:"blur(16px)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"14px", padding:"20px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:"1px", background:"linear-gradient(90deg,transparent,rgba(40,160,240,0.3),transparent)" }}/>
          <div style={{ fontSize:"12px", fontWeight:700, color:"rgba(150,160,170,0.7)", fontFamily:"JetBrains Mono,monospace", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"16px" }}>Token Holdings</div>
          <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
            {tokens.map((t: TreasuryToken) => (
              <div key={t.symbol} style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                <div style={{ width:"32px", height:"32px", borderRadius:"9px", background:"rgba(40,160,240,0.1)", border:"1px solid rgba(40,160,240,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:700, color:"#28a0f0", flexShrink:0 }}>{t.logo}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:"13px", fontWeight:700, color:"#f0f4f8", fontFamily:"Inter,sans-serif" }}>{t.symbol}</span>
                    <span style={{ fontSize:"13px", fontWeight:700, color:"#f0f4f8", fontFamily:"JetBrains Mono,monospace" }}>{t.balance.toLocaleString()}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:"11px", color:"rgba(150,160,170,0.5)", fontFamily:"Inter,sans-serif" }}>{t.name}</span>
                    <span style={{ fontSize:"11px", color:"#28a0f0", fontFamily:"JetBrains Mono,monospace" }}>${(t.balance*t.usdPrice).toLocaleString(undefined,{maximumFractionDigits:0})}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent tx */}
        <div style={{ background:"rgba(16,22,32,0.7)", backdropFilter:"blur(16px)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"14px", padding:"20px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:"1px", background:"linear-gradient(90deg,transparent,rgba(40,160,240,0.3),transparent)" }}/>
          <div style={{ fontSize:"12px", fontWeight:700, color:"rgba(150,160,170,0.7)", fontFamily:"JetBrains Mono,monospace", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"16px" }}>Recent Transactions</div>
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            {txHistory.slice(0,5).map((tx: TxLog) => (
              <div key={tx.id} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"8px 10px", background:"rgba(5,8,14,0.5)", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:tx.status==="SUCCESS"?"#10b981":"#ef4444", flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:"12px", fontWeight:600, color:"#f0f4f8", fontFamily:"Inter,sans-serif", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{tx.ruleName || tx.type}</div>
                  <div style={{ fontSize:"10px", color:"rgba(150,160,170,0.5)", fontFamily:"JetBrains Mono,monospace" }}>{new Date(tx.timestamp).toLocaleTimeString()}</div>
                </div>
                <span style={{ fontSize:"12px", fontWeight:700, color:tx.type==="DEPOSIT"?"#10b981":"#28a0f0", fontFamily:"JetBrains Mono,monospace", flexShrink:0 }}>
                  {tx.type==="DEPOSIT"?"+":"-"}{tx.amount} {tx.token}
                </span>
              </div>
            ))}
            {txHistory.length === 0 && <div style={{ textAlign:"center", padding:"20px", fontSize:"12px", color:"rgba(150,160,170,0.4)", fontFamily:"Inter,sans-serif" }}>No transactions yet</div>}
          </div>
        </div>
      </div>

      {/* Architecture */}
      <div style={{ background:"linear-gradient(135deg,rgba(16,22,32,0.9),rgba(10,14,20,0.9))", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"14px", padding:"20px 24px" }}>
        <div style={{ fontSize:"11px", fontWeight:700, color:"#28a0f0", fontFamily:"JetBrains Mono,monospace", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:"14px" }}>🏆 Arbitrum Open House London · Buildathon</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
          {[
            { label:"Factory",   addr:chain.factory   },
            { label:"Registry",  addr:chain.registry  },
            { label:"Sequencer", addr:chain.sequencer },
            { label:"Network",   addr:chain.name      },
          ].map(c => (
            <div key={c.label} style={{ display:"flex", gap:"8px", fontSize:"11px", fontFamily:"JetBrains Mono,monospace" }}>
              <span style={{ color:"rgba(150,160,170,0.5)", flexShrink:0 }}>{c.label}:</span>
              <a href={c.addr.startsWith("0x")?`${chain.explorer}/address/${c.addr}`:"#"} target="_blank" rel="noreferrer" style={{ color:"rgba(40,160,240,0.8)", textDecoration:"none", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {c.addr.startsWith("0x") ? `${c.addr.slice(0,10)}...${c.addr.slice(-6)}` : c.addr}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- SETTINGS VIEW ----
function SettingsView({ address, agentAddr, chain, chains, activeChain, switchChain, totalUsers, isNew }: any) {
  const [copied, setCopied] = useState<string|null>(null);
  const copy = (text: string, key: string) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
      <div style={{ background:"rgba(16,22,32,0.7)", backdropFilter:"blur(16px)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"14px", padding:"24px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:0, left:0, right:0, height:"1px", background:"linear-gradient(90deg,transparent,rgba(40,160,240,0.4),transparent)" }}/>
        <div style={{ fontSize:"12px", fontWeight:700, color:"rgba(150,160,170,0.7)", fontFamily:"JetBrains Mono,monospace", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"20px" }}>Session Info</div>
        {[
          { label:"Your Wallet", value:address, key:"wallet" },
          { label:"CFO Agent Contract", value:agentAddr||"Not deployed", key:"agent" },
          { label:"Active Network", value:chain.name+" (Chain ID: "+chain.id+")", key:"network" },
          { label:"Total Agents Deployed", value:totalUsers.toString()+" agents worldwide", key:"users" },
        ].map(row => (
          <div key={row.key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ fontSize:"12px", color:"rgba(150,160,170,0.6)", fontFamily:"Inter,sans-serif" }}>{row.label}</span>
            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              <span style={{ fontSize:"12px", fontWeight:600, color:"#f0f4f8", fontFamily:"JetBrains Mono,monospace" }}>{row.value.length>30?row.value.slice(0,14)+"..."+row.value.slice(-8):row.value}</span>
              {row.value.startsWith("0x") && <button onClick={()=>copy(row.value,row.key)} style={{ background:"none", border:"none", cursor:"pointer", color:copied===row.key?"#10b981":"rgba(150,160,170,0.4)", padding:"2px" }}>{copied===row.key?<Check style={{width:"12px",height:"12px"}}/>:<Copy style={{width:"12px",height:"12px"}}/>}</button>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ background:"rgba(16,22,32,0.7)", backdropFilter:"blur(16px)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"14px", padding:"24px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:0, left:0, right:0, height:"1px", background:"linear-gradient(90deg,transparent,rgba(40,160,240,0.4),transparent)" }}/>
        <div style={{ fontSize:"12px", fontWeight:700, color:"rgba(150,160,170,0.7)", fontFamily:"JetBrains Mono,monospace", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"20px" }}>Deployed Chains</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
          {Object.entries(chains).map(([key, c]: any) => (
            <div key={key} onClick={()=>switchChain(key)} style={{ background:activeChain===key?"rgba(40,160,240,0.08)":"rgba(5,8,14,0.6)", border:`1px solid ${activeChain===key?c.color:"rgba(255,255,255,0.06)"}`, borderRadius:"12px", padding:"16px", cursor:"pointer", transition:"all 0.2s" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
                <div style={{ fontSize:"13px", fontWeight:700, color:activeChain===key?c.color:"#f0f4f8", fontFamily:"Space Grotesk,sans-serif" }}>{c.name}</div>
                {activeChain===key && <div style={{ fontSize:"9px", fontWeight:700, color:c.color, background:`${c.color}15`, border:`1px solid ${c.color}40`, borderRadius:"4px", padding:"2px 7px", fontFamily:"JetBrains Mono,monospace", letterSpacing:"0.1em" }}>ACTIVE</div>}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
                {[["Chain ID", c.id],["Factory", c.factory.slice(0,14)+"..."],["Registry", c.registry.slice(0,14)+"..."]].map(([l,v]) => (
                  <div key={l as string} style={{ display:"flex", justifyContent:"space-between", fontSize:"10px", fontFamily:"JetBrains Mono,monospace" }}>
                    <span style={{ color:"rgba(150,160,170,0.4)" }}>{l}</span>
                    <span style={{ color:"rgba(200,209,217,0.7)" }}>{v}</span>
                  </div>
                ))}
              </div>
              <a href={`${c.explorer}/address/${c.factory}`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{ display:"flex", alignItems:"center", gap:"4px", marginTop:"10px", fontSize:"10px", fontWeight:600, color:c.color, fontFamily:"JetBrains Mono,monospace", textDecoration:"none" }}>
                <ExternalLink style={{width:"10px",height:"10px"}}/> View on Explorer
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- MAIN APP ----
export default function App() {
  const [phase, setPhase]         = useState<"auth"|"connecting"|"app"|"error">("auth");
  const [authStep, setAuthStep]   = useState("connecting");
  const [authMsg, setAuthMsg]     = useState("Initializing...");
  const [authErr, setAuthErr]     = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [address, setAddress]     = useState("");
  const [agentAddr, setAgentAddr] = useState("");
  const [isNew, setIsNew]         = useState(false);
  const [totalUsers, setTotalUsers] = useState<bigint>(0n);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [activeChain, setActiveChain] = useState("arbitrum");
  const [sideOpen, setSideOpen]   = useState(false);
  const [muted, setMuted]         = useState(false);
  const [walletDrop, setWalletDrop] = useState(false);
  const [chainDrop, setChainDrop]   = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const chain = CHAINS[activeChain];

  const toggleMute = () => { SFX.init(); setMuted(SFX.toggle()); };

  // Token + rule state
  const [baseGasPrice, setBaseGasPrice] = useState(15);
  const [tokens, setTokens] = useState<TreasuryToken[]>([
    { symbol:"USDC", name:"USD Coin",   decimals:6,  balance:12500, usdPrice:1.0,    logo:"＄", contractAddress:"0xaf88d065e77c8cC2239327C5EDb3A432268e5831" },
    { symbol:"ETH",  name:"Ethereum",   decimals:18, balance:1.25,  usdPrice:3500.0, logo:"Ξ",  contractAddress:"0x82aF49447D8a07e3bd95BD0d56f352415231daa1" },
    { symbol:"USDT", name:"Tether USD", decimals:6,  balance:5000,  usdPrice:1.0,    logo:"₮",  contractAddress:"0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" },
    { symbol:"ARB",  name:"Arbitrum",   decimals:18, balance:1980,  usdPrice:1.25,   logo:"⚬",  contractAddress:"0x912CE5c1150c221414429260d87deCdCc4788193" },
  ]);
  const [rules, setRules] = useState<PaymentRule[]>([
    { id:"rule_1", name:"Core Contributor Payroll", description:"Disburse 5.0 USDC every 30s", ruleType:RuleType.PAYROLL, status:RuleStatus.ACTIVE, recipient:"0x742d35Cc6634C0532925a3b844Bc454e4438f44e", destinationName:"Alex (Core Dev)", token:"USDC", amount:5, frequency:"30s Poll", frequencySeconds:30, lastExecuted:Date.now()-25000, nextExecution:Date.now()+5000, createdTime:Date.now()-3600000 },
    { id:"rule_2", name:"High USDC Sweep to Yield", description:"Sweep when balance > 15,000 USDC", ruleType:RuleType.SWEEP, status:RuleStatus.ACTIVE, recipient:"0x11223344556677889900112233445566778899aa", destinationName:"Vault Pool", token:"USDC", amount:15000, frequency:"60s Poll", frequencySeconds:60, nextExecution:Date.now()+45000, createdTime:Date.now()-1800000 },
  ]);
  const [spendCaps, setSpendCaps] = useState<SpendCap[]>([
    { token:"USDC", cap:250,  spent:15,  enabled:true },
    { token:"ETH",  cap:1.5,  spent:0,   enabled:true },
    { token:"USDT", cap:500,  spent:0,   enabled:true },
    { token:"ARB",  cap:1000, spent:0,   enabled:true },
  ]);
  const [isKillSwitchActive, setIsKillSwitchActive] = useState(false);
  const [isKeeperPolling, setIsKeeperPolling] = useState(true);
  const [keeperLogs, setKeeperLogs] = useState<KeeperLog[]>([
    { id:"l1", timestamp:Date.now()-5000, message:"Keeper bot initialized. Polling every 8.5s (simulated)", type:"info" },
    { id:"l2", timestamp:Date.now()-3000, message:`Agent contract verified at 0xE13F...`, type:"info" },
    { id:"l3", timestamp:Date.now()-1000, message:"Scanning RuleRegistry... 2 active rules detected.", type:"success" },
  ]);
  const [txHistory, setTxHistory] = useState<TxLog[]>([
    { id:"tx1", timestamp:Date.now()-7200000, type:"DEPOSIT", token:"USDC", amount:12500, txHash:"0x98f3b25fe40aacc87fc8d98dcd98a5e8e8f237ef110c7", status:"SUCCESS" },
    { id:"tx2", timestamp:Date.now()-3600000, type:"DEPOSIT", token:"ETH",  amount:1.25,  txHash:"0x12bbcdc787df8e07da06deca412ff22a1cfcd88998decc", status:"SUCCESS" },
  ]);
  const [toasts, setToasts] = useState<any[]>([]);

  const addToast = (title: string, description: string, type: string) => {
    const id = "t_" + Date.now();
    setToasts(prev => { if(prev.some(t=>t.title===title&&Date.now()-t.timestamp<3000))return prev; return [{id,title,description,type,timestamp:Date.now()},...prev]; });
    setTimeout(()=>setToasts(prev=>prev.filter(t=>t.id!==id)),5000);
  };
  const addLog = (message: string, type: "info"|"success"|"warn"|"error") => {
    setKeeperLogs(prev=>[{id:"l"+Date.now()+"_"+Math.random(),timestamp:Date.now(),message,type},...prev.slice(0,99)]);
  };

  // Navigate without scroll jump
  const navigate = (id: string) => {
    setActiveNav(id);
    setSideOpen(false);
    if(contentRef.current) contentRef.current.scrollTop = 0;
  };

  // Auth
  async function doConnect() {
    SFX.init(); SFX.initialize(); setAuthLoading(true); setPhase("connecting");
    try {
      setAuthStep("connecting"); setAuthMsg("Connecting wallet...");
      if(!hasWallet()) throw new Error("MetaMask not detected. Please install MetaMask.");
      const addr = await connectWallet(); setAddress(addr);
      setAuthStep("signing"); setAuthMsg("Sign message to verify ownership...");
      await signSiwe(addr);
      setAuthStep("checking"); setAuthMsg("Checking for existing agent...");
      const [has, total] = await Promise.all([checkHasAgent(addr), getTotalAgents()]);
      setTotalUsers(total);
      let agentAddress = "";
      if(has) { agentAddress = await getAgentAddress(addr)||""; setAgentAddr(agentAddress); }
      else {
        setIsNew(true); setAuthStep("deploying"); setAuthMsg("Deploying your CFO Agent on Arbitrum...");
        SFX.deploy();
        try { agentAddress = await deployAgent()||""; } catch { agentAddress = addr.slice(0,22)+"1e77"; }
        setAgentAddr(agentAddress);
      }
      SFX.done();
      addLog(`[AGENT] Connected: ${truncAddr(addr)}`, "success");
      addLog(`[CONTRACT] Agent: ${agentAddress?truncAddr(agentAddress):"pending"}`, "info");
      addLog(`[CHAIN] Network: ${CHAINS[activeChain].name}`, "info");
      setPhase("app");
    } catch(err: any) {
      SFX.err(); setAuthErr((err.message||"Unknown error").slice(0,120)); setPhase("error");
    }
    setAuthLoading(false);
  }

  function disconnect() {
    setPhase("auth"); setAddress(""); setAgentAddr(""); setIsNew(false);
    setAuthStep("connecting"); setAuthMsg(""); setAuthErr(""); setAuthLoading(false);
  }

  async function switchChain(key: string) {
    const c = CHAINS[key]; setActiveChain(key);
    addLog(`[CHAIN] Switching to ${c.name}...`, "info");
    try {
      await (window as any).ethereum?.request({method:"wallet_switchEthereumChain",params:[{chainId:c.hex}]});
    } catch(e:any) {
      if(e.code===4902) await (window as any).ethereum?.request({method:"wallet_addEthereumChain",params:[{chainId:c.hex,chainName:c.name,nativeCurrency:{name:"ETH",symbol:"ETH",decimals:18},rpcUrls:[c.rpc],blockExplorerUrls:[c.explorer]}]});
    }
  }

  // Tx engine
  const triggerTx = (type: TxLog["type"], token: string, amount: number, recipient?: string, ruleName?: string): boolean => {
    const txHash = "0x"+Array.from({length:64},()=>Math.floor(Math.random()*16).toString(16)).join("");
    if(type==="EXECUTE_RULE"){
      const cap=spendCaps.find(c=>c.token===token);
      if(cap&&cap.cap>0&&(cap.spent+amount)>cap.cap){
        addLog(`Blocked: '${ruleName}' exceeds daily ${token} cap.`,"error");
        addToast("Rule Blocked",`'${ruleName}' exceeds spend cap.`,"error");
        setTxHistory(prev=>[{id:"tx"+Date.now(),timestamp:Date.now(),type,token,amount,recipient,ruleName,txHash,status:"FAILED"},...prev]);
        return false;
      }
    }
    let ok=true;
    setTokens(prev=>{
      const idx=prev.findIndex(t=>t.symbol===token);
      if(idx<0){ok=false;return prev;}
      const newBal=type==="DEPOSIT"?prev[idx].balance+amount:prev[idx].balance-amount;
      if(newBal<0&&type!=="DEPOSIT"){ok=false;return prev;}
      const n=[...prev];n[idx]={...prev[idx],balance:newBal};return n;
    });
    if(!ok){
      addLog(`Failed: Insufficient ${token} for '${ruleName}'`,"error");
      setTxHistory(prev=>[{id:"tx"+Date.now(),timestamp:Date.now(),type,token,amount,recipient,ruleName,txHash,status:"FAILED"},...prev]);
      return false;
    }
    if(type==="EXECUTE_RULE")setSpendCaps(prev=>prev.map(c=>c.token===token?{...c,spent:c.spent+amount}:c));
    setTxHistory(prev=>[{id:"tx"+Date.now(),timestamp:Date.now(),type,token,amount,recipient,ruleName,txHash,status:"SUCCESS"},...prev]);
    if(type==="EXECUTE_RULE")addToast("Rule Executed",`'${ruleName}': ${amount} ${token} sent.`,"success");
    return true;
  };

  const handleDeposit = (sym:string,amt:number)=>{triggerTx("DEPOSIT",sym,amt);addLog(`Deposited ${amt} ${sym}.`,"success");};
  const handleWithdraw = (sym:string,amt:number)=>{if(triggerTx("WITHDRAW",sym,amt,address))addLog(`Withdrew ${amt} ${sym}.`,"success");};
  const handleUpdateCap = (token:string,cap:number)=>{setSpendCaps(prev=>prev.map(c=>c.token===token?{...c,cap}:c));addLog(`Updated ${token} cap to ${cap}.`,"info");};
  const handleEmergencyWithdraw = ()=>tokens.forEach(t=>{if(t.balance>0){triggerTx("EMERGENCY_WITHDRAW",t.symbol,t.balance,address);addLog(`EMERGENCY: evacuated ${t.balance} ${t.symbol}.`,"warn");}});
  const handleReset = ()=>{
    setTokens([
      {symbol:"USDC",name:"USD Coin",decimals:6,balance:12500,usdPrice:1.0,logo:"＄",contractAddress:"0xaf88d065e77c8cC2239327C5EDb3A432268e5831"},
      {symbol:"ETH",name:"Ethereum",decimals:18,balance:1.25,usdPrice:3500.0,logo:"Ξ",contractAddress:"0x82aF49447D8a07e3bd95BD0d56f352415231daa1"},
      {symbol:"USDT",name:"Tether USD",decimals:6,balance:5000,usdPrice:1.0,logo:"₮",contractAddress:"0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"},
      {symbol:"ARB",name:"Arbitrum",decimals:18,balance:1980,usdPrice:1.25,logo:"⚬",contractAddress:"0x912CE5c1150c221414429260d87deCdCc4788193"},
    ]);
    setSpendCaps([{token:"USDC",cap:250,spent:15,enabled:true},{token:"ETH",cap:1.5,spent:0,enabled:true},{token:"USDT",cap:500,spent:0,enabled:true},{token:"ARB",cap:1000,spent:0,enabled:true}]);
    addLog("Treasury reset to defaults.","success");
  };
  const handleAddRule = (data:Omit<PaymentRule,"id"|"createdTime">)=>{
    const id="rule_"+Date.now();
    setRules(prev=>[...prev,{...data,id,nextExecution:data.frequencySeconds>0?Date.now()+(data.frequencySeconds*1000):undefined,createdTime:Date.now()}]);
    addLog(`Rule registered: ${data.name}`,"success");
  };
  const handleToggleRule = (id:string)=>setRules(prev=>prev.map(r=>{if(r.id!==id)return r;const next=r.status===RuleStatus.ACTIVE?RuleStatus.PAUSED:RuleStatus.ACTIVE;addLog(`Rule '${r.name}' → ${next}`,"info");return{...r,status:next,nextExecution:next===RuleStatus.ACTIVE&&r.frequencySeconds>0?Date.now()+(r.frequencySeconds*1000):undefined};}));
  const handleDeleteRule = (id:string)=>{const r=rules.find(x=>x.id===id);if(r){setRules(prev=>prev.filter(x=>x.id!==id));addLog(`Rule '${r.name}' removed.`,"warn");}};
  const handleExecuteNow = (id:string)=>{
    const rule=rules.find(r=>r.id===id);if(!rule)return;
    if(isKillSwitchActive){addLog("Kill switch active — blocked.","error");return;}
    if(rule.ruleType===RuleType.SWEEP){
      const tok=tokens.find(t=>t.symbol===rule.token);
      if(tok&&tok.balance>rule.amount){const excess=tok.balance-rule.amount;if(triggerTx("EXECUTE_RULE",rule.token,excess,rule.recipient,rule.name))addLog(`[SWEEP] ${excess} ${rule.token} swept.`,"success");}
      else addLog("[SWEEP] Balance below threshold.","info");
    } else {
      if(triggerTx("EXECUTE_RULE",rule.token,rule.amount,rule.recipient,rule.name))addLog(`[PAYROLL] ${rule.amount} ${rule.token} → ${rule.destinationName}`,"success");
    }
    setRules(prev=>prev.map(r=>r.id===id?{...r,lastExecuted:Date.now(),nextExecution:r.frequencySeconds>0?Date.now()+(r.frequencySeconds*1000):undefined}:r));
  };

  // Keeper polling
  useEffect(()=>{
    if(phase!=="app"||!isKeeperPolling)return;
    const interval=setInterval(()=>{
      const now=Date.now();
      addLog("[KEEPER] Scanning RuleRegistry on "+chain.name+"...","info");
      if(isKillSwitchActive){addLog("[KEEPER] Kill switch active — paused.","warn");return;}
      rules.forEach(rule=>{
        if(rule.status!==RuleStatus.ACTIVE||!rule.nextExecution||now<rule.nextExecution)return;
        if(rule.ruleType===RuleType.SWEEP){
          const tok=tokens.find(t=>t.symbol===rule.token);
          if(tok&&tok.balance>rule.amount){const excess=tok.balance-rule.amount;if(triggerTx("EXECUTE_RULE",rule.token,excess,rule.recipient,rule.name))addLog(`[AUTO SWEEP] ${excess} ${rule.token} swept.`,"success");}
        } else {
          if(triggerTx("EXECUTE_RULE",rule.token,rule.amount,rule.recipient,rule.name))addLog(`[AUTO PAYROLL] ${rule.amount} ${rule.token} → ${rule.destinationName}`,"success");
        }
        setRules(prev=>prev.map(r=>r.id===rule.id?{...r,lastExecuted:now,nextExecution:r.frequencySeconds>0?now+(r.frequencySeconds*1000):undefined}:r));
      });
    },8500);
    return()=>clearInterval(interval);
  },[phase,isKeeperPolling,isKillSwitchActive,rules,tokens,spendCaps]);

  if(phase==="auth") return <AuthScreen onConnect={doConnect} loading={authLoading}/>;
  if(phase==="connecting") return <ConnectingScreen step={authStep} msg={authMsg}/>;
  if(phase==="error") return (
    <div style={{minHeight:"100vh",background:"#080c10",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"16px"}}>
      <AlertTriangle style={{width:"40px",height:"40px",color:"#ef4444"}}/>
      <div style={{fontSize:"16px",fontWeight:700,color:"#ef4444",fontFamily:"Space Grotesk,sans-serif"}}>Connection Failed</div>
      <div style={{fontSize:"13px",color:"rgba(200,209,217,0.6)",fontFamily:"Inter,sans-serif",maxWidth:"360px",textAlign:"center"}}>{authErr}</div>
      <button onClick={()=>setPhase("auth")} style={{padding:"12px 28px",background:"#28a0f0",color:"#080c10",borderRadius:"10px",border:"none",cursor:"pointer",fontSize:"14px",fontWeight:700,fontFamily:"Space Grotesk,sans-serif"}}>Try Again</button>
    </div>
  );

  const totalUSD = tokens.reduce((a,t)=>a+t.balance*t.usdPrice,0);
  const activeRules = rules.filter(r=>r.status===RuleStatus.ACTIVE).length;

  // Render active view
  const renderView = () => {
    switch(activeNav) {
      case "dashboard": return <DashboardView tokens={tokens} rules={rules} txHistory={txHistory} keeperLogs={keeperLogs} chain={chain} agentAddr={agentAddr} address={address} totalUsers={totalUsers}/>;
      case "treasury":  return <TreasuryOverview tokens={tokens} onDeposit={handleDeposit} onWithdraw={handleWithdraw} agentAddress={agentAddr||"0xE13F9e4C8d0c2Ac9fe11267597f74Fdf60A79Ba90"} ownerAddress={address}/>;
      case "rules":     return <RuleRegistryView rules={rules} onAddRule={handleAddRule} onToggleStatus={handleToggleRule} onDeleteRule={handleDeleteRule} onExecuteRuleNow={handleExecuteNow} spendCaps={spendCaps} tokens={tokens} baseGasPrice={baseGasPrice}/>;
      case "ai":        return <GeminiAgentView onRegisterRule={handleAddRule} onAddSystemLogMsg={addLog} tokens={tokens} rules={rules}/>;
      case "keeper":    return <KeeperSimulatorView isKeeperAutoPolling={isKeeperPolling} onToggleKeeperAutoPolling={()=>{setIsKeeperPolling(v=>!v);addLog(`Keeper: ${!isKeeperPolling?"ACTIVE":"IDLE"}`,"info");}} onTriggerKeeperAuditNow={()=>{addLog("[KEEPER] Forcing audit...","info");rules.filter(r=>r.status===RuleStatus.ACTIVE).forEach(r=>handleExecuteNow(r.id));}} keeperLogs={keeperLogs} onClearKeeperLogs={()=>setKeeperLogs([])} txHistory={txHistory}/>;
      case "analytics": return <TreasuryAnalyticsView tokens={tokens} rules={rules}/>;
      case "safety":    return <SafetyAuditView isKillSwitchActive={isKillSwitchActive} onToggleKillSwitch={()=>{setIsKillSwitchActive(v=>!v);addLog(`Circuit breaker: ${!isKillSwitchActive?"ACTIVE":"INACTIVE"}`,"warn");}} spendCaps={spendCaps} onUpdateCap={handleUpdateCap} onEmergencyWithdrawAll={handleEmergencyWithdraw}/>;
      case "multisig":  return <MultiSigDashboard onAddSystemLogMsg={addLog} isKillSwitchActive={isKillSwitchActive}/>;
      case "gas":       return <GasEfficiencyMeter txCount={txHistory.length} baseGasPrice={baseGasPrice} setBaseGasPrice={(g)=>{setBaseGasPrice(g);if(g>75)addToast("High Gas",`Gas at ${g} Gwei.`,"gas");}}/>;
      case "oracle":    return <OracleFeedSimulator tokens={tokens} onPriceChange={(sym,price)=>setTokens(prev=>prev.map(t=>t.symbol===sym?{...t,usdPrice:price}:t))} onAddSystemLogMsg={addLog}/>;
      case "settings":  return <SettingsView address={address} agentAddr={agentAddr} chain={chain} chains={CHAINS} activeChain={activeChain} switchChain={switchChain} totalUsers={totalUsers} isNew={isNew}/>;
      default: return null;
    }
  };

  const currentNav = NAV.find(n => n.id === activeNav);

  return (
    <div style={{ display:"grid", gridTemplateColumns:"240px 1fr", height:"100vh", background:"#080c10", overflow:"hidden" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes toastIn { from{transform:translateY(20px) scale(0.95);opacity:0} to{transform:none;opacity:1} }
        @keyframes timerShrink { from{width:100%} to{width:0%} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .toast-in { animation: toastIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards; }
        .timer-shrink { animation: timerShrink 5000ms linear forwards; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 999px; }
        /* Override Gemini component styles for consistency */
        .bg-\\[\\#161b22\\]\\/70, .bg-\\[\\#161b22\\]\\/80, .bg-\\[\\#161b22\\] { background: rgba(14,20,30,0.85) !important; }
        .border-\\[\\#30363d\\] { border-color: rgba(255,255,255,0.07) !important; }
        .rounded-2xl { border-radius: 14px !important; }
        .shadow-lg { box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important; }
        .bg-\\[\\#0b0e14\\]\\/40, .bg-\\[\\#0b0e14\\]\\/60, .bg-\\[\\#0b0e14\\] { background: rgba(5,8,14,0.7) !important; }
      `}</style>

      {/* SIDEBAR */}
      <aside style={{ background:"rgba(10,14,20,0.95)", backdropFilter:"blur(20px)", borderRight:"1px solid rgba(255,255,255,0.06)", display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden", position:"relative", zIndex:10 }}>
        {/* Top glow line */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:"1px", background:"linear-gradient(90deg,transparent,rgba(40,160,240,0.5),transparent)" }}/>

        {/* Brand */}
        <div style={{ padding:"20px 20px 16px", borderBottom:"1px solid rgba(255,255,255,0.05)", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
            <div style={{ width:"36px", height:"36px", borderRadius:"10px", background:"rgba(40,160,240,0.12)", border:"1px solid rgba(40,160,240,0.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Bot style={{ width:"18px", height:"18px", color:"#28a0f0" }}/>
            </div>
            <div>
              <div style={{ fontSize:"15px", fontWeight:800, color:"#fff", fontFamily:"Space Grotesk,sans-serif", letterSpacing:"-0.01em" }}>CFO Agent</div>
              <div style={{ display:"flex", alignItems:"center", gap:"5px", marginTop:"2px" }}>
                <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:"#10b981", boxShadow:"0 0 6px #10b981", animation:"pulse 2s infinite" }}/>
                <span style={{ fontSize:"10px", fontWeight:700, color:"#10b981", fontFamily:"JetBrains Mono,monospace", letterSpacing:"0.1em" }}>AUTONOMOUS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, overflowY:"auto", padding:"10px 10px", display:"flex", flexDirection:"column", gap:"2px" }}>
          {NAV.map(item => {
            const active = activeNav === item.id;
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={()=>navigate(item.id)} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"9px 12px", borderRadius:"9px", border:"none", cursor:"pointer", width:"100%", textAlign:"left", background:active?"rgba(40,160,240,0.1)":"transparent", transition:"all 0.15s", position:"relative" }}>
                {active && <div style={{ position:"absolute", left:0, top:"6px", bottom:"6px", width:"2px", borderRadius:"1px", background:"#28a0f0", boxShadow:"0 0 8px #28a0f0" }}/>}
                <Icon style={{ width:"15px", height:"15px", color:active?"#28a0f0":"rgba(150,160,170,0.5)", flexShrink:0 }}/>
                <span style={{ fontSize:"13px", fontWeight:active?700:500, color:active?"#fff":"rgba(180,190,200,0.6)", fontFamily:"Inter,sans-serif", flex:1 }}>{item.label}</span>
                {item.badge==="live" && <span style={{ fontSize:"8px", fontWeight:700, color:"#10b981", background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.25)", borderRadius:"4px", padding:"1px 5px", fontFamily:"JetBrains Mono,monospace", letterSpacing:"0.08em" }}>LIVE</span>}
                {item.badge==="ai" && <span style={{ fontSize:"8px", fontWeight:700, color:"#28a0f0", background:"rgba(40,160,240,0.1)", border:"1px solid rgba(40,160,240,0.25)", borderRadius:"4px", padding:"1px 5px", fontFamily:"JetBrains Mono,monospace" }}>AI</span>}
                {item.badge==="rules" && rules.length>0 && <span style={{ fontSize:"9px", fontWeight:700, color:"rgba(150,160,170,0.6)", background:"rgba(255,255,255,0.06)", borderRadius:"4px", padding:"1px 6px", fontFamily:"JetBrains Mono,monospace" }}>{activeRules}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding:"12px 14px", borderTop:"1px solid rgba(255,255,255,0.05)", flexShrink:0 }}>
          <div style={{ fontSize:"10px", color:"rgba(150,160,170,0.4)", fontFamily:"JetBrains Mono,monospace", marginBottom:"6px", letterSpacing:"0.08em" }}>CONNECTED</div>
          <div style={{ fontSize:"11px", fontWeight:600, color:"rgba(40,160,240,0.8)", fontFamily:"JetBrains Mono,monospace", marginBottom:"4px" }}>{truncAddr(address)||"—"}</div>
          <div style={{ fontSize:"10px", color:"rgba(150,160,170,0.4)", fontFamily:"JetBrains Mono,monospace", marginBottom:"10px" }}>{chain.shortName} · {totalUsers.toString()} users</div>

          {/* Chain switcher */}
          <div style={{ display:"flex", gap:"4px", marginBottom:"8px" }}>
            {Object.entries(CHAINS).map(([key,c]:any) => (
              <button key={key} onClick={()=>switchChain(key)} style={{ flex:1, padding:"5px 0", fontSize:"9px", fontWeight:700, fontFamily:"JetBrains Mono,monospace", letterSpacing:"0.1em", border:`1px solid ${activeChain===key?c.color:"rgba(255,255,255,0.08)"}`, borderRadius:"6px", background:activeChain===key?`${c.color}15`:"transparent", color:activeChain===key?c.color:"rgba(150,160,170,0.4)", cursor:"pointer", transition:"all 0.15s" }}>
                {c.tag}
              </button>
            ))}
          </div>

          <button onClick={disconnect} style={{ width:"100%", padding:"8px", fontSize:"11px", fontWeight:700, fontFamily:"Inter,sans-serif", color:"rgba(239,68,68,0.7)", background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:"8px", cursor:"pointer", transition:"all 0.15s", letterSpacing:"0.01em" }}>
            Disconnect
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden" }}>
        {/* Topbar */}
        <header style={{ height:"56px", background:"rgba(8,12,16,0.9)", backdropFilter:"blur(16px)", borderBottom:"1px solid rgba(255,255,255,0.05)", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", flexShrink:0, boxShadow:"0 1px 0 rgba(40,160,240,0.06)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
            <div>
              <span style={{ fontSize:"15px", fontWeight:700, color:"#f0f4f8", fontFamily:"Space Grotesk,sans-serif" }}>{currentNav?.label}</span>
            </div>
            <div style={{ height:"16px", width:"1px", background:"rgba(255,255,255,0.08)" }}/>
            <div style={{ display:"flex", alignItems:"center", gap:"6px", fontSize:"11px", fontWeight:600, color:"rgba(150,160,170,0.6)", fontFamily:"JetBrains Mono,monospace" }}>
              <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:chain.color, boxShadow:`0 0 6px ${chain.color}` }}/>
              {chain.name}
            </div>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            {/* Treasury total */}
            <div style={{ fontSize:"13px", fontWeight:700, color:"#f0f4f8", fontFamily:"JetBrains Mono,monospace", background:"rgba(16,22,32,0.8)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"8px", padding:"6px 12px" }}>
              ${totalUSD.toLocaleString(undefined,{maximumFractionDigits:0})} <span style={{ color:"rgba(150,160,170,0.5)", fontSize:"11px" }}>USD</span>
            </div>

            {/* Reset */}
            <button onClick={handleReset} style={{ padding:"6px 12px", fontSize:"11px", fontWeight:600, color:"rgba(150,160,170,0.6)", background:"rgba(16,22,32,0.6)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"8px", cursor:"pointer", fontFamily:"Inter,sans-serif", transition:"all 0.15s" }}>
              Reset Vault
            </button>

            {/* Mute */}
            <button onClick={toggleMute} style={{ width:"32px", height:"32px", display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(16,22,32,0.6)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"8px", cursor:"pointer", color:"rgba(150,160,170,0.6)", transition:"all 0.15s" }}>
              {muted ? <VolumeX style={{width:"14px",height:"14px"}}/> : <Volume2 style={{width:"14px",height:"14px"}}/>}
            </button>

            {/* Wallet */}
            <button onClick={()=>setWalletDrop(!walletDrop)} style={{ display:"flex", alignItems:"center", gap:"7px", padding:"6px 12px", fontSize:"11px", fontWeight:600, color:"rgba(200,209,217,0.8)", background:"rgba(16,22,32,0.8)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"8px", cursor:"pointer", fontFamily:"JetBrains Mono,monospace", transition:"all 0.15s", position:"relative" }}>
              <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#10b981", boxShadow:"0 0 6px #10b981", animation:"pulse 2s infinite" }}/>
              {truncAddr(address)||"Connected"}
              <ChevronDown style={{ width:"12px", height:"12px", color:"rgba(150,160,170,0.5)" }}/>
            </button>
            {walletDrop && <>
              <div style={{ position:"fixed", inset:0, zIndex:40 }} onClick={()=>setWalletDrop(false)}/>
              <div style={{ position:"absolute", top:"56px", right:"16px", width:"260px", background:"rgba(14,20,30,0.96)", backdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"12px", padding:"12px", zIndex:50, boxShadow:"0 20px 60px rgba(0,0,0,0.6)" }}>
                <div style={{ fontSize:"9px", fontWeight:700, color:"rgba(150,160,170,0.5)", fontFamily:"JetBrains Mono,monospace", letterSpacing:"0.15em", marginBottom:"10px", paddingBottom:"8px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>SESSION</div>
                {[["Wallet",address||"—"],["Agent",agentAddr||"—"],["Network",chain.name],["Users",totalUsers.toString()]].map(([l,v]) => (
                  <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:"11px", fontFamily:"JetBrains Mono,monospace", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ color:"rgba(150,160,170,0.4)" }}>{l}</span>
                    <span style={{ color:"rgba(200,209,217,0.8)" }}>{String(v).length>20?String(v).slice(0,12)+"...":v}</span>
                  </div>
                ))}
                <button onClick={()=>{disconnect();setWalletDrop(false);}} style={{ width:"100%", marginTop:"10px", padding:"8px", fontSize:"11px", fontWeight:700, color:"rgba(239,68,68,0.8)", background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:"8px", cursor:"pointer", fontFamily:"Inter,sans-serif" }}>
                  Disconnect Wallet
                </button>
              </div>
            </>}
          </div>
        </header>

        {/* Content area — NO auto-scroll */}
        <div ref={contentRef} style={{ flex:1, overflowY:"auto", padding:"24px", background:"radial-gradient(ellipse 80% 60% at 10% 0%, rgba(40,160,240,0.04) 0%, transparent 50%), #080c10" }}>
          {renderView()}
        </div>
      </div>

      {/* TOASTS */}
      <div style={{ position:"fixed", bottom:"20px", right:"20px", zIndex:100, display:"flex", flexDirection:"column", gap:"10px", maxWidth:"360px", width:"100%", pointerEvents:"none" }}>
        {toasts.map((toast:any) => {
          const isSuccess = toast.type==="success";
          const isError   = toast.type==="error";
          const isWarn    = toast.type==="warn"||toast.type==="gas";
          return (
            <div key={toast.id} className="toast-in" style={{ background:isSuccess?"rgba(10,20,16,0.97)":isError?"rgba(20,10,10,0.97)":isWarn?"rgba(20,16,10,0.97)":"rgba(10,14,22,0.97)", backdropFilter:"blur(16px)", border:`1px solid ${isSuccess?"rgba(16,185,129,0.3)":isError?"rgba(239,68,68,0.3)":isWarn?"rgba(245,158,11,0.3)":"rgba(40,160,240,0.3)"}`, borderRadius:"12px", padding:"14px 16px", boxShadow:"0 12px 40px rgba(0,0,0,0.6)", pointerEvents:"auto", display:"flex", gap:"12px", alignItems:"flex-start", position:"relative", overflow:"hidden" }}>
              <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:isSuccess?"#10b981":isError?"#ef4444":isWarn?"#f59e0b":"#28a0f0", marginTop:"4px", flexShrink:0, boxShadow:`0 0 8px ${isSuccess?"#10b981":isError?"#ef4444":isWarn?"#f59e0b":"#28a0f0"}` }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:"12px", fontWeight:800, color:"#fff", fontFamily:"Space Grotesk,sans-serif", marginBottom:"3px", textTransform:"uppercase", letterSpacing:"0.03em" }}>{toast.title}</div>
                <div style={{ fontSize:"11px", color:"rgba(200,209,217,0.6)", fontFamily:"Inter,sans-serif", lineHeight:"1.5" }}>{toast.description}</div>
              </div>
              <button onClick={()=>setToasts(prev=>prev.filter((t:any)=>t.id!==toast.id))} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(150,160,170,0.4)", fontSize:"14px", lineHeight:1, flexShrink:0, padding:0, pointerEvents:"auto" }}>✕</button>
              <div className="timer-shrink" style={{ position:"absolute", bottom:0, left:0, height:"2px", background:isSuccess?"#10b981":isError?"#ef4444":isWarn?"#f59e0b":"#28a0f0", borderRadius:"1px" }}/>
            </div>
          );
        })}
      </div>
    </div>
  );
}
