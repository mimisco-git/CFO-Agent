import { useState, useRef, useEffect } from 'react'
import './App.css'
import {
  hasWallet, connectWallet, signSiwe, genNonce,
  checkHasAgent, getAgentAddress, deployAgent,
  getAgentStatus, getTotalAgents,
  truncAddr, onAccountChange, onChainChange,
  FACTORY_ADDR, CHAIN_ID,
} from './lib/chain.js'

// ---- SOUND ENGINE ----
const SFX = {
  ctx: null,
  init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)() },
  beep(freq=880,dur=0.04,vol=0.06,type='square') {
    try {
      this.init()
      const o=this.ctx.createOscillator(), g=this.ctx.createGain()
      o.connect(g); g.connect(this.ctx.destination)
      o.type=type; o.frequency.value=freq
      g.gain.setValueAtTime(vol,this.ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001,this.ctx.currentTime+dur)
      o.start(); o.stop(this.ctx.currentTime+dur)
    } catch(e) {}
  },
  boot()   { this.beep(440,.06,.08); setTimeout(()=>this.beep(660,.04,.05),80) },
  line()   { this.beep(600+Math.random()*200,.03,.04) },
  lock()   { [880,740,620,520].forEach((f,i)=>setTimeout(()=>this.beep(f,.08,.06),i*80)) },
  launch() { [440,550,660,880].forEach((f,i)=>setTimeout(()=>this.beep(f,.1,.07,'sine'),i*60)) },
  key()    { this.beep(800+Math.random()*400,.025,.03) },
  exec()   { this.beep(300,.15,.05,'sawtooth') },
  done()   { [660,880,1100].forEach((f,i)=>setTimeout(()=>this.beep(f,.12,.05,'sine'),i*100)) },
  deploy() { [220,330,440,660,880].forEach((f,i)=>setTimeout(()=>this.beep(f,.15,.07,'sine'),i*100)) },
  err()    { [400,300,200].forEach((f,i)=>setTimeout(()=>this.beep(f,.1,.06,'square'),i*80)) },
}

function buildBoot(callsign, address, isNew) {
  return [
    { text: '...', type: 'dim' },
    { text: 'SIGNAL DETECTED', type: 'normal' },
    { text: 'SOURCE: ARBITRUM NETWORK', type: 'normal' },
    { text: `CALLSIGN: ${callsign} VERIFIED`, type: 'acid' },
    { text: `WALLET: ${truncAddr(address)}`, type: 'teal' },
    { text: 'SIWE AUTHENTICATION: CONFIRMED', type: 'acid' },
    { text: 'PROTOCOL: CFO-AGENT v1.0', type: 'normal' },
    { text: 'CHAIN ID: 421614 [ARB SEPOLIA]', type: 'normal' },
    isNew
      ? { text: 'NEW AGENT DEPLOYED ON-CHAIN', type: 'acid' }
      : { text: 'EXISTING AGENT LOADED', type: 'teal' },
    { text: 'RULE REGISTRY: ONLINE', type: 'acid' },
    { text: 'EXECUTION SEQUENCER: ACTIVE', type: 'teal' },
    { text: 'GASLESS MODE: ZERODEV ENABLED', type: 'acid' },
    { text: 'ALL SYSTEMS READY', type: 'acid' },
    { text: 'TYPE "HELP" OR "LAUNCH"', type: 'bright' },
  ]
}

const LINE_MS = 360

const CMDS = {
  help: [
    { text: 'COMMANDS:', type: 'bright' },
    { text: '  HELP      show this', type: 'resp' },
    { text: '  STATUS    agent info', type: 'resp' },
    { text: '  BALANCE   treasury', type: 'resp' },
    { text: '  RULES     list rules', type: 'resp' },
    { text: '  QUEUE     job queue', type: 'resp' },
    { text: '  SIMULATE  test run', type: 'resp' },
    { text: '  CLEAR     clear screen', type: 'resp' },
    { text: '  LAUNCH    dashboard', type: 'resp' },
  ],
  status: [
    { text: 'AGENT STATUS:', type: 'bright' },
    { text: '  CHAIN:    ARBITRUM SEPOLIA (421614)', type: 'resp' },
    { text: '  GASLESS:  ZERODEV ACTIVE', type: 'resp' },
    { text: '  STATUS:   ACTIVE', type: 'acid' },
  ],
  balance: [
    { text: 'TREASURY:', type: 'bright' },
    { text: '  USDC:  4,820.00', type: 'acid' },
    { text: '  ETH:   0.842', type: 'resp' },
    { text: '  CAP:   2,000 USDC / DAY', type: 'resp' },
  ],
  rules: [
    { text: 'RULES (2 ACTIVE / 3 TOTAL):', type: 'bright' },
    { text: '  [0] FRIDAY PAYROLL  500 USDC  7D    ACTIVE', type: 'resp' },
    { text: '  [1] YIELD SWEEP    1000 USDC  COND  ACTIVE', type: 'resp' },
    { text: '  [2] DAILY OPS      0.05 ETH   1D    PAUSED', type: 'dim' },
  ],
  queue: [
    { text: 'QUEUE (2 PENDING):', type: 'bright' },
    { text: '  JOB #0  FRIDAY PAYROLL  NORMAL  QUEUED', type: 'resp' },
    { text: '  JOB #1  YIELD SWEEP     HIGH    QUEUED', type: 'resp' },
  ],
  simulate: [
    { text: 'SIMULATING...', type: 'amber' },
    { text: '  DEQUEUING JOB #0', type: 'resp' },
    { text: '  EXECUTING ON-CHAIN', type: 'acid' },
    { text: '  TX: 0x4f3a...2c1e', type: 'resp' },
    { text: '  CONFIRMED', type: 'acid' },
  ],
  launch: [{ text: 'LAUNCHING DASHBOARD...', type: 'acid' }],
  clear: null,
}

