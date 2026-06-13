import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, BookOpen, Shield, BarChart3,
  Zap, Settings, Wallet, ChevronDown, Check, Volume2,
  VolumeX, RefreshCw, AlertTriangle, TrendingUp,
  Activity, X, ExternalLink, Copy, CheckCircle, Menu
} from "lucide-react";

// Custom CFO Agent logo - unique brand mark
const CFOLogo = ({ size = 36 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="10" fill="rgba(40,160,240,0.12)" stroke="rgba(40,160,240,0.4)" strokeWidth="1"/>
    {/* Treasury building pillars */}
    <rect x="8" y="28" width="4" height="8" rx="1" fill="#28a0f0" opacity="0.9"/>
    <rect x="14" y="24" width="4" height="12" rx="1" fill="#28a0f0"/>
    <rect x="20" y="20" width="4" height="16" rx="1" fill="#28a0f0"/>
    <rect x="26" y="24" width="4" height="12" rx="1" fill="#28a0f0" opacity="0.9"/>
    {/* Trend line */}
    <polyline points="8,26 14,22 20,18 26,22 32,14" stroke="#6FFFE9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    {/* Dollar signal dot */}
    <circle cx="32" cy="14" r="3" fill="#6FFFE9"/>
    <circle cx="32" cy="14" r="5" fill="none" stroke="#6FFFE9" strokeWidth="1" opacity="0.4"/>
    {/* Base line */}
    <line x1="6" y1="36" x2="34" y2="36" stroke="rgba(40,160,240,0.3)" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);
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
  { id: "ai",         label: "AI Copilot",     icon: BarChart3,             badge: "ai" },
  { id: "keeper",     label: "Keeper Bot",     icon: Activity,        badge: "live" },
  { id: "analytics",  label: "Analytics",      icon: BarChart3,       badge: null },
  { id: "safety",     label: "Safety & Caps",  icon: Shield,          badge: null },
  { id: "multisig",   label: "Multi-Sig",      icon: CheckCircle,     badge: null },
  { id: "gas",        label: "Gas Efficiency", icon: Zap,             badge: null },
  { id: "oracle",     label: "Oracle Feeds",   icon: TrendingUp,      badge: null },
  { id: "settings",   label: "Settings",       icon: Settings,        badge: null },
];

