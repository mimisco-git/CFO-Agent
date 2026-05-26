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

const INITIAL_QUEUE = [
  { id: 0, rule: 'Friday payroll', ruleId: 0, priority: 'NORMAL', status: 'QUEUED', attempts: 0, maxRetries: 3, createdAt: '2m ago' },
  { id: 1, rule: 'Yield sweep', ruleId: 1, priority: 'HIGH', status: 'QUEUED', attempts: 0, maxRetries: 3, createdAt: '5m ago' },
]

const BLANK = { name: '', type: 'SCHEDULED', token: 'USDC', recipient: '', amount: '', limit: '', interval: '604800', condVal: '' }

function fmtInterval(s) {
  const n = Number(s)
  if (n >= 2592000) return '1 month'
  if (n >= 604800) return '1 week'
  if (n >= 86400) return '1 day'
  return '1 hour'
}

function truncate(addr) {
  if (!addr || addr.includes('...')) return addr
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

export default function App() {
  const [page, setPage] = useState('landing')
  const [agentOn, setAgentOn] = useState(true)
  const [nav, setNav] = useState('dashboard')
  const [rules, setRules] = useState(INITIAL_RULES)
  const [log, setLog] = useState(INITIAL_LOG)
  const [queue, setQueue] = useState(INITIAL_QUEUE)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(BLANK)
  const logId = useRef(10)
  const jobId = useRef(10)

  function simulate() {
    const active = rules.filter(r => r.active)
    if (!active.length) return
    const rule = active[Math.floor(Math.random() * active.length)]
    const newJob = { id: jobId.current++, rule: rule.name, ruleId: rule.id, priority: 'NORMAL', status: 'QUEUED', attempts: 0, maxRetries: 3, createdAt: 'just now' }
    setQueue(q => [newJob, ...q])
    setTimeout(() => {
      setQueue(q => q.map(j => j.id === newJob.id ? { ...j, status: 'EXECUTING' } : j))
      setTimeout(() => {
        setQueue(q => q.map(j => j.id === newJob.id ? { ...j, status: 'COMPLETED' } : j))
        setLog(l => [{ id: logId.current++, rule: rule.name, token: rule.token, amount: '+' + rule.amount, to: rule.recipient, time: 'just now' }, ...l])
        setRules(r => r.map(rl => rl.id === rule.id ? { ...rl, last: 'just now' } : rl))
      }, 1800)
    }, 1000)
  }

  function addRule() {
    setRules(r => [...r, { id: Date.now(), name: form.name || 'Unnamed rule', type: form.type, token: form.token, recipient: form.recipient || '0x0000...0000', amount: form.amount, interval: form.type === 'SCHEDULED' ? fmtInterval(form.interval) : '', limit: form.limit, cond: form.type === 'CONDITIONAL' ? `Balance > ${form.condVal} ${form.token}` : '', active: true, last: 'never' }])
    setShowAdd(false)
    setForm(BLANK)
  }

  function launch() { setPage('app') }

  if (page === 'landing') return <LandingPage onLaunch={launch} />

  const activeCount = rules.filter(r => r.active).length
  const queueDepth = queue.filter(j => j.status === 'QUEUED' || j.status === 'EXECUTING').length

  return (
    <div className="wrap">
      <Sidebar nav={nav} setNav={setNav} queueDepth={queueDepth} />
      <main className="main">
        {nav === 'dashboard' && <Dashboard rules={rules} log={log} queue={queue} agentOn={agentOn} setAgentOn={setAgentOn} simulate={simulate} activeCount={activeCount} queueDepth={queueDepth} />}
        {nav === 'sequencer' && <Sequencer queue={queue} simulate={simulate} cancelJob={id => setQueue(q => q.map(j => j.id === id ? { ...j, status: 'CANCELLED' } : j))} boostJob={id => setQueue(q => q.map(j => j.id === id ? { ...j, priority: 'CRITICAL' } : j))} />}
        {nav === 'rules' && <Rules rules={rules} showAdd={showAdd} setShowAdd={setShowAdd} form={form} setForm={setForm} addRule={addRule} toggleRule={id => setRules(r => r.map(rl => rl.id === id ? { ...rl, active: !rl.active } : rl))} deleteRule={id => setRules(r => r.filter(rl => rl.id !== id))} />}
        {nav === 'log' && <Log log={log} simulate={simulate} />}
        {nav === 'settings' && <Settings agentOn={agentOn} setAgentOn={setAgentOn} />}
      </main>
    </div>
  )
}

function LandingPage({ onLaunch }) {
  return (
    <div className="landing">
      <div className="land-grid" />
      <div className="land-glow" />

      <nav className="land-nav">
        <div className="land-logo">
          <div className="land-logo-mark" />
          <div className="land-logo-text">CFO Agent</div>
        </div>
        <div className="land-nav-right">
          <div className="land-pill">
            <div className="land-pill-dot" />
            Built on Arbitrum
          </div>
          <button className="btn-ghost btn" onClick={onLaunch}>
            Launch app
          </button>
        </div>
      </nav>

      <div className="land-hero">
        <div className="land-tag">
          <div className="land-tag-dot" />
          Open House London Buildathon 2026
        </div>

        <h1 className="land-h1">
          Your treasury.<br />
          <span>Automated.</span>
        </h1>

        <p className="land-sub">
          Set payment rules once. CFO Agent executes them onchain, 24/7,
          without you touching anything. Payroll, yield routing, recurring
          transfers — all autonomous.
        </p>

        <div className="land-btns">
          <button className="land-btn-primary" onClick={onLaunch}>
            <i className="ti ti-rocket" />
            Launch app
          </button>
          <a className="land-btn-secondary" href="https://github.com/mimisco-git/CFO-agent" target="_blank" rel="noreferrer">
            <i className="ti ti-brand-github" />
            View on GitHub
          </a>
        </div>

        <div className="land-stats">
          <div className="land-stat">
            <div className="land-stat-val">3</div>
            <div className="land-stat-label">Smart contracts</div>
          </div>
          <div className="land-stat">
            <div className="land-stat-val">24/7</div>
            <div className="land-stat-label">Autonomous execution</div>
          </div>
          <div className="land-stat">
            <div className="land-stat-val">0</div>
            <div className="land-stat-label">Manual transactions</div>
          </div>
        </div>
      </div>

      <div className="land-features">
        {[
          { icon: 'ti-bolt', title: 'Rule engine', desc: 'Define scheduled and conditional payment rules. The agent executes them automatically based on time or on-chain conditions.' },
          { icon: 'ti-stack-2', title: 'Priority sequencer', desc: 'Jobs queue in order. CRITICAL executes first, then HIGH, then NORMAL. Retry logic handles failed executions automatically.' },
          { icon: 'ti-shield-check', title: 'Safety controls', desc: 'Emergency kill switch, per-rule spend limits, daily caps, and multi-sig support keep your treasury protected at all times.' },
        ].map(f => (
          <div className="land-feature" key={f.title}>
            <div className="land-feature-icon"><i className={`ti ${f.icon}`} /></div>
            <div className="land-feature-title">{f.title}</div>
            <div className="land-feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Sidebar({ nav, setNav, queueDepth }) {
  return (
    <aside className="side">
      <div className="side-top">
        <div className="logo">
          <div className="logo-mark" />
          <div><div className="logo-text">CFO Agent</div><div className="logo-sub">Treasury OS</div></div>
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
        <button className={`nav ${nav === 'sequencer' ? 'on' : ''}`} onClick={() => setNav('sequencer')}>
          <i className="ti ti-stack-2" />Sequencer
          {queueDepth > 0 && <span className="nav-badge">{queueDepth}</span>}
        </button>
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

function Dashboard({ rules, log, queue, agentOn, setAgentOn, simulate, activeCount, queueDepth }) {
  return (
    <>
      <div className="ph">
        <div className="ph-left"><div className="pt">Dashboard</div><div className="ps">Arbitrum Sepolia · last sync 12s ago</div></div>
        <button className="btn btn-ghost" onClick={simulate}><i className="ti ti-player-play" /> Simulate execution</button>
      </div>
      <div className="stats">
        <StatCard label="Treasury balance" value="4,820" sub="USDC" accent />
        <StatCard label="Active rules" value={activeCount} sub={`of ${rules.length} total`} />
        <StatCard label="Queue depth" value={queueDepth} sub="jobs pending" />
        <StatCard label="USDC routed" value="2,000" sub="this month" />
      </div>
      <div className="status-bar">
        <div className="sb-left">
          <div className={`sb-indicator ${agentOn ? '' : 'off'}`}>
            <div className="status-dot" style={agentOn ? {} : { background: 'var(--t3)', animation: 'none' }} />
          </div>
          <div>
            <div className="sb-label">Agent {agentOn ? 'running' : 'paused'}</div>
            <div className="sb-sub">{agentOn ? 'Sequencer polling every 30s · rules execute in priority order' : 'All execution suspended'}</div>
          </div>
        </div>
        <div className="sb-right">
          <span className="sb-status" style={{ color: agentOn ? 'var(--acid)' : 'var(--t3)' }}>{agentOn ? 'Online' : 'Offline'}</span>
          <Toggle on={agentOn} onClick={() => setAgentOn(v => !v)} />
        </div>
      </div>
      <div className="two-col">
        <div>
          <div className="sh"><div className="st">Recent activity</div></div>
          <div className="log-list">{log.slice(0, 4).map(e => <LogItem key={e.id} entry={e} />)}</div>
        </div>
        <div>
          <div className="sh"><div className="st">Execution queue</div></div>
          <div className="q-mini">
            {queue.slice(0, 4).map(j => <QueueMiniItem key={j.id} job={j} />)}
            {queue.length === 0 && <div className="empty" style={{ padding: 20 }}>Queue empty</div>}
          </div>
        </div>
      </div>
    </>
  )
}

function Sequencer({ queue, simulate, cancelJob, boostJob }) {
  const queued = queue.filter(j => j.status === 'QUEUED' || j.status === 'EXECUTING')
  const done = queue.filter(j => ['COMPLETED','FAILED','CANCELLED'].includes(j.status))
  const pOrder = { CRITICAL: 2, HIGH: 1, NORMAL: 0 }

  return (
    <>
      <div className="ph">
        <div className="ph-left"><div className="pt">Execution sequencer</div><div className="ps">{queued.length} jobs pending · CRITICAL first, then HIGH, then NORMAL</div></div>
        <button className="btn btn-ghost" onClick={simulate}><i className="ti ti-plus" /> Enqueue job</button>
      </div>
      <div className="stats" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <StatCard label="Queue depth" value={queued.length} sub="pending jobs" />
        <StatCard label="Completed" value={queue.filter(j => j.status === 'COMPLETED').length} sub="all time" accent />
        <StatCard label="Failed" value={queue.filter(j => j.status === 'FAILED').length} sub="needs attention" />
      </div>
      <div className="sh" style={{ marginTop: 8 }}><div className="st">Pending queue</div></div>
      <div className="q-list" style={{ marginBottom: 24 }}>
        {queued.length === 0 && <div className="empty">No jobs in queue. Rules will be enqueued automatically when ready.</div>}
        {[...queued].sort((a, b) => (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0)).map(j => (
          <QueueCard key={j.id} job={j} onCancel={() => cancelJob(j.id)} onBoost={() => boostJob(j.id)} />
        ))}
      </div>
      {done.length > 0 && (
        <>
          <div className="sh"><div className="st">Completed jobs</div></div>
          <div className="q-list">{done.map(j => <QueueCard key={j.id} job={j} done />)}</div>
        </>
      )}
    </>
  )
}

function QueueCard({ job, onCancel, onBoost, done }) {
  const pColor = { CRITICAL: 'var(--red)', HIGH: 'var(--amber)', NORMAL: 'var(--t3)' }
  const sColor = { QUEUED: 'var(--teal)', EXECUTING: 'var(--acid)', COMPLETED: 'var(--t3)', FAILED: 'var(--red)', CANCELLED: 'var(--t3)' }
  return (
    <div className="qc" style={{ borderLeftColor: pColor[job.priority] || 'var(--t3)' }}>
      <div>
        <div className="qc-top">
          <span className="qc-name">{job.rule}</span>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.04)', color: pColor[job.priority] }}>{job.priority}</span>
          <span className="badge" style={{ color: sColor[job.status], background: 'rgba(255,255,255,0.04)' }}>
            {job.status === 'EXECUTING' && <span className="exec-dot" />}{job.status}
          </span>
        </div>
        <div className="qc-sub">Job #{job.id} · rule {job.ruleId} · attempt {job.attempts}/{job.maxRetries} · {job.createdAt}</div>
      </div>
      {!done && (
        <div className="ra">
          {job.priority !== 'CRITICAL' && <button className="btn btn-ghost btn-sm" onClick={onBoost}><i className="ti ti-bolt" /> Boost</button>}
          <button className="btn btn-danger btn-sm" onClick={onCancel}>Cancel</button>
        </div>
      )}
    </div>
  )
}

function QueueMiniItem({ job }) {
  const sColor = { QUEUED: 'var(--teal)', EXECUTING: 'var(--acid)', COMPLETED: 'var(--t3)', FAILED: 'var(--red)', CANCELLED: 'var(--t3)' }
  return (
    <div className="qm">
      <div className="qm-dot" style={{ background: sColor[job.status] || 'var(--t3)' }} />
      <div className="qm-rule">{job.rule}</div>
      <div className="qm-status">{job.status}</div>
      <div className="qm-pri" style={{ color: job.priority === 'CRITICAL' ? 'var(--red)' : job.priority === 'HIGH' ? 'var(--amber)' : 'var(--t3)' }}>{job.priority}</div>
    </div>
  )
}

function Rules({ rules, showAdd, setShowAdd, form, setForm, addRule, toggleRule, deleteRule }) {
  return (
    <>
      <div className="ph">
        <div className="ph-left"><div className="pt">Automation rules</div><div className="ps">{rules.filter(r => r.active).length} active · {rules.filter(r => !r.active).length} paused</div></div>
        <button className="btn btn-acid" onClick={() => setShowAdd(true)}><i className="ti ti-plus" /> New rule</button>
      </div>
      {showAdd && <AddRuleModal form={form} setForm={setForm} onSave={addRule} onCancel={() => setShowAdd(false)} />}
      <div className="rule-list">
        {rules.map(r => (
          <div className="rc-wrap" key={r.id}>
            <div className={`rc ${r.active ? 'active-rule' : 'paused-rule'} ${r.type === 'CONDITIONAL' ? 'cond-rule' : ''}`}>
              <div>
                <div className="rn-row">
                  <span className="rn">{r.name}</span>
                  <span className={`badge ${r.type === 'SCHEDULED' ? 'b-sched' : 'b-cond'}`}>{r.type}</span>
                  <span className={`badge ${r.active ? 'b-active' : 'b-paused'}`}>{r.active ? 'active' : 'paused'}</span>
                </div>
                <div className="rd">{r.amount} {r.token} → {r.recipient}{r.interval ? ` · every ${r.interval}` : ''}{r.cond ? ` · when ${r.cond}` : ''}</div>
                <div className="rd" style={{ marginTop: 3, color: 'var(--t3)' }}>limit {r.limit} {r.token} · last: {r.last}</div>
              </div>
              <div className="ra">
                <button className="btn btn-ghost btn-sm" onClick={() => toggleRule(r.id)}>{r.active ? 'Pause' : 'Resume'}</button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteRule(r.id)}><i className="ti ti-trash" /></button>
              </div>
            </div>
          </div>
        ))}
        {rules.length === 0 && <div className="empty">No rules configured.</div>}
      </div>
    </>
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
          <div className="fg"><label className="fl">Amount</label><input className="fi" type="number" placeholder="500" value={form.amount} onChange={f('amount')} /></div>
          <div className="fg"><label className="fl">Spend limit</label><input className="fi" type="number" placeholder="600" value={form.limit} onChange={f('limit')} /></div>
        </div>
        {form.type === 'SCHEDULED' && <div className="fg"><label className="fl">Interval</label><select className="fse" value={form.interval} onChange={f('interval')}><option value="3600">Every hour</option><option value="86400">Every day</option><option value="604800">Every week</option><option value="2592000">Every month</option></select></div>}
        {form.type === 'CONDITIONAL' && <div className="fg"><label className="fl">Trigger when balance exceeds</label><input className="fi" type="number" placeholder="5000" value={form.condVal} onChange={f('condVal')} /></div>}
        <div className="ma"><button className="btn btn-ghost" onClick={onCancel}>Cancel</button><button className="btn btn-acid" onClick={onSave}>Create rule</button></div>
      </div>
    </div>
  )
}

function Log({ log, simulate }) {
  return (
    <>
      <div className="ph">
        <div className="ph-left"><div className="pt">Activity log</div><div className="ps">{log.length} executions recorded on-chain</div></div>
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
      <div className="lit"><div className="lit-rule">{e.rule}</div><div className="lit-to">{e.to}</div></div>
      <span className="lam">{e.amount} {e.token}</span>
      <span className="ltm">{e.time}</span>
    </div>
  )
}

function Settings({ agentOn, setAgentOn }) {
  return (
    <>
      <div className="ph"><div className="ph-left"><div className="pt">Settings</div><div className="ps">Agent configuration and safety controls</div></div></div>
      <div className="two" style={{ marginBottom: 16 }}>
        <div className="sc"><div className="sl">Agent contract</div><div className="mono-val teal">{AGENT}</div><div className="ss">Arbitrum Sepolia · chain 421614</div></div>
        <div className="sc"><div className="sl">Keeper bot</div><div className="mono-val muted">0x3d9A...7B22</div><div className="ss">Polling every 30 seconds</div></div>
        <div className="sc"><div className="sl">Sequencer</div><div className="mono-val teal">0x5f2c...8A11</div><div className="ss">CRITICAL, HIGH, NORMAL priority</div></div>
        <div className="sc"><div className="sl">Daily USDC cap</div><div className="sv" style={{ fontSize: 22, marginTop: 8 }}>2,000</div><div className="ss">max per 24h window</div></div>
        <div className="sc full" style={{ borderTop: `2px solid ${agentOn ? 'var(--acid)' : 'var(--red)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="sl">Emergency kill switch</div>
              <div style={{ fontSize: 12, marginTop: 6, color: 'var(--t2)', fontWeight: 300 }}>{agentOn ? 'Agent live. Sequencer processing in priority order.' : 'Agent paused. No rules will execute until reactivated.'}</div>
            </div>
            <button className={`btn ${agentOn ? 'btn-danger' : 'btn-acid'}`} onClick={() => setAgentOn(v => !v)}>
              <i className={`ti ${agentOn ? 'ti-power' : 'ti-player-play'}`} />{agentOn ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function StatCard({ label, value, sub, accent }) {
  return <div className="sc"><div className="sl">{label}</div><div className={`sv ${accent ? 'accent' : ''}`}>{value}</div><div className="ss">{sub}</div></div>
}

function Toggle({ on, onClick }) {
  return <div className={`tog ${on ? 'on' : ''}`} onClick={onClick}><div className="tthumb" /></div>
}
