import { useState, useRef } from 'react'
import './App.css'

const WALLET = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
const AGENT  = '0x9aB4...1e77'

const INITIAL_RULES = [
  { id: 0, name: 'Friday payroll', type: 'SCHEDULED', token: 'USDC', recipient: '0x4f3a...9B12', amount: '500', interval: '7 days', limit: '600', active: true, last: '2 days ago' },
  { id: 1, name: 'Yield sweep', type: 'CONDITIONAL', token: 'USDC', recipient: '0x8c2d...4A90', amount: '1,000', interval: '', limit: '2,000', cond: 'Balance > 5,000 USDC', active: true, last: '5 days ago' },
  { id: 2, name: 'Daily ops budget', type: 'SCHEDULED', token: 'ETH', recipient: '0x2e7f...B301', amount: '0.05', interval: '1 day', limit: '0.1', active: false, last: '15 days ago' },
]

const INITIAL_LOG = [
  { id: 1, rule: 'Friday payroll', token: 'USDC', amount: '+500', to: '0x4f3a...9B12', time: '2d ago' },
  { id: 2, rule: 'Yield sweep', token: 'USDC', amount: '+1,000', to: '0x8c2d...4A90', time: '5d ago' },
  { id: 3, rule: 'Friday payroll', token: 'USDC', amount: '+500', to: '0x4f3a...9B12', time: '9d ago' },
]

const BLANK = { name: '', type: 'SCHEDULED', token: 'USDC', recipient: '', amount: '', limit: '', interval: '604800', condVal: '' }

function fmtInterval(s) {
  const n = Number(s)
  if (n >= 2592000) return '1 month'
  if (n >= 604800)  return '1 week'
  if (n >= 86400)   return '1 day'
  return '1 hour'
}

