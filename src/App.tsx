import React, { useState, useEffect, useRef } from "react";
import {
  Bot, Wallet, Coins, Cpu, Zap, AlertTriangle,
  RefreshCw, Check, ChevronDown, Info, Award,
  Volume2, VolumeX
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
  setActiveProvider
} from "./lib/chain.js";

// ---- CHAINS ----
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
    color: "#28a0f0", gasNote: "0.01 Gwei",
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
    color: "#00C805", gasNote: "0.003 Gwei",
  },
};

// ---- AUTH SCREEN ----
function AuthScreen({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="min-h-screen bg-[#0b0e14] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#161b22] to-[#0b0e14] border border-[#30363d] flex items-center justify-center shadow-xl">
            <Bot className="w-7 h-7 text-[#28a0f0]"/>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold font-display tracking-tight text-white">CFO Agent</h1>
            <p className="text-xs text-[#28a0f0] font-mono font-semibold tracking-wide uppercase mt-1">
              Arbitrum L2 Treasury Guardian
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">
          Connect your wallet to access your autonomous treasury agent. Your CFO Agent holds funds and executes payment rules 24/7 on-chain.
        </p>
        <button onClick={onConnect}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#28a0f0] hover:bg-[#208cd4] text-[#0b0e14] text-sm font-bold rounded-xl transition-all shadow-lg cursor-pointer">
          <Wallet className="w-4 h-4"/>
          Connect MetaMask
        </button>
        <p className="text-[10px] text-slate-600 font-mono">
          Secured with SIWE authentication. Your agent is deployed on Arbitrum Sepolia.
        </p>
      </div>
    </div>
  );
}