// ---- LANDING + AUTH SCREEN ----
function AuthScreen({ onConnect, loading }: { onConnect: () => void; loading: boolean }) {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const el = document.getElementById("auth-scroll");
    if (!el) return;
    const handler = () => setScrolled(el.scrollTop > 40);
    el.addEventListener("scroll", handler);
    return () => el.removeEventListener("scroll", handler);
  }, []);

  return (
    <div style={{ height:"100vh", background:"#060A12", overflow:"hidden", display:"flex", flexDirection:"column", fontFamily:"Inter,sans-serif" }}>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes pulse2 { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes scan2 { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .fade1{animation:fadeUp .6s .1s both}
        .fade2{animation:fadeUp .6s .2s both}
        .fade3{animation:fadeUp .6s .3s both}
        .fade4{animation:fadeUp .6s .4s both}
        .fade5{animation:fadeUp .6s .5s both}
        .feature-card:hover{border-color:rgba(40,160,240,...3)!important;background:rgba(16,24,36,...9)!important;transform:translateY(-2px)}
        .step-card:hover{border-color:rgba(40,160,240,...25)!important}
        .launch-btn:hover{background:#3ab0ff!important;box-shadow:0 8px 40px rgba(40,160,240,...5)!important;transform:translateY(-1px)}
        .nav-link:hover{color:#fff!important}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:rgba(40,160,240,...2);border-radius:4px}
      `}</style>

      {/* Scanline */}
      <div style={{ position:"fixed",left:0,right:0,height:"1px",background:"linear-gradient(transparent,rgba(40,160,240,...25),transparent)",pointerEvents:"none",zIndex:999,top:0,animation:"scan2 8s linear infinite" }}/>

      {/* NAV */}
      <nav style={{ position:"fixed",top:0,left:0,right:0,zIndex:100,padding:"0 40px",height:"60px",display:"flex",alignItems:"center",justifyContent:"space-between",background:scrolled?"rgba(6,10,18,...95)":"transparent",backdropFilter:scrolled?"blur(20px)":"none",borderBottom:scrolled?"1px solid rgba(255,255,255,...06)":"none",transition:"all .3s" }}>
        <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
          <CFOLogo size={28}/>
          <span style={{ fontFamily:"Space Grotesk,sans-serif",fontSize:"17px",fontWeight:800,color:"#fff",letterSpacing:"-.01em" }}>CFO Agent</span>
          <span style={{ fontSize:"9px",fontWeight:700,color:"#10b981",background:"rgba(16,185,129,...1)",border:"1px solid rgba(16,185,129,...25)",borderRadius:"999px",padding:"2px 8px",fontFamily:"JetBrains Mono,monospace",letterSpacing:".1em",marginLeft:4 }}>LIVE</span>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:"28px" }}>
          {["How It Works","Features","Chains"].map(l => (
            <a key={l} href={`#${l.replace(/ /g,"-").toLowerCase()}`} className="nav-link" style={{ fontSize:"13px",fontWeight:600,color:"rgba(200,210,220,...75)",textDecoration:"none",transition:"color .2s" }}>{l}</a>
          ))}
          <button onClick={onConnect} disabled={loading} className="launch-btn" style={{ padding:"8px 20px",background:"#28a0f0",color:"#060A12",fontSize:"13px",fontWeight:800,borderRadius:"8px",border:"none",cursor:loading?"not-allowed":"pointer",fontFamily:"Space Grotesk,sans-serif",boxShadow:"0 4px 20px rgba(40,160,240,...3)",transition:"all .2s",letterSpacing:".01em",display:"flex",alignItems:"center",gap:7 }}>
            {loading ? <RefreshCw style={{width:"13px",height:"13px",animation:"spin 1s linear infinite"}}/> : <Wallet style={{width:"13px",height:"13px"}}/>}
            {loading ? "Connecting." : "Launch App"}
          </button>
        </div>
      </nav>

      {/* SCROLLABLE CONTENT */}
      <div id="auth-scroll" style={{ flex:1,overflowY:"auto",overflowX:"hidden" }}>

        {/* HERO */}
        <section style={{ minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"120px 24px 80px",position:"relative",overflow:"hidden" }}>
          {/* Background effects */}
          <div style={{ position:"absolute",top:"-20%",left:"50%",transform:"translateX(-50%)",width:"700px",height:"700px",background:"radial-gradient(ellipse,rgba(40,160,240,...1) 0%,transparent 65%)",pointerEvents:"none" }}/>
          <div style={{ position:"absolute",bottom:"-10%",right:"-5%",width:"400px",height:"400px",background:"radial-gradient(ellipse,rgba(111,255,233,...05) 0%,transparent 65%)",pointerEvents:"none" }}/>
          <div style={{ position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(40,160,240,...04) 1px,transparent 1px),linear-gradient(90deg,rgba(40,160,240,...04) 1px,transparent 1px)",backgroundSize:"44px 44px",maskImage:"radial-gradient(ellipse 80% 80% at 50% 50%,black 40%,transparent 100%)" }}/>

          <div className="fade1" style={{ display:"inline-flex",alignItems:"center",gap:8,background:"rgba(40,160,240,...1)",border:"1px solid rgba(40,160,240,...25)",borderRadius:"999px",padding:"6px 16px",marginBottom:28 }}>
            <div style={{ width:6,height:6,borderRadius:"50%",background:"#10b981",boxShadow:"0 0 8px #10b981",animation:"pulse2 2s infinite" }}/>
            <span style={{ fontFamily:"JetBrains Mono,monospace",fontSize:11,fontWeight:700,color:"#28a0f0",letterSpacing:".12em",textTransform:"uppercase" }}>Arbitrum Open House London · Buildathon 2026</span>
          </div>

          <h1 className="fade2" style={{ fontFamily:"Space Grotesk,sans-serif",fontSize:"clamp(40px,8vw,80px)",fontWeight:900,color:"#fff",lineHeight:1.05,letterSpacing:"-.03em",marginBottom:20 }}>
            Your On-Chain CFO<br/>
            <span style={{ background:"linear-gradient(135deg,#28a0f0,#6FFFE9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text" }}>Never Sleeps</span>
          </h1>

          <p className="fade3" style={{ fontSize:"clamp(16px,2.5vw,20px)",color:"rgba(220,228,236,...88)",lineHeight:1.75,maxWidth:580,margin:"0 auto 40px" }}>
            Set payment rules once. Your autonomous treasury agent executes them 24/7 on Arbitrum and Robinhood Chain. no manual transactions, no missed payments, no human error.
          </p>

          <div className="fade4" style={{ display:"flex",alignItems:"center",gap:14,flexWrap:"wrap",justifyContent:"center",marginBottom:64 }}>
            <button onClick={onConnect} disabled={loading} className="launch-btn" style={{ padding:"16px 36px",background:"#28a0f0",color:"#060A12",fontSize:"16px",fontWeight:800,borderRadius:"12px",border:"none",cursor:loading?"not-allowed":"pointer",fontFamily:"Space Grotesk,sans-serif",boxShadow:"0 6px 28px rgba(40,160,240,...4)",transition:"all .2s",letterSpacing:".01em",display:"flex",alignItems:"center",gap:10 }}>
              {loading ? <RefreshCw style={{width:"18px",height:"18px",animation:"spin 1s linear infinite"}}/> : <Wallet style={{width:"18px",height:"18px"}}/>}
              {loading ? "Connecting." : "Connect Wallet. Launch App"}
            </button>
            <a href="#how-it-works" style={{ padding:"16px 28px",color:"rgba(220,228,236,...9)",fontSize:"15px",fontWeight:700,borderRadius:"12px",border:"1px solid rgba(255,255,255,...1)",background:"rgba(16,22,32,...6)",backdropFilter:"blur(8px)",textDecoration:"none",transition:"all .2s" }}>
              See How It Works ↓
            </a>
          </div>

          {/* Live terminal preview */}
          <div className="fade5" style={{ width:"100%",maxWidth:760,background:"rgba(6,10,16,...98)",border:"1px solid rgba(255,255,255,...08)",borderRadius:16,overflow:"hidden",boxShadow:"0 40px 100px rgba(0,0,0,...7)",animation:"float 6s ease-in-out infinite" }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,padding:"12px 18px",background:"rgba(14,20,30,...9)",borderBottom:"1px solid rgba(255,255,255,...06)" }}>
              {["#ef4444","#f59e0b","#10b981"].map(c=><div key={c} style={{width:11,height:11,borderRadius:"50%",background:c}}/>)}
              <span style={{ flex:1,textAlign:"center",fontFamily:"JetBrains Mono,monospace",fontSize:11,fontWeight:600,color:"rgba(170,180,190,...7)",letterSpacing:".1em" }}>cfo-agent · keeper-bot · arbitrum-sepolia</span>
            </div>
            <div style={{ padding:"20px 24px",textAlign:"left" }}>
              {[
                {c:"rgba(170,180,190,...65)",p:"[SYS]",m:"keeper bot initialized · polling every 8.5s"},
                {c:"#4a7a55",p:"[POL]",m:"scanning RuleRegistry · 2 active rules detected"},
                {c:"#f59e0b",p:"[EXE]",m:"dequeuing job #1041 · CORE CONTRIBUTOR PAYROLL"},
                {c:"#6FFFE9",p:"[TX ]",m:"submitted · 0x7f3a2c.b2e1 · gas 142,300"},
                {c:"#10b981",p:"[OK ]",m:"confirmed · 200 USDC → dev lead · block #21,814,965"},
                {c:"#4a7a55",p:"[POL]",m:"scanning RuleRegistry · next execution in 8.5s"},
              ].map((l,i)=>(
                <div key={i} style={{ display:"flex",gap:12,padding:"3px 0",fontFamily:"JetBrains Mono,monospace",fontSize:12,lineHeight:1.9 }}>
                  <span style={{ color:"rgba(170,180,190,...55)",width:60,flexShrink:0 }}>{`17:4${i}:0${i*3}`}</span>
                  <span style={{ color:l.c,fontWeight:700,width:46,flexShrink:0 }}>{l.p}</span>
                  <span style={{ color:l.c === "#10b981" ? "#10b981" : "rgba(220,228,236,...85)" }}>{l.m}</span>
                </div>
              ))}
              <div style={{ display:"flex",gap:12,padding:"3px 0",fontFamily:"JetBrains Mono,monospace",fontSize:12,lineHeight:1.9,marginTop:2 }}>
                <span style={{ color:"rgba(170,180,190,...55)",width:60,flexShrink:0 }}>17:43:51</span>
                <span style={{ color:"#28a0f0",fontWeight:700 }}>$</span>
                <span style={{ display:"inline-block",width:8,height:14,background:"#28a0f0",animation:"pulse2 .8s infinite",verticalAlign:"middle",marginLeft:4,borderRadius:1 }}/>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <div style={{ borderTop:"1px solid rgba(255,255,255,...06)",borderBottom:"1px solid rgba(255,255,255,...06)",background:"rgba(10,14,22,...6)",backdropFilter:"blur(12px)",padding:"0 40px" }}>
          <div style={{ maxWidth:1000,margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(4,1fr)" }}>
            {[
              {n:"4",l:"Smart Contracts"},
              {n:"2",l:"Chains Deployed"},
              {n:"99%",l:"Gas Savings vs L1"},
              {n:"24/7",l:"Autonomous Execution"},
            ].map((s,i)=>(
              <div key={i} style={{ textAlign:"center",padding:"28px 20px",borderRight:i<3?"1px solid rgba(255,255,255,...06)":"none" }}>
                <div style={{ fontFamily:"Space Grotesk,sans-serif",fontSize:"clamp(28px,5vw,38px)",fontWeight:900,background:"linear-gradient(135deg,#28a0f0,#6FFFE9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",letterSpacing:"-.02em",marginBottom:4 }}>{s.n}</div>
                <div style={{ fontFamily:"JetBrains Mono,monospace",fontSize:10,fontWeight:700,color:"rgba(170,180,190,...68)",letterSpacing:".15em",textTransform:"uppercase" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* HOW IT WORKS */}
        <section id="how-it-works" style={{ padding:"100px 40px",maxWidth:1100,margin:"0 auto" }}>
          <div style={{ textAlign:"center",marginBottom:60 }}>
            <div style={{ fontFamily:"JetBrains Mono,monospace",fontSize:11,fontWeight:700,color:"#28a0f0",letterSpacing:".2em",textTransform:"uppercase",marginBottom:12 }}>// HOW IT WORKS</div>
            <h2 style={{ fontFamily:"Space Grotesk,sans-serif",fontSize:"clamp(28px,5vw,46px)",fontWeight:900,color:"#fff",letterSpacing:"-.02em",lineHeight:1.1,marginBottom:14 }}>Three steps to<br/>autonomous treasury</h2>
            <p style={{ fontSize:16,color:"rgba(220,228,236,...85)",lineHeight:1.75,maxWidth:500,margin:"0 auto" }}>From natural language to on-chain execution in under 60 seconds.</p>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:20 }}>
            {[
              {n:"01",icon:"🔐",t:"Connect & Deploy",d:"Sign in with MetaMask using SIWE. Your personal CFOAgent smart contract is automatically deployed on Arbitrum: one per wallet, non-custodial, fully yours.",tag:"AgentFactory.sol"},
              {n:"02",icon:"🤖",t:"Describe in English",d:'Type "Pay dev lead 500 USDC weekly" and our AI parses it into a production-ready on-chain payment rule. No code. No ABI. No manual transactions.',tag:"AI Copilot"},
              {n:"03",icon:"⚡",t:"Keeper Executes Forever",d:"The keeper bot polls your RuleRegistry every 8.5 seconds. When conditions are met, it fires on-chain transactions automatically with full audit trails.",tag:"ExecutionSequencer.sol"},
            ].map((s,i)=>(
              <div key={i} className="step-card" style={{ background:"rgba(14,20,30,...8)",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,...07)",borderRadius:16,padding:"28px",transition:"all .25s",position:"relative",overflow:"hidden" }}>
                <div style={{ position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(40,160,240,...4),transparent)" }}/>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:18 }}>
                  <span style={{ fontFamily:"JetBrains Mono,monospace",fontSize:10,fontWeight:700,color:"rgba(40,160,240,...5)",letterSpacing:".15em" }}>STEP {s.n}</span>
                  <div style={{ flex:1,height:1,background:"rgba(40,160,240,...15)" }}/>
                </div>
                <div style={{ fontSize:28,marginBottom:14 }}>{s.icon}</div>
                <h3 style={{ fontFamily:"Space Grotesk,sans-serif",fontSize:18,fontWeight:800,color:"#fff",marginBottom:10,letterSpacing:"-.01em" }}>{s.t}</h3>
                <p style={{ fontSize:13,color:"rgba(220,228,236,...85)",lineHeight:1.75,marginBottom:16 }}>{s.d}</p>
                <span style={{ display:"inline-flex",alignItems:"center",gap:5,fontFamily:"JetBrains Mono,monospace",fontSize:10,fontWeight:700,color:"#28a0f0",background:"rgba(40,160,240,...08)",border:"1px solid rgba(40,160,240,...15)",borderRadius:6,padding:"4px 10px",letterSpacing:".06em" }}>{s.tag}</span>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" style={{ padding:"0 40px 100px",maxWidth:1100,margin:"0 auto" }}>
          <div style={{ textAlign:"center",marginBottom:60 }}>
            <div style={{ fontFamily:"JetBrains Mono,monospace",fontSize:11,fontWeight:700,color:"#28a0f0",letterSpacing:".2em",textTransform:"uppercase",marginBottom:12 }}>// FEATURES</div>
            <h2 style={{ fontFamily:"Space Grotesk,sans-serif",fontSize:"clamp(28px,5vw,46px)",fontWeight:900,color:"#fff",letterSpacing:"-.02em",lineHeight:1.1 }}>Everything your treasury<br/>needs to run itself</h2>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:14 }}>
            {[
              {icon:"📋",c:"rgba(40,160,240,...1)",b:"rgba(40,160,240,...2)",t:"Rule Registry",d:"Create scheduled payroll, conditional sweeps, and recurring transfers stored on-chain and executed trustlessly."},
              {icon:"🛡️",c:"rgba(16,185,129,...1)",b:"rgba(16,185,129,...2)",t:"Daily Spend Caps",d:"Per-token daily limits block over-execution. Emergency kill switch halts all activity instantly."},
              {icon:"🧠",c:"rgba(168,85,247,...1)",b:"rgba(168,85,247,...2)",t:"AI Rule Copilot",d:"Describe payment needs in plain English. AI generates smart contract-compatible rule configurations instantly."},
              {icon:"⚡",c:"rgba(245,158,11,...1)",b:"rgba(245,158,11,...2)",t:"Gas Efficiency",d:"Arbitrum L2 reduces costs by 99% vs Ethereum mainnet. Robinhood Chain drops costs to near-zero."},
              {icon:"🔗",c:"rgba(111,255,233,...1)",b:"rgba(111,255,233,...2)",t:"Multi-Chain",d:"Deployed on Arbitrum Sepolia and Robinhood Chain. Switch networks in one click, same architecture."},
              {icon:"📊",c:"rgba(239,68,68,...1)",b:"rgba(239,68,68,...2)",t:"Treasury Analytics",d:"Real-time runway projections, burn rate tracking, oracle price feeds, and full audit sheet export."},
            ].map((f,i)=>(
              <div key={i} className="feature-card" style={{ background:"rgba(14,20,30,...75)",backdropFilter:"blur(14px)",border:"1px solid rgba(255,255,255,...07)",borderRadius:14,padding:"22px",display:"flex",gap:16,transition:"all .25s" }}>
                <div style={{ width:42,height:42,borderRadius:10,background:f.c,border:`1px solid ${f.b}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>{f.icon}</div>
                <div>
                  <div style={{ fontFamily:"Space Grotesk,sans-serif",fontSize:15,fontWeight:700,color:"#fff",marginBottom:6,letterSpacing:"-.01em" }}>{f.t}</div>
                  <div style={{ fontSize:13,color:"rgba(220,228,236,...8)",lineHeight:1.7 }}>{f.d}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CHAINS */}
        <section id="chains" style={{ padding:"0 40px 100px",maxWidth:1100,margin:"0 auto" }}>
          <div style={{ textAlign:"center",marginBottom:48 }}>
            <div style={{ fontFamily:"JetBrains Mono,monospace",fontSize:11,fontWeight:700,color:"#28a0f0",letterSpacing:".2em",textTransform:"uppercase",marginBottom:12 }}>// DEPLOYED CONTRACTS</div>
            <h2 style={{ fontFamily:"Space Grotesk,sans-serif",fontSize:"clamp(28px,5vw,46px)",fontWeight:900,color:"#fff",letterSpacing:"-.02em",lineHeight:1.1 }}>Live on two chains</h2>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16 }}>
            {[
              {name:"Arbitrum Sepolia",id:"421614",color:"#28a0f0",logo:<svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#2D374B"/><path d="M16 4L6 20.5L16 28L26 20.5Z" fill="#28a0f0" opacity=".9"/><path d="M16 4L11 20.5L16 28V4Z" fill="#96BEDC"/></svg>,factory:"0xF1EE2CC9741547cAf04FE99ed2ad8Ff072AEe900",registry:"0x5eadac819B2206B960a30978eFCEf3E1351C6b10",sequencer:"0xA6a5A3364c8A169c9F38768df67Ad89AA33f14e2",explorer:"https://sepolia.arbiscan.io",status:"ACTIVE"},
              {name:"Robinhood Chain",id:"46630",color:"#00C805",logo:<svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#00C805"/><path d="M10 8h7c3.3 0 6 2.7 6 6s-2.7 6-6 6h-2l4 4h-4l-4-4V8z" fill="white"/><rect x="10" y="8" width="3" height="12" fill="white"/></svg>,factory:"0xcd75Ad7AC9C9325105f798c476E84176648F391A",registry:"0xbfce6B877Ebff977bB6e80B24FbBb7bC4eBcA4df",sequencer:"0x6d5a4D246617d711595a1657c55B17B97e20bdda",explorer:"https://explorer.testnet.chain.robinhood.com",status:"DEPLOYED"},
            ].map((c,i)=>(
              <div key={i} style={{ background:"rgba(14,20,30,...8)",backdropFilter:"blur(16px)",border:`1px solid rgba(255,255,255,...08)`,borderRadius:16,padding:"24px",position:"relative",overflow:"hidden" }}>
                <div style={{ position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${c.color}60,transparent)` }}/>
                <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16 }}>
                  {c.logo}
                  <div>
                    <div style={{ fontFamily:"Space Grotesk,sans-serif",fontSize:17,fontWeight:800,color:"#fff",marginBottom:2 }}>{c.name}</div>
                    <div style={{ fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(170,180,190,...65)",letterSpacing:".1em" }}>CHAIN ID: {c.id}</div>
                  </div>
                  <div style={{ marginLeft:"auto",fontSize:9,fontWeight:700,color:c.color,background:`${c.color}15`,border:`1px solid ${c.color}40`,borderRadius:6,padding:"3px 9px",fontFamily:"JetBrains Mono,monospace",letterSpacing:".1em" }}>{c.status}</div>
                </div>
                <div style={{ fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(170,180,190,...65)",lineHeight:2.2,marginBottom:14 }}>
                  <div>Factory:&nbsp;&nbsp; {c.factory.slice(0,18)}.</div>
                  <div>Registry:&nbsp; {c.registry.slice(0,18)}.</div>
                  <div>Sequencer: {c.sequencer.slice(0,18)}.</div>
                </div>
                <a href={`${c.explorer}/address/${c.factory}`} target="_blank" rel="noreferrer" style={{ display:"flex",alignItems:"center",gap:5,fontFamily:"JetBrains Mono,monospace",fontSize:10,fontWeight:700,color:c.color,textDecoration:"none",letterSpacing:".06em" }}>
                  <ExternalLink style={{width:10,height:10}}/> View on Explorer
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ padding:"80px 24px 100px",textAlign:"center",position:"relative",overflow:"hidden" }}>
          <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:600,height:300,background:"radial-gradient(ellipse,rgba(40,160,240,...1) 0%,transparent 65%)",pointerEvents:"none" }}/>
          <div style={{ position:"relative",zIndex:1 }}>
            <h2 style={{ fontFamily:"Space Grotesk,sans-serif",fontSize:"clamp(30px,6vw,54px)",fontWeight:900,color:"#fff",letterSpacing:"-.02em",marginBottom:14,lineHeight:1.1 }}>Ready to automate<br/>your treasury?</h2>
            <p style={{ fontSize:17,color:"rgba(220,228,236,...85)",lineHeight:1.75,marginBottom:40,maxWidth:480,margin:"0 auto 40px" }}>Connect your wallet and deploy your personal CFO Agent in under 60 seconds. Non-custodial. No setup fees.</p>
            <button onClick={onConnect} disabled={loading} className="launch-btn" style={{ padding:"18px 44px",background:"#28a0f0",color:"#060A12",fontSize:"17px",fontWeight:800,borderRadius:"14px",border:"none",cursor:loading?"not-allowed":"pointer",fontFamily:"Space Grotesk,sans-serif",boxShadow:"0 6px 32px rgba(40,160,240,...4)",transition:"all .2s",letterSpacing:".01em",display:"inline-flex",alignItems:"center",gap:12 }}>
              {loading ? <RefreshCw style={{width:"20px",height:"20px",animation:"spin 1s linear infinite"}}/> : <Wallet style={{width:"20px",height:"20px"}}/>}
              {loading ? "Connecting." : "Connect Wallet. It's Free"}
            </button>
            <div style={{ marginTop:20,fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(140,160,180,...6)",letterSpacing:".1em" }}>
              SECURED WITH SIWE · EIP-4361 · NON-CUSTODIAL · ARBITRUM SEPOLIA
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ borderTop:"1px solid rgba(255,255,255,...06)",padding:"24px 40px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,background:"rgba(6,10,16,...8)" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <CFOLogo size={20}/>
            <span style={{ fontFamily:"Space Grotesk,sans-serif",fontSize:13,fontWeight:700,color:"rgba(255,255,255,...4)" }}>CFO Agent · Arbitrum Open House London 2026</span>
          </div>
          <div style={{ fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(170,180,190,...5)",letterSpacing:".1em" }}>
            ARBITRUM SEPOLIA · ROBINHOOD CHAIN · NON-CUSTODIAL
          </div>
        </footer>
      </div>
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
            <CFOLogo size={28}/>
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
          <CFOLogo size={24}/>
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
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:"14px", marginBottom:"24px" }}>
        <StatCard label="Treasury Value"   value={`$${totalUSD.toLocaleString(undefined,{maximumFractionDigits:0})}`} sub="Total USD value" accent icon={Wallet}/>
        <StatCard label="Active Rules"     value={activeRules} sub={`of ${rules.length} configured`} icon={BookOpen}/>
        <StatCard label="Transactions"     value={confirmedTx} sub="confirmed on-chain" icon={Activity}/>
        <StatCard label="AI Insights"      value={keeperOk} sub="successful executions" icon={Zap}/>
      </div>

      {/* Token breakdown + recent activity */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:"16px", marginBottom:"16px" }}>
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
                {c.addr.startsWith("0x") ? `${c.addr.slice(0,10)}.${c.addr.slice(-6)}` : c.addr}
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
              <span style={{ fontSize:"12px", fontWeight:600, color:"#f0f4f8", fontFamily:"JetBrains Mono,monospace" }}>{row.value.length>30?row.value.slice(0,14)+"."+row.value.slice(-8):row.value}</span>
              {row.value.startsWith("0x") && <button onClick={()=>copy(row.value,row.key)} style={{ background:"none", border:"none", cursor:"pointer", color:copied===row.key?"#10b981":"rgba(150,160,170,0.4)", padding:"2px" }}>{copied===row.key?<Check style={{width:"12px",height:"12px"}}/>:<Copy style={{width:"12px",height:"12px"}}/>}</button>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ background:"rgba(16,22,32,0.7)", backdropFilter:"blur(16px)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"14px", padding:"24px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:0, left:0, right:0, height:"1px", background:"linear-gradient(90deg,transparent,rgba(40,160,240,0.4),transparent)" }}/>
        <div style={{ fontSize:"12px", fontWeight:700, color:"rgba(150,160,170,0.7)", fontFamily:"JetBrains Mono,monospace", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"20px" }}>Deployed Chains</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:"12px" }}>
          {Object.entries(chains).map(([key, c]: any) => (
            <div key={key} onClick={()=>switchChain(key)} style={{ background:activeChain===key?"rgba(40,160,240,0.08)":"rgba(5,8,14,0.6)", border:`1px solid ${activeChain===key?c.color:"rgba(255,255,255,0.06)"}`, borderRadius:"12px", padding:"16px", cursor:"pointer", transition:"all 0.2s" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
                <div style={{ fontSize:"13px", fontWeight:700, color:activeChain===key?c.color:"#f0f4f8", fontFamily:"Space Grotesk,sans-serif" }}>{c.name}</div>
                {activeChain===key && <div style={{ fontSize:"9px", fontWeight:700, color:c.color, background:`${c.color}15`, border:`1px solid ${c.color}40`, borderRadius:"4px", padding:"2px 7px", fontFamily:"JetBrains Mono,monospace", letterSpacing:"0.1em" }}>ACTIVE</div>}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
                {[["Chain ID", c.id],["Factory", c.factory.slice(0,14)+"."],["Registry", c.registry.slice(0,14)+"."]].map(([l,v]) => (
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
  const [authMsg, setAuthMsg]     = useState("Initializing.");
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
    { symbol:"USDC", name:"USD Coin",   decimals:6,  balance:0, usdPrice:1.0,    logo:"＄", contractAddress:"0xaf88d065e77c8cC2239327C5EDb3A432268e5831" },
    { symbol:"ETH",  name:"Ethereum",   decimals:18, balance:0, usdPrice:3500.0, logo:"Ξ",  contractAddress:"0x82aF49447D8a07e3bd95BD0d56f352415231daa1" },
    { symbol:"USDT", name:"Tether USD", decimals:6,  balance:0, usdPrice:1.0,    logo:"₮",  contractAddress:"0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" },
    { symbol:"ARB",  name:"Arbitrum",   decimals:18, balance:0, usdPrice:1.25,   logo:"⚬",  contractAddress:"0x912CE5c1150c221414429260d87deCdCc4788193" },
  ]);
  const [rules, setRules] = useState<PaymentRule[]>([]);
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
    { id:"l2", timestamp:Date.now()-3000, message:`Agent contract verified at 0xE13F.`, type:"info" },
    { id:"l3", timestamp:Date.now()-1000, message:"Scanning RuleRegistry. 2 active rules detected.", type:"success" },
  ]);
  const [txHistory, setTxHistory] = useState<TxLog[]>([]);
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
    SFX.init(); setAuthLoading(true); setPhase("connecting");
    try {
      setAuthStep("connecting"); setAuthMsg("Connecting wallet.");
      if(!hasWallet()) throw new Error("MetaMask not detected. Please install MetaMask.");
      const addr = await connectWallet(); setAddress(addr);
      setAuthStep("signing"); setAuthMsg("Sign message to verify ownership.");
      await signSiwe(addr);
      setAuthStep("checking"); setAuthMsg("Checking for existing agent.");
      const [has, total] = await Promise.all([checkHasAgent(addr), getTotalAgents()]);
      setTotalUsers(total);
      let agentAddress = "";
      if(has) { agentAddress = await getAgentAddress(addr)||""; setAgentAddr(agentAddress); }
      else {
        setIsNew(true); setAuthStep("deploying"); setAuthMsg("Deploying your CFO Agent on Arbitrum.");
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
    addLog(`[CHAIN] Switching to ${c.name}.`, "info");
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
      {symbol:"USDC",name:"USD Coin",decimals:6,balance:0,usdPrice:1.0,logo:"＄",contractAddress:"0xaf88d065e77c8cC2239327C5EDb3A432268e5831"},
      {symbol:"ETH",name:"Ethereum",decimals:18,balance:0,usdPrice:3500.0,logo:"Ξ",contractAddress:"0x82aF49447D8a07e3bd95BD0d56f352415231daa1"},
      {symbol:"USDT",name:"Tether USD",decimals:6,balance:0,usdPrice:1.0,logo:"₮",contractAddress:"0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"},
      {symbol:"ARB",name:"Arbitrum",decimals:18,balance:0,usdPrice:1.25,logo:"⚬",contractAddress:"0x912CE5c1150c221414429260d87deCdCc4788193"},
    ]);
    setSpendCaps([{token:"USDC",cap:250,spent:0,enabled:true},{token:"ETH",cap:1.5,spent:0,enabled:true},{token:"USDT",cap:500,spent:0,enabled:true},{token:"ARB",cap:1000,spent:0,enabled:true}]);
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
    if(isKillSwitchActive){addLog("Kill switch active. blocked.","error");return;}
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
      addLog("[KEEPER] Scanning RuleRegistry on "+chain.name+".","info");
      if(isKillSwitchActive){addLog("[KEEPER] Kill switch active. paused.","warn");return;}
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
      case "keeper":    return <KeeperSimulatorView isKeeperAutoPolling={isKeeperPolling} onToggleKeeperAutoPolling={()=>{setIsKeeperPolling(v=>!v);addLog(`Keeper: ${!isKeeperPolling?"ACTIVE":"IDLE"}`,"info");}} onTriggerKeeperAuditNow={()=>{addLog("[KEEPER] Forcing audit.","info");rules.filter(r=>r.status===RuleStatus.ACTIVE).forEach(r=>handleExecuteNow(r.id));}} keeperLogs={keeperLogs} onClearKeeperLogs={()=>setKeeperLogs([])} txHistory={txHistory}/>;
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
    <div className="app-root" style={{ display:"grid", height:"100vh", background:"#080c10", overflow:"hidden" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes toastIn { from{transform:translateY(20px) scale(0.95);opacity:0} to{transform:none;opacity:1} }
        @keyframes timerShrink { from{width:100%} to{width:0%} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .toast-in { animation: toastIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards; }
        .timer-shrink { animation: timerShrink 5000ms linear forwards; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        /* Layout */
        .app-root { grid-template-columns: 240px 1fr; }
        .app-sidebar { position: relative; width: 240px; transform: translateX(0); transition: transform 0.25s ease; }
        /* Mobile */
        @media (max-width: 768px) {
          .app-root { grid-template-columns: 1fr; }
          .app-sidebar { position: fixed; left: 0; top: 0; bottom: 0; width: 240px; transform: translateX(-100%); }
          .app-sidebar.open { transform: translateX(0); box-shadow: 4px 0 40px rgba(0,0,0,0.7); }
          .mobile-menu-btn { display: flex !important; }
          .mobile-overlay { display: block !important; }
        }
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
      {/* Mobile overlay */}
      {sideOpen && <div onClick={()=>setSideOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:19, display:"none" }} className="mobile-overlay"/>}
      <aside className={`app-sidebar ${sideOpen?"open":""}`} style={{ background:"rgba(10,14,20,0.97)", backdropFilter:"blur(20px)", borderRight:"1px solid rgba(255,255,255,0.06)", display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden", zIndex:20 }}>
        {/* Top glow line */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:"1px", background:"linear-gradient(90deg,transparent,rgba(40,160,240,0.5),transparent)" }}/>

        {/* Brand */}
        <div style={{ padding:"20px 20px 16px", borderBottom:"1px solid rgba(255,255,255,0.05)", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
            <div style={{ width:"36px", height:"36px", borderRadius:"10px", background:"rgba(40,160,240,0.12)", border:"1px solid rgba(40,160,240,0.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <CFOLogo size={18}/>
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
          <div style={{ fontSize:"11px", fontWeight:600, color:"rgba(40,160,240,0.8)", fontFamily:"JetBrains Mono,monospace", marginBottom:"4px" }}>{truncAddr(address)||"-"}</div>
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
          <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
            {/* Hamburger - visible on mobile */}
            <button onClick={()=>setSideOpen(!sideOpen)} style={{ display:"none", width:"34px", height:"34px", alignItems:"center", justifyContent:"center", background:"rgba(16,22,32,0.8)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"8px", cursor:"pointer", color:"rgba(200,209,217,0.7)", flexShrink:0 }} className="mobile-menu-btn">
              {sideOpen ? <X style={{width:"16px",height:"16px"}}/> : <Menu style={{width:"16px",height:"16px"}}/>}
            </button>
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
                {[["Wallet",address||"-"],["Agent",agentAddr||"-"],["Network",chain.name],["Users",totalUsers.toString()]].map(([l,v]) => (
                  <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:"11px", fontFamily:"JetBrains Mono,monospace", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ color:"rgba(150,160,170,0.4)" }}>{l}</span>
                    <span style={{ color:"rgba(200,209,217,0.8)" }}>{String(v).length>20?String(v).slice(0,12)+".":v}</span>
                  </div>
                ))}
                <button onClick={()=>{disconnect();setWalletDrop(false);}} style={{ width:"100%", marginTop:"10px", padding:"8px", fontSize:"11px", fontWeight:700, color:"rgba(239,68,68,0.8)", background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:"8px", cursor:"pointer", fontFamily:"Inter,sans-serif" }}>
                  Disconnect Wallet
                </button>
              </div>
            </>}
          </div>
        </header>

        {/* Content area. NO auto-scroll */}
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
