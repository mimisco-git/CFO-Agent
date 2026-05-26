import { useState, useRef, useEffect } from 'react'
import './App.css'

const WALLET = '0x71C7...976F'
const AGENT  = '0x9aB4...1e77'

// Web Audio sound engine
const SFX = {
  ctx: null,
  init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)() },
  beep(freq = 880, dur = 0.04, vol = 0.06, type = 'square') {
    try {
      this.init()
      const o = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      o.connect(g); g.connect(this.ctx.destination)
      o.type = type; o.frequency.value = freq
      g.gain.setValueAtTime(vol, this.ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur)
      o.start(); o.stop(this.ctx.currentTime + dur)
    } catch(e) {}
  },
  boot()    { this.beep(440, 0.06, 0.08); setTimeout(() => this.beep(660, 0.04, 0.05), 80) },
  line()    { this.beep(600 + Math.random()*200, 0.03, 0.04) },
  lock()    { [880,740,620,520].forEach((f,i) => setTimeout(() => this.beep(f, 0.08, 0.06), i*80)) },
  launch()  { [440,550,660,880].forEach((f,i) => setTimeout(() => this.beep(f, 0.1, 0.07, 'sine'), i*60)) },
  keytype() { this.beep(800 + Math.random()*400, 0.025, 0.03) },
  exec()    { this.beep(300, 0.15, 0.05, 'sawtooth') },
  done()    { [660,880,1100].forEach((f,i) => setTimeout(() => this.beep(f, 0.12, 0.05, 'sine'), i*100)) },
}

function buildBoot(callsign) {
  return [
    { text: '...', type: 'dim' },
    { text: 'SIGNAL DETECTED', type: 'normal' },
    { text: 'SOURCE: ARBITRUM NETWORK', type: 'normal' },
    { text: `AGENT: ${callsign} AUTHENTICATED`, type: 'acid' },
    { text: 'PROTOCOL: CFO-AGENT v1.0', type: 'normal' },
    { text: 'CHAIN ID: 421614 [SEPOLIA]', type: 'normal' },
    { text: 'RULE REGISTRY: ONLINE', type: 'acid' },
    { text: 'EXECUTION SEQUENCER: ACTIVE', type: 'teal' },
    { text: 'TREASURY BALANCE: $4,820 USDC', type: 'teal' },
    { text: 'KEEPER BOT: POLLING 30S', type: 'normal' },
    { text: 'ALL SYSTEMS READY', type: 'acid' },
    { text: 'TYPE "HELP" FOR COMMANDS OR "LAUNCH" TO ENTER', type: 'bright' },
  ]
}

const LINE_DELAY = 420