function truncate(addr) {
  if (!addr || addr.includes('...')) return addr
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

export default function App() {
  const [connected, setConnected] = useState(false)
  const [agentOn, setAgentOn]     = useState(true)
  const [nav, setNav]             = useState('dashboard')
  const [rules, setRules]         = useState(INITIAL_RULES)
  const [log, setLog]             = useState(INITIAL_LOG)
  const [showAdd, setShowAdd]     = useState(false)
  const [form, setForm]           = useState(BLANK)
  const logId = useRef(10)

  function simulate() {
    const active = rules.filter(r => r.active)
    if (!active.length) return
    const rule = active[Math.floor(Math.random() * active.length)]
    setLog(l => [{ id: logId.current++, rule: rule.name, token: rule.token, amount: '+' + rule.amount, to: rule.recipient, time: 'just now' }, ...l])
    setRules(r => r.map(rl => rl.id === rule.id ? { ...rl, last: 'just now' } : rl))
  }

  function addRule() {
    setRules(r => [...r, { id: Date.now(), name: form.name || 'Unnamed rule', type: form.type, token: form.token, recipient: form.recipient || '0x0000...0000', amount: form.amount, interval: form.type === 'SCHEDULED' ? fmtInterval(form.interval) : '', limit: form.limit, cond: form.type === 'CONDITIONAL' ? `Balance > ${form.condVal} ${form.token}` : '', active: true, last: 'never' }])
    setShowAdd(false)
    setForm(BLANK)
  }

  if (!connected) return <ConnectScreen onConnect={() => setConnected(true)} />

  const activeCount = rules.filter(r => r.active).length

  return (
    <div className="wrap">
      <Sidebar nav={nav} setNav={setNav} />
      <main className="main">
        {nav === 'dashboard' && <Dashboard rules={rules} log={log} agentOn={agentOn} setAgentOn={setAgentOn} simulate={simulate} activeCount={activeCount} />}
        {nav === 'rules' && <Rules rules={rules} showAdd={showAdd} setShowAdd={setShowAdd} form={form} setForm={setForm} addRule={addRule} toggleRule={id => setRules(r => r.map(rl => rl.id === id ? { ...rl, active: !rl.active } : rl))} deleteRule={id => setRules(r => r.filter(rl => rl.id !== id))} />}
        {nav === 'log' && <Log log={log} simulate={simulate} />}
        {nav === 'settings' && <Settings agentOn={agentOn} setAgentOn={setAgentOn} />}
      </main>
    </div>
  )
}

function ConnectScreen({ onConnect }) {
  return (
    <div className="conn">
      <div className="conn-grid" />
      <div className="conn-center">
        <div className="conn-mark" />
        <div className="conn-title">CFO Agent</div>
        <div className="conn-sub">Programmable treasury automation.<br />Set rules. The agent executes.</div>
        <button className="conn-btn" onClick={onConnect}>
          <i className="ti ti-wallet" style={{ fontSize: 16 }} />
          Connect Wallet
        </button>
        <div className="conn-chain">
          <div className="status-dot" />
          Arbitrum Sepolia · Testnet
        </div>
      </div>
    </div>
  )
}

function Sidebar({ nav, setNav }) {
  return (
    <aside className="side">
      <div className="side-top">
        <div className="logo">
          <div className="logo-mark" />
          <div>
            <div className="logo-text">CFO Agent</div>
            <div className="logo-sub">Treasury OS</div>
          </div>
        </div>
      </div>
      <nav className="side-nav">
        <div className="nav-section-label">Overview</div>
        {[{ id: 'dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' }, { id: 'log', icon: 'ti-activity', label: 'Activity' }].map(item => (
          <button key={item.id} className={`nav ${nav === item.id ? 'on' : ''}`} onClick={() => setNav(item.id)}>
            <i className={`ti ${item.icon}`} />{item.label}
          </button>
        ))}
        <div className="nav-section-label">Automation</div>
        {[{ id: 'rules', icon: 'ti-bolt', label: 'Rules' }, { id: 'settings', icon: 'ti-adjustments-horizontal', label: 'Settings' }].map(item => (
          <button key={item.id} className={`nav ${nav === item.id ? 'on' : ''}`} onClick={() => setNav(item.id)}>
            <i className={`ti ${item.icon}`} />{item.label}
          </button>
        ))}
      </nav>
      <div className="side-foot">
        <div className="wallet-card">
          <div className="wallet-label"><div className="status-dot" />Connected</div>
          <div className="wallet-addr">{truncate(WALLET)}</div>
          <div className="agent-addr">Agent: {AGENT}</div>
        </div>
      </div>
    </aside>
  )
}

function Dashboard({ rules, log, agentOn, setAgentOn, simulate, activeCount }) {
  return (
    <>
      <div className="ph">
        <div className="ph-left">
          <div className="pt">Dashboard</div>
          <div className="ps">Arbitrum Sepolia · last sync 12s ago</div>
        </div>
        <button className="btn btn-ghost" onClick={simulate}><i className="ti ti-player-play" /> Simulate execution</button>
      </div>
      <div className="stats">
        <StatCard label="Treasury balance" value="4,820" sub="USDC" accent />
        <StatCard label="Active rules" value={activeCount} sub={`of ${rules.length} total`} />
        <StatCard label="Total executions" value={log.length} sub="all time" />
        <StatCard label="USDC routed" value="2,000" sub="this month" />
      </div>
      <div className="status-bar">
        <div className="sb-left">
          <div className={`sb-indicator ${agentOn ? '' : 'off'}`}>
            <div className="status-dot" style={agentOn ? {} : { background: 'var(--t3)', animation: 'none' }} />
          </div>
          <div>
            <div className="sb-label">Agent {agentOn ? 'running' : 'paused'}</div>
            <div className="sb-sub">{agentOn ? 'Rules execute automatically on schedule' : 'All rule execution is suspended'}</div>
          </div>
        </div>
        <div className="sb-right">
          <span className="sb-status" style={{ color: agentOn ? 'var(--acid)' : 'var(--t3)' }}>{agentOn ? 'Online' : 'Offline'}</span>
          <Toggle on={agentOn} onClick={() => setAgentOn(v => !v)} />
        </div>
      </div>
      <div className="sh"><div className="st">Recent activity</div></div>
      <div className="log-list">{log.slice(0, 5).map(e => <LogItem key={e.id} entry={e} />)}</div>
    </>
  )
}

function Rules({ rules, showAdd, setShowAdd, form, setForm, addRule, toggleRule, deleteRule }) {
  return (
    <>
      <div className="ph">
        <div className="ph-left">
          <div className="pt">Automation rules</div>
          <div className="ps">{rules.filter(r => r.active).length} active · {rules.filter(r => !r.active).length} paused</div>
        </div>
        <button className="btn btn-acid" onClick={() => setShowAdd(true)}><i className="ti ti-plus" /> New rule</button>
      </div>
      {showAdd && <AddRuleModal form={form} setForm={setForm} onSave={addRule} onCancel={() => setShowAdd(false)} />}
      <div className="rule-list">
        {rules.map(r => (
          <div className="rc-wrap" key={r.id}>
            <RuleCard rule={r} onToggle={() => toggleRule(r.id)} onDelete={() => deleteRule(r.id)} />
          </div>
        ))}
        {rules.length === 0 && <div className="empty">No rules configured. Add one to start automating.</div>}
      </div>
    </>
  )
}

function RuleCard({ rule, onToggle, onDelete }) {
  return (
    <div className={`rc ${rule.active ? 'active-rule' : 'paused-rule'} ${rule.type === 'CONDITIONAL' ? 'cond-rule' : ''}`}>
      <div>
        <div className="rn-row">
          <span className="rn">{rule.name}</span>
          <span className={`badge ${rule.type === 'SCHEDULED' ? 'b-sched' : 'b-cond'}`}>{rule.type}</span>
          <span className={`badge ${rule.active ? 'b-active' : 'b-paused'}`}>{rule.active ? 'active' : 'paused'}</span>
        </div>
        <div className="rd">{rule.amount} {rule.token} → {rule.recipient}{rule.interval ? ` · every ${rule.interval}` : ''}{rule.cond ? ` · when ${rule.cond}` : ''}</div>
        <div className="rd" style={{ marginTop: 3, color: 'var(--t3)' }}>limit {rule.limit} {rule.token} · last: {rule.last}</div>
      </div>
      <div className="ra">
        <button className="btn btn-ghost btn-sm" onClick={onToggle}>{rule.active ? 'Pause' : 'Resume'}</button>
        <button className="btn btn-danger btn-sm" onClick={onDelete}><i className="ti ti-trash" /></button>
      </div>
    </div>
  )
}

function AddRuleModal({ form, setForm, onSave, onCancel }) {
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  return (
    <div className="modal-bg">
      <div className="modal">
        <div className="modal-title">New automation rule</div>
        <div className="fg"><label className="fl">Rule name</label><input className="fi" placeholder="e.g. Friday payroll" value={form.name} onChange={f('name')} /></div>
        <div className="fr">
          <div className="fg"><label className="fl">Type</label><select className="fse" value={form.type} onChange={f('type')}><option value="SCHEDULED">Scheduled</option><option value="CONDITIONAL">Conditional</option></select></div>
          <div className="fg"><label className="fl">Token</label><select className="fse" value={form.token} onChange={f('token')}><option>USDC</option><option>ETH</option></select></div>
        </div>
        <div className="fg"><label className="fl">Recipient address</label><input className="fi" placeholder="0x..." value={form.recipient} onChange={f('recipient')} /></div>
        <div className="fr">
          <div className="fg"><label className="fl">Amount per execution</label><input className="fi" type="number" placeholder="500" value={form.amount} onChange={f('amount')} /></div>
          <div className="fg"><label className="fl">Spend limit (cap)</label><input className="fi" type="number" placeholder="600" value={form.limit} onChange={f('limit')} /></div>
        </div>
        {form.type === 'SCHEDULED' && <div className="fg"><label className="fl">Interval</label><select className="fse" value={form.interval} onChange={f('interval')}><option value="3600">Every hour</option><option value="86400">Every day</option><option value="604800">Every week</option><option value="2592000">Every month</option></select></div>}
        {form.type === 'CONDITIONAL' && <div className="fg"><label className="fl">Trigger when balance exceeds</label><input className="fi" type="number" placeholder="5000" value={form.condVal} onChange={f('condVal')} /></div>}
        <div className="ma">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-acid" onClick={onSave}>Create rule</button>
        </div>
      </div>
    </div>
  )
}

function Log({ log, simulate }) {
  return (
    <>
      <div className="ph">
        <div className="ph-left">
          <div className="pt">Activity log</div>
          <div className="ps">{log.length} executions recorded on-chain</div>
        </div>
        <button className="btn btn-ghost" onClick={simulate}><i className="ti ti-player-play" /> Simulate</button>
      </div>
      <div className="log-list">
        {log.map(e => <LogItem key={e.id} entry={e} />)}
        {log.length === 0 && <div className="empty">No executions yet.</div>}
      </div>
    </>
  )
}

function LogItem({ entry: e }) {
  return (
    <div className="li">
      <div className="li-icon"><i className="ti ti-check" /></div>
      <div className="lit">
        <div className="lit-rule">{e.rule}</div>
        <div className="lit-to">{e.to}</div>
      </div>
      <span className="lam">{e.amount} {e.token}</span>
      <span className="ltm">{e.time}</span>
    </div>
  )
}

function Settings({ agentOn, setAgentOn }) {
  return (
    <>
      <div className="ph">
        <div className="ph-left">
          <div className="pt">Settings</div>
          <div className="ps">Agent configuration and safety controls</div>
        </div>
      </div>
      <div className="two" style={{ marginBottom: 16 }}>
        <div className="sc"><div className="sl">Agent contract</div><div className="mono-val teal">{AGENT}</div><div className="ss">Arbitrum Sepolia · chain 421614</div></div>
        <div className="sc"><div className="sl">Keeper bot</div><div className="mono-val muted">0x3d9A...7B22</div><div className="ss">Polling every 60 seconds</div></div>
        <div className="sc"><div className="sl">Daily USDC cap</div><div className="sv" style={{ fontSize: 22, marginTop: 8 }}>2,000</div><div className="ss">max per 24h window</div></div>
        <div className="sc"><div className="sl">Daily ETH cap</div><div className="sv" style={{ fontSize: 22, marginTop: 8 }}>0.5</div><div className="ss">max per 24h window</div></div>
        <div className="sc full" style={{ borderTop: `2px solid ${agentOn ? 'var(--acid)' : 'var(--red)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="sl">Emergency kill switch</div>
              <div style={{ fontSize: 12, marginTop: 6, color: 'var(--t2)', fontWeight: 300 }}>{agentOn ? 'Agent is live. All active rules execute on schedule.' : 'Agent is paused. No rules will execute until reactivated.'}</div>
            </div>
            <button className={`btn ${agentOn ? 'btn-danger' : 'btn-acid'}`} onClick={() => setAgentOn(v => !v)}>
              <i className={`ti ${agentOn ? 'ti-power' : 'ti-player-play'}`} />
              {agentOn ? 'Deactivate agent' : 'Activate agent'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="sc">
      <div className="sl">{label}</div>
      <div className={`sv ${accent ? 'accent' : ''}`}>{value}</div>
      <div className="ss">{sub}</div>
    </div>
  )
}

function Toggle({ on, onClick }) {
  return (
    <div className={`tog ${on ? 'on' : ''}`} onClick={onClick}>
      <div className="tthumb" />
    </div>
  )
}
