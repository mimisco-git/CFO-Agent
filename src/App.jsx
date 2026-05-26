import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './App.css'
import { SFX } from './lib/audio.js'
import { suggestRules } from './lib/ai.js'
import {
  hasWallet, connectWallet, signSiwe,
  checkHasAgent, getAgentAddress, deployAgent,
  getTotalAgents, truncAddr, onAccountChange, FACTORY_ADDR,
} from './lib/chain.js'

// ---- ANIMATION VARIANTS ----
const fadeUp   = { hidden:{opacity:0,y:16}, visible:{opacity:1,y:0,transition:{duration:0.4,ease:'easeOut'}}, exit:{opacity:0,y:-8,transition:{duration:0.2}} }
const fadeIn   = { hidden:{opacity:0}, visible:{opacity:1,transition:{duration:0.5}}, exit:{opacity:0,transition:{duration:0.25}} }
const stagger  = { visible:{transition:{staggerChildren:0.07}} }
const slideR   = { hidden:{opacity:0,x:-20}, visible:{opacity:1,x:0,transition:{duration:0.35,ease:'easeOut'}} }
const scaleIn  = { hidden:{opacity:0,scale:0.96}, visible:{opacity:1,scale:1,transition:{duration:0.35}}, exit:{opacity:0,scale:0.96} }

// ---- BOOT LINES ----
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
    isNew ? { text: 'NEW AGENT DEPLOYED ON-CHAIN', type: 'acid' } : { text: 'EXISTING AGENT LOADED', type: 'teal' },
    { text: 'RULE REGISTRY: ONLINE', type: 'acid' },
    { text: 'EXECUTION SEQUENCER: ACTIVE', type: 'teal' },
    { text: 'AI RULE SUGGESTER: READY', type: 'acid' },
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
    { text: '  LAUNCH    open dashboard', type: 'resp' },
  ],
  status:   [{ text: 'AGENT STATUS:', type: 'bright' }, { text: '  STATUS: ACTIVE', type: 'acid' }, { text: '  GASLESS: ZERODEV', type: 'resp' }],
  balance:  [{ text: 'TREASURY:', type: 'bright' }, { text: '  USDC: 4,820.00', type: 'acid' }, { text: '  ETH: 0.842', type: 'resp' }],
  rules:    [{ text: 'RULES (2/3 ACTIVE):', type: 'bright' }, { text: '  [0] FRIDAY PAYROLL  ACTIVE', type: 'resp' }, { text: '  [1] YIELD SWEEP     ACTIVE', type: 'resp' }, { text: '  [2] DAILY OPS       PAUSED', type: 'dim' }],
  queue:    [{ text: 'QUEUE (2 PENDING):', type: 'bright' }, { text: '  JOB #0  FRIDAY PAYROLL  QUEUED', type: 'resp' }, { text: '  JOB #1  YIELD SWEEP    QUEUED', type: 'resp' }],
  simulate: [{ text: 'SIMULATING...', type: 'amber' }, { text: '  EXECUTING ON-CHAIN', type: 'acid' }, { text: '  CONFIRMED', type: 'acid' }],
  launch:   [{ text: 'LAUNCHING DASHBOARD...', type: 'acid' }],
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

// Payroll recipients for split feature
const BLANK_RECIPIENT = { name:'', address:'', amount:'' }