const COMMANDS = {
  help: [
    { text: 'AVAILABLE COMMANDS:', type: 'bright' },
    { text: '  HELP        show commands', type: 'resp' },
    { text: '  STATUS      agent status', type: 'resp' },
    { text: '  BALANCE     treasury balance', type: 'resp' },
    { text: '  RULES       list rules', type: 'resp' },
    { text: '  QUEUE       execution queue', type: 'resp' },
    { text: '  SIMULATE    test execution', type: 'resp' },
    { text: '  CLEAR       clear terminal', type: 'resp' },
    { text: '  LAUNCH      open dashboard', type: 'resp' },
  ],
  status: [
    { text: 'AGENT STATUS:', type: 'bright' },
    { text: '  CHAIN:      ARBITRUM SEPOLIA (421614)', type: 'resp' },
    { text: '  KEEPER:     0x3d9A...7B22', type: 'resp' },
    { text: '  SEQUENCER:  ONLINE', type: 'resp' },
    { text: '  PING:       039 MS', type: 'resp' },
    { text: '  UPTIME:     14D 06H 22M', type: 'resp' },
    { text: '  STATUS:     ACTIVE', type: 'acid' },
  ],
  balance: [
    { text: 'TREASURY BALANCE:', type: 'bright' },
    { text: '  USDC:   4,820.00', type: 'acid' },
    { text: '  ETH:    0.842', type: 'resp' },
    { text: '  DAILY CAP:  2,000 USDC REMAINING', type: 'resp' },
  ],
  rules: [
    { text: 'ACTIVE RULES (2/3):', type: 'bright' },
    { text: '  [0] FRIDAY PAYROLL  500 USDC  EVERY 7D   ACTIVE', type: 'resp' },
    { text: '  [1] YIELD SWEEP     1000 USDC CONDITIONAL ACTIVE', type: 'resp' },
    { text: '  [2] DAILY OPS       0.05 ETH  EVERY 1D   PAUSED', type: 'dim' },
  ],
  queue: [
    { text: 'EXECUTION QUEUE (2 PENDING):', type: 'bright' },
    { text: '  JOB #0  FRIDAY PAYROLL  NORMAL  QUEUED', type: 'resp' },
    { text: '  JOB #1  YIELD SWEEP     HIGH    QUEUED', type: 'resp' },
    { text: 'POLLING EVERY 30S', type: 'dim' },
  ],
  simulate: [
    { text: 'SIMULATING EXECUTION...', type: 'amber' },
    { text: '  DEQUEUING JOB #0', type: 'resp' },
    { text: '  RULE: FRIDAY PAYROLL', type: 'resp' },
    { text: '  PRIORITY: NORMAL', type: 'resp' },
    { text: '  SPEND LIMIT: OK', type: 'resp' },
    { text: '  EXECUTING ON-CHAIN', type: 'acid' },
    { text: '  TX: 0x4f3a9b...2c1e', type: 'resp' },
    { text: '  STATUS: CONFIRMED', type: 'acid' },
    { text: '  GAS USED: 142,000', type: 'dim' },
  ],
  launch: [{ text: 'LAUNCHING DASHBOARD...', type: 'acid' }],
  clear: null,
}

const INITIAL_RULES = [
  { id:0, name:'FRIDAY PAYROLL',   type:'SCHEDULED',   token:'USDC', recipient:'0x4f3a...9B12', amount:'500',  interval:'7 DAYS', limit:'600',  active:true,  last:'2 DAYS AGO' },
  { id:1, name:'YIELD SWEEP',      type:'CONDITIONAL', token:'USDC', recipient:'0x8c2d...4A90', amount:'1000', interval:'',       limit:'2000', active:true,  last:'5 DAYS AGO' },
  { id:2, name:'DAILY OPS BUDGET', type:'SCHEDULED',   token:'ETH',  recipient:'0x2e7f...B301', amount:'0.05', interval:'1 DAY',  limit:'0.1',  active:false, last:'15 DAYS AGO' },
]

const INITIAL_LOG = [
  { id:1, rule:'FRIDAY PAYROLL', token:'USDC', amount:'+500',  to:'0x4f3a...9B12', time:'2D AGO' },
  { id:2, rule:'YIELD SWEEP',    token:'USDC', amount:'+1000', to:'0x8c2d...4A90', time:'5D AGO' },
  { id:3, rule:'FRIDAY PAYROLL', token:'USDC', amount:'+500',  to:'0x4f3a...9B12', time:'9D AGO' },
]

const INITIAL_QUEUE = [
  { id:0, rule:'FRIDAY PAYROLL', ruleId:0, priority:'NORMAL', status:'QUEUED', attempts:0, maxRetries:3, createdAt:'2M AGO' },
  { id:1, rule:'YIELD SWEEP',    ruleId:1, priority:'HIGH',   status:'QUEUED', attempts:0, maxRetries:3, createdAt:'5M AGO' },
]

const BLANK = { name:'', type:'SCHEDULED', token:'USDC', recipient:'', amount:'', limit:'', interval:'604800', condVal:'' }

function fmtInterval(s) {
  const n = Number(s)
  if (n>=2592000) return '1 MONTH'
  if (n>=604800)  return '1 WEEK'
  if (n>=86400)   return '1 DAY'
  return '1 HOUR'
}

function usePing() {
  const [v, set] = useState(39)
  useEffect(() => { const id = setInterval(() => set(20+Math.floor(Math.random()*60)), 2000); return ()=>clearInterval(id) }, [])
  return v
}

function useTime() {
  const [t, set] = useState('')
  useEffect(() => {
    const f = () => { const d=new Date(); set(`${d.getHours().toString().padStart(2,'0')}${d.getMinutes().toString().padStart(2,'0')}`) }
    f(); const id=setInterval(f,1000); return ()=>clearInterval(id)
  }, [])
  return t
}

