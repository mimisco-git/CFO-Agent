import React, { useState } from "react";
import { 
  Sparkles, Send, ShieldAlert, Cpu, RefreshCw,
  Lightbulb, BrainCircuit, CheckCircle2
} from "lucide-react";
import { PaymentRule, RuleType, RuleStatus, TreasuryToken } from "../types";

interface GeminiAgentViewProps {
  onRegisterRule: (rule: Omit<PaymentRule, "id" | "createdTime">) => void;
  onAddSystemLogMsg: (msg: string, type: "info" | "success" | "warn" | "error") => void;
  tokens?: TreasuryToken[];
  rules?: PaymentRule[];
}

export function GeminiAgentView({ onRegisterRule, onAddSystemLogMsg, tokens = [], rules = [] }: GeminiAgentViewProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<any | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const samplePrompts = [
    "Pay Alex 250 USDC every week to wallet 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "Sweep all ETH over 5.0 to 0x11223344556677889900112233445566778899aa",
    "Pay marketing team 0.05 ETH every hour to 0xbbbbccccddddeeeeffff00001111222233334444",
  ];

  const getSmartInsights = () => {
    const list: any[] = [];
    const usdcToken = tokens.find(t => t.symbol === "USDC");
    const ethToken  = tokens.find(t => t.symbol === "ETH");
    const usdtToken = tokens.find(t => t.symbol === "USDT");

    if (usdcToken && usdcToken.balance > 8000) {
      list.push({
        id: "idle-usdc", title: "High Idle USDC Balance",
        description: `Your vault holds $${usdcToken.balance.toLocaleString()} idle USDC. Create a sweep rule to move excess capital into yield automatically.`,
        type: "info", actionLabel: "Draft Sweep Rule",
        promptToUse: "Sweep all USDC over 5000 to vault 0xEda8b880b912a7Cd3b25fe40AaCc87FC8D98dcd9",
        draftRule: { name: "Auto-sweep Idle USDC", description: "Sweep excess USDC above $5,000 to treasury escrow", ruleType: RuleType.SWEEP, token: "USDC", amount: 5000, frequency: "On-Demand", frequencySeconds: 30, recipient: "0xEda8b880b912a7Cd3b25fe40AaCc87FC8D98dcd9", destinationName: "CFO Escrow" }
      });
    }
    if (ethToken && ethToken.balance > 2 && !rules.some(r => r.token === "ETH" && r.ruleType === RuleType.SWEEP)) {
      list.push({
        id: "eth-sweep", title: "Surplus ETH Guard",
        description: `ETH reserve at ${ethToken.balance} ETH. Create a safety sweep for balances above 1.5 ETH.`,
        type: "success", actionLabel: "Draft Safety Sweep",
        promptToUse: "Sweep all ETH over 1.5 to cold vault 0x51c706c9aC2432EE0dfB1E21E1430Ff60A79Ba90",
        draftRule: { name: "ETH Gas Reserves Guard", description: "Route surplus gas reserves to governance multisig", ruleType: RuleType.SWEEP, token: "ETH", amount: 1.5, frequency: "Continuous", frequencySeconds: 30, recipient: "0x51c706c9aC2432EE0dfB1E21E1430Ff60A79Ba90", destinationName: "Cold Vault" }
      });
    }
    if (!rules.some(r => r.ruleType === RuleType.PAYROLL)) {
      list.push({
        id: "payroll", title: "Contributor Payroll Not Configured",
        description: "No active payroll rules. Deploy contributor disbursement to automate team payments.",
        type: "info", actionLabel: "Set Up Payroll",
        promptToUse: "Pay dev lead Alex 450 USDC every week to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        draftRule: { name: "Weekly Dev Payroll", description: "Weekly salary disbursement", ruleType: RuleType.PAYROLL, token: "USDC", amount: 450, frequency: "Weekly", frequencySeconds: 604800, recipient: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", destinationName: "Core Dev (Alex)" }
      });
    }
    return list;
  };

  const handleAIEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true); setParsedPreview(null); setWarningMessage(null);
    onAddSystemLogMsg("[AI] Analyzing payment rule specification...", "info");

    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) throw new Error("AI API key not configured");

      const systemPrompt = `You are a CFO payment rule parser. Extract payment rules from natural language and return ONLY a JSON object with these exact fields:
{
  "name": "rule name",
  "description": "brief description",
  "ruleType": "PAYROLL" or "SWEEP",
  "token": "USDC", "ETH", "USDT", or "ARB",
  "amount": number,
  "recipient": "0x address or empty string",
  "destinationName": "recipient name or description",
  "frequency": "human readable frequency",
  "frequencySeconds": number (3600=hourly, 86400=daily, 604800=weekly, 2592000=monthly)
}
Return ONLY the JSON object, no other text.`;

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
          max_tokens: 400, temperature: 0.2,
        })
      });

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "{}";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setParsedPreview(parsed);
      onAddSystemLogMsg("[AI] Rule parsed successfully. Review and approve below.", "success");
    } catch (err: any) {
      // Fallback: local pattern parse
      const lower = prompt.toLowerCase();
      const tokenMatch = lower.match(/\b(usdc|eth|usdt|arb)\b/i);
      const amtMatch = prompt.match(/(\d+\.?\d*)/);
      const addrMatch = prompt.match(/(0x[a-fA-F0-9]{40})/);
      const isPayroll = lower.includes("pay") || lower.includes("payroll") || lower.includes("salary");
      const isSweep = lower.includes("sweep") || lower.includes("transfer all");
      const freqMatch = lower.includes("week") ? { freq: "Weekly", secs: 604800 } :
                        lower.includes("day") ? { freq: "Daily", secs: 86400 } :
                        lower.includes("hour") ? { freq: "Hourly", secs: 3600 } :
                        lower.includes("month") ? { freq: "Monthly", secs: 2592000 } :
                        { freq: "Daily", secs: 86400 };
      setParsedPreview({
        name: isPayroll ? "Payroll Rule" : isSweep ? "Sweep Rule" : "Payment Rule",
        description: prompt.slice(0, 80),
        ruleType: isSweep ? RuleType.SWEEP : RuleType.PAYROLL,
        token: tokenMatch ? tokenMatch[0].toUpperCase() : "USDC",
        amount: amtMatch ? parseFloat(amtMatch[1]) : 100,
        recipient: addrMatch ? addrMatch[1] : "",
        destinationName: "Recipient",
        frequency: freqMatch.freq,
        frequencySeconds: freqMatch.secs,
      });
      setWarningMessage("AI unavailable. Rule generated from pattern matching — please review carefully.");
      onAddSystemLogMsg("[AI] Fallback parse used. Verify rule details.", "warn");
    } finally { setLoading(false); }
  };

  const handleApplyInsight = (promptText: string, draftRule?: any) => {
    setPrompt(promptText);
    if (draftRule) { setParsedPreview(draftRule); onAddSystemLogMsg(`[AI] Smart insight applied: "${draftRule.name}". Review below.`, "success"); }
  };

  const handleApproveRule = () => {
    if (!parsedPreview) return;
    onRegisterRule({
      name: parsedPreview.name, description: parsedPreview.description,
      ruleType: parsedPreview.ruleType as RuleType, status: RuleStatus.ACTIVE,
      recipient: parsedPreview.recipient, token: parsedPreview.token,
      amount: parsedPreview.amount, frequency: parsedPreview.frequency,
      frequencySeconds: parsedPreview.frequencySeconds || 86400,
      destinationName: parsedPreview.destinationName || "Recipient"
    });
    setParsedPreview(null); setPrompt(""); setWarningMessage(null);
    onAddSystemLogMsg("[SUCCESS] Rule registered on-chain successfully.", "success");
  };

  const insights = getSmartInsights();

  return (
    <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-6 text-[#c9d1d9] shadow-lg relative overflow-hidden backdrop-blur-md">
      <div className="absolute right-0 top-0 w-64 h-64 bg-[#28a0f0]/5 rounded-full blur-3xl opacity-20 -mr-12 -mt-12 pointer-events-none"/>
      <div className="relative space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="bg-blue-500/10 p-2 rounded-xl text-[#28a0f0] border border-blue-500/20">
            <Sparkles className="w-5 h-5 flex-shrink-0"/>
          </div>
          <div>
            <h3 className="text-sm font-bold font-display uppercase tracking-wider text-white">CFO AI Copilot</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Describe payment rules in plain English. AI parses and structures them automatically.</p>
          </div>
        </div>

        {/* Sample prompts */}
        <div className="flex flex-wrap gap-2 pt-1.5">
          {samplePrompts.map((p, idx) => (
            <button key={idx} type="button" onClick={() => setPrompt(p)}
              className="text-[10px] text-slate-350 hover:text-white bg-[#0b0e14] hover:bg-[#161b22] border border-[#30363d] hover:border-[#28a0f0]/30 px-2.5 py-1 rounded-lg transition-all cursor-pointer font-mono">
              "{p.substring(0, 30)}..."
            </button>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleAIEvaluation} className="relative mt-2">
          <input type="text" required disabled={loading}
            placeholder="e.g. pay dev team 0.5 ETH every friday..."
            value={prompt} onChange={(e) => setPrompt(e.target.value)}
            className="w-full pl-4 pr-12 py-3 bg-[#0b0e14] border border-[#30363d] rounded-xl text-xs text-white focus:outline-none focus:border-[#28a0f0] font-sans tracking-wide placeholder:text-slate-600 disabled:opacity-50 font-medium"/>
          <button type="submit" disabled={loading || !prompt.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-[#28a0f0] text-[#0b0e14] hover:bg-[#28a0f0]/95 disabled:bg-[#161b22] disabled:text-slate-600 transition-all cursor-pointer">
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <Send className="w-3.5 h-3.5 stroke-[2.5]"/>}
          </button>
        </form>

        {loading && (
          <div className="text-center py-4 text-xs font-semibold text-slate-400 animate-pulse flex items-center justify-center gap-2">
            <Cpu className="w-4 h-4 text-[#28a0f0] animate-spin"/>
            <span>Analyzing with AI...</span>
          </div>
        )}

        {warningMessage && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] rounded-xl flex items-start gap-2 leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5"/>
            <div><span className="font-bold uppercase font-mono">Note:</span> {warningMessage}</div>
          </div>
        )}

        {/* Parsed rule preview */}
        {parsedPreview && !loading && (
          <div className="p-4 bg-[#0b0e14]/80 border border-[#28a0f0]/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#28a0f0]">Parsed Rule — Review Before Registering</span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${parsedPreview.ruleType === RuleType.SWEEP ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"}`}>
                {parsedPreview.ruleType}
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-slate-400 font-mono">Name</span><span className="text-white font-bold">{parsedPreview.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-400 font-mono">Token</span><span className="text-[#28a0f0] font-bold font-mono">{parsedPreview.token}</span></div>
              <div className="flex justify-between"><span className="text-slate-400 font-mono">Amount</span><span className="text-white font-bold">{parsedPreview.amount} {parsedPreview.token}</span></div>
              <div className="flex justify-between"><span className="text-slate-400 font-mono">Frequency</span><span className="text-white font-bold">{parsedPreview.frequency}</span></div>
              {parsedPreview.recipient && <div className="flex justify-between gap-4"><span className="text-slate-400 font-mono flex-shrink-0">Recipient</span><span className="text-white font-mono text-[10px] truncate">{parsedPreview.recipient}</span></div>}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setParsedPreview(null); setWarningMessage(null); }}
                className="px-3 py-1.5 border border-[#30363d] text-slate-400 hover:text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer">
                Discard
              </button>
              <button onClick={handleApproveRule}
                className="flex-1 px-3 py-1.5 bg-[#28a0f0] text-[#0b0e14] rounded-lg text-[11px] font-black transition-colors hover:bg-blue-400 cursor-pointer flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]"/> Register Rule
              </button>
            </div>
          </div>
        )}

        {/* Smart insights */}
        {insights.length > 0 && (
          <div className="pt-2 border-t border-[#30363d]/60 space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400 animate-pulse"/>
              <span>AI Treasury Insights ({insights.length})</span>
            </h4>
            <div className="grid grid-cols-1 gap-2.5">
              {insights.map(insight => (
                <div key={insight.id} className={`p-3 rounded-xl border text-xs flex flex-col gap-2.5 ${
                  insight.type === "warn" ? "bg-amber-500/5 border-amber-500/10 hover:border-amber-500/25" :
                  insight.type === "success" ? "bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/25" :
                  "bg-[#0b0e14]/50 border-[#30363d]"}`}>
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <BrainCircuit className="w-3.5 h-3.5 text-[#28a0f0]"/>
                      {insight.title}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-1">{insight.description}</p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setPrompt(insight.promptToUse)}
                      className="px-2 py-1 border border-slate-700/80 hover:border-slate-600 rounded text-[10px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer">
                      Use Prompt
                    </button>
                    <button onClick={() => handleApplyInsight(insight.promptToUse, insight.draftRule)}
                      className="px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer flex items-center gap-1 bg-[#28a0f0] hover:bg-blue-400 text-[#0b0e14]">
                      Apply Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