function fmtInt(s) {
  const n=Number(s)
  if(n>=2592000) return '1 MONTH'; if(n>=604800) return '1 WEEK'
  if(n>=86400) return '1 DAY'; return '1 HOUR'
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
  const [phase,setPhase]           = useState('gate')
  const [muted,setMuted]           = useState(false)
  const [callsign,setCallsign]     = useState('')
  const [csTyped,setCsTyped]       = useState('')
  const [address,setAddress]       = useState('')
  const [agentAddr,setAgentAddr]   = useState('')
  const [isNew,setIsNew]           = useState(false)
  const [authStep,setAuthStep]     = useState('')
  const [authMsg,setAuthMsg]       = useState('')
  const [authErr,setAuthErr]       = useState('')
  const [totalUsers,setTotalUsers] = useState(0n)
  const [bootLines,setBootLines]   = useState([])
  const [bootIdx,setBootIdx]       = useState(0)
  const [lines,setLines]           = useState([])
  const [typed,setTyped]           = useState('')
  const [locked,setLocked]         = useState(false)
  const [sigText,setSigText]       = useState('SIGNAL : UNSTABLE')
  const [progress,setProgress]     = useState(0)
  const [eraText,setEraText]       = useState('2140 / SYNC PENDING')
  const [nav,setNav]               = useState('dashboard')
  const [agentOn,setAgentOn]       = useState(true)
  const [rules,setRules]           = useState(INIT_RULES)
  const [log,setLog]               = useState(INIT_LOG)
  const [queue,setQueue]           = useState(INIT_QUEUE)
  const [showAdd,setShowAdd]       = useState(false)
  const [showPayroll,setShowPayroll] = useState(false)
  const [showAI,setShowAI]         = useState(false)
  const [form,setForm]             = useState(BLANK)
  const [appStat,setAppStat]       = useState('ONLINE')
  const [sideOpen,setSideOpen]     = useState(false)

  const logId   = useRef(10)
  const jobId   = useRef(10)
  const bootRef = useRef(null)
  const csInputRef = useRef(null)
  const termInputRef = useRef(null)
  const ping    = usePing()
  const time    = useTime()

  useEffect(()=>{ bootRef.current?.scrollIntoView({behavior:'smooth'}) },[lines])

  useEffect(()=>{
    onAccountChange(acc=>{ if(!acc && phase==='app') { setPhase('callsign'); setCsTyped('') } })
  },[phase])

  function toggleMute() { SFX.init(); const m=SFX.toggle(); setMuted(m) }

  function enterGate() {
    SFX.init(); SFX.initialize()
    setTimeout(()=>{ SFX.startDrone(); setPhase('callsign') }, 600)
  }

  // Callsign - works on both desktop (keydown) and mobile (input onChange)
  useEffect(()=>{
    if(phase!=='callsign') return
    // Auto-focus on desktop
    setTimeout(()=>csInputRef.current?.focus(), 100)
  },[phase])

  function handleCsKey(e) {
    if(phase!=='callsign') return
    SFX.key()
    if(e.key==='Enter' && csTyped.trim().length>=2) {
      setCallsign(csTyped.trim().toUpperCase()); setPhase('wallet')
    } else if(e.key==='Backspace') {
      setCsTyped(t=>t.slice(0,-1))
    } else if(e.key.length===1 && csTyped.length<16) {
      setCsTyped(t=>(t+e.key).toUpperCase())
    }
  }

  // Mobile onChange for callsign
  function handleCsChange(e) {
    const val = e.target.value.toUpperCase().slice(0,16)
    setCsTyped(val)
    SFX.key()
  }

  function handleCsSubmit() {
    if(csTyped.trim().length>=2) { setCallsign(csTyped.trim().toUpperCase()); setPhase('wallet') }
  }

  async function doAuth() {
    setAuthErr('')
    try {
      setAuthStep('connecting'); setAuthMsg('CONNECTING WALLET...')
      if(!hasWallet()) throw {code:'NO_WALLET',message:'NO WALLET DETECTED. INSTALL METAMASK.'}
      const addr = await connectWallet(); setAddress(addr)
      setAuthStep('signing'); setAuthMsg('SIGN MESSAGE TO AUTHENTICATE...')
      await signSiwe(addr)
      setAuthStep('checking'); setAuthMsg('CHECKING ON-CHAIN AGENT...')
      const [has,total] = await Promise.all([checkHasAgent(addr),getTotalAgents()])
      setTotalUsers(total)
      let agentAddress, newUser=false
      if(has) { agentAddress = await getAgentAddress(addr); setAgentAddr(agentAddress||'') }
      else {
        setIsNew(true); newUser=true
        setAuthStep('deploying'); setAuthMsg('DEPLOYING YOUR CFO AGENT ON ARBITRUM...')
        SFX.deploy()
        if(FACTORY_ADDR && FACTORY_ADDR!=='') { agentAddress = await deployAgent() }
        else { await new Promise(r=>setTimeout(r,2200)); agentAddress='0x'+Array.from(crypto.getRandomValues(new Uint8Array(20))).map(b=>b.toString(16).padStart(2,'0')).join('') }
        setAgentAddr(agentAddress||'')
      }
      setAuthStep('done'); setAuthMsg(''); SFX.glitch(); setPhase('glitch')
      setTimeout(()=>{ setPhase('boot'); setBootLines(buildBoot(callsign||csTyped.toUpperCase(), addr, newUser)); setBootIdx(0) }, 900)
    } catch(err) {
      setAuthStep('error'); SFX.err()
      if(err.code==='NO_WALLET') setAuthErr(err.message)
      else if(err.code===4001) setAuthErr('SIGNATURE REJECTED. TRY AGAIN.')
      else setAuthErr((err.message||'UNKNOWN ERROR').toUpperCase().slice(0,80))
    }
  }

  // Boot sequence
  useEffect(()=>{
    if(phase!=='boot') return
    if(bootIdx>=bootLines.length) {
      setTimeout(()=>{ setLocked(true); setSigText('SIGNAL : LOCKED'); setEraText('2140 / SYNC FINDING'); SFX.lock() },300)
      return
    }
    setProgress(Math.round((bootIdx/bootLines.length)*100))
    const t=setTimeout(()=>{ setLines(l=>[...l,bootLines[bootIdx]]); setBootIdx(i=>i+1); SFX.line() },LINE_MS)
    return()=>clearTimeout(t)
  },[phase,bootIdx,bootLines])

  // Terminal input - desktop keyboard
  useEffect(()=>{
    if(phase!=='boot'||!locked) return
    const h=e=>{
      if(e.key==='Enter'){ runCmd(typed); setTyped('') }
      else if(e.key==='Backspace') setTyped(t=>t.slice(0,-1))
      else if(e.key.length===1){ SFX.key(); setTyped(t=>(t+e.key).toUpperCase().slice(0,40)) }
    }
    window.addEventListener('keydown',h); return()=>window.removeEventListener('keydown',h)
  },[phase,locked,typed])

  // Terminal - mobile onChange
  function handleTermChange(e) {
    setTyped(e.target.value.toUpperCase().slice(0,40))
    SFX.key()
  }

  function handleTermSubmit() { if(typed.trim()) { runCmd(typed); setTyped('') } }

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
      setLines(l=>[...l,{text:`UNKNOWN: "${cmd.trim()}" - TYPE "HELP"`,type:'red'}])
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

  function addRule(r) {
    setRules(prev=>[...prev,{id:Date.now(),name:(r.name||'UNNAMED').toUpperCase(),type:r.type,token:r.token,recipient:r.recipient||'0x0000...0000',amount:r.amount,interval:r.type==='SCHEDULED'?fmtInt(r.interval):'',limit:r.limit,cond:r.type==='CONDITIONAL'?`BALANCE > ${r.condVal} ${r.token}`:'',active:true,last:'NEVER'}])
    setShowAdd(false); setForm(BLANK)
  }

  function addPayrollSplit(recipients, token, interval) {
    const total = recipients.reduce((s,r)=>s+Number(r.amount||0),0)
    const splitRule = {
      id: Date.now(),
      name: 'PAYROLL SPLIT',
      type: 'SCHEDULED',
      token,
      recipient: `${recipients.length} WALLETS`,
      amount: String(total),
      interval: fmtInt(interval),
      limit: String(total*1.1),
      active: true,
      last: 'NEVER',
      isSplit: true,
      recipients,
    }
    setRules(prev=>[...prev,splitRule])
    setShowPayroll(false)
    // Simulate split execution in log
    recipients.forEach((r,i)=>{
      setTimeout(()=>{
        setLog(l=>[{id:logId.current++,rule:'PAYROLL SPLIT',token,amount:'+'+r.amount,to:r.address||'0x'+i+'f3a...'+i+'B12',time:'JUST NOW'},...l])
      }, i*300)
    })
    SFX.deploy()
  }

  const activeCount=rules.filter(r=>r.active).length
  const queueDepth=queue.filter(j=>j.status==='QUEUED'||j.status==='EXECUTING').length
  const statColor={ONLINE:'var(--acid)',EXECUTING:'var(--teal)'}[appStat]||'var(--acid)'

  // ---- GATE ----
  if(phase==='gate') return (
    <motion.div className="fullscreen crt gate-screen" variants={fadeIn} initial="hidden" animate="visible" exit="exit" key="gate">
      <div className="scanline"/>
      <div className="gate-grid"/>
      <div className="gate-glow"/>
      <motion.div className="gate-center" variants={stagger} initial="hidden" animate="visible">
        <motion.div className="gate-logo-wrap" variants={scaleIn}>
          <Logo size={72}/>
        </motion.div>
        <motion.div className="gate-title" variants={fadeUp}>CFO AGENT</motion.div>
        <motion.div className="gate-sub" variants={fadeUp}>ARBITRUM TREASURY OS</motion.div>
        <motion.div className="gate-sub2" variants={fadeUp}>AUTONOMOUS PAYMENT EXECUTION ON-CHAIN</motion.div>
        <motion.button className="gate-btn" variants={scaleIn}
          whileHover={{scale:1.03}} whileTap={{scale:0.97}}
          onClick={enterGate} onMouseEnter={()=>SFX.hover()}>
          <span className="gate-btn-glyph">&gt;</span>
          INITIALIZE INTERFACE
        </motion.button>
        <motion.div className="gate-chain" variants={fadeUp}>
          <span className="gate-dot"/><span>ARBITRUM SEPOLIA // CHAIN 421614</span>
        </motion.div>
      </motion.div>
      <button className="gate-mute" onClick={toggleMute}>{muted?'[ MUTED ]':'[ AUDIO ON ]'}</button>
    </motion.div>
  )

  // ---- CALLSIGN ----
  if(phase==='callsign') return (
    <motion.div className="fullscreen crt" variants={fadeIn} initial="hidden" animate="visible" exit="exit" key="cs"
      onClick={()=>csInputRef.current?.focus()}>
      <div className="scanline"/>
      <motion.div className="cs-wrap" variants={stagger} initial="hidden" animate="visible">
        <motion.div variants={scaleIn} style={{marginBottom:24}}><Logo size={40}/></motion.div>
        <motion.div className="cs-logo" variants={fadeUp}>CFO-AGENT</motion.div>
        <motion.div className="cs-tag" variants={fadeUp}>ARBITRUM TREASURY OS // POWERED BY ZERODEV</motion.div>
        <motion.div className="cs-label" variants={fadeUp}>ENTER YOUR CALLSIGN</motion.div>
        <motion.div className="cs-row" variants={scaleIn}>
          <span className="cs-prompt">&gt;</span>
          <span className="cs-typed">{csTyped}</span>
          <span className="cs-cur"/>
        </motion.div>
        <motion.div className="cs-hint" variants={fadeUp}>
          {csTyped.length>=2?'PRESS ENTER OR TAP CONTINUE':'MIN 2 CHARACTERS'}
        </motion.div>
        {/* Visible input for mobile */}
        <input
          ref={csInputRef}
          className="cs-mobile-input"
          type="text"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck="false"
          value={csTyped}
          onChange={handleCsChange}
          onKeyDown={handleCsKey}
          maxLength={16}
          placeholder="TYPE YOUR CALLSIGN"
        />
        {csTyped.length>=2 && (
          <motion.button className="cs-enter-btn" onClick={handleCsSubmit}
            initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
            whileHover={{scale:1.04}} whileTap={{scale:0.96}}>
            &gt; CONTINUE
          </motion.button>
        )}
      </motion.div>
      <MuteBtn muted={muted} toggle={toggleMute}/>
    </motion.div>
  )

  // ---- WALLET ----
  if(phase==='wallet') return (
    <motion.div className="fullscreen crt" variants={fadeIn} initial="hidden" animate="visible" exit="exit" key="wallet">
      <div className="scanline"/>
      <motion.div className="cs-wrap" variants={stagger} initial="hidden" animate="visible">
        <motion.div variants={scaleIn} style={{marginBottom:16}}><Logo size={36}/></motion.div>
        <motion.div className="cs-logo" variants={fadeUp}>CFO-AGENT</motion.div>
        <motion.div className="cs-tag" variants={fadeUp}>CALLSIGN: {callsign||csTyped.toUpperCase()}</motion.div>
        <AnimatePresence mode="wait">
          {authStep==='' && (
            <motion.div key="wi" className="wallet-box" variants={scaleIn} initial="hidden" animate="visible" exit="exit">
              <div className="wallet-box-label">AUTHENTICATION REQUIRED</div>
              <div className="wallet-box-sub">Connect your wallet to prove ownership. Your personal CFO Agent will be deployed on Arbitrum.</div>
              <motion.div className="wallet-steps" variants={stagger} initial="hidden" animate="visible">
                {['01  CONNECT WALLET','02  SIGN MESSAGE (SIWE)','03  CHECK ON-CHAIN AGENT','04  DEPLOY IF NEW USER','05  LAUNCH'].map((s,i)=>(
                  <motion.div key={i} className="wallet-step" variants={slideR} onMouseEnter={()=>SFX.hover()}>
                    <span className="step-text">&gt; {s}</span>
                  </motion.div>
                ))}
              </motion.div>
              {!hasWallet() && <div className="auth-err" style={{marginBottom:14}}>&gt; NO WALLET. <a href="https://metamask.io" target="_blank" rel="noreferrer" style={{color:'var(--acid)'}}>INSTALL METAMASK</a></div>}
              {authErr && <div className="auth-err" style={{marginBottom:12}}>&gt; {authErr}</div>}
              <motion.button className="wallet-btn" whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={doAuth} onMouseEnter={()=>SFX.hover()}>&gt; CONNECT WALLET</motion.button>
            </motion.div>
          )}
          {['connecting','signing','checking','deploying'].includes(authStep) && (
            <motion.div key="wp" className="wallet-box" variants={scaleIn} initial="hidden" animate="visible">
              <div className="wallet-box-label">
                {authStep==='connecting'&&'01 / CONNECTING WALLET'}{authStep==='signing'&&'02 / SIGNING MESSAGE'}
                {authStep==='checking'&&'03 / CHECKING AGENT'}{authStep==='deploying'&&'04 / DEPLOYING AGENT'}
              </div>
              <div className="auth-progress">
                <div className="auth-bar">
                  <motion.div className="auth-bar-fill" initial={{width:'0%'}} animate={{width:authStep==='connecting'?'20%':authStep==='signing'?'45%':authStep==='checking'?'70%':'95%'}} transition={{duration:0.6,ease:'easeInOut'}}/>
                </div>
              </div>
              <div className="auth-msg">{authMsg}</div>
              {authStep==='deploying'&&<motion.div className="auth-new" variants={fadeUp} initial="hidden" animate="visible">&gt; FIRST TIME USER. DEPLOYING YOUR PERSONAL CFO AGENT ON ARBITRUM SEPOLIA...</motion.div>}
            </motion.div>
          )}
          {authStep==='error' && (
            <motion.div key="we" className="wallet-box err-box" variants={scaleIn} initial="hidden" animate="visible">
              <div className="wallet-box-label" style={{color:'var(--red)'}}>AUTH FAILED</div>
              <div className="auth-err" style={{margin:'12px 0'}}>&gt; {authErr}</div>
              <motion.button className="wallet-btn" whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={()=>{setAuthStep('');setAuthErr('')}} onMouseEnter={()=>SFX.hover()}>&gt; TRY AGAIN</motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <MuteBtn muted={muted} toggle={toggleMute}/>
    </motion.div>
  )

  // ---- GLITCH ----
  if(phase==='glitch') return (
    <motion.div className="fullscreen glitch-screen crt" variants={fadeIn} initial="hidden" animate="visible" exit={{opacity:0}} key="glitch">
      <div className="scanline"/>
      <div className="glitch-bars-wrap">{[0,1,2,3,4,5,6,7].map(i=><div key={i} className="gbar"/>)}</div>
      <div className="glitch-word">CONNECTING</div>
    </motion.div>
  )

  // ---- BOOT ----
  if(phase==='boot') return (
    <motion.div className="fullscreen terminal-screen crt" variants={fadeIn} initial="hidden" animate="visible" key="boot"
      onClick={()=>termInputRef.current?.focus()}>
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
          <AnimatePresence>
            {lines.map((l,i)=>(
              <motion.div key={i} className={`t-line ${l.type==='resp'?'resp':l.type||''}`}
                initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{duration:0.2}}>
                {l.type!=='dim'&&l.type!=='resp'&&!l.text.startsWith('>')&&<span className="t-chev">&gt;</span>}
                {l.text}
              </motion.div>
            ))}
          </AnimatePresence>
          {bootIdx<bootLines.length&&(
            <div className="t-processing">
              <div className="t-bar-wrap">
                <div className="t-bar"><motion.div className="t-bar-fill" animate={{width:progress+'%'}} transition={{duration:0.3}}/></div>
                <span className="t-pct">{progress}%</span>
              </div>
              <span className="t-dots"/>
            </div>
          )}
          {locked&&(
            <>
              <div className="input-line">
                <span className="prompt-char">&gt;</span>
                <span className="typed-text">{typed}</span>
                <span className="cursor-block"/>
              </div>
              {/* Mobile: visible input + send button */}
              <div className="term-mobile-bar">
                <input ref={termInputRef} className="term-mobile-input" type="text"
                  autoComplete="off" autoCapitalize="off" spellCheck="false"
                  value={typed} onChange={handleTermChange} placeholder="TYPE A COMMAND..."
                  onKeyDown={e=>{ if(e.key==='Enter') handleTermSubmit() }}/>
                <button className="term-mobile-send" onClick={handleTermSubmit}>&gt;</button>
              </div>
            </>
          )}
          <div ref={bootRef}/>
        </div>
      </div>
      <MuteBtn muted={muted} toggle={toggleMute}/>
    </motion.div>
  )

  // ---- APP ----
  return (
    <motion.div className="app-wrap crt" variants={fadeIn} initial="hidden" animate="visible" key="app">
      <div className="scanline"/>
      {sideOpen&&<div className="side-overlay" onClick={()=>setSideOpen(false)}/>}
      <aside className={`side ${sideOpen?'side-open':''}`}>
        <div className="side-top">
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <Logo size={24}/>
            <div><div className="logo-text">CFO AGENT</div><div className="logo-sub">CALLSIGN: {callsign||csTyped.toUpperCase()}</div></div>
          </div>
          <button className="side-close" onClick={()=>setSideOpen(false)}>✕</button>
        </div>
        <nav className="side-nav">
          <div className="nav-label">// OVERVIEW</div>
          {[{id:'dashboard',label:'DASHBOARD'},{id:'log',label:'ACTIVITY'}].map(item=>(
            <button key={item.id} className={`nav ${nav===item.id?'on':''}`} onClick={()=>{setNav(item.id);setSideOpen(false);SFX.key()}} onMouseEnter={()=>SFX.hover()}>{item.label}</button>
          ))}
          <div className="nav-label">// AUTOMATION</div>
          <button className={`nav ${nav==='sequencer'?'on':''}`} onClick={()=>{setNav('sequencer');setSideOpen(false);SFX.key()}} onMouseEnter={()=>SFX.hover()}>
            SEQUENCER {queueDepth>0&&<span className="nav-badge">{queueDepth}</span>}
          </button>
          <button className={`nav ${nav==='rules'?'on':''}`} onClick={()=>{setNav('rules');setSideOpen(false);SFX.key()}} onMouseEnter={()=>SFX.hover()}>RULES</button>
          <button className={`nav ai-nav ${nav==='ai'?'on':''}`} onClick={()=>{setNav('ai');setSideOpen(false);SFX.key()}} onMouseEnter={()=>SFX.hover()}>
            <span>AI SUGGESTER</span><span className="ai-badge">AI</span>
          </button>
          <button className={`nav ${nav==='settings'?'on':''}`} onClick={()=>{setNav('settings');setSideOpen(false);SFX.key()}} onMouseEnter={()=>SFX.hover()}>SETTINGS</button>
        </nav>
        <div className="side-foot">
          <div className="wallet-label"><div className="w-dot"/>CONNECTED</div>
          <div className="wallet-addr">{truncAddr(address)||'0x71C7...976F'}</div>
          <div className="agent-addr">AGENT: {truncAddr(agentAddr)||'0x9aB4...1e77'}</div>
          {isNew&&<div className="new-badge">NEW AGENT DEPLOYED</div>}
          <div className="agent-addr" style={{marginTop:6}}>TOTAL USERS: {totalUsers.toString()}</div>
        </div>
      </aside>

      <div className="main">
        <div className="main-bar">
          <div className="main-bar-left">
            <button className="burger" onClick={()=>setSideOpen(true)}>☰</button>
            <span style={{display:'flex',alignItems:'center',gap:8}}>
              <motion.span style={{width:6,height:6,borderRadius:'50%',background:statColor,display:'inline-block'}} animate={{opacity:[1,0.3,1]}} transition={{repeat:Infinity,duration:1.5}}/>
              <span className="stat-label">STATUS : <span style={{color:statColor}}>{appStat}</span></span>
            </span>
            <span className="ping-label">PING : {String(ping).padStart(3,'0')} MS</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span className="time-label">{time} / ARB SEPOLIA</span>
            <MuteBtn muted={muted} toggle={toggleMute} inline/>
          </div>
        </div>
        <div className="main-content">
          <AnimatePresence mode="wait">
            {nav==='dashboard'&&<motion.div key="db" variants={fadeUp} initial="hidden" animate="visible" exit="exit"><Dashboard rules={rules} log={log} queue={queue} agentOn={agentOn} setAgentOn={setAgentOn} simulate={simExec} activeCount={activeCount} queueDepth={queueDepth} setNav={setNav}/></motion.div>}
            {nav==='sequencer'&&<motion.div key="sq" variants={fadeUp} initial="hidden" animate="visible" exit="exit"><Sequencer queue={queue} simulate={simExec} cancelJob={id=>setQueue(q=>q.map(j=>j.id===id?{...j,status:'CANCELLED'}:j))} boostJob={id=>setQueue(q=>q.map(j=>j.id===id?{...j,priority:'CRITICAL'}:j))}/></motion.div>}
            {nav==='rules'&&<motion.div key="rl" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
              <Rules rules={rules} showAdd={showAdd} setShowAdd={setShowAdd}
                showPayroll={showPayroll} setShowPayroll={setShowPayroll}
                form={form} setForm={setForm} addRule={addRule} addPayrollSplit={addPayrollSplit}
                toggleRule={id=>setRules(r=>r.map(rl=>rl.id===id?{...rl,active:!rl.active}:rl))}
                deleteRule={id=>setRules(r=>r.filter(rl=>rl.id!==id))}/>
            </motion.div>}
            {nav==='ai'&&<motion.div key="ai" variants={fadeUp} initial="hidden" animate="visible" exit="exit"><AIRuleSuggester rules={rules} addRule={addRule}/></motion.div>}
            {nav==='log'&&<motion.div key="lg" variants={fadeUp} initial="hidden" animate="visible" exit="exit"><Log log={log} simulate={simExec}/></motion.div>}
            {nav==='settings'&&<motion.div key="st" variants={fadeUp} initial="hidden" animate="visible" exit="exit"><Settings agentOn={agentOn} setAgentOn={setAgentOn} address={address} agentAddr={agentAddr}/></motion.div>}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// ---- LOGO ----
function Logo({ size = 40 }) {
  const s = size
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="38" height="38" rx="4" stroke="var(--acid)" strokeWidth="1.5"/>
      <rect x="7" y="7" width="26" height="26" rx="2" stroke="var(--acid)" strokeWidth="0.8" strokeOpacity="0.4"/>
      {/* C shape */}
      <path d="M26 14 H18 Q14 14 14 18 V22 Q14 26 18 26 H26" stroke="var(--acid)" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
      {/* Dollar tick */}
      <line x1="20" y1="11" x2="20" y2="29" stroke="var(--acid)" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.7"/>
      {/* Corner accents */}
      <rect x="2" y="2" width="4" height="4" fill="var(--acid)" opacity="0.6"/>
      <rect x="34" y="34" width="4" height="4" fill="var(--acid)" opacity="0.6"/>
    </svg>
  )
}

// ---- AI RULE SUGGESTER ----
function AIRuleSuggester({ rules, addRule }) {
  const [desc,setDesc]         = useState('')
  const [loading,setLoading]   = useState(false)
  const [suggestions,setSugs]  = useState([])
  const [error,setError]       = useState('')
  const [added,setAdded]       = useState({})

  async function getSuggestions() {
    if(!desc.trim()) return
    setLoading(true); setError(''); setSugs([])
    SFX.exec()
    try {
      const result = await suggestRules(desc, rules)
      setSugs(result); SFX.done()
    } catch(e) {
      setError(e.message||'AI REQUEST FAILED'); SFX.err()
    } finally { setLoading(false) }
  }

  function acceptSuggestion(s, idx) {
    addRule({ name:s.name, type:s.type, token:s.token, recipient:s.recipient||'0x0000...0000', amount:s.amount, limit:s.limit, interval:s.interval||'604800', condVal:s.condVal||'' })
    setAdded(a=>({...a,[idx]:true}))
    SFX.deploy()
  }

  const examples = [
    'Lagos fintech startup paying 8 remote contractors weekly in USDC',
    'DeFi yield farming protocol sweeping profits to treasury',
    'E-commerce brand paying suppliers monthly and managing operating budget',
  ]

  return (
    <>
      <div className="ph">
        <div><div className="pt">AI RULE SUGGESTER</div><div className="ps">DESCRIBE YOUR BUSINESS. CLAUDE SUGGESTS OPTIMAL RULES.</div></div>
        <div className="ai-powered-badge">POWERED BY CLAUDE</div>
      </div>

      <motion.div className="ai-box" variants={scaleIn} initial="hidden" animate="visible">
        <div className="ai-box-label">// DESCRIBE YOUR BUSINESS</div>
        <textarea
          className="ai-textarea"
          placeholder="E.g. Lagos fintech startup paying 8 remote contractors weekly in USDC, plus daily operating budget and yield sweep..."
          value={desc}
          onChange={e=>setDesc(e.target.value)}
          rows={4}
        />
        <div className="ai-examples">
          {examples.map((ex,i)=>(
            <button key={i} className="ai-example-btn" onClick={()=>setDesc(ex)} onMouseEnter={()=>SFX.hover()}>
              &gt; {ex}
            </button>
          ))}
        </div>
        <motion.button className={`wallet-btn ${!desc.trim()||loading?'btn-disabled':''}`}
          onClick={getSuggestions} disabled={!desc.trim()||loading}
          whileHover={desc.trim()&&!loading?{scale:1.02}:{}} whileTap={desc.trim()&&!loading?{scale:0.98}:{}}>
          {loading?'> ANALYZING YOUR BUSINESS...':'> GENERATE RULES WITH AI'}
        </motion.button>
        {error&&<div className="auth-err" style={{marginTop:12}}>&gt; {error}</div>}
      </motion.div>

      {loading && (
        <motion.div className="ai-loading" variants={fadeIn} initial="hidden" animate="visible">
          <div className="ai-loading-bar"><motion.div className="ai-loading-fill" animate={{width:['0%','100%']}} transition={{duration:2,repeat:Infinity,ease:'easeInOut'}}/></div>
          <div className="ai-loading-text">CLAUDE IS ANALYZING YOUR BUSINESS AND GENERATING OPTIMAL RULES...</div>
        </motion.div>
      )}

      {suggestions.length>0&&(
        <>
          <div className="sh" style={{marginTop:16}}><div className="st">// AI SUGGESTED RULES ({suggestions.length})</div></div>
          <motion.div className="rule-list" variants={stagger} initial="hidden" animate="visible">
            {suggestions.map((s,i)=>(
              <motion.div key={i} className="ai-suggestion" variants={slideR}>
                <div className="ai-sug-top">
                  <span className="rn">&gt; {s.name}</span>
                  <span className={`badge ${s.type==='SCHEDULED'?'b-sched':'b-cond'}`}>{s.type}</span>
                  <span className="badge b-active">{s.token}</span>
                </div>
                <div className="rd">{s.amount} {s.token} // {s.type==='SCHEDULED'?fmtInt(s.interval):`WHEN BALANCE > ${s.condVal}`}</div>
                <div className="ai-reasoning">&gt; {s.reasoning}</div>
                <div style={{marginTop:10}}>
                  {added[i]
                    ? <span className="ai-added">RULE ADDED</span>
                    : <motion.button className="btn btn-acid btn-sm" onClick={()=>acceptSuggestion(s,i)}
                        whileHover={{scale:1.05}} whileTap={{scale:0.95}} onMouseEnter={()=>SFX.hover()}>
                        &gt; ADD THIS RULE
                      </motion.button>
                  }
                </div>
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </>
  )
}


// ---- PAYROLL SPLIT ----
function PayrollSplitModal({ onSave, onCancel }) {
  const [recipients,setRecipients] = useState([
    {name:'',address:'',amount:''},
    {name:'',address:'',amount:''},
  ])
  const [token,setToken]     = useState('USDC')
  const [interval,setInterval] = useState('604800')
  const total = recipients.reduce((s,r)=>s+Number(r.amount||0),0)

  function updateR(i,k,v) { setRecipients(r=>r.map((x,j)=>j===i?{...x,[k]:v}:x)) }
  function addR()  { setRecipients(r=>[...r,{name:'',address:'',amount:''}]) }
  function removeR(i) { if(recipients.length>2) setRecipients(r=>r.filter((_,j)=>j!==i)) }

  return (
    <motion.div className="modal-bg" variants={fadeIn} initial="hidden" animate="visible">
      <motion.div className="modal modal-wide" variants={scaleIn} initial="hidden" animate="visible">
        <div className="modal-title">&gt; PAYROLL SPLIT</div>
        <div className="payroll-sub">Fan out a single payment to multiple wallets simultaneously.</div>

        <div className="fr" style={{marginBottom:12}}>
          <div className="fg"><label className="fl">// TOKEN</label>
            <select className="fse" value={token} onChange={e=>setToken(e.target.value)}>
              <option>USDC</option><option>ETH</option>
            </select>
          </div>
          <div className="fg"><label className="fl">// FREQUENCY</label>
            <select className="fse" value={interval} onChange={e=>setInterval(e.target.value)}>
              <option value="86400">DAILY</option>
              <option value="604800">WEEKLY</option>
              <option value="2592000">MONTHLY</option>
            </select>
          </div>
        </div>

        <div className="payroll-header">
          <span className="fl" style={{flex:1.5,margin:0}}>// NAME</span>
          <span className="fl" style={{flex:2,margin:0}}>// WALLET ADDRESS</span>
          <span className="fl" style={{flex:1,margin:0}}>// AMOUNT ({token})</span>
          <span style={{width:24}}/>
        </div>

        {recipients.map((r,i)=>(
          <div key={i} className="payroll-row">
            <input className="fi" style={{flex:1.5}} placeholder="Alice" value={r.name} onChange={e=>updateR(i,'name',e.target.value)}/>
            <input className="fi" style={{flex:2}} placeholder="0x..." value={r.address} onChange={e=>updateR(i,'address',e.target.value)}/>
            <input className="fi" style={{flex:1}} type="number" placeholder="500" value={r.amount} onChange={e=>updateR(i,'amount',e.target.value)}/>
            <button className="btn btn-danger btn-sm" onClick={()=>removeR(i)} style={{padding:'6px 8px'}}>✕</button>
          </div>
        ))}

        <button className="btn btn-sm" style={{marginTop:8}} onClick={addR} onMouseEnter={()=>SFX.hover()}>+ ADD RECIPIENT</button>

        <div className="payroll-total">
          TOTAL PER EXECUTION: <span style={{color:'var(--acid)'}}>{total} {token}</span> to {recipients.filter(r=>r.address||r.name).length} wallets
        </div>

        <div className="ma">
          <motion.button className="btn" onClick={onCancel} whileHover={{scale:1.04}} whileTap={{scale:0.96}}>CANCEL</motion.button>
          <motion.button className="btn btn-acid" onClick={()=>onSave(recipients.filter(r=>r.amount),token,interval)}
            whileHover={{scale:1.04}} whileTap={{scale:0.96}}>&gt; CREATE SPLIT</motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ---- DASHBOARD ----
function Dashboard({ rules, log, queue, agentOn, setAgentOn, simulate, activeCount, queueDepth, setNav }) {
  return (
    <>
      <div className="ph">
        <div><div className="pt">DASHBOARD</div><div className="ps">ARB SEPOLIA // LIVE</div></div>
        <motion.button className="btn" onClick={simulate} whileHover={{scale:1.04}} whileTap={{scale:0.96}} onMouseEnter={()=>SFX.hover()}>&gt; SIMULATE</motion.button>
      </div>
      <motion.div className="stats" variants={stagger} initial="hidden" animate="visible">
        {[{label:'BALANCE',value:'4,820',sub:'USDC',accent:true},{label:'RULES',value:activeCount,sub:`OF ${rules.length}`},{label:'QUEUE',value:queueDepth,sub:'PENDING'},{label:'ROUTED',value:'2,000',sub:'USDC/MO'}].map(c=>(
          <motion.div key={c.label} className="sc" variants={fadeUp}><div className="sl">{c.label}</div><div className={`sv ${c.accent?'accent':''}`}>{c.value}</div><div className="ss">{c.sub}</div></motion.div>
        ))}
      </motion.div>
      <motion.div className="status-bar-app" variants={fadeUp} initial="hidden" animate="visible">
        <div className="sb-left">
          <div className="w-dot" style={agentOn?{}:{background:'var(--red)'}}/>
          <div><div className="sb-label">AGENT {agentOn?'RUNNING':'PAUSED'}</div><div className="sb-sub">{agentOn?'SEQUENCER ACTIVE // AI RULES OPTIMIZED':'ALL EXECUTION SUSPENDED'}</div></div>
        </div>
        <div className="sb-right">
          <span className="sb-status" style={{color:agentOn?'var(--acid)':'var(--red)'}}>{agentOn?'ONLINE':'OFFLINE'}</span>
          <motion.div className={`tog ${agentOn?'on':''}`} onClick={()=>setAgentOn(v=>!v)} whileHover={{scale:1.1}} whileTap={{scale:0.9}}><div className="tthumb"/></motion.div>
        </div>
      </motion.div>

      {/* AI Suggester CTA */}
      <motion.div className="ai-cta" variants={fadeUp} initial="hidden" animate="visible" onClick={()=>setNav('ai')} whileHover={{scale:1.01}} style={{cursor:'pointer'}}>
        <div className="ai-cta-icon">AI</div>
        <div>
          <div className="ai-cta-title">AI RULE SUGGESTER</div>
          <div className="ai-cta-sub">Describe your business. Claude generates optimal payment automation rules.</div>
        </div>
        <div className="ai-cta-arrow">&gt;</div>
      </motion.div>

      <div className="two-col">
        <div>
          <div className="sh"><div className="st">// RECENT ACTIVITY</div></div>
          <motion.div className="log-list" variants={stagger} initial="hidden" animate="visible">
            {log.slice(0,4).map(e=>(<motion.div key={e.id} variants={slideR}><LogItem entry={e}/></motion.div>))}
          </motion.div>
        </div>
        <div>
          <div className="sh"><div className="st">// QUEUE</div></div>
          <motion.div className="q-mini" variants={stagger} initial="hidden" animate="visible">
            {queue.slice(0,4).map(j=>(<motion.div key={j.id} variants={slideR}><QueueMini job={j}/></motion.div>))}
            {queue.length===0&&<div className="empty">QUEUE EMPTY</div>}
          </motion.div>
        </div>
      </div>
    </>
  )
}

function Sequencer({ queue, simulate, cancelJob, boostJob }) {
  const pO={CRITICAL:2,HIGH:1,NORMAL:0}; const pC={CRITICAL:'var(--red)',HIGH:'var(--amber)',NORMAL:'var(--muted2)'}; const sC={QUEUED:'var(--teal)',EXECUTING:'var(--acid)',COMPLETED:'var(--muted2)',FAILED:'var(--red)',CANCELLED:'var(--muted2)'}
  const queued=queue.filter(j=>j.status==='QUEUED'||j.status==='EXECUTING'); const done=queue.filter(j=>['COMPLETED','FAILED','CANCELLED'].includes(j.status))
  return (
    <>
      <div className="ph"><div><div className="pt">SEQUENCER</div><div className="ps">{queued.length} PENDING</div></div><motion.button className="btn" onClick={simulate} whileHover={{scale:1.04}} whileTap={{scale:0.96}} onMouseEnter={()=>SFX.hover()}>&gt; ENQUEUE</motion.button></div>
      <motion.div className="stats" style={{gridTemplateColumns:'repeat(3,1fr)'}} variants={stagger} initial="hidden" animate="visible">
        {[{label:'PENDING',value:queued.length},{label:'DONE',value:queue.filter(j=>j.status==='COMPLETED').length,accent:true},{label:'FAILED',value:queue.filter(j=>j.status==='FAILED').length}].map(c=>(<motion.div key={c.label} className="sc" variants={fadeUp}><div className="sl">{c.label}</div><div className={`sv ${c.accent?'accent':''}`}>{c.value}</div></motion.div>))}
      </motion.div>
      <div className="sh" style={{marginTop:8}}><div className="st">// PENDING</div></div>
      <motion.div className="q-list" style={{marginBottom:16}} variants={stagger} initial="hidden" animate="visible">
        {queued.length===0&&<div className="empty">&gt; QUEUE EMPTY.</div>}
        {[...queued].sort((a,b)=>(pO[b.priority]||0)-(pO[a.priority]||0)).map(j=>(
          <motion.div className="qc" key={j.id} style={{borderLeftColor:pC[j.priority]||'#2a2820'}} variants={slideR}>
            <div><div className="qc-top"><span className="qc-name">&gt; {j.rule}</span><span className="badge" style={{color:pC[j.priority],borderColor:pC[j.priority]}}>{j.priority}</span><span className="badge" style={{color:sC[j.status],borderColor:sC[j.status]}}>{j.status==='EXECUTING'&&<><span className="exec-block"/><span className="exec-block"/><span className="exec-block"/><span className="exec-block-e"/><span className="exec-block-e"/>&nbsp;</>}{j.status}</span></div><div className="qc-sub">JOB #{j.id} // RULE {j.ruleId} // {j.attempts}/{j.maxRetries} // {j.createdAt}</div></div>
            <div className="ra">{j.priority!=='CRITICAL'&&<motion.button className="btn btn-sm" onClick={()=>boostJob(j.id)} style={{color:'var(--amber)',borderColor:'var(--amber)'}} whileHover={{scale:1.05}} whileTap={{scale:0.95}}>&gt; BOOST</motion.button>}<motion.button className="btn btn-danger btn-sm" onClick={()=>cancelJob(j.id)} whileHover={{scale:1.05}} whileTap={{scale:0.95}}>CANCEL</motion.button></div>
          </motion.div>
        ))}
      </motion.div>
      {done.length>0&&<><div className="sh"><div className="st">// COMPLETED</div></div><div className="q-list">{done.map(j=>(<div className="qc" key={j.id} style={{borderLeftColor:sC[j.status],opacity:.5}}><div><div className="qc-top"><span className="qc-name">&gt; {j.rule}</span><span className="badge" style={{color:sC[j.status],borderColor:sC[j.status]}}>{j.status}</span></div><div className="qc-sub">JOB #{j.id} // {j.createdAt}</div></div></div>))}</div></>}
    </>
  )
}

function QueueMini({ job }) {
  const sC={QUEUED:'var(--teal)',EXECUTING:'var(--acid)',COMPLETED:'var(--muted2)',FAILED:'var(--red)',CANCELLED:'var(--muted2)'}; const pC={CRITICAL:'var(--red)',HIGH:'var(--amber)',NORMAL:'var(--muted2)'}
  return <div className="qm"><span className="qm-chev">&gt;</span><span className="qm-rule">{job.rule}</span><span className="qm-status" style={{color:sC[job.status]}}>{job.status}</span><span className="qm-pri" style={{color:pC[job.priority]}}>{job.priority}</span></div>
}

function Rules({ rules, showAdd, setShowAdd, showPayroll, setShowPayroll, form, setForm, addRule, addPayrollSplit, toggleRule, deleteRule }) {
  return (
    <>
      <div className="ph">
        <div><div className="pt">RULES</div><div className="ps">{rules.filter(r=>r.active).length} ACTIVE // {rules.filter(r=>!r.active).length} PAUSED</div></div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <motion.button className="btn" onClick={()=>setShowPayroll(true)} whileHover={{scale:1.04}} whileTap={{scale:0.96}} onMouseEnter={()=>SFX.hover()} style={{color:'var(--teal)',borderColor:'var(--teal)'}}>PAYROLL SPLIT</motion.button>
          <motion.button className="btn btn-acid" onClick={()=>setShowAdd(true)} whileHover={{scale:1.04}} whileTap={{scale:0.96}} onMouseEnter={()=>SFX.hover()}>&gt; NEW RULE</motion.button>
        </div>
      </div>
      {showPayroll&&<PayrollSplitModal onSave={addPayrollSplit} onCancel={()=>setShowPayroll(false)}/>}
      {showAdd&&<AddRuleModal form={form} setForm={setForm} onSave={addRule} onCancel={()=>setShowAdd(false)}/>}
      <motion.div className="rule-list" variants={stagger} initial="hidden" animate="visible">
        {rules.map(r=>(
          <motion.div key={r.id} className={`rc ${r.active?'active-rule':'paused-rule'} ${r.type==='CONDITIONAL'?'cond-rule':''}`} variants={slideR}>
            <div>
              <div className="rn-row">
                <span className="rn">&gt; {r.name}</span>
                {r.isSplit&&<span className="badge" style={{color:'var(--teal)',borderColor:'var(--teal)'}}>SPLIT</span>}
                <span className={`badge ${r.type==='SCHEDULED'?'b-sched':'b-cond'}`}>{r.type}</span>
                <span className={`badge ${r.active?'b-active':'b-paused'}`}>{r.active?'ACTIVE':'PAUSED'}</span>
              </div>
              <div className="rd">{r.amount} {r.token} // {r.recipient}{r.interval?` // ${r.interval}`:''}{r.cond?` // ${r.cond}`:''}</div>
              {r.isSplit&&r.recipients&&<div className="rd" style={{color:'var(--teal)',marginTop:2}}>{r.recipients.length} WALLETS: {r.recipients.map(x=>x.name||'unnamed').join(', ')}</div>}
              <div className="rd" style={{color:'var(--muted2)'}}>LIMIT {r.limit} {r.token} // LAST: {r.last}</div>
            </div>
            <div className="ra">
              <motion.button className="btn btn-sm" onClick={()=>toggleRule(r.id)} whileHover={{scale:1.05}} whileTap={{scale:0.95}}>{r.active?'PAUSE':'RESUME'}</motion.button>
              <motion.button className="btn btn-danger btn-sm" onClick={()=>deleteRule(r.id)} whileHover={{scale:1.05}} whileTap={{scale:0.95}}>DEL</motion.button>
            </div>
          </motion.div>
        ))}
        {rules.length===0&&<div className="empty">&gt; NO RULES.</div>}
      </motion.div>
    </>
  )
}

function AddRuleModal({ form, setForm, onSave, onCancel }) {
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}))
  return (
    <motion.div className="modal-bg" variants={fadeIn} initial="hidden" animate="visible">
      <motion.div className="modal" variants={scaleIn} initial="hidden" animate="visible">
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
        <div className="ma"><motion.button className="btn" onClick={onCancel} whileHover={{scale:1.04}} whileTap={{scale:0.96}}>CANCEL</motion.button><motion.button className="btn btn-acid" onClick={()=>onSave(form)} whileHover={{scale:1.04}} whileTap={{scale:0.96}}>&gt; CREATE</motion.button></div>
      </motion.div>
    </motion.div>
  )
}

function Log({ log, simulate }) {
  return (
    <>
      <div className="ph"><div><div className="pt">ACTIVITY</div><div className="ps">{log.length} EXECUTIONS ON-CHAIN</div></div><motion.button className="btn" onClick={simulate} whileHover={{scale:1.04}} whileTap={{scale:0.96}} onMouseEnter={()=>SFX.hover()}>&gt; SIMULATE</motion.button></div>
      <motion.div className="log-list" variants={stagger} initial="hidden" animate="visible">
        {log.map(e=>(<motion.div key={e.id} variants={slideR}><LogItem entry={e}/></motion.div>))}
        {log.length===0&&<div className="empty">&gt; NO EXECUTIONS YET.</div>}
      </motion.div>
    </>
  )
}

function LogItem({ entry: e }) {
  return <div className="li"><span className="li-chev">&gt;</span><div className="lit"><div className="lit-rule">{e.rule}</div><div className="lit-to">{e.to}</div></div><span className="lam">{e.amount} {e.token}</span><span className="ltm">{e.time}</span></div>
}

function Settings({ agentOn, setAgentOn, address, agentAddr }) {
  return (
    <>
      <div className="ph"><div><div className="pt">SETTINGS</div><div className="ps">CONFIGURATION // SAFETY</div></div></div>
      <motion.div className="two" style={{marginBottom:14}} variants={stagger} initial="hidden" animate="visible">
        {[{label:'YOUR WALLET',val:truncAddr(address)||'0x71C7...976F',sub:'SIWE AUTHENTICATED',color:'teal'},{label:'YOUR AGENT',val:truncAddr(agentAddr)||'0x9aB4...1e77',sub:'ARB SEPOLIA 421614',color:'teal'},{label:'GASLESS MODE',val:'ZERODEV ACTIVE',sub:'NO ETH NEEDED FOR GAS',color:'acid'},{label:'AI SUGGESTER',val:'CLAUDE POWERED',sub:'RULE GENERATION AI',color:'acid'}].map(c=>(
          <motion.div key={c.label} className="sc" variants={fadeUp}><div className="sl">{c.label}</div><div className={`mono-val ${c.color||''}`}>{c.val}</div><div className="ss">{c.sub}</div></motion.div>
        ))}
        <motion.div className="sc full" style={{borderTop:`3px solid ${agentOn?'var(--acid)':'var(--red)'}`}} variants={fadeUp}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
            <div><div className="sl">EMERGENCY KILL SWITCH</div><div style={{fontSize:13,marginTop:5,color:'var(--muted2)',letterSpacing:'0.06em'}}>{agentOn?'AGENT LIVE. ALL RULES EXECUTING.':'AGENT PAUSED. NO RULES WILL EXECUTE.'}</div></div>
            <motion.button className={`btn ${agentOn?'btn-danger':'btn-acid'}`} onClick={()=>setAgentOn(v=>!v)} whileHover={{scale:1.04}} whileTap={{scale:0.96}} onMouseEnter={()=>SFX.hover()}>{agentOn?'> DEACTIVATE':'> ACTIVATE'}</motion.button>
          </div>
        </motion.div>
      </motion.div>
    </>
  )
}

function MuteBtn({ muted, toggle, inline }) {
  return (
    <motion.button className={`mute-btn ${inline?'mute-inline':''}`} onClick={toggle} whileHover={{scale:1.05}} whileTap={{scale:0.95}}>
      {muted?'[ MUTED ]':<span style={{display:'flex',alignItems:'center',gap:6}}><motion.span style={{display:'inline-block',width:6,height:6,borderRadius:'50%',background:'var(--acid)'}} animate={{opacity:[1,0.2,1]}} transition={{repeat:Infinity,duration:1.2}}/> AUDIO</span>}
    </motion.button>
  )
}