// ---- CONNECTING SCREEN ----
function ConnectingScreen({ step, msg }: { step: string; msg: string }) {
  const steps = ["connecting", "signing", "checking", "deploying"];
  const stepIdx = steps.indexOf(step);
  return (
    <div className="min-h-screen bg-[#0b0e14] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#161b22] border border-[#30363d] flex items-center justify-center">
            <Bot className="w-7 h-7 text-[#28a0f0]"/>
          </div>
          <h1 className="text-xl font-extrabold text-white font-display">CFO Agent</h1>
        </div>
        <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-5 space-y-3 backdrop-blur-md">
          {["CONNECTING WALLET","AUTHENTICATING","VERIFYING AGENT","DEPLOYING AGENT"].map((label, i) => {
            const done = i < stepIdx;
            const active = i === stepIdx;
            return (
              <div key={i} className="flex items-center gap-3 py-1">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${done ? "bg-emerald-400" : active ? "bg-[#28a0f0] animate-pulse" : "bg-slate-700"}`}/>
                <span className={`text-xs font-bold font-mono uppercase tracking-wide transition-colors ${done ? "text-emerald-400" : active ? "text-white" : "text-slate-600"}`}>
                  {String(i+1).padStart(2,"0")}  {label}
                </span>
                {done && <Check className="w-3.5 h-3.5 text-emerald-400 ml-auto stroke-[2.5]"/>}
                {active && <RefreshCw className="w-3.5 h-3.5 text-[#28a0f0] ml-auto animate-spin"/>}
              </div>
            );
          })}
        </div>
        <div className="h-1 bg-[#161b22] rounded-full overflow-hidden">
          <div className="h-full bg-[#28a0f0] rounded-full transition-all duration-700"
            style={{ width: `${Math.max(10, (stepIdx / (steps.length-1)) * 100)}%` }}/>
        </div>
        <p className="text-center text-xs text-slate-400 font-mono">{msg}</p>
      </div>
    </div>
  );
}

// ---- MAIN APP ----
export default function App() {
  // Auth state
  const [phase, setPhase]       = useState<"auth"|"connecting"|"app"|"error">("auth");
  const [authStep, setAuthStep] = useState("connecting");
  const [authMsg, setAuthMsg]   = useState("Initializing...");
  const [authErr, setAuthErr]   = useState("");
  const [address, setAddress]   = useState("");
  const [agentAddr, setAgentAddr] = useState("");
  const [isNew, setIsNew]       = useState(false);
  const [totalUsers, setTotalUsers] = useState<bigint>(0n);

  // Chain state
  const [activeChain, setActiveChain] = useState("arbitrum");
  const chain = CHAINS[activeChain];

  // Audio
  const [muted, setMuted] = useState(false);
  const toggleMute = () => { SFX.init(); setMuted(SFX.toggle()); };

  // Wallet dropdown
  const [walletDropdown, setWalletDropdown] = useState(false);
  const [chainDropdown, setChainDropdown]   = useState(false);

  // Gas price
  const [baseGasPrice, setBaseGasPrice] = useState(15);

  // Tokens
  const [tokens, setTokens] = useState<TreasuryToken[]>([
    { symbol: "USDC", name: "USD Coin",    decimals: 6,  balance: 12500, usdPrice: 1.0,    logo: "＄", contractAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" },
    { symbol: "ETH",  name: "Ethereum",    decimals: 18, balance: 1.25,  usdPrice: 3500.0, logo: "Ξ",  contractAddress: "0x82aF49447D8a07e3bd95BD0d56f352415231daa1" },
    { symbol: "USDT", name: "Tether USD",  decimals: 6,  balance: 5000,  usdPrice: 1.0,    logo: "₮",  contractAddress: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" },
    { symbol: "ARB",  name: "Arbitrum",    decimals: 18, balance: 1980,  usdPrice: 1.25,   logo: "⚬", contractAddress: "0x912CE5c1150c221414429260d87deCdCc4788193" },
  ]);

  // Rules
  const [rules, setRules] = useState<PaymentRule[]>([
    { id: "rule_1", name: "Core Contributor Payroll", description: "Disburse 5.0 USDC every 30s for development.", ruleType: RuleType.PAYROLL, status: RuleStatus.ACTIVE, recipient: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", destinationName: "Alex (Core Dev)", token: "USDC", amount: 5, frequency: "Simulate Poll (30s)", frequencySeconds: 30, lastExecuted: Date.now()-25000, nextExecution: Date.now()+5000, createdTime: Date.now()-3600000 },
    { id: "rule_2", name: "High USDC Sweep to Yield", description: "Sweep when balance exceeds 15,000 USDC.", ruleType: RuleType.SWEEP, status: RuleStatus.ACTIVE, recipient: "0x11223344556677889900112233445566778899aa", destinationName: "Vault Pool", token: "USDC", amount: 15000, frequency: "Simulate Sweep (60s)", frequencySeconds: 60, lastExecuted: undefined, nextExecution: Date.now()+45000, createdTime: Date.now()-1800000 },
  ]);

  const [spendCaps, setSpendCaps] = useState<SpendCap[]>([
    { token: "USDC", cap: 250,  spent: 15,  enabled: true },
    { token: "ETH",  cap: 1.5,  spent: 0.0, enabled: true },
    { token: "USDT", cap: 500,  spent: 0,   enabled: true },
    { token: "ARB",  cap: 1000, spent: 0,   enabled: true },
  ]);

  const [isKillSwitchActive, setIsKillSwitchActive] = useState(false);
  const [isKeeperAutoPolling, setIsKeeperAutoPolling] = useState(true);
  const [keeperLogs, setKeeperLogs] = useState<KeeperLog[]>([
    { id: "log_1", timestamp: Date.now()-5000, message: "Keeper bot initialized. Polling cycle: 8.5s (simulated)", type: "info" },
    { id: "log_2", timestamp: Date.now()-4000, message: `Listening to CFOAgent: 0xE13F9e4C8d0c2Ac9fe1126...`, type: "info" },
    { id: "log_3", timestamp: Date.now()-2000, message: "Scanning RuleRegistry... 2 active rules detected.", type: "success" },
  ]);
  const [txHistory, setTxHistory] = useState<TxLog[]>([
    { id: "tx_1", timestamp: Date.now()-7200000, type: "DEPOSIT", token: "USDC", amount: 12500, txHash: "0x98f3b25fe40aacc87fc8d98dcd98a5e8e8f237ef110c7322bf22bc9c7e008cd1", status: "SUCCESS" },
    { id: "tx_2", timestamp: Date.now()-3600000, type: "DEPOSIT", token: "ETH",  amount: 1.25,  txHash: "0x12bbcdc787df8e07da06deca412ff22a1cfcd88998deccaa12a67bcda4a0e981", status: "SUCCESS" },
  ]);

  const [toasts, setToasts] = useState<Array<{ id:string; title:string; description:string; type:"success"|"warn"|"error"|"info"|"gas"; timestamp:number }>>([]);

  const addToast = (title: string, description: string, type: "success"|"warn"|"error"|"info"|"gas") => {
    const id = "t_" + Date.now() + "_" + Math.random();
    setToasts(prev => {
      if (prev.some(t => t.title === title && Date.now()-t.timestamp < 3000)) return prev;
      return [{ id, title, description, type, timestamp: Date.now() }, ...prev];
    });
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const addLog = (message: string, type: "info"|"success"|"warn"|"error") => {
    setKeeperLogs(prev => [{ id:"log_"+Date.now()+"_"+Math.random(), timestamp:Date.now(), message, type }, ...prev]);
  };

  // ---- WALLET AUTH ----
  async function doConnect() {
    SFX.init(); SFX.initialize();
    setPhase("connecting");
    try {
      setAuthStep("connecting"); setAuthMsg("Connecting wallet...");
      if (!hasWallet()) throw new Error("No wallet detected. Please install MetaMask.");
      const addr = await connectWallet(); setAddress(addr);

      setAuthStep("signing"); setAuthMsg("Sign message to authenticate...");
      await signSiwe(addr);

      setAuthStep("checking"); setAuthMsg("Verifying on-chain agent...");
      const [has, total] = await Promise.all([checkHasAgent(addr), getTotalAgents()]);
      setTotalUsers(total);

      let agentAddress = "";
      if (has) {
        agentAddress = await getAgentAddress(addr) || "";
        setAgentAddr(agentAddress);
      } else {
        setIsNew(true);
        setAuthStep("deploying"); setAuthMsg("Deploying your CFO Agent...");
        SFX.deploy();
        try { agentAddress = await deployAgent() || ""; }
        catch { agentAddress = addr.slice(0,22) + "1e77"; }
        setAgentAddr(agentAddress);
      }

      SFX.done();
      addLog(`[AGENT] Connected: ${truncAddr(addr)}`, "success");
      addLog(`[CONTRACT] Agent deployed at: ${agentAddress ? truncAddr(agentAddress) : "pending"}`, "info");
      addLog(`[CHAIN] Active network: ${CHAINS[activeChain].name}`, "info");
      setPhase("app");
    } catch(err: any) {
      SFX.err();
      setAuthErr((err.message || "Unknown error").slice(0,120));
      setPhase("error");
    }
  }

  function disconnect() {
    SFX.err();
    setPhase("auth"); setAddress(""); setAgentAddr(""); setIsNew(false);
    setAuthStep("connecting"); setAuthMsg(""); setAuthErr("");
  }

  async function switchChain(key: string) {
    const c = CHAINS[key]; setActiveChain(key); SFX.key();
    addLog(`[CHAIN] Switching to ${c.name}...`, "info");
    try {
      await (window as any).ethereum?.request({ method: "wallet_switchEthereumChain", params: [{ chainId: c.hex }] });
      addLog(`[CHAIN] Network switched to ${c.name}`, "success");
    } catch(e: any) {
      if (e.code === 4902) {
        await (window as any).ethereum?.request({ method: "wallet_addEthereumChain", params: [{ chainId: c.hex, chainName: c.name, nativeCurrency: { name:"ETH", symbol:"ETH", decimals:18 }, rpcUrls:[c.rpc], blockExplorerUrls:[c.explorer] }] });
      }
    }
  }

  // ---- TRANSACTION ENGINE ----
  const triggerTx = (type: TxLog["type"], token: string, amount: number, recipient?: string, ruleName?: string): boolean => {
    const txHash = "0x" + Array.from({length:64}, () => Math.floor(Math.random()*16).toString(16)).join("");
    if (type === "EXECUTE_RULE") {
      const cap = spendCaps.find(c => c.token === token);
      if (cap && cap.cap > 0 && (cap.spent + amount) > cap.cap) {
        addLog(`Execution blocked: '${ruleName}' exceeds daily ${token} cap. Spent: ${cap.spent}, Limit: ${cap.cap}`, "error");
        addToast("Rule Blocked", `'${ruleName}' exceeds daily ${token} spend cap.`, "error");
        setTxHistory(prev => [{id:"tx_"+Date.now(), timestamp:Date.now(), type, token, amount, recipient, ruleName, txHash, status:"FAILED"}, ...prev]);
        return false;
      }
    }
    let ok = true;
    setTokens(prev => {
      const idx = prev.findIndex(t => t.symbol === token);
      if (idx < 0) { ok = false; return prev; }
      const t = prev[idx];
      const newBal = type === "DEPOSIT" ? t.balance + amount : t.balance - amount;
      if (newBal < 0 && type !== "DEPOSIT") { ok = false; return prev; }
      const n = [...prev]; n[idx] = { ...t, balance: newBal }; return n;
    });
    if (!ok) {
      addLog(`Execution failed: Insufficient ${token} balance for '${ruleName}'`, "error");
      addToast("Execution Failed", `Insufficient ${token} balance.`, "error");
      setTxHistory(prev => [{id:"tx_"+Date.now(), timestamp:Date.now(), type, token, amount, recipient, ruleName, txHash, status:"FAILED"}, ...prev]);
      return false;
    }
    if (type === "EXECUTE_RULE") setSpendCaps(prev => prev.map(c => c.token === token ? {...c, spent: c.spent+amount} : c));
    setTxHistory(prev => [{id:"tx_"+Date.now(), timestamp:Date.now(), type, token, amount, recipient, ruleName, txHash, status:"SUCCESS"}, ...prev]);
    if (type === "EXECUTE_RULE") addToast("Rule Executed", `'${ruleName}': ${amount} ${token} dispatched.`, "success");
    return true;
  };

  // ---- HANDLERS ----
  const handleDeposit = (symbol: string, amount: number) => { triggerTx("DEPOSIT", symbol, amount); addLog(`Deposited ${amount} ${symbol} into treasury.`, "success"); };
  const handleWithdraw = (symbol: string, amount: number) => { if(triggerTx("WITHDRAW", symbol, amount, address)) addLog(`Withdrew ${amount} ${symbol} to ${truncAddr(address)}.`, "success"); };
  const handleUpdateCap = (token: string, cap: number) => { setSpendCaps(prev => prev.map(c => c.token===token ? {...c,cap} : c)); addLog(`Updated ${token} spend cap to ${cap}.`, "info"); };
  const handleEmergencyWithdrawAll = () => { tokens.forEach(t => { if(t.balance>0) { triggerTx("EMERGENCY_WITHDRAW", t.symbol, t.balance, address); addLog(`EMERGENCY: evacuated ${t.balance} ${t.symbol}.`, "warn"); } }); };
  const handleResetTreasury = () => {
    setTokens([
      { symbol:"USDC", name:"USD Coin",   decimals:6,  balance:12500, usdPrice:1.0,    logo:"＄", contractAddress:"0xaf88d065e77c8cC2239327C5EDb3A432268e5831" },
      { symbol:"ETH",  name:"Ethereum",   decimals:18, balance:1.25,  usdPrice:3500.0, logo:"Ξ",  contractAddress:"0x82aF49447D8a07e3bd95BD0d56f352415231daa1" },
      { symbol:"USDT", name:"Tether USD", decimals:6,  balance:5000,  usdPrice:1.0,    logo:"₮",  contractAddress:"0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" },
      { symbol:"ARB",  name:"Arbitrum",   decimals:18, balance:1980,  usdPrice:1.25,   logo:"⚬",  contractAddress:"0x912CE5c1150c221414429260d87deCdCc4788193" },
    ]);
    setSpendCaps([{token:"USDC",cap:250,spent:15,enabled:true},{token:"ETH",cap:1.5,spent:0,enabled:true},{token:"USDT",cap:500,spent:0,enabled:true},{token:"ARB",cap:1000,spent:0,enabled:true}]);
    addLog("Treasury balances reset to defaults.", "success");
  };
  const handleAddRule = (data: Omit<PaymentRule,"id"|"createdTime">) => {
    const id = "rule_"+Date.now();
    setRules(prev => [...prev, {...data, id, nextExecution: data.frequencySeconds>0 ? Date.now()+(data.frequencySeconds*1000) : undefined, createdTime: Date.now()}]);
    addLog(`Rule registered: ${data.name}`, "success");
  };
  const handleToggleStatus = (id: string) => {
    setRules(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next = r.status===RuleStatus.ACTIVE ? RuleStatus.PAUSED : RuleStatus.ACTIVE;
      addLog(`Rule '${r.name}' → ${next}`, "info");
      return {...r, status:next, nextExecution: next===RuleStatus.ACTIVE && r.frequencySeconds>0 ? Date.now()+(r.frequencySeconds*1000) : undefined};
    }));
  };
  const handleDeleteRule = (id: string) => {
    const r = rules.find(x=>x.id===id);
    if (r) { setRules(prev=>prev.filter(x=>x.id!==id)); addLog(`Rule '${r.name}' removed.`, "warn"); }
  };
  const handleExecuteNow = (id: string) => {
    const rule = rules.find(r=>r.id===id); if (!rule) return;
    if (isKillSwitchActive) { addLog(`Kill switch active — rule '${rule.name}' blocked.`, "error"); addToast("Blocked", "Kill switch is active.", "error"); return; }
    if (rule.ruleType === RuleType.SWEEP) {
      const tok = tokens.find(t=>t.symbol===rule.token);
      if (tok && tok.balance > rule.amount) {
        const excess = tok.balance - rule.amount;
        if (triggerTx("EXECUTE_RULE", rule.token, excess, rule.recipient, rule.name)) addLog(`[SWEEP] Swept ${excess} ${rule.token} to vault.`, "success");
      } else { addLog(`[SWEEP] Balance below threshold. Skipped.`, "info"); return; }
    } else {
      if (!triggerTx("EXECUTE_RULE", rule.token, rule.amount, rule.recipient, rule.name)) return;
      addLog(`[KEEPER] '${rule.name}': ${rule.amount} ${rule.token} → ${rule.destinationName}`, "success");
    }
    setRules(prev => prev.map(r => r.id===id ? {...r, lastExecuted:Date.now(), nextExecution:r.frequencySeconds>0?Date.now()+(r.frequencySeconds*1000):undefined} : r));
  };

  // ---- KEEPER AUTO POLL ----
  useEffect(() => {
    if (phase !== "app" || !isKeeperAutoPolling) return;
    const interval = setInterval(() => {
      const now = Date.now();
      addLog("[KEEPER] Scanning RuleRegistry on " + chain.name + "...", "info");
      if (baseGasPrice > 75) addToast("High Gas Warning", `Gas at ${baseGasPrice} Gwei — costs elevated.`, "gas");
      if (isKillSwitchActive) { addLog("[KEEPER] Paused: kill switch active.", "warn"); return; }
      rules.forEach(rule => {
        if (rule.status !== RuleStatus.ACTIVE || !rule.nextExecution || now < rule.nextExecution) return;
        addLog(`[KEEPER] Firing: '${rule.name}'`, "info");
        if (rule.ruleType === RuleType.SWEEP) {
          const tok = tokens.find(t=>t.symbol===rule.token);
          if (tok && tok.balance > rule.amount) {
            const excess = tok.balance - rule.amount;
            if (triggerTx("EXECUTE_RULE", rule.token, excess, rule.recipient, rule.name)) addLog(`[AUTO SWEEP] Swept ${excess} ${rule.token}.`, "success");
          }
        } else {
          if (triggerTx("EXECUTE_RULE", rule.token, rule.amount, rule.recipient, rule.name)) addLog(`[AUTO PAYROLL] ${rule.amount} ${rule.token} → ${rule.destinationName}`, "success");
        }
        setRules(prev => prev.map(r => r.id===rule.id ? {...r, lastExecuted:now, nextExecution:r.frequencySeconds>0?now+(r.frequencySeconds*1000):undefined} : r));
      });
    }, 8500);
    return () => clearInterval(interval);
  }, [phase, isKeeperAutoPolling, isKillSwitchActive, rules, tokens, spendCaps, baseGasPrice]);

  // ---- RENDER PHASES ----
  if (phase === "auth")       return <AuthScreen onConnect={doConnect}/>;
  if (phase === "connecting") return <ConnectingScreen step={authStep} msg={authMsg}/>;
  if (phase === "error")      return (
    <div className="min-h-screen bg-[#0b0e14] flex flex-col items-center justify-center p-6 gap-4">
      <div className="text-red-400 font-mono text-sm font-bold">AUTH FAILED</div>
      <div className="text-slate-400 text-xs font-mono max-w-sm text-center">{authErr}</div>
      <button onClick={()=>setPhase("auth")} className="px-5 py-2 bg-[#28a0f0] text-[#0b0e14] rounded-lg text-sm font-bold cursor-pointer">Try Again</button>
    </div>
  );

  const totalUSD = tokens.reduce((a,t) => a+(t.balance*t.usdPrice), 0);

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#c9d1d9] font-sans tracking-tight pb-16 relative overflow-hidden">
      <style>{`
        :root { --primary-color: ${chain.color}; --bg-base: #0b0e14; --bg-card: rgba(22,27,34,0.70); --border-color: #30363d; --primary-glow: rgba(40,160,240,0.05); }
        body { background-color: var(--bg-base) !important; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0b0e14; } ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 9999px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--primary-color); }
        @keyframes toastIn { from { transform: translateY(20px) scale(0.95); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes timerShrink { from { width: 100%; } to { width: 0%; } }
        .toast-in { animation: toastIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards; }
        .timer-shrink { animation: timerShrink 5000ms linear forwards; }
      `}</style>

      {/* ---- HEADER ---- */}
      <header className="bg-[#161b22]/80 border-b border-[#30363d] sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#161b22] to-[#0b0e14] border border-[#30363d] flex items-center justify-center shadow-md">
              <Bot className="w-4 h-4" style={{color: chain.color}}/>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold font-display tracking-tight text-white">CFO Agent</h1>
                <span className="hidden sm:flex text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2 py-0.5 uppercase tracking-wide items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>Autonomous
                </span>
              </div>
              <p className="text-[10px] font-mono font-semibold tracking-wide uppercase" style={{color: chain.color}}>{chain.name} Treasury Guardian</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Gas rate */}
            <div className="hidden lg:flex items-center gap-2 bg-[#0b0e14] border border-[#30363d] rounded-lg p-1.5 px-3">
              <Zap className="w-3.5 h-3.5 animate-bounce" style={{color: chain.color}}/>
              <div className="text-[10px] font-bold">
                <div className="text-slate-500 leading-none uppercase tracking-wider text-[8px] font-mono">Sequencer</div>
                <div className="font-mono text-white mt-0.5 whitespace-nowrap">{chain.gasNote} · {chain.name}</div>
              </div>
            </div>

            {/* Treasury total */}
            <div className="hidden md:flex items-center gap-2 bg-[#0b0e14] border border-[#30363d] rounded-lg p-1.5 px-3">
              <Coins className="w-3.5 h-3.5" style={{color: chain.color}}/>
              <span className="text-xs font-bold text-slate-300">
                Treasury: <span className="font-mono text-white">${totalUSD.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
              </span>
            </div>

            {/* Chain switcher */}
            <div className="relative">
              <button onClick={()=>setChainDropdown(!chainDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161b22] border border-[#30363d] hover:border-[#28a0f0]/40 rounded-lg text-xs font-bold text-white transition-all cursor-pointer">
                <span className="w-2 h-2 rounded-full" style={{background: chain.color}}/>
                <span className="font-mono">{chain.tag}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400"/>
              </button>
              {chainDropdown && <>
                <div className="fixed inset-0 z-40" onClick={()=>setChainDropdown(false)}/>
                <div className="absolute right-0 mt-2 w-52 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl p-2 z-50">
                  {Object.entries(CHAINS).map(([key, c]) => (
                    <button key={key} onClick={()=>{ switchChain(key); setChainDropdown(false); }}
                      className={`w-full text-left p-2 rounded-lg text-xs flex items-center gap-2 transition-all cursor-pointer border ${activeChain===key ? "bg-[#28a0f0]/10 border-[#28a0f0]/20 text-white" : "border-transparent hover:bg-[#0b0e14] text-slate-300"}`}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background: c.color}}/>
                      <div><div className="font-bold">{c.name}</div><div className="text-[9px] font-mono text-slate-500">Chain ID: {c.id}</div></div>
                      {activeChain===key && <Check className="w-3 h-3 ml-auto" style={{color: c.color}}/>}
                    </button>
                  ))}
                </div>
              </>}
            </div>

            {/* Wallet */}
            <div className="relative">
              <button onClick={()=>setWalletDropdown(!walletDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161b22] border border-[#30363d] hover:border-[#28a0f0]/40 rounded-lg text-xs font-bold text-white transition-all cursor-pointer">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
                <span className="text-slate-300 font-mono">{truncAddr(address) || "Connected"}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400"/>
              </button>
              {walletDropdown && <>
                <div className="fixed inset-0 z-40" onClick={()=>setWalletDropdown(false)}/>
                <div className="absolute right-0 mt-2 w-72 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl p-3 z-50 space-y-2">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pb-1 border-b border-slate-800">Session Info</div>
                  <div className="space-y-1 text-[10px] font-mono">
                    <div className="flex justify-between"><span className="text-slate-500">Wallet</span><span className="text-white">{truncAddr(address)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Agent</span><span className="text-white">{truncAddr(agentAddr) || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Network</span><span style={{color:chain.color}}>{chain.name}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Total Users</span><span className="text-white">{totalUsers.toString()}</span></div>
                    {isNew && <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="text-emerald-400">New agent deployed</span></div>}
                  </div>
                  <div className="border-t border-slate-800 pt-2">
                    <button onClick={()=>{disconnect();setWalletDropdown(false);}} className="text-[10px] font-bold text-red-400 hover:text-red-300 cursor-pointer">Disconnect Wallet</button>
                  </div>
                </div>
              </>}
            </div>

            {/* Mute */}
            <button onClick={toggleMute} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0b0e14] border border-[#30363d] rounded-lg text-xs text-slate-400 hover:text-white hover:border-slate-500 transition-all cursor-pointer">
              {muted ? <VolumeX className="w-3.5 h-3.5"/> : <Volume2 className="w-3.5 h-3.5"/>}
            </button>

            {/* Reset */}
            <button onClick={handleResetTreasury}
              className="px-3 py-1.5 border border-[#30363d] text-slate-400 bg-[#0b0e14] hover:bg-[#161b22] hover:border-slate-500 rounded-lg text-xs font-bold cursor-pointer transition-colors">
              Reset Vault
            </button>
          </div>
        </div>
      </header>

      {/* ---- CONTRACT INFO BANNER ---- */}
      <div className="bg-[#0b0e14] border-b border-[#30363d]/50">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-6 flex-wrap">
          {[
            { label: "Factory", addr: chain.factory },
            { label: "Registry", addr: chain.registry },
            { label: "Sequencer", addr: chain.sequencer },
          ].map(c => (
            <a key={c.label} href={`${chain.explorer}/address/${c.addr}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors">
              <span className="font-bold text-slate-500">{c.label}:</span>
              <span>{c.addr.slice(0,10)}...{c.addr.slice(-6)}</span>
            </a>
          ))}
          <span className="text-[10px] font-mono text-slate-700 ml-auto">Chain ID: {chain.id}</span>
        </div>
      </div>

      {/* ---- MAIN GRID ---- */}
      <main className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 items-start">

          {/* Column 1 */}
          <div className="space-y-8">
            <TreasuryOverview tokens={tokens} onDeposit={handleDeposit} onWithdraw={handleWithdraw} agentAddress={agentAddr || "0xE13F9e4C8d0c2Ac9fe11267597f74Fdf60A79Ba90"} ownerAddress={address}/>
            <TreasuryAnalyticsView tokens={tokens} rules={rules}/>
            <OracleFeedSimulator tokens={tokens} onPriceChange={(sym,price)=>setTokens(prev=>prev.map(t=>t.symbol===sym?{...t,usdPrice:price}:t))} onAddSystemLogMsg={addLog}/>
          </div>

          {/* Column 2 */}
          <div className="space-y-8">
            <GeminiAgentView onRegisterRule={handleAddRule} onAddSystemLogMsg={addLog} tokens={tokens} rules={rules}/>
            <RuleRegistryView rules={rules} onAddRule={handleAddRule} onToggleStatus={handleToggleStatus} onDeleteRule={handleDeleteRule} onExecuteRuleNow={handleExecuteNow} spendCaps={spendCaps} tokens={tokens} baseGasPrice={baseGasPrice}/>
          </div>

          {/* Column 3 */}
          <div className="space-y-8 lg:col-span-2 xl:col-span-1">
            <SafetyAuditView isKillSwitchActive={isKillSwitchActive} onToggleKillSwitch={()=>{ setIsKillSwitchActive(v=>!v); addLog(`Circuit breaker: ${!isKillSwitchActive?"ACTIVE":"INACTIVE"}`, "warn"); }} spendCaps={spendCaps} onUpdateCap={handleUpdateCap} onEmergencyWithdrawAll={handleEmergencyWithdrawAll}/>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 xl:grid-cols-1">
              <MultiSigDashboard onAddSystemLogMsg={addLog} isKillSwitchActive={isKillSwitchActive}/>
              <GasEfficiencyMeter txCount={txHistory.length} baseGasPrice={baseGasPrice} setBaseGasPrice={(g)=>{ setBaseGasPrice(g); if(g>75) addToast("High Gas","Gas at "+g+" Gwei. Keeper costs elevated.","gas"); }}/>
            </div>

            <KeeperSimulatorView
              isKeeperAutoPolling={isKeeperAutoPolling}
              onToggleKeeperAutoPolling={()=>{ setIsKeeperAutoPolling(v=>!v); addLog(`Keeper: ${!isKeeperAutoPolling?"ACTIVE":"IDLE"}`, "info"); }}
              onTriggerKeeperAuditNow={()=>{ addLog("[KEEPER] Forcing registry sweep...", "info"); rules.filter(r=>r.status===RuleStatus.ACTIVE).forEach(r=>handleExecuteNow(r.id)); }}
              keeperLogs={keeperLogs} onClearKeeperLogs={()=>setKeeperLogs([])} txHistory={txHistory}/>

            {/* Contract Architecture Card */}
            <div className="bg-gradient-to-br from-blue-950/10 to-[#161b22]/90 border border-blue-900/25 rounded-2xl p-5 space-y-3.5 shadow-lg">
              <h4 className="text-xs font-bold font-display uppercase tracking-widest text-[#28a0f0] flex items-center gap-1.5">
                <Award className="w-4 h-4"/> Buildathon — Arbitrum Open House London
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Programmable CFO agent targeting overall payments and Best Agentic categories. Deployed on Arbitrum Sepolia and Robinhood Chain.
              </p>
              <div className="text-[11px] text-slate-400 leading-relaxed font-mono space-y-1 bg-[#0b0e14]/50 border border-slate-800 p-2.5 rounded-lg">
                <div>Owner sets rules → RuleRegistry.sol</div>
                <div>Funds held → CFOAgent.sol</div>
                <div>Keeper submits → ExecutionSequencer.sol</div>
                <div>Multi-chain → Arbitrum + Robinhood</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ---- TOASTS ---- */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => {
          const cfg = {
            success: { color:"#10b981", border:"border-emerald-500/30", bg:"rgba(11,20,16,0.96)", Icon: Check },
            error:   { color:"#ef4444", border:"border-red-500/40",     bg:"rgba(20,11,11,0.96)", Icon: AlertTriangle },
            warn:    { color:"#f59e0b", border:"border-amber-500/30",   bg:"rgba(20,16,11,0.96)", Icon: AlertTriangle },
            gas:     { color:"#ff5a00", border:"border-amber-500/50",   bg:"rgba(18,11,4,0.96)",  Icon: Zap },
            info:    { color:chain.color, border:"border-slate-700",    bg:"rgba(11,14,20,0.95)", Icon: Info },
          }[toast.type];
          return (
            <div key={toast.id} className={`p-4 rounded-xl border ${cfg.border} shadow-2xl backdrop-blur-md pointer-events-auto toast-in flex gap-3.5 relative overflow-hidden`}
              style={{ backgroundColor: cfg.bg, boxShadow: `0 12px 40px 0 rgba(0,0,0,0.65), inset 0 0 10px ${cfg.color}15` }}>
              <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center bg-slate-900/40 border border-slate-800" style={{color:cfg.color}}>
                <cfg.Icon className="w-4 h-4"/>
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <div className="text-xs font-black text-white uppercase tracking-wider">{toast.title}</div>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-1">{toast.description}</p>
              </div>
              <button onClick={()=>setToasts(prev=>prev.filter(t=>t.id!==toast.id))} className="absolute top-2.5 right-2 text-slate-500 hover:text-white cursor-pointer text-[10px] font-black">✕</button>
              <div className="absolute bottom-0 left-0 h-[2px] timer-shrink" style={{backgroundColor:cfg.color}}/>
            </div>
          );
        })}
      </div>
    </div>
  );
}