const INIT_RULES = [
  { id:0, name:'FRIDAY PAYROLL',   type:'SCHEDULED',   token:'USDC', recipient:'0x4f3a...9B12', amount:'500',  interval:'7 DAYS', limit:'600',  active:true,  last:'2D AGO' },
  { id:1, name:'YIELD SWEEP',      type:'CONDITIONAL', token:'USDC', recipient:'0x8c2d...4A90', amount:'1000', interval:'',       limit:'2000', active:true,  last:'5D AGO' },
  { id:2, name:'DAILY OPS BUDGET', type:'SCHEDULED',   token:'ETH',  recipient:'0x2e7f...B301', amount:'0.05', interval:'1 DAY',  limit:'0.1',  active:false, last:'15D AGO' },
]
const INIT_LOG = [
  { id:1, rule:'FRIDAY PAYROLL', token:'USDC', amount:'+500',  to:'0x4f3a...9B12', time:'2D AGO' },
  { id:2, rule:'YIELD SWEEP',    token:'USDC', amount:'+1000', to:'0x8c2d...4A90', time:'5D AGO' },
]
const INIT_QUEUE = [
  { id:0, rule:'FRIDAY PAYROLL', ruleId:0, priority:'NORMAL', status:'QUEUED', attempts:0, maxRetries:3, createdAt:'2M AGO' },
  { id:1, rule:'YIELD SWEEP',    ruleId:1, priority:'HIGH',   status:'QUEUED', attempts:0, maxRetries:3, createdAt:'5M AGO' },
]
const BLANK = { name:'', type:'SCHEDULED', token:'USDC', recipient:'', amount:'', limit:'', interval:'604800', condVal:'' }

function fmtInt(s) {
  const n=Number(s)
  if(n>=2592000) return '1 MONTH'
  if(n>=604800)  return '1 WEEK'
  if(n>=86400)   return '1 DAY'
  return '1 HOUR'
}

function usePing() {
  const [v,set]=useState(39)
  useEffect(()=>{const id=setInterval(()=>set(20+Math.floor(Math.random()*60)),2000);return()=>clearInterval(id)},[])
  return v
}

function useTime() {
  const [t,set]=useState('')
  useEffect(()=>{
    const f=()=>{const d=new Date();set(`${d.getHours().toString().padStart(2,'0')}${d.getMinutes().toString().padStart(2,'0')}`)}
    f();const id=setInterval(f,1000);return()=>clearInterval(id)
  },[])
  return t
}