export default function App() {
  const [phase, setPhase]       = useState('callsign')
  const [callsign, setCallsign] = useState('')
  const [csTyped, setCsTyped]   = useState('')
  const [bootIdx, setBootIdx]   = useState(0)
  const [bootLines, setBootLines] = useState([])
  const [lines, setLines]       = useState([])
  const [typed, setTyped]       = useState('')
  const [locked, setLocked]     = useState(false)
  const [sigText, setSigText]   = useState('SIGNAL : UNSTABLE')
  const [pingMs, setPingMs]     = useState('039')
  const [eraText, setEraText]   = useState('2140 / SYNC PENDING')
  const [progress, setProgress] = useState(0)

  const [nav, setNav]         = useState('dashboard')
  const [agentOn, setAgentOn] = useState(true)
  const [rules, setRules]     = useState(INITIAL_RULES)
  const [log, setLog]         = useState(INITIAL_LOG)
  const [queue, setQueue]     = useState(INITIAL_QUEUE)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]       = useState(BLANK)
  const [appStat, setAppStat] = useState('ONLINE')

  const logId  = useRef(10)
  const jobId  = useRef(10)
  const inputRef = useRef(null)
  const bootRef  = useRef(null)
  const ping   = usePing()
  const time   = useTime()

  useEffect(() => { bootRef.current?.scrollIntoView({behavior:'smooth'}) }, [lines, bootLines])

  // Callsign keydown
  useEffect(() => {
    if (phase !== 'callsign') return
    const h = e => {
      SFX.keytype()
      if (e.key === 'Enter' && csTyped.trim()) {
        const cs = csTyped.trim().toUpperCase()
        setCallsign(cs)
        SFX.boot()
        setPhase('glitch')
        setTimeout(() => { setPhase('boot'); setBootLines(buildBoot(cs)); setBootIdx(0) }, 900)
      } else if (e.key === 'Backspace') {
        setCsTyped(t => t.slice(0,-1))
      } else if (e.key.length === 1 && csTyped.length < 16) {
        setCsTyped(t => (t + e.key).toUpperCase())
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [phase, csTyped])

  // Boot sequence
  useEffect(() => {
    if (phase !== 'boot') return
    if (bootIdx >= bootLines.length) {
      setTimeout(() => {
        setLocked(true)
        setSigText('SIGNAL : LOCKED')
        setEraText('2140 / SYNC FINDING')
        SFX.lock()
      }, 300)
      return
    }
    const pct = Math.round((bootIdx / bootLines.length) * 100)
    setProgress(pct)
    const timer = setTimeout(() => {
      setLines(l => [...l, bootLines[bootIdx]])
      setBootIdx(i => i+1)
      SFX.line()
    }, LINE_DELAY)
    return () => clearTimeout(timer)
  }, [phase, bootIdx, bootLines])

  // Terminal keydown
  useEffect(() => {
    if (phase !== 'boot') return
    const h = e => {
      if (!locked) return
      if (e.key === 'Enter') {
        runCommand(typed)
        setTyped('')
      } else if (e.key === 'Backspace') {
        setTyped(t => t.slice(0,-1))
      } else if (e.key.length === 1) {
        SFX.keytype()
        setTyped(t => (t+e.key).toUpperCase().slice(0,40))
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [phase, locked, typed])

  function runCommand(cmd) {
    const t = cmd.trim().toLowerCase()
    setLines(l => [...l, { text: '> ' + cmd.trim(), type: 'bright' }])
    if (!t) return
    const r = COMMANDS[t]
    if (r === null) { setLines([]); return }
    if (r) {
      setLines(l => [...l, ...r])
      if (t === 'launch') { SFX.launch(); setTimeout(() => setPhase('app'), 700) }
      else if (t === 'simulate') { SFX.exec(); simulateExecution() }
    } else {
      setLines(l => [...l, { text: `UNKNOWN COMMAND: "${cmd.trim()}" — TYPE "HELP"`, type: 'red' }])
    }
  }

  function simulateExecution() {
    const active = rules.filter(r=>r.active)
    if (!active.length) return
    const rule = active[Math.floor(Math.random()*active.length)]
    const nj = { id:jobId.current++, rule:rule.name, ruleId:rule.id, priority:'NORMAL', status:'QUEUED', attempts:0, maxRetries:3, createdAt:'JUST NOW' }
    setQueue(q=>[nj,...q])
    setAppStat('EXECUTING')
    SFX.exec()
    setTimeout(() => {
      setQueue(q=>q.map(j=>j.id===nj.id?{...j,status:'EXECUTING'}:j))
      setTimeout(() => {
        setQueue(q=>q.map(j=>j.id===nj.id?{...j,status:'COMPLETED'}:j))
        setLog(l=>[{id:logId.current++,rule:rule.name,token:rule.token,amount:'+'+rule.amount,to:rule.recipient,time:'JUST NOW'},...l])
        setRules(r=>r.map(rl=>rl.id===rule.id?{...rl,last:'JUST NOW'}:rl))
        setAppStat('ONLINE')
        SFX.done()
      }, 1800)
    }, 1000)
  }

  function addRule() {
    setRules(r=>[...r,{id:Date.now(),name:(form.name||'UNNAMED RULE').toUpperCase(),type:form.type,token:form.token,recipient:form.recipient||'0x0000...0000',amount:form.amount,interval:form.type==='SCHEDULED'?fmtInterval(form.interval):'',limit:form.limit,cond:form.type==='CONDITIONAL'?`BALANCE > ${form.condVal} ${form.token}`:'',active:true,last:'NEVER'}])
    setShowAdd(false); setForm(BLANK)
  }

  const activeCount = rules.filter(r=>r.active).length
  const queueDepth  = queue.filter(j=>j.status==='QUEUED'||j.status==='EXECUTING').length
  const statColor   = {ONLINE:'var(--acid)',EXECUTING:'var(--teal)',STANDBY:'var(--muted2)'}[appStat]||'var(--acid)'

  // ---- CALLSIGN SCREEN ----
  if (phase === 'callsign') return (
    <div className="callsign-screen crt" onClick={() => inputRef.current?.focus()}>
      <div className="scanline" />
      <div className="cs-tag">CFO-AGENT // ARBITRUM TREASURY OS</div>
      <div className="cs-label">ENTER CALLSIGN TO AUTHENTICATE</div>
      <div className="cs-input-row">
        <span className="cs-prompt">&gt;</span>
        <span className="cs-typed">{csTyped}</span>
        <span className="cs-cursor" />
      </div>
      <div className="cs-hint">PRESS ENTER TO BEGIN TRANSMISSION</div>
      <input ref={inputRef} className="real-input" type="text" autoComplete="off" autoCapitalize="off" spellCheck="false" autoFocus value={csTyped} onChange={()=>{}} />
    </div>
  )

  // ---- GLITCH SCREEN ----
  if (phase === 'glitch') return (
    <div className="glitch-screen crt">
      <div className="scanline" />
      <div className="glitch-bars-wrap">
        {[0,1,2,3,4,5,6,7].map(i=><div key={i} className="gbar" />)}
      </div>
      <div className="glitch-word">CONNECTING</div>
    </div>
  )

  // ---- BOOT TERMINAL ----
  if (phase === 'boot') return (
    <div className="terminal-screen crt" onClick={() => document.getElementById('hiddenInput')?.focus()}>
      <div className="scanline" />
      <div className="t-statusbar">
        <div className="left">
          <span><span className={`signal-dot ${locked?'locked':''}`} />{sigText}</span>
          <span>PING : {pingMs} MS</span>
        </div>
        <div>{eraText}</div>
      </div>

      <div className="t-viewport">
        <div className="t-block">
          {lines.map((l,i) => (
            <div key={i} className={`t-line ${l.type==='resp'?'resp':l.type||''}`}>
              {l.type!=='dim' && l.type!=='resp' && !l.text.startsWith('>') && <span className="t-chev">&gt;</span>}
              {l.text}
            </div>
          ))}

          {bootIdx < bootLines.length && (
            <div className="t-processing">
              <div className="t-bar-wrap">
                <div className="t-bar"><div className="t-bar-fill" style={{width:progress+'%'}} /></div>
                <span className="t-pct">{progress}%</span>
              </div>
              <span className="t-dots" />
            </div>
          )}

          {locked && (
            <div className="input-line">
              <span className="prompt-char">&gt;</span>
              <span className="typed-text">{typed}</span>
              <span className="cursor-block" />
            </div>
          )}
          <div ref={bootRef} />
        </div>
      </div>

      <input id="hiddenInput" className="real-input" type="text" autoComplete="off" autoCapitalize="off" spellCheck="false" value={typed} onChange={()=>{}} />
      {locked && <div className="hint">TYPE SOMETHING</div>}
    </div>
  )

  // ---- APP ----
  return (
    <div className="wrap crt">
      <div className="scanline" />
      <aside className="side">
        <div className="side-top">
          <div className="logo-text">CFO AGENT</div>
          <div className="logo-sub">CALLSIGN: {callsign}</div>
        </div>
        <nav className="side-nav">
          <div className="nav-label">// OVERVIEW</div>
          {[{id:'dashboard',label:'DASHBOARD'},{id:'log',label:'ACTIVITY'}].map(item=>(
            <button key={item.id} className={`nav ${nav===item.id?'on':''}`} onClick={()=>setNav(item.id)}>{item.label}</button>
          ))}
          <div className="nav-label">// AUTOMATION</div>
          <button className={`nav ${nav==='sequencer'?'on':''}`} onClick={()=>setNav('sequencer')}>
            SEQUENCER {queueDepth>0&&<span className="nav-badge">{queueDepth}</span>}
          </button>
          {[{id:'rules',label:'RULES'},{id:'settings',label:'SETTINGS'}].map(item=>(
            <button key={item.id} className={`nav ${nav===item.id?'on':''}`} onClick={()=>setNav(item.id)}>{item.label}</button>
          ))}
        </nav>
        <div className="side-foot">
          <div className="wallet-label"><div className="w-dot"/>CONNECTED</div>
          <div className="wallet-addr">{WALLET}</div>
          <div className="agent-addr">AGENT: {AGENT}</div>
        </div>
      </aside>

      <div className="main">
        <div className="main-bar">
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <span style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:statColor,display:'inline-block',animation:'pulse 1.5s infinite'}}/>
              STATUS : <span style={{color:statColor,marginLeft:4}}>{appStat}</span>
            </span>
            <span>PING : {String(ping).padStart(3,'0')} MS</span>
            <span>CALLSIGN : {callsign}</span>
          </div>
          <span>{time} / ARBITRUM SEPOLIA</span>
        </div>
        <div className="main-content">
          {nav==='dashboard' && <Dashboard rules={rules} log={log} queue={queue} agentOn={agentOn} setAgentOn={setAgentOn} simulate={simulateExecution} activeCount={activeCount} queueDepth={queueDepth}/>}
          {nav==='sequencer' && <Sequencer queue={queue} simulate={simulateExecution} cancelJob={id=>setQueue(q=>q.map(j=>j.id===id?{...j,status:'CANCELLED'}:j))} boostJob={id=>setQueue(q=>q.map(j=>j.id===id?{...j,priority:'CRITICAL'}:j))}/>}
          {nav==='rules' && <Rules rules={rules} showAdd={showAdd} setShowAdd={setShowAdd} form={form} setForm={setForm} addRule={addRule} toggleRule={id=>setRules(r=>r.map(rl=>rl.id===id?{...rl,active:!rl.active}:rl))} deleteRule={id=>setRules(r=>r.filter(rl=>rl.id!==id))}/>}
          {nav==='log' && <Log log={log} simulate={simulateExecution}/>}
          {nav==='settings' && <Settings agentOn={agentOn} setAgentOn={setAgentOn}/>}
        </div>
      </div>
    </div>
  )
}

function Dashboard({ rules, log, queue, agentOn, setAgentOn, simulate, activeCount, queueDepth }) {
  return (
    <>
      <div className="ph">
        <div><div className="pt">DASHBOARD</div><div className="ps">ARBITRUM SEPOLIA // LAST SYNC 12S AGO</div></div>
        <button className="btn" onClick={simulate}>&gt; SIMULATE</button>
      </div>
      <div className="stats">
        <StatCard label="TREASURY BALANCE" value="4,820" sub="USDC" accent/>
        <StatCard label="ACTIVE RULES" value={activeCount} sub={`OF ${rules.length} TOTAL`}/>
        <StatCard label="QUEUE DEPTH" value={queueDepth} sub="JOBS PENDING"/>
        <StatCard label="USDC ROUTED" value="2,000" sub="THIS MONTH"/>
      </div>
      <div className="status-bar-app">
        <div className="sb-left">
          <div className="w-dot" style={agentOn?{}:{background:'var(--red)'}}/>
          <div>
            <div className="sb-label">AGENT {agentOn?'RUNNING':'PAUSED'}</div>
            <div className="sb-sub">{agentOn?'SEQUENCER POLLING 30S // PRIORITY ORDER':'ALL EXECUTION SUSPENDED'}</div>
          </div>
        </div>
        <div className="sb-right">
          <span className="sb-status" style={{color:agentOn?'var(--acid)':'var(--red)'}}>{agentOn?'ONLINE':'OFFLINE'}</span>
          <Toggle on={agentOn} onClick={()=>setAgentOn(v=>!v)}/>
        </div>
      </div>
      <div className="two-col">
        <div>
          <div className="sh"><div className="st">// RECENT ACTIVITY</div></div>
          <div className="log-list">{log.slice(0,4).map(e=><LogItem key={e.id} entry={e}/>)}</div>
        </div>
        <div>
          <div className="sh"><div className="st">// EXECUTION QUEUE</div></div>
          <div className="q-mini">
            {queue.slice(0,4).map(j=><QueueMini key={j.id} job={j}/>)}
            {queue.length===0&&<div className="empty">QUEUE EMPTY</div>}
          </div>
        </div>
      </div>
    </>
  )
}

function Sequencer({ queue, simulate, cancelJob, boostJob }) {
  const pOrder = {CRITICAL:2,HIGH:1,NORMAL:0}
  const pColor = {CRITICAL:'var(--red)',HIGH:'var(--amber)',NORMAL:'var(--muted2)'}
  const sColor = {QUEUED:'var(--teal)',EXECUTING:'var(--acid)',COMPLETED:'var(--muted2)',FAILED:'var(--red)',CANCELLED:'var(--muted2)'}
  const queued = queue.filter(j=>j.status==='QUEUED'||j.status==='EXECUTING')
  const done   = queue.filter(j=>['COMPLETED','FAILED','CANCELLED'].includes(j.status))
  return (
    <>
      <div className="ph">
        <div><div className="pt">SEQUENCER</div><div className="ps">{queued.length} JOBS PENDING // CRITICAL &gt; HIGH &gt; NORMAL</div></div>
        <button className="btn" onClick={simulate}>&gt; ENQUEUE JOB</button>
      </div>
      <div className="stats" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
        <StatCard label="QUEUE DEPTH" value={queued.length} sub="PENDING"/>
        <StatCard label="COMPLETED" value={queue.filter(j=>j.status==='COMPLETED').length} sub="ALL TIME" accent/>
        <StatCard label="FAILED" value={queue.filter(j=>j.status==='FAILED').length} sub="ATTENTION"/>
      </div>
      <div className="sh" style={{marginTop:8}}><div className="st">// PENDING QUEUE</div></div>
      <div className="q-list" style={{marginBottom:18}}>
        {queued.length===0&&<div className="empty">&gt; QUEUE EMPTY. KEEPER ENQUEUES RULES AUTOMATICALLY.</div>}
        {[...queued].sort((a,b)=>(pOrder[b.priority]||0)-(pOrder[a.priority]||0)).map(j=>(
          <div className="qc" key={j.id} style={{borderLeftColor:pColor[j.priority]||'#2a2820'}}>
            <div>
              <div className="qc-top">
                <span className="qc-name">&gt; {j.rule}</span>
                <span className="badge" style={{color:pColor[j.priority],borderColor:pColor[j.priority]}}>{j.priority}</span>
                <span className="badge" style={{color:sColor[j.status],borderColor:sColor[j.status]}}>
                  {j.status==='EXECUTING'&&<><span className="exec-block"/><span className="exec-block"/><span className="exec-block"/><span className="exec-block-e"/><span className="exec-block-e"/>&nbsp;</>}
                  {j.status}
                </span>
              </div>
              <div className="qc-sub">JOB #{j.id} // RULE {j.ruleId} // ATTEMPT {j.attempts}/{j.maxRetries} // {j.createdAt}</div>
            </div>
            <div className="ra">
              {j.priority!=='CRITICAL'&&<button className="btn btn-sm" onClick={()=>boostJob(j.id)} style={{color:'var(--amber)',borderColor:'var(--amber)'}}>&gt; BOOST</button>}
              <button className="btn btn-danger btn-sm" onClick={()=>cancelJob(j.id)}>CANCEL</button>
            </div>
          </div>
        ))}
      </div>
      {done.length>0&&(
        <>
          <div className="sh"><div className="st">// COMPLETED JOBS</div></div>
          <div className="q-list">
            {done.map(j=>(
              <div className="qc" key={j.id} style={{borderLeftColor:sColor[j.status],opacity:.55}}>
                <div>
                  <div className="qc-top">
                    <span className="qc-name">&gt; {j.rule}</span>
                    <span className="badge" style={{color:sColor[j.status],borderColor:sColor[j.status]}}>{j.status}</span>
                    <span className="badge" style={{color:pColor[j.priority],borderColor:pColor[j.priority]}}>{j.priority}</span>
                  </div>
                  <div className="qc-sub">JOB #{j.id} // {j.attempts}/{j.maxRetries} ATTEMPTS // {j.createdAt}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

function QueueMini({ job }) {
  const sColor = {QUEUED:'var(--teal)',EXECUTING:'var(--acid)',COMPLETED:'var(--muted2)',FAILED:'var(--red)',CANCELLED:'var(--muted2)'}
  const pColor = {CRITICAL:'var(--red)',HIGH:'var(--amber)',NORMAL:'var(--muted2)'}
  return (
    <div className="qm">
      <span className="qm-chev">&gt;</span>
      <span className="qm-rule">{job.rule}</span>
      <span className="qm-status" style={{color:sColor[job.status]}}>{job.status}</span>
      <span className="qm-pri" style={{color:pColor[job.priority]}}>{job.priority}</span>
    </div>
  )
}

function Rules({ rules, showAdd, setShowAdd, form, setForm, addRule, toggleRule, deleteRule }) {
  return (
    <>
      <div className="ph">
        <div><div className="pt">RULES</div><div className="ps">{rules.filter(r=>r.active).length} ACTIVE // {rules.filter(r=>!r.active).length} PAUSED</div></div>
        <button className="btn btn-acid" onClick={()=>setShowAdd(true)}>&gt; NEW RULE</button>
      </div>
      {showAdd&&<AddRuleModal form={form} setForm={setForm} onSave={addRule} onCancel={()=>setShowAdd(false)}/>}
      <div className="rule-list">
        {rules.map(r=>(
          <div key={r.id} className={`rc ${r.active?'active-rule':'paused-rule'} ${r.type==='CONDITIONAL'?'cond-rule':''}`}>
            <div>
              <div className="rn-row">
                <span className="rn">&gt; {r.name}</span>
                <span className={`badge ${r.type==='SCHEDULED'?'b-sched':'b-cond'}`}>{r.type}</span>
                <span className={`badge ${r.active?'b-active':'b-paused'}`}>{r.active?'ACTIVE':'PAUSED'}</span>
              </div>
              <div className="rd">{r.amount} {r.token} // {r.recipient}{r.interval?` // EVERY ${r.interval}`:''}{r.cond?` // WHEN ${r.cond}`:''}</div>
              <div className="rd" style={{marginTop:2,color:'var(--muted2)'}}>LIMIT {r.limit} {r.token} // LAST: {r.last}</div>
            </div>
            <div className="ra">
              <button className="btn btn-sm" onClick={()=>toggleRule(r.id)}>{r.active?'PAUSE':'RESUME'}</button>
              <button className="btn btn-danger btn-sm" onClick={()=>deleteRule(r.id)}>DEL</button>
            </div>
          </div>
        ))}
        {rules.length===0&&<div className="empty">&gt; NO RULES CONFIGURED.</div>}
      </div>
    </>
  )
}

function AddRuleModal({ form, setForm, onSave, onCancel }) {
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}))
  return (
    <div className="modal-bg">
      <div className="modal">
        <div className="modal-title">&gt; NEW AUTOMATION RULE</div>
        <div className="fg"><label className="fl">// RULE NAME</label><input className="fi" placeholder="E.G. FRIDAY PAYROLL" value={form.name} onChange={f('name')}/></div>
        <div className="fr">
          <div className="fg"><label className="fl">// TYPE</label><select className="fse" value={form.type} onChange={f('type')}><option value="SCHEDULED">SCHEDULED</option><option value="CONDITIONAL">CONDITIONAL</option></select></div>
          <div className="fg"><label className="fl">// TOKEN</label><select className="fse" value={form.token} onChange={f('token')}><option>USDC</option><option>ETH</option></select></div>
        </div>
        <div className="fg"><label className="fl">// RECIPIENT ADDRESS</label><input className="fi" placeholder="0x..." value={form.recipient} onChange={f('recipient')}/></div>
        <div className="fr">
          <div className="fg"><label className="fl">// AMOUNT</label><input className="fi" type="number" placeholder="500" value={form.amount} onChange={f('amount')}/></div>
          <div className="fg"><label className="fl">// SPEND LIMIT</label><input className="fi" type="number" placeholder="600" value={form.limit} onChange={f('limit')}/></div>
        </div>
        {form.type==='SCHEDULED'&&<div className="fg"><label className="fl">// INTERVAL</label><select className="fse" value={form.interval} onChange={f('interval')}><option value="3600">EVERY HOUR</option><option value="86400">EVERY DAY</option><option value="604800">EVERY WEEK</option><option value="2592000">EVERY MONTH</option></select></div>}
        {form.type==='CONDITIONAL'&&<div className="fg"><label className="fl">// TRIGGER WHEN BALANCE EXCEEDS</label><input className="fi" type="number" placeholder="5000" value={form.condVal} onChange={f('condVal')}/></div>}
        <div className="ma"><button className="btn" onClick={onCancel}>CANCEL</button><button className="btn btn-acid" onClick={onSave}>&gt; CREATE RULE</button></div>
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
        {log.map(e=><LogItem key={e.id} entry={e}/>)}
        {log.length===0&&<div className="empty">&gt; NO EXECUTIONS YET.</div>}
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
      <div className="two" style={{marginBottom:14}}>
        <div className="sc"><div className="sl">AGENT CONTRACT</div><div className="mono-val teal">{AGENT}</div><div className="ss">ARBITRUM SEPOLIA // CHAIN 421614</div></div>
        <div className="sc"><div className="sl">KEEPER BOT</div><div className="mono-val muted">0x3d9A...7B22</div><div className="ss">POLLING EVERY 30 SECONDS</div></div>
        <div className="sc"><div className="sl">SEQUENCER</div><div className="mono-val teal">0x5f2c...8A11</div><div className="ss">CRITICAL &gt; HIGH &gt; NORMAL</div></div>
        <div className="sc"><div className="sl">DAILY USDC CAP</div><div className="sv" style={{fontSize:26,marginTop:6}}>2,000</div><div className="ss">MAX PER 24H WINDOW</div></div>
        <div className="sc full" style={{borderTop:`3px solid ${agentOn?'var(--acid)':'var(--red)'}`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div className="sl">EMERGENCY KILL SWITCH</div>
              <div style={{fontSize:14,marginTop:6,color:'var(--muted2)',letterSpacing:'0.06em'}}>{agentOn?'AGENT LIVE. SEQUENCER PROCESSING IN PRIORITY ORDER.':'AGENT PAUSED. NO RULES WILL EXECUTE UNTIL REACTIVATED.'}</div>
            </div>
            <button className={`btn ${agentOn?'btn-danger':'btn-acid'}`} onClick={()=>setAgentOn(v=>!v)}>
              {agentOn?'> DEACTIVATE':'> ACTIVATE'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function StatCard({ label, value, sub, accent }) {
  return <div className="sc"><div className="sl">{label}</div><div className={`sv ${accent?'accent':''}`}>{value}</div><div className="ss">{sub}</div></div>
}

function Toggle({ on, onClick }) {
  return <div className={`tog ${on?'on':''}`} onClick={onClick}><div className="tthumb"/></div>
}
