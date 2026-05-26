import { useState, useRef, useEffect } from 'react'
import './App.css'

const WALLET = '0x71C7...976F'
const AGENT  = '0x9aB4...1e77'

const BOOT_LINES = [
  { text: '...', type: 'dim', delay: 200 },
  { text: 'SIGNAL DETECTED', type: 'normal', delay: 600 },
  { text: 'SOURCE: ARBITRUM NETWORK', type: 'normal', delay: 1100 },
  { text: 'PROTOCOL: CFO-AGENT v1.0', type: 'normal', delay: 1600 },
  { text: 'CHAIN ID: 421614 [SEPOLIA]', type: 'normal', delay: 2100 },
  { text: 'RULE REGISTRY: ONLINE', type: 'acid', delay: 2600 },
  { text: 'EXECUTION SEQUENCER: ACTIVE', type: 'acid', delay: 3100 },
  { text: 'TREASURY: $4,820 USDC', type: 'normal', delay: 3600 },
  { text: 'AGENT STATUS: READY', type: 'acid', delay: 4100 },
  { text: 'PRESS ENTER TO LAUNCH', type: 'bright', delay: 4700 },
]

const INITIAL_RULES = [
  { id: 0, name: 'FRIDAY PAYROLL', type: 'SCHEDULED', token: 'USDC', recipient: '0x4f3a...9B12', amount: '500', interval: '7 DAYS', limit: '600', active: true, last: '2 DAYS AGO' },
  { id: 1, name: 'YIELD SWEEP', type: 'CONDITIONAL', token: 'USDC', recipient: '0x8c2d...4A90', amount: '1000', interval: '', limit: '2000', cond: 'BALANCE > 5000 USDC', active: true, last: '5 DAYS AGO' },
  { id: 2, name: 'DAILY OPS BUDGET', type: 'SCHEDULED', token: 'ETH', recipient: '0x2e7f...B301', amount: '0.05', interval: '1 DAY', limit: '0.1', active: false, last: '15 DAYS AGO' },
]

const INITIAL_LOG = [
  { id: 1, rule: 'FRIDAY PAYROLL', token: 'USDC', amount: '+500', to: '0x4f3a...9B12', time: '2D AGO' },
  { id: 2, rule: 'YIELD SWEEP', token: 'USDC', amount: '+1000', to: '0x8c2d...4A90', time: '5D AGO' },
  { id: 3, rule: 'FRIDAY PAYROLL', token: 'USDC', amount: '+500', to: '0x4f3a...9B12', time: '9D AGO' },
]

const INITIAL_QUEUE = [
  { id: 0, rule: 'FRIDAY PAYROLL', ruleId: 0, priority: 'NORMAL', status: 'QUEUED', attempts: 0, maxRetries: 3, createdAt: '2M AGO' },
  { id: 1, rule: 'YIELD SWEEP', ruleId: 1, priority: 'HIGH', status: 'QUEUED', attempts: 0, maxRetries: 3, createdAt: '5M AGO' },
]

const BLANK = { name: '', type: 'SCHEDULED', token: 'USDC', recipient: '', amount: '', limit: '', interval: '604800', condVal: '' }

function fmtInterval(s) {
  const n = Number(s)
  if (n >= 2592000) return '1 MONTH'
  if (n >= 604800) return '1 WEEK'
  if (n >= 86400) return '1 DAY'
  return '1 HOUR'
}

function usePing() {
  const [ping, setPing] = useState(39)
  useEffect(() => {
    const id = setInterval(() => setPing(20 + Math.floor(Math.random() * 60)), 2000)
    return () => clearInterval(id)
  }, [])
  return ping
}

function useTime() {
  const [t, setT] = useState('')
  useEffect(() => {
    const fmt = () => {
      const d = new Date()
      setT(`${d.getHours().toString().padStart(2,'0')}${d.getMinutes().toString().padStart(2,'0')}`)
    }
    fmt()
    const id = setInterval(fmt, 1000)
    return () => clearInterval(id)
  }, [])
  return t
}