export default function App() {
  // auth
  const [phase,setPhase]       = useState('callsign')
  const [callsign,setCallsign] = useState('')
  const [csTyped,setCsTyped]   = useState('')
  const [address,setAddress]   = useState('')
  const [agentAddr,setAgentAddr]= useState('')
  const [isNew,setIsNew]       = useState(false)
  const [authStep,setAuthStep] = useState('')
  const [authMsg,setAuthMsg]   = useState('')
  const [authErr,setAuthErr]   = useState('')
  const [totalUsers,setTotalUsers]= useState(0n)

  // boot
  const [bootLines,setBootLines]= useState([])
  const [bootIdx,setBootIdx]   = useState(0)
  const [lines,setLines]       = useState([])
  const [typed,setTyped]       = useState('')
  const [locked,setLocked]     = useState(false)
  const [sigText,setSigText]   = useState('SIGNAL : UNSTABLE')
  const [progress,setProgress] = useState(0)
  const [eraText,setEraText]   = useState('2140 / SYNC PENDING')

  // app
  const [nav,setNav]           = useState('dashboard')
  const [agentOn,setAgentOn]   = useState(true)
  const [rules,setRules]       = useState(INIT_RULES)
  const [log,setLog]           = useState(INIT_LOG)
  const [queue,setQueue]       = useState(INIT_QUEUE)
  const [showAdd,setShowAdd]   = useState(false)
  const [form,setForm]         = useState(BLANK)
  const [appStat,setAppStat]   = useState('ONLINE')
  const [sideOpen,setSideOpen] = useState(false)

  const logId  = useRef(10)
  const jobId  = useRef(10)
  const bootRef= useRef(null)
  const ping   = usePing()
  const time   = useTime()

  useEffect(()=>{ bootRef.current?.scrollIntoView({behavior:'smooth'}) },[lines,bootLines])

  // watch wallet disconnects
  useEffect(()=>{
    onAccountChange(acc => { if(!acc && phase==='app') { setPhase('callsign'); setCsTyped(''); } })
  },[phase])

  // Callsign input
  useEffect(()=>{
    if(phase!=='callsign') return
    const h=e=>{
      SFX.key()
      if(e.key==='Enter' && csTyped.trim().length>=2) {
        setCallsign(csTyped.trim().toUpperCase())
        setPhase('wallet')
      } else if(e.key==='Backspace') {
        setCsTyped(t=>t.slice(0,-1))
      } else if(e.key.length===1 && csTyped.length<16) {
        setCsTyped(t=>(t+e.key).toUpperCase())
      }
    }
    window.addEventListener('keydown',h)
    return()=>window.removeEventListener('keydown',h)
  },[phase,csTyped])

  // Wallet auth
  async function doAuth() {
    setAuthErr('')
    try {
      // Step 1: wallet
      setAuthStep('connecting'); setAuthMsg('CONNECTING WALLET...')
      if(!hasWallet()) throw {code:'NO_WALLET',message:'NO WALLET DETECTED. INSTALL METAMASK.'}
      const addr = await connectWallet()
      setAddress(addr)

      // Step 2: SIWE
      setAuthStep('signing'); setAuthMsg('SIGN MESSAGE TO AUTHENTICATE...')
      await signSiwe(addr)

      // Step 3: check agent
      setAuthStep('checking'); setAuthMsg('CHECKING ON-CHAIN AGENT...')
      const [has, total] = await Promise.all([
        checkHasAgent(addr),
        getTotalAgents(),
      ])
      setTotalUsers(total)

      let agentAddress
      let newUser = false

      if(has) {
        agentAddress = await getAgentAddress(addr)
        setAgentAddr(agentAddress || '')
      } else {
        // Step 4: deploy
        setIsNew(true); newUser=true
        setAuthStep('deploying'); setAuthMsg('DEPLOYING YOUR CFO AGENT ON ARBITRUM...')
        SFX.deploy()
        if(FACTORY_ADDR && FACTORY_ADDR !== '') {
          agentAddress = await deployAgent()
        } else {
          // Demo mode: factory not deployed yet
          await new Promise(r=>setTimeout(r,2000))
          agentAddress = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(20))).map(b=>b.toString(16).padStart(2,'0')).join('')
        }
        setAgentAddr(agentAddress || '')
      }

      // Boot
      setAuthStep('done'); setAuthMsg('')
      SFX.boot()
      setPhase('glitch')
      setTimeout(()=>{
        setPhase('boot')
        setBootLines(buildBoot(callsign.trim().toUpperCase()||csTyped.toUpperCase(), addr, newUser))
        setBootIdx(0)
      }, 900)

    } catch(err) {
      setAuthStep('error'); SFX.err()
      if(err.code==='NO_WALLET') setAuthErr(err.message)
      else if(err.code===4001) setAuthErr('SIGNATURE REJECTED. TRY AGAIN.')
      else if(err.code===4902) setAuthErr('NETWORK ADD REJECTED.')
      else setAuthErr((err.message||'UNKNOWN ERROR').toUpperCase().slice(0,80))
    }
  }

  // Boot sequence
  useEffect(()=>{
    if(phase!=='boot') return
    if(bootIdx>=bootLines.length) {
      setTimeout(()=>{
        setLocked(true)
        setSigText('SIGNAL : LOCKED')
        setEraText('2140 / SYNC FINDING')
        SFX.lock()
      },300)
      return
    }
    setProgress(Math.round((bootIdx/bootLines.length)*100))
    const t=setTimeout(()=>{
      setLines(l=>[...l,bootLines[bootIdx]])
      setBootIdx(i=>i+1)
      SFX.line()
    },LINE_MS)
    return()=>clearTimeout(t)
  },[phase,bootIdx,bootLines])

  // Terminal input
  useEffect(()=>{
    if(phase!=='boot'||!locked) return
    const h=e=>{
      if(e.key==='Enter'){ runCmd(typed); setTyped('') }
      else if(e.key==='Backspace') setTyped(t=>t.slice(0,-1))
      else if(e.key.length===1){ SFX.key(); setTyped(t=>(t+e.key).toUpperCase().slice(0,40)) }
    }
    window.addEventListener('keydown',h)
    return()=>window.removeEventListener('keydown',h)
  },[phase,locked,typed])

  function runCmd(cmd) {
    const t=cmd.trim().toLowerCase()
    setLines(l=>[...l,{text:'> '+cmd.trim(),type:'bright'}])
    if(!t) return
    const r=CMDS[t]
    if(r===null){ setLines([]); return }
    if(r){
      setLines(l=>[...l,...r])
      if(t==='launch'){ SFX.launch(); setTimeout(()=>setPhase('app'),700) }
      else if(t==='simulate') simExec()
    } else {
      setLines(l=>[...l,{text:`UNKNOWN: "${cmd.trim()}" — TYPE "HELP"`,type:'red'}])
    }
  }

  function simExec() {
    const active=rules.filter(r=>r.active)
    if(!active.length) return
    const rule=active[Math.floor(Math.random()*active.length)]
    const nj={id:jobId.current++,rule:rule.name,ruleId:rule.id,priority:'NORMAL',status:'QUEUED',attempts:0,maxRetries:3,createdAt:'JUST NOW'}
    setQueue(q=>[nj,...q]); setAppStat('EXECUTING'); SFX.exec()
    setTimeout(()=>{
      setQueue(q=>q.map(j=>j.id===nj.id?{...j,status:'EXECUTING'}:j))
      setTimeout(()=>{
        setQueue(q=>q.map(j=>j.id===nj.id?{...j,status:'COMPLETED'}:j))
        setLog(l=>[{id:logId.current++,rule:rule.name,token:rule.token,amount:'+'+rule.amount,to:rule.recipient,time:'JUST NOW'},...l])
        setRules(r=>r.map(rl=>rl.id===rule.id?{...rl,last:'JUST NOW'}:rl))
        setAppStat('ONLINE'); SFX.done()
      },1800)
    },1000)
  }

  function addRule() {
    setRules(r=>[...r,{id:Date.now(),name:(form.name||'UNNAMED').toUpperCase(),type:form.type,token:form.token,recipient:form.recipient||'0x0000...0000',amount:form.amount,interval:form.type==='SCHEDULED'?fmtInt(form.interval):'',limit:form.limit,cond:form.type==='CONDITIONAL'?`BALANCE > ${form.condVal} ${form.token}`:'',active:true,last:'NEVER'}])
    setShowAdd(false); setForm(BLANK)
  }

  const activeCount=rules.filter(r=>r.active).length
  const queueDepth=queue.filter(j=>j.status==='QUEUED'||j.status==='EXECUTING').length
  const statColor={ONLINE:'var(--acid)',EXECUTING:'var(--teal)'}[appStat]||'var(--acid)'

  // SCREENS
  if(phase==='callsign') return (
    <div className="fullscreen crt" onClick={()=>document.getElementById('csIn')?.focus()}>
      <div className="scanline"/>
      <div className="cs-wrap">
        <div className="cs-logo">CFO-AGENT</div>
        <div className="cs-tag">ARBITRUM TREASURY OS // POWERED BY ZERODEV</div>
        <div className="cs-label">ENTER YOUR CALLSIGN</div>
        <div className="cs-row">
          <span className="cs-prompt">&gt;</span>
          <span className="cs-typed">{csTyped}</span>
          <span className="cs-cur"/>
        </div>
        <div className="cs-hint">{csTyped.length>=2?'PRESS ENTER TO CONTINUE':'MIN 2 CHARACTERS'}</div>
        <input id="csIn" className="real-input" autoFocus autoComplete="off" autoCapitalize="off" spellCheck="false" value={csTyped} onChange={()=>{}}/>
      </div>
    </div>
  )

  if(phase==='wallet') return (
    <div className="fullscreen crt">
      <div className="scanline"/>
      <div className="cs-wrap">
        <div className="cs-logo">CFO-AGENT</div>
        <div className="cs-tag">CALLSIGN: {callsign||csTyped.toUpperCase()}</div>

        {authStep==='' && (
          <>
            <div className="wallet-box">
              <div className="wallet-box-label">AUTHENTICATION REQUIRED</div>
              <div className="wallet-box-sub">
                Connect your wallet. Sign a message to prove ownership.<br/>
                Your personal CFO Agent will be deployed on Arbitrum.
              </div>
              <div className="wallet-steps">
                {['01  CONNECT WALLET','02  SIGN MESSAGE (SIWE)','03  CHECK ON-CHAIN AGENT','04  DEPLOY IF NEW USER','05  LAUNCH'].map((s,i)=>(
                  <div className="wallet-step" key={i}>
                    <span className="step-text">&gt; {s}</span>
                  </div>
                ))}
              </div>
              {!hasWallet() && (
                <div className="auth-err" style={{marginBottom:14}}>
                  &gt; NO WALLET DETECTED. <a href="https://metamask.io" target="_blank" rel="noreferrer" style={{color:'var(--acid)'}}>INSTALL METAMASK</a>
                </div>
              )}
              <button className="wallet-btn" onClick={doAuth}>&gt; CONNECT WALLET</button>
            </div>
            {authErr && <div className="auth-err" style={{marginTop:12}}>&gt; {authErr}</div>}
          </>
        )}

        {['connecting','signing','checking','deploying'].includes(authStep) && (
          <div className="wallet-box">
            <div className="wallet-box-label">
              {authStep==='connecting' && '01 / CONNECTING WALLET'}
              {authStep==='signing'    && '02 / SIGNING MESSAGE'}
              {authStep==='checking'   && '03 / CHECKING AGENT'}
              {authStep==='deploying'  && '04 / DEPLOYING AGENT'}
            </div>
            <div className="auth-progress">
              <div className="auth-bar">
                <div className="auth-bar-fill" style={{width:
                  authStep==='connecting'?'20%':
                  authStep==='signing'?'45%':
                  authStep==='checking'?'70%':'95%'
                }}/>
              </div>
            </div>
            <div className="auth-msg">{authMsg}</div>
            {authStep==='deploying' && (
              <div className="auth-new">&gt; FIRST TIME USER — DEPLOYING YOUR PERSONAL CFO AGENT ON ARBITRUM SEPOLIA...</div>
            )}
          </div>
        )}

        {authStep==='error' && (
          <div className="wallet-box err-box">
            <div className="wallet-box-label" style={{color:'var(--red)'}}>AUTHENTICATION FAILED</div>
            <div className="auth-err" style={{margin:'12px 0'}}>&gt; {authErr}</div>
            <button className="wallet-btn" onClick={()=>{setAuthStep('');setAuthErr('')}}>&gt; TRY AGAIN</button>
          </div>
        )}
      </div>
    </div>
  )

  if(phase==='glitch') return (
    <div className="fullscreen glitch-screen crt">
      <div className="scanline"/>
      <div className="glitch-bars-wrap">{[0,1,2,3,4,5,6,7].map(i=><div key={i} className="gbar"/>)}</div>
      <div className="glitch-word">CONNECTING</div>
    </div>
  )

  if(phase==='boot') return (
    <div className="fullscreen terminal-screen crt" onClick={()=>document.getElementById('hIn')?.focus()}>
      <div className="scanline"/>
      <div className="t-statusbar">
        <div className="t-sb-left">
          <span><span className={`signal-dot ${locked?'locked':''}`}/>{sigText}</span>
          <span className="t-ping">PING : 039 MS</span>
        </div>
        <div>{eraText}</div>
      </div>
      <div className="t-viewport">
        <div className="t-block">
          {lines.map((l,i)=>(
            <div key={i} className={`t-line ${l.type==='resp'?'resp':l.type||''}`}>
              {l.type!=='dim'&&l.type!=='resp'&&!l.text.startsWith('>')&&<span className="t-chev">&gt;</span>}
              {l.text}
            </div>
          ))}
          {bootIdx<bootLines.length && (
            <div className="t-processing">
              <div className="t-bar-wrap">
                <div className="t-bar"><div className="t-bar-fill" style={{width:progress+'%'}}/></div>
                <span className="t-pct">{progress}%</span>
              </div>
              <span className="t-dots"/>
            </div>
          )}
          {locked && (
            <div className="input-line">
              <span className="prompt-char">&gt;</span>
              <span className="typed-text">{typed}</span>
              <span className="cursor-block"/>
            </div>
          )}
          <div ref={bootRef}/>
        </div>
      </div>
      <input id="hIn" className="real-input" autoComplete="off" value={typed} onChange={()=>{}}/>
      {locked && <div className="hint">TYPE SOMETHING</div>}
    </div>
  )

  // APP
  return (
    <div className="app-wrap crt">
      <div className="scanline"/>
      {sideOpen && <div className="side-overlay" onClick={()=>setSideOpen(false)}/>}
      <aside className={`side ${sideOpen?'side-open':''}`}>
        <div className="side-top">
          <div>
            <div className="logo-text">CFO AGENT</div>
            <div className="logo-sub">CALLSIGN: {callsign||csTyped.toUpperCase()}</div>
          </div>
          <button className="side-close" onClick={()=>setSideOpen(false)}>✕</button>
        </div>
        <nav className="side-nav">
          <div className="nav-label">// OVERVIEW</div>
          {[{id:'dashboard',label:'DASHBOARD'},{id:'log',label:'ACTIVITY'}].map(item=>(
            <button key={item.id} className={`nav ${nav===item.id?'on':''}`} onClick={()=>{setNav(item.id);setSideOpen(false)}}>{item.label}</button>
          ))}
          <div className="nav-label">// AUTOMATION</div>
          <button className={`nav ${nav==='sequencer'?'on':''}`} onClick={()=>{setNav('sequencer');setSideOpen(false)}}>
            SEQUENCER {queueDepth>0&&<span className="nav-badge">{queueDepth}</span>}
          </button>
          {[{id:'rules',label:'RULES'},{id:'settings',label:'SETTINGS'}].map(item=>(
            <button key={item.id} className={`nav ${nav===item.id?'on':''}`} onClick={()=>{setNav(item.id);setSideOpen(false)}}>{item.label}</button>
          ))}
        </nav>
        <div className="side-foot">
          <div className="wallet-label"><div className="w-dot"/>CONNECTED</div>
          <div className="wallet-addr">{truncAddr(address)||'0x71C7...976F'}</div>
          <div className="agent-addr">AGENT: {truncAddr(agentAddr)||'0x9aB4...1e77'}</div>
          {isNew && <div className="new-badge">NEW AGENT DEPLOYED</div>}
          <div className="agent-addr" style={{marginTop:6}}>USERS: {totalUsers.toString()}</div>
        </div>
      </aside>

      <div className="main">
        <div className="main-bar">
          <div className="main-bar-left">
            <button className="burger" onClick={()=>setSideOpen(true)}>☰</button>
            <span style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:statColor,display:'inline-block',animation:'pulse 1.5s infinite'}}/>
              <span className="stat-label">STATUS : <span style={{color:statColor}}>{appStat}</span></span>
            </span>
            <span className="ping-label">PING : {String(ping).padStart(3,'0')} MS</span>
          </div>
          <span className="time-label">{time} / ARB SEPOLIA</span>
        </div>
        <div className="main-content">
          {nav==='dashboard' && <Dashboard rules={rules} log={log} queue={queue} agentOn={agentOn} setAgentOn={setAgentOn} simulate={simExec} activeCount={activeCount} queueDepth={queueDepth}/>}
          {nav==='sequencer' && <Sequencer queue={queue} simulate={simExec} cancelJob={id=>setQueue(q=>q.map(j=>j.id===id?{...j,status:'CANCELLED'}:j))} boostJob={id=>setQueue(q=>q.map(j=>j.id===id?{...j,priority:'CRITICAL'}:j))}/>}
          {nav==='rules' && <Rules rules={rules} showAdd={showAdd} setShowAdd={setShowAdd} form={form} setForm={setForm} addRule={addRule} toggleRule={id=>setRules(r=>r.map(rl=>rl.id===id?{...rl,active:!rl.active}:rl))} deleteRule={id=>setRules(r=>r.filter(rl=>rl.id!==id))}/>}
          {nav==='log' && <Log log={log} simulate={simExec}/>}
          {nav==='settings' && <Settings agentOn={agentOn} setAgentOn={setAgentOn} address={address} agentAddr={agentAddr}/>}
        </div>
      </div>
    </div>
  )
}

// ---- Sub-components ----

function Dashboard({rules,log,queue,agentOn,setAgentOn,simulate,activeCount,queueDepth}) {
  return (
    <>
      <div className="ph">
        <div><div className="pt">DASHBOARD</div><div className="ps">ARB SEPOLIA // LIVE</div></div>
        <button className="btn" onClick={simulate}>&gt; SIMULATE</button>
      </div>
      <div className="stats">
        <StatCard label="BALANCE" value="4,820" sub="USDC" accent/>
        <StatCard label="RULES" value={activeCount} sub={`OF ${rules.length}`}/>
        <StatCard label="QUEUE" value={queueDepth} sub="PENDING"/>
        <StatCard label="ROUTED" value="2,000" sub="USDC/MO"/>
      </div>
      <div className="status-bar-app">
        <div className="sb-left">
          <div className="w-dot" style={agentOn?{}:{background:'var(--red)'}}/>
          <div>
            <div className="sb-label">AGENT {agentOn?'RUNNING':'PAUSED'}</div>
            <div className="sb-sub">{agentOn?'SEQUENCER ACTIVE // PRIORITY ORDER':'ALL EXECUTION SUSPENDED'}</div>
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
          <div className="sh"><div className="st">// QUEUE</div></div>
          <div className="q-mini">
            {queue.slice(0,4).map(j=><QueueMini key={j.id} job={j}/>)}
            {queue.length===0&&<div className="empty">QUEUE EMPTY</div>}
          </div>
        </div>
      </div>
    </>
  )
}