export default function App() {
  const [page, setPage] = useState('intro')
  const [bootIdx, setBootIdx] = useState(0)
  const [agentOn, setAgentOn] = useState(true)
  const [nav, setNav] = useState('dashboard')
  const [rules, setRules] = useState(INITIAL_RULES)
  const [log, setLog] = useState(INITIAL_LOG)
  const [queue, setQueue] = useState(INITIAL_QUEUE)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [status, setStatus] = useState('STANDBY')
  const logId = useRef(10)
  const jobId = useRef(10)
  const ping = usePing()
  const time = useTime()

  useEffect(() => {
    if (page !== 'boot') return
    if (bootIdx >= BOOT_LINES.length) return
    const line = BOOT_LINES[bootIdx]
    const timer = setTimeout(() => setBootIdx(i => i + 1), line.delay)
    return () => clearTimeout(timer)
  }, [page, bootIdx])

  function startBoot() {
    setPage('boot')
    setStatus('BOOTING')
    setBootIdx(0)
  }

  function launch() {
    setPage('app')
    setStatus('ONLINE')
  }

  useEffect(() => {
    if (page !== 'intro') return
    const onKey = () => startBoot()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [page])

  useEffect(() => {
    if (page !== 'boot') return
    const onKey = (e) => { if (e.key === 'Enter' && bootIdx >= BOOT_LINES.length) launch() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [page, bootIdx])

  function simulate() {
    const active = rules.filter(r => r.active)
    if (!active.length) return
    const rule = active[Math.floor(Math.random() * active.length)]
    const newJob = { id: jobId.current++, rule: rule.name, ruleId: rule.id, priority: 'NORMAL', status: 'QUEUED', attempts: 0, maxRetries: 3, createdAt: 'JUST NOW' }
    setQueue(q => [newJob, ...q])
    setStatus('EXECUTING')
    setTimeout(() => {
      setQueue(q => q.map(j => j.id === newJob.id ? { ...j, status: 'EXECUTING' } : j))
      setTimeout(() => {
        setQueue(q => q.map(j => j.id === newJob.id ? { ...j, status: 'COMPLETED' } : j))
        setLog(l => [{ id: logId.current++, rule: rule.name, token: rule.token, amount: '+' + rule.amount, to: rule.recipient, time: 'JUST NOW' }, ...l])
        setRules(r => r.map(rl => rl.id === rule.id ? { ...rl, last: 'JUST NOW' } : rl))
        setStatus('ONLINE')
      }, 1800)
    }, 1000)
  }

  function addRule() {
    setRules(r => [...r, { id: Date.now(), name: (form.name || 'UNNAMED RULE').toUpperCase(), type: form.type, token: form.token, recipient: form.recipient || '0x0000...0000', amount: form.amount, interval: form.type === 'SCHEDULED' ? fmtInterval(form.interval) : '', limit: form.limit, cond: form.type === 'CONDITIONAL' ? `BALANCE > ${form.condVal} ${form.token}` : '', active: true, last: 'NEVER' }])
    setShowAdd(false)
    setForm(BLANK)
  }

  const activeCount = rules.filter(r => r.active).length
  const queueDepth = queue.filter(j => j.status === 'QUEUED' || j.status === 'EXECUTING').length
  const statusColor = { STANDBY: 'var(--muted)', BOOTING: 'var(--amber)', ONLINE: 'var(--acid)', EXECUTING: 'var(--teal)' }[status] || 'var(--muted)'

  if (page === 'intro') return (
    <div className="terminal" onClick={startBoot}>
      <div className="scanline-overlay" />
      <div className="term-bar">
        <div className="term-bar-left">
          <div className="term-bar-dot" />
          <span>STATUS : STANDBY</span>
        </div>
        <span>CFO-AGENT / AWAITING</span>
      </div>
      <div className="term-body">
        <div className="intro-text">PRESS ANY KEY TO BEGIN TRANSMISSION</div>
      </div>
    </div>
  )

  if (page === 'boot') return (
    <div className="terminal">
      <div className="scanline-overlay" />
      <div className="term-bar">
        <div className="term-bar-left">
          <div className="term-bar-dot amber" />
          <span>STATUS : BOOTING&nbsp;&nbsp;PING : {String(ping).padStart(3,'0')} MS</span>
        </div>
        <span>{time} / SYNC FINDING</span>
      </div>
      <div className="term-body" style={{ alignItems: 'flex-start', paddingLeft: '15%' }}>
        <div className="boot-block">
          {BOOT_LINES.slice(0, bootIdx).map((line, i) => (
            <div key={i} className={`boot-line ${line.type === 'dim' ? 'dim-line' : line.type === 'acid' ? 'acid-line' : line.type === 'bright' ? 'bright-line' : ''}`}>
              {line.type !== 'dim' && <span className="boot-chevron">&gt;</span>}
              {line.type === 'dim' ? <span style={{color:'var(--muted)'}}>{line.text}</span> : line.text}
            </div>
          ))}
          {bootIdx < BOOT_LINES.length && (
            <div className="boot-line">
              <span className="boot-chevron">&gt;</span>
              <BlockLoader progress={bootIdx} total={BOOT_LINES.length} />
            </div>
          )}
          {bootIdx >= BOOT_LINES.length && (
            <div className="boot-line" style={{ marginTop: 8 }}>
              <span className="boot-chevron">&gt;</span>
              <span className="boot-cursor" />
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="wrap">
      <aside className="side">
        <div className="side-top">
          <div className="logo">
            <div className="logo-text">CFO AGENT</div>
            <div className="logo-sub">TREASURY OS v1.0</div>
          </div>
        </div>
        <nav className="side-nav">
          <div className="nav-label">// OVERVIEW</div>
          {[{ id: 'dashboard', label: 'DASHBOARD' }, { id: 'log', label: 'ACTIVITY' }].map(item => (
            <button key={item.id} className={`nav ${nav === item.id ? 'on' : ''}`} onClick={() => setNav(item.id)}>
              {item.label}
            </button>
          ))}
          <div className="nav-label">// AUTOMATION</div>
          <button className={`nav ${nav === 'sequencer' ? 'on' : ''}`} onClick={() => setNav('sequencer')}>
            SEQUENCER {queueDepth > 0 && <span className="nav-badge">{queueDepth}</span>}
          </button>
          {[{ id: 'rules', label: 'RULES' }, { id: 'settings', label: 'SETTINGS' }].map(item => (
            <button key={item.id} className={`nav ${nav === item.id ? 'on' : ''}`} onClick={() => setNav(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <div className="wallet-label"><div className="status-dot" />CONNECTED</div>
          <div className="wallet-addr">{WALLET}</div>
          <div className="agent-addr">AGENT: {AGENT}</div>
        </div>
      </aside>

      <div className="main">
        <div className="main-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="term-bar-dot" style={{ background: statusColor, borderRadius: '50%', width: 8, height: 8, animation: 'blink 1.2s infinite' }} />
            <span>STATUS : <span style={{ color: statusColor }}>{status}</span></span>
            <span>PING : {String(ping).padStart(3,'0')} MS</span>
          </div>
          <span>{time} / ARBITRUM SEPOLIA</span>
        </div>

        <div className="main-content">
          {nav === 'dashboard' && <Dashboard rules={rules} log={log} queue={queue} agentOn={agentOn} setAgentOn={setAgentOn} simulate={simulate} activeCount={activeCount} queueDepth={queueDepth} />}
          {nav === 'sequencer' && <Sequencer queue={queue} simulate={simulate} cancelJob={id => setQueue(q => q.map(j => j.id === id ? { ...j, status: 'CANCELLED' } : j))} boostJob={id => setQueue(q => q.map(j => j.id === id ? { ...j, priority: 'CRITICAL' } : j))} />}
          {nav === 'rules' && <Rules rules={rules} showAdd={showAdd} setShowAdd={setShowAdd} form={form} setForm={setForm} addRule={addRule} toggleRule={id => setRules(r => r.map(rl => rl.id === id ? { ...rl, active: !rl.active } : rl))} deleteRule={id => setRules(r => r.filter(rl => rl.id !== id))} />}
          {nav === 'log' && <Log log={log} simulate={simulate} />}
          {nav === 'settings' && <Settings agentOn={agentOn} setAgentOn={setAgentOn} />}
        </div>
      </div>
    </div>
  )
}

function BlockLoader({ progress, total }) {
  const filled = Math.floor((progress / total) * 5)
  return (
    <div className="block-loader">
      <span className="block-label">SY</span>
      <div className="blocks">
        {[0,1,2,3,4].map(i => (
          <div key={i} className={`block ${i < filled ? 'filled' : 'empty'}`} />
        ))}
      </div>
      <span className="block-label">{progress >= total ? 'RDY' : 'EXE'}</span>
    </div>
  )
}

function Dashboard({ rules, log, queue, agentOn, setAgentOn, simulate, activeCount, queueDepth }) {
  return (
    <>
      <div className="ph">
        <div><div className="pt">DASHBOARD</div><div className="ps">ARBITRUM SEPOLIA // LAST SYNC 12S AGO</div></div>
        <button className="btn" onClick={simulate}>&gt; SIMULATE EXECUTION</button>
      </div>
      <div className="stats">
        <StatCard label="TREASURY BALANCE" value="4,820" sub="USDC" accent />
        <StatCard label="ACTIVE RULES" value={activeCount} sub={`OF ${rules.length} TOTAL`} />
        <StatCard label="QUEUE DEPTH" value={queueDepth} sub="JOBS PENDING" />
        <StatCard label="USDC ROUTED" value="2,000" sub="THIS MONTH" />
      </div>
      <div className="status-bar">
        <div className="sb-left">
          <div className="status-dot" style={agentOn ? {} : { background: 'var(--red)', animationDuration: '3s' }} />
          <div>
            <div className="sb-label">AGENT {agentOn ? 'RUNNING' : 'PAUSED'}</div>
            <div className="sb-sub">{agentOn ? 'SEQUENCER POLLING 30S // RULES EXECUTE IN PRIORITY ORDER' : 'ALL EXECUTION SUSPENDED'}</div>
          </div>
        </div>
        <div className="sb-right">
          <span className="sb-status" style={{ color: agentOn ? 'var(--acid)' : 'var(--red)' }}>{agentOn ? 'ONLINE' : 'OFFLINE'}</span>
          <Toggle on={agentOn} onClick={() => setAgentOn(v => !v)} />
        </div>
      </div>
      <div className="two-col">
        <div>
          <div className="sh"><div className="st">// RECENT ACTIVITY</div></div>
          <div className="log-list">{log.slice(0, 4).map(e => <LogItem key={e.id} entry={e} />)}</div>
        </div>
        <div>
          <div className="sh"><div className="st">// EXECUTION QUEUE</div></div>
          <div className="q-mini">
            {queue.slice(0, 4).map(j => <QueueMiniItem key={j.id} job={j} />)}
            {queue.length === 0 && <div className="empty">QUEUE EMPTY</div>}
          </div>
        </div>
      </div>
    </>
  )
}

function Sequencer({ queue, simulate, cancelJob, boostJob }) {
  const pOrder = { CRITICAL: 2, HIGH: 1, NORMAL: 0 }
  const queued = queue.filter(j => j.status === 'QUEUED' || j.status === 'EXECUTING')
  const done = queue.filter(j => ['COMPLETED','FAILED','CANCELLED'].includes(j.status))
  const pColor = { CRITICAL: 'var(--red)', HIGH: 'var(--amber)', NORMAL: 'var(--muted)' }
  const sColor = { QUEUED: 'var(--teal)', EXECUTING: 'var(--acid)', COMPLETED: 'var(--muted)', FAILED: 'var(--red)', CANCELLED: 'var(--muted)' }

  return (
    <>
      <div className="ph">
        <div><div className="pt">SEQUENCER</div><div className="ps">{queued.length} JOBS PENDING // CRITICAL &gt; HIGH &gt; NORMAL</div></div>
        <button className="btn" onClick={simulate}>&gt; ENQUEUE JOB</button>
      </div>
      <div className="stats" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <StatCard label="QUEUE DEPTH" value={queued.length} sub="PENDING" />
        <StatCard label="COMPLETED" value={queue.filter(j => j.status === 'COMPLETED').length} sub="ALL TIME" accent />
        <StatCard label="FAILED" value={queue.filter(j => j.status === 'FAILED').length} sub="NEEDS ATTENTION" />
      </div>
      <div className="sh" style={{ marginTop: 8 }}><div className="st">// PENDING QUEUE</div></div>
      <div className="q-list" style={{ marginBottom: 20 }}>
        {queued.length === 0 && <div className="empty">&gt; QUEUE EMPTY. KEEPER WILL ENQUEUE RULES AUTOMATICALLY.</div>}
        {[...queued].sort((a,b) => (pOrder[b.priority]||0) - (pOrder[a.priority]||0)).map(j => (
          <div className="qc" key={j.id} style={{ borderLeftColor: pColor[j.priority] || 'var(--muted)' }}>
            <div>
              <div className="qc-top">
                <span className="qc-name">&gt; {j.rule}</span>
                <span className="badge" style={{ color: pColor[j.priority], borderColor: pColor[j.priority] }}>{j.priority}</span>
                <span className="badge" style={{ color: sColor[j.status], borderColor: sColor[j.status] }}>
                  {j.status === 'EXECUTING' && (
                    <span style={{ display: 'inline-flex', gap: 2, marginRight: 6 }}>
                      {[0,1,2].map(i => <span key={i} className="exec-block" style={{ animationDelay: `${i*0.15}s` }} />)}
                      {[0,1].map(i => <span key={i} className="exec-block-empty" />)}
                    </span>
                  )}
                  {j.status}
                </span>
              </div>
              <div className="qc-sub">JOB #{j.id} // RULE {j.ruleId} // ATTEMPT {j.attempts}/{j.maxRetries} // {j.createdAt}</div>
            </div>
            <div className="ra">
              {j.priority !== 'CRITICAL' && <button className="btn btn-sm" onClick={() => boostJob(j.id)} style={{ color: 'var(--amber)', borderColor: 'var(--amber)' }}>&gt; BOOST</button>}
              <button className="btn btn-danger btn-sm" onClick={() => cancelJob(j.id)}>CANCEL</button>
            </div>
          </div>
        ))}
      </div>
      {done.length > 0 && (
        <>
          <div className="sh"><div className="st">// COMPLETED JOBS</div></div>
          <div className="q-list">
            {done.map(j => (
              <div className="qc" key={j.id} style={{ borderLeftColor: sColor[j.status] || 'var(--muted)', opacity: 0.6 }}>
                <div>
                  <div className="qc-top">
                    <span className="qc-name">&gt; {j.rule}</span>
                    <span className="badge" style={{ color: sColor[j.status], borderColor: sColor[j.status] }}>{j.status}</span>
                    <span className="badge" style={{ color: pColor[j.priority], borderColor: pColor[j.priority] }}>{j.priority}</span>
                  </div>
                  <div className="qc-sub">JOB #{j.id} // RULE {j.ruleId} // {j.attempts}/{j.maxRetries} ATTEMPTS // {j.createdAt}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

function QueueMiniItem({ job }) {
  const sColor = { QUEUED: 'var(--teal)', EXECUTING: 'var(--acid)', COMPLETED: 'var(--muted)', FAILED: 'var(--red)', CANCELLED: 'var(--muted)' }
  const pColor = { CRITICAL: 'var(--red)', HIGH: 'var(--amber)', NORMAL: 'var(--muted)' }
  return (
    <div className="qm">
      <span className="qm-chev">&gt;</span>
      <span className="qm-rule">{job.rule}</span>
      <span className="qm-status" style={{ color: sColor[job.status] }}>{job.status}</span>
      <span className="qm-pri" style={{ color: pColor[job.priority] }}>{job.priority}</span>
    </div>
  )
}

function Rules({ rules, showAdd, setShowAdd, form, setForm, addRule, toggleRule, deleteRule }) {
  return (
    <>
      <div className="ph">
        <div><div className="pt">RULES</div><div className="ps">{rules.filter(r=>r.active).length} ACTIVE // {rules.filter(r=>!r.active).length} PAUSED</div></div>
        <button className="btn btn-acid" onClick={() => setShowAdd(true)}>&gt; NEW RULE</button>
      </div>
      {showAdd && <AddRuleModal form={form} setForm={setForm} onSave={addRule} onCancel={() => setShowAdd(false)} />}
      <div className="rule-list">
        {rules.map(r => (
          <div key={r.id} className={`rc ${r.active ? 'active-rule' : 'paused-rule'} ${r.type === 'CONDITIONAL' ? 'cond-rule' : ''}`}>
            <div>
              <div className="rn-row">
                <span className="rn">&gt; {r.name}</span>
                <span className={`badge ${r.type === 'SCHEDULED' ? 'b-sched' : 'b-cond'}`}>{r.type}</span>
                <span className={`badge ${r.active ? 'b-active' : 'b-paused'}`}>{r.active ? 'ACTIVE' : 'PAUSED'}</span>
              </div>
              <div className="rd">{r.amount} {r.token} // {r.recipient}{r.interval ? ` // EVERY ${r.interval}` : ''}{r.cond ? ` // WHEN ${r.cond}` : ''}</div>
              <div className="rd" style={{ marginTop: 2, color: 'var(--muted)' }}>LIMIT {r.limit} {r.token} // LAST: {r.last}</div>
            </div>
            <div className="ra">
              <button className="btn btn-sm" onClick={() => toggleRule(r.id)}>{r.active ? 'PAUSE' : 'RESUME'}</button>
              <button className="btn btn-danger btn-sm" onClick={() => deleteRule(r.id)}>DEL</button>
            </div>
          </div>
        ))}
        {rules.length === 0 && <div className="empty">&gt; NO RULES CONFIGURED.</div>}
      </div>
    </>
  )
}

function AddRuleModal({ form, setForm, onSave, onCancel }) {
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  return (
    <div className="modal-bg">
      <div className="modal">
        <div className="modal-title">&gt; NEW AUTOMATION RULE</div>
        <div className="fg"><label className="fl">// RULE NAME</label><input className="fi" placeholder="E.G. FRIDAY PAYROLL" value={form.name} onChange={f('name')} /></div>
        <div className="fr">
          <div className="fg"><label className="fl">// TYPE</label><select className="fse" value={form.type} onChange={f('type')}><option value="SCHEDULED">SCHEDULED</option><option value="CONDITIONAL">CONDITIONAL</option></select></div>
          <div className="fg"><label className="fl">// TOKEN</label><select className="fse" value={form.token} onChange={f('token')}><option>USDC</option><option>ETH</option></select></div>
        </div>
        <div className="fg"><label className="fl">// RECIPIENT ADDRESS</label><input className="fi" placeholder="0x..." value={form.recipient} onChange={f('recipient')} /></div>
        <div className="fr">
          <div className="fg"><label className="fl">// AMOUNT</label><input className="fi" type="number" placeholder="500" value={form.amount} onChange={f('amount')} /></div>
          <div className="fg"><label className="fl">// SPEND LIMIT</label><input className="fi" type="number" placeholder="600" value={form.limit} onChange={f('limit')} /></div>
        </div>
        {form.type === 'SCHEDULED' && <div className="fg"><label className="fl">// INTERVAL</label><select className="fse" value={form.interval} onChange={f('interval')}><option value="3600">EVERY HOUR</option><option value="86400">EVERY DAY</option><option value="604800">EVERY WEEK</option><option value="2592000">EVERY MONTH</option></select></div>}
        {form.type === 'CONDITIONAL' && <div className="fg"><label className="fl">// TRIGGER WHEN BALANCE EXCEEDS</label><input className="fi" type="number" placeholder="5000" value={form.condVal} onChange={f('condVal')} /></div>}
        <div className="ma">
          <button className="btn" onClick={onCancel}>CANCEL</button>
          <button className="btn btn-acid" onClick={onSave}>&gt; CREATE RULE</button>
        </div>
      </div>
    </div>
  )
}

function Log({ log, simulate }) {
  return (
    <>
      <div className="ph">
        <div><div className="pt">ACTIVITY LOG</div><div className="ps">{log.length} EXECUTIONS RECORDED ON-CHAIN</div></div>
        <button className="btn" onClick={simulate}>&gt; SIMULATE</button>
      </div>
      <div className="log-list">
        {log.map(e => <LogItem key={e.id} entry={e} />)}
        {log.length === 0 && <div className="empty">&gt; NO EXECUTIONS YET.</div>}
      </div>
    </>
  )
}

function LogItem({ entry: e }) {
  return (
    <div className="li">
      <span className="li-chev">&gt;</span>
      <div className="lit"><div className="lit-rule">{e.rule}</div><div className="lit-to">{e.to}</div></div>
      <span className="lam">{e.amount} {e.token}</span>
      <span className="ltm">{e.time}</span>
    </div>
  )
}

function Settings({ agentOn, setAgentOn }) {
  return (
    <>
      <div className="ph"><div><div className="pt">SETTINGS</div><div className="ps">AGENT CONFIGURATION // SAFETY CONTROLS</div></div></div>
      <div className="two" style={{ marginBottom: 16 }}>
        <div className="sc"><div className="sl">AGENT CONTRACT</div><div className="mono-val teal">{AGENT}</div><div className="ss">ARBITRUM SEPOLIA // CHAIN 421614</div></div>
        <div className="sc"><div className="sl">KEEPER BOT</div><div className="mono-val muted">0x3d9A...7B22</div><div className="ss">POLLING EVERY 30 SECONDS</div></div>
        <div className="sc"><div className="sl">SEQUENCER</div><div className="mono-val teal">0x5f2c...8A11</div><div className="ss">CRITICAL &gt; HIGH &gt; NORMAL</div></div>
        <div className="sc"><div className="sl">DAILY USDC CAP</div><div className="sv" style={{ fontSize: 28, marginTop: 6 }}>2,000</div><div className="ss">MAX PER 24H WINDOW</div></div>
        <div className="sc full" style={{ borderTop: `3px solid ${agentOn ? 'var(--acid)' : 'var(--red)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="sl">EMERGENCY KILL SWITCH</div>
              <div style={{ fontSize: 16, marginTop: 6, color: 'var(--muted)', letterSpacing: '0.06em' }}>{agentOn ? 'AGENT LIVE. SEQUENCER PROCESSING IN PRIORITY ORDER.' : 'AGENT PAUSED. NO RULES WILL EXECUTE UNTIL REACTIVATED.'}</div>
            </div>
            <button className={`btn ${agentOn ? 'btn-danger' : 'btn-acid'}`} onClick={() => setAgentOn(v => !v)}>
              {agentOn ? '> DEACTIVATE' : '> ACTIVATE'}
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