function Sequencer({queue,simulate,cancelJob,boostJob}) {
  const pO={CRITICAL:2,HIGH:1,NORMAL:0}
  const pC={CRITICAL:'var(--red)',HIGH:'var(--amber)',NORMAL:'var(--muted2)'}
  const sC={QUEUED:'var(--teal)',EXECUTING:'var(--acid)',COMPLETED:'var(--muted2)',FAILED:'var(--red)',CANCELLED:'var(--muted2)'}
  const queued=queue.filter(j=>j.status==='QUEUED'||j.status==='EXECUTING')
  const done=queue.filter(j=>['COMPLETED','FAILED','CANCELLED'].includes(j.status))
  return (
    <>
      <div className="ph">
        <div><div className="pt">SEQUENCER</div><div className="ps">{queued.length} PENDING</div></div>
        <button className="btn" onClick={simulate}>&gt; ENQUEUE</button>
      </div>
      <div className="stats" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
        <StatCard label="PENDING" value={queued.length} sub="IN QUEUE"/>
        <StatCard label="DONE" value={queue.filter(j=>j.status==='COMPLETED').length} sub="COMPLETED" accent/>
        <StatCard label="FAILED" value={queue.filter(j=>j.status==='FAILED').length} sub="ATTENTION"/>
      </div>
      <div className="sh" style={{marginTop:8}}><div className="st">// PENDING QUEUE</div></div>
      <div className="q-list" style={{marginBottom:16}}>
        {queued.length===0&&<div className="empty">&gt; QUEUE EMPTY.</div>}
        {[...queued].sort((a,b)=>(pO[b.priority]||0)-(pO[a.priority]||0)).map(j=>(
          <div className="qc" key={j.id} style={{borderLeftColor:pC[j.priority]||'#2a2820'}}>
            <div>
              <div className="qc-top">
                <span className="qc-name">&gt; {j.rule}</span>
                <span className="badge" style={{color:pC[j.priority],borderColor:pC[j.priority]}}>{j.priority}</span>
                <span className="badge" style={{color:sC[j.status],borderColor:sC[j.status]}}>
                  {j.status==='EXECUTING'&&<><span className="exec-block"/><span className="exec-block"/><span className="exec-block"/><span className="exec-block-e"/><span className="exec-block-e"/>&nbsp;</>}
                  {j.status}
                </span>
              </div>
              <div className="qc-sub">JOB #{j.id} // RULE {j.ruleId} // {j.attempts}/{j.maxRetries} // {j.createdAt}</div>
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
          <div className="sh"><div className="st">// COMPLETED</div></div>
          <div className="q-list">
            {done.map(j=>(
              <div className="qc" key={j.id} style={{borderLeftColor:sC[j.status],opacity:.5}}>
                <div>
                  <div className="qc-top">
                    <span className="qc-name">&gt; {j.rule}</span>
                    <span className="badge" style={{color:sC[j.status],borderColor:sC[j.status]}}>{j.status}</span>
                  </div>
                  <div className="qc-sub">JOB #{j.id} // {j.createdAt}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

function QueueMini({job}) {
  const sC={QUEUED:'var(--teal)',EXECUTING:'var(--acid)',COMPLETED:'var(--muted2)',FAILED:'var(--red)',CANCELLED:'var(--muted2)'}
  const pC={CRITICAL:'var(--red)',HIGH:'var(--amber)',NORMAL:'var(--muted2)'}
  return (
    <div className="qm">
      <span className="qm-chev">&gt;</span>
      <span className="qm-rule">{job.rule}</span>
      <span className="qm-status" style={{color:sC[job.status]}}>{job.status}</span>
      <span className="qm-pri" style={{color:pC[job.priority]}}>{job.priority}</span>
    </div>
  )
}

function Rules({rules,showAdd,setShowAdd,form,setForm,addRule,toggleRule,deleteRule}) {
  return (
    <>
      <div className="ph">
        <div><div className="pt">RULES</div><div className="ps">{rules.filter(r=>r.active).length} ACTIVE // {rules.filter(r=>!r.active).length} PAUSED</div></div>
        <button className="btn btn-acid" onClick={()=>setShowAdd(true)}>&gt; NEW</button>
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
              <div className="rd">{r.amount} {r.token} // {r.recipient}{r.interval?` // ${r.interval}`:''}{r.cond?` // ${r.cond}`:''}</div>
              <div className="rd" style={{color:'var(--muted2)'}}>LIMIT {r.limit} {r.token} // LAST: {r.last}</div>
            </div>
            <div className="ra">
              <button className="btn btn-sm" onClick={()=>toggleRule(r.id)}>{r.active?'PAUSE':'RESUME'}</button>
              <button className="btn btn-danger btn-sm" onClick={()=>deleteRule(r.id)}>DEL</button>
            </div>
          </div>
        ))}
        {rules.length===0&&<div className="empty">&gt; NO RULES.</div>}
      </div>
    </>
  )
}

function AddRuleModal({form,setForm,onSave,onCancel}) {
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}))
  return (
    <div className="modal-bg">
      <div className="modal">
        <div className="modal-title">&gt; NEW RULE</div>
        <div className="fg"><label className="fl">// NAME</label><input className="fi" placeholder="FRIDAY PAYROLL" value={form.name} onChange={f('name')}/></div>
        <div className="fr">
          <div className="fg"><label className="fl">// TYPE</label><select className="fse" value={form.type} onChange={f('type')}><option value="SCHEDULED">SCHEDULED</option><option value="CONDITIONAL">CONDITIONAL</option></select></div>
          <div className="fg"><label className="fl">// TOKEN</label><select className="fse" value={form.token} onChange={f('token')}><option>USDC</option><option>ETH</option></select></div>
        </div>
        <div className="fg"><label className="fl">// RECIPIENT</label><input className="fi" placeholder="0x..." value={form.recipient} onChange={f('recipient')}/></div>
        <div className="fr">
          <div className="fg"><label className="fl">// AMOUNT</label><input className="fi" type="number" placeholder="500" value={form.amount} onChange={f('amount')}/></div>
          <div className="fg"><label className="fl">// LIMIT</label><input className="fi" type="number" placeholder="600" value={form.limit} onChange={f('limit')}/></div>
        </div>
        {form.type==='SCHEDULED'&&<div className="fg"><label className="fl">// INTERVAL</label><select className="fse" value={form.interval} onChange={f('interval')}><option value="3600">HOURLY</option><option value="86400">DAILY</option><option value="604800">WEEKLY</option><option value="2592000">MONTHLY</option></select></div>}
        {form.type==='CONDITIONAL'&&<div className="fg"><label className="fl">// TRIGGER ABOVE</label><input className="fi" type="number" placeholder="5000" value={form.condVal} onChange={f('condVal')}/></div>}
        <div className="ma"><button className="btn" onClick={onCancel}>CANCEL</button><button className="btn btn-acid" onClick={onSave}>&gt; CREATE</button></div>
      </div>
    </div>
  )
}

function Log({log,simulate}) {
  return (
    <>
      <div className="ph">
        <div><div className="pt">ACTIVITY</div><div className="ps">{log.length} EXECUTIONS ON-CHAIN</div></div>
        <button className="btn" onClick={simulate}>&gt; SIMULATE</button>
      </div>
      <div className="log-list">
        {log.map(e=><LogItem key={e.id} entry={e}/>)}
        {log.length===0&&<div className="empty">&gt; NO EXECUTIONS YET.</div>}
      </div>
    </>
  )
}

function LogItem({entry:e}) {
  return (
    <div className="li">
      <span className="li-chev">&gt;</span>
      <div className="lit"><div className="lit-rule">{e.rule}</div><div className="lit-to">{e.to}</div></div>
      <span className="lam">{e.amount} {e.token}</span>
      <span className="ltm">{e.time}</span>
    </div>
  )
}

function Settings({agentOn,setAgentOn,address,agentAddr}) {
  return (
    <>
      <div className="ph"><div><div className="pt">SETTINGS</div><div className="ps">CONFIGURATION // SAFETY</div></div></div>
      <div className="two" style={{marginBottom:14}}>
        <div className="sc"><div className="sl">YOUR WALLET</div><div className="mono-val teal">{truncAddr(address)||'0x71C7...976F'}</div><div className="ss">SIWE AUTHENTICATED</div></div>
        <div className="sc"><div className="sl">YOUR AGENT</div><div className="mono-val teal">{truncAddr(agentAddr)||'0x9aB4...1e77'}</div><div className="ss">ARB SEPOLIA 421614</div></div>
        <div className="sc"><div className="sl">GASLESS MODE</div><div className="mono-val" style={{color:'var(--acid)'}}>ZERODEV ACTIVE</div><div className="ss">NO ETH NEEDED FOR GAS</div></div>
        <div className="sc"><div className="sl">DAILY USDC CAP</div><div className="sv" style={{fontSize:24,marginTop:6}}>2,000</div><div className="ss">MAX PER 24H</div></div>
        <div className="sc full" style={{borderTop:`3px solid ${agentOn?'var(--acid)':'var(--red)'}`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
            <div>
              <div className="sl">EMERGENCY KILL SWITCH</div>
              <div style={{fontSize:13,marginTop:5,color:'var(--muted2)',letterSpacing:'0.06em'}}>{agentOn?'AGENT LIVE. ALL RULES EXECUTING.':'AGENT PAUSED. NO RULES WILL EXECUTE.'}</div>
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

function StatCard({label,value,sub,accent}) {
  return <div className="sc"><div className="sl">{label}</div><div className={`sv ${accent?'accent':''}`}>{value}</div><div className="ss">{sub}</div></div>
}

function Toggle({on,onClick}) {
  return <div className={`tog ${on?'on':''}`} onClick={onClick}><div className="tthumb"/></div>
}
