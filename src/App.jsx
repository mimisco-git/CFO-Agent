import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import './App.css'
import { SFX } from './lib/audio.js'
import { suggestRules } from './lib/ai.js'
import Intro from './Intro.jsx'
import {
  hasWallet, connectWallet, signSiwe,
  checkHasAgent, getAgentAddress, deployAgent,
  getTotalAgents, truncAddr, onAccountChange, FACTORY_ADDR,
  getAvailableWallets, setActiveProvider,
} from './lib/chain.js'

const ARBISCAN = 'https://sepolia.arbiscan.io/tx/'

// ---- CHAIN CONFIG ----
const CHAINS = {
  arbitrum: {
    id: 421614,
    hex: '0x' + (421614).toString(16),
    name: 'ARBITRUM SEPOLIA',
    shortName: 'ARB SEPOLIA',
    rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorer: 'https://sepolia.arbiscan.io',
    txBase: 'https://sepolia.arbiscan.io/tx/',
    factory:   import.meta.env.VITE_FACTORY_ADDRESS   || '0xF1EE2CC9741547cAf04FE99ed2ad8Ff072AEe900',
    registry:  import.meta.env.VITE_REGISTRY_ADDRESS  || '0x5eadac819B2206B960a30978eFCEf3E1351C6b10',
    sequencer: import.meta.env.VITE_SEQUENCER_ADDRESS || '0xA6a5A3364c8A169c9F38768df67Ad89AA33f14e2',
    color: 'var(--acid)',
    icon: '🔷',
    tag: 'ARBITRUM',
  },
  robinhood: {
    id: 46630,
    hex: '0x' + (46630).toString(16),
    name: 'ROBINHOOD CHAIN',
    shortName: 'RH CHAIN',
    rpc: 'https://rpc.testnet.chain.robinhood.com',
    explorer: 'https://explorer.testnet.chain.robinhood.com',
    txBase: 'https://explorer.testnet.chain.robinhood.com/tx/',
    factory:   import.meta.env.VITE_RH_FACTORY_ADDRESS   || '0xcd75Ad7AC9C9325105f798c476E84176648F391A',
    registry:  import.meta.env.VITE_RH_REGISTRY_ADDRESS  || '0xbfce6B877Ebff977bB6e80B24FbBb7bC4eBcA4df',
    sequencer: import.meta.env.VITE_RH_SEQUENCER_ADDRESS || '0x6d5a4D246617d711595a1657c55B17B97e20bdda',
    color: '#47ffd4',
    icon: '🟢',
    tag: 'ROBINHOOD',
  },
}

const fadeUp  = { hidden:{opacity:0,y:16}, visible:{opacity:1,y:0,transition:{duration:0.4,ease:'easeOut'}}, exit:{opacity:0,y:-8,transition:{duration:0.2}} }
const fadeIn  = { hidden:{opacity:0}, visible:{opacity:1,transition:{duration:0.5}}, exit:{opacity:0,transition:{duration:0.25}} }
const stagger = { visible:{transition:{staggerChildren:0.07}} }
const slideR  = { hidden:{opacity:0,x:-20}, visible:{opacity:1,x:0,transition:{duration:0.35,ease:'easeOut'}} }
const scaleIn = { hidden:{opacity:0,scale:0.96}, visible:{opacity:1,scale:1,transition:{duration:0.35}}, exit:{opacity:0,scale:0.96} }

// ---- MOCK DATA ----
const INIT_RULES = [
  { id:0, name:'FRIDAY PAYROLL',   type:'SCHEDULED',   token:'USDC', recipient:'0x4f3a...9B12', amount:'500',  interval:'7 DAYS', limit:'600',  active:true,  last:'2D AGO', execCount:8 },
  { id:1, name:'YIELD SWEEP',      type:'CONDITIONAL', token:'USDC', recipient:'0x8c2d...4A90', amount:'1000', interval:'',       limit:'2000', active:true,  last:'5D AGO', execCount:3 },
  { id:2, name:'DAILY OPS BUDGET', type:'SCHEDULED',   token:'ETH',  recipient:'0x2e7f...B301', amount:'0.05', interval:'1 DAY',  limit:'0.1',  active:false, last:'15D AGO', execCount:12 },
]

const INIT_LOG = [
  { id:1, rule:'FRIDAY PAYROLL', token:'USDC', amount:'+500',  to:'0x4f3a...9B12', time:'2D AGO', txHash:'0x4f3a9b2c1e4d8f7a3b9c2e1d4f7a3b9c' },
  { id:2, rule:'YIELD SWEEP',    token:'USDC', amount:'+1000', to:'0x8c2d...4A90', time:'5D AGO', txHash:'0x8c2d4a907f3b1e9c4a2d8f7b3e1c9a4d' },
  { id:3, rule:'FRIDAY PAYROLL', token:'USDC', amount:'+500',  to:'0x4f3a...9B12', time:'9D AGO', txHash:'0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d' },
]

const INIT_QUEUE = [
  { id:0, rule:'FRIDAY PAYROLL', ruleId:0, priority:'NORMAL', status:'QUEUED',   attempts:0, maxRetries:3, createdAt:'2M AGO' },
  { id:1, rule:'YIELD SWEEP',    ruleId:1, priority:'HIGH',   status:'QUEUED',   attempts:0, maxRetries:3, createdAt:'5M AGO' },
]

const SPEND_DATA = [
  { day:'MON', usdc:500,  eth:0.05 },
  { day:'TUE', usdc:0,    eth:0.05 },
  { day:'WED', usdc:1000, eth:0.05 },
  { day:'THU', usdc:0,    eth:0.05 },
  { day:'FRI', usdc:500,  eth:0.05 },
  { day:'SAT', usdc:0,    eth:0    },
  { day:'SUN', usdc:0,    eth:0    },
]

const MONTHLY_DATA = [
  { month:'JAN', routed:3200 }, { month:'FEB', routed:4100 }, { month:'MAR', routed:3800 },
  { month:'APR', routed:5200 }, { month:'MAY', routed:4820 }, { month:'JUN', routed:6100 },
]

const RULE_TEMPLATES = [
  {
    id:'t1', name:'FREELANCER PAYROLL', icon:'👥',
    desc:'Pay a single contractor a fixed amount every week automatically.',
    pitch:'Stop manually sending payments every Friday. Your agent handles it at midnight.',
    rule:{ name:'FREELANCER PAYROLL', type:'SCHEDULED', token:'USDC', recipient:'', amount:'500', limit:'600', interval:'604800', condVal:'' }
  },
  {
    id:'t2', name:'YIELD SWEEP', icon:'📈',
    desc:'Auto-sweep profits to your treasury when DeFi balance exceeds threshold.',
    pitch:'Never leave yield sitting idle. Your agent sweeps it the moment it hits your target.',
    rule:{ name:'YIELD SWEEP', type:'CONDITIONAL', token:'USDC', recipient:'', amount:'1000', limit:'2000', interval:'0', condVal:'5000' }
  },
  {
    id:'t3', name:'DAO CONTRIBUTOR PAY', icon:'🏛️',
    desc:'Monthly payment to DAO contributors from treasury.',
    pitch:'Automate DAO payroll. Contributors get paid on time, every month, on-chain.',
    rule:{ name:'DAO CONTRIBUTOR', type:'SCHEDULED', token:'USDC', recipient:'', amount:'800', limit:'1000', interval:'2592000', condVal:'' }
  },
  {
    id:'t4', name:'VENDOR INVOICE', icon:'🧾',
    desc:'Monthly vendor payment with spend cap protection.',
    pitch:'Pay vendors automatically. Spend caps mean you can never overpay by accident.',
    rule:{ name:'VENDOR INVOICE', type:'SCHEDULED', token:'USDC', recipient:'', amount:'2000', limit:'2500', interval:'2592000', condVal:'' }
  },
  {
    id:'t5', name:'DAILY OPS BUDGET', icon:'⚙️',
    desc:'Daily ETH allocation for operational gas and on-chain transactions.',
    pitch:'Never run out of gas mid-operation. Daily budget keeps your on-chain ops funded.',
    rule:{ name:'DAILY OPS BUDGET', type:'SCHEDULED', token:'ETH', recipient:'', amount:'0.05', limit:'0.1', interval:'86400', condVal:'' }
  },
  {
    id:'t6', name:'TREASURY REBALANCE', icon:'⚖️',
    desc:'Move excess USDC to yield protocol when balance is above target.',
    pitch:'Idle treasury is wasted treasury. Auto-rebalance keeps your capital working.',
    rule:{ name:'TREASURY REBALANCE', type:'CONDITIONAL', token:'USDC', recipient:'', amount:'3000', limit:'5000', interval:'0', condVal:'10000' }
  },
]

const BLANK = { name:'', type:'SCHEDULED', token:'USDC', recipient:'', amount:'', limit:'', interval:'604800', condVal:'' }

function fmtInt(s) {
  const n=Number(s)
  if(n>=2592000) return '1 MONTH'; if(n>=604800) return '1 WEEK'
  if(n>=86400)   return '1 DAY';   return '1 HOUR'
}

// Daily cap: 2000 USDC
const DAILY_CAP = 2000

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

// ---- TOOLTIP ----
const CRT_TOOLTIP = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null
  return (
    <div style={{background:'#0a0a08',border:'1px solid #2a2820',padding:'8px 12px',fontFamily:"'VT323',monospace",fontSize:15,letterSpacing:'0.08em'}}>
      <div style={{color:'#5a5848',marginBottom:4}}>{label}</div>
      {payload.map((p,i)=>(
        <div key={i} style={{color:p.color||'var(--acid)'}}>{p.name?.toUpperCase()}: {p.value}</div>
      ))}
    </div>
  )
}

export default function App() {
  const [phase,setPhase]           = useState('intro')
  const [muted,setMuted]           = useState(false)
  const [callsign,setCallsign]     = useState('')
  const [address,setAddress]       = useState('')
  const [agentAddr,setAgentAddr]   = useState('')
  const [isNew,setIsNew]           = useState(false)
  const [authStep,setAuthStep]     = useState('')
  const [authMsg,setAuthMsg]       = useState('')
  const [authErr,setAuthErr]       = useState('')
  const [totalUsers,setTotalUsers] = useState(0n)
  const [nav,setNav]               = useState('dashboard')
  const [agentOn,setAgentOn]       = useState(true)
  const [rules,setRules]           = useState(INIT_RULES)
  const [log,setLog]               = useState(INIT_LOG)
  const [queue,setQueue]           = useState(INIT_QUEUE)
  const [showAdd,setShowAdd]       = useState(false)
  const [showPayroll,setShowPayroll] = useState(false)
  const [form,setForm]             = useState(BLANK)
  const [appStat,setAppStat]       = useState('ONLINE')
  const [sideOpen,setSideOpen]     = useState(false)
  const [dailySpent,setDailySpent] = useState(1000)
  const [activeChain,setActiveChain] = useState('arbitrum')

  const chain = CHAINS[activeChain]

  async function switchChain(chainKey) {
    const c = CHAINS[chainKey]
    setActiveChain(chainKey)
    SFX.key()
    // Switch MetaMask network
    try {
      await window.ethereum?.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: c.hex }],
      })
    } catch(e) {
      if(e.code === 4902) {
        await window.ethereum?.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: c.hex,
            chainName: c.name,
            nativeCurrency: { name:'ETH', symbol:'ETH', decimals:18 },
            rpcUrls: [c.rpc],
            blockExplorerUrls: [c.explorer],
          }],
        })
      }
    }
  } // mock: 1000 of 2000 cap used

  const logId = useRef(10)
  const jobId = useRef(10)
  const ping  = usePing()
  const time  = useTime()

  function toggleMute() { SFX.init(); setMuted(SFX.toggle()) }

  function logout() {
    SFX.err()
    setPhase('intro')
    setAddress(''); setAgentAddr(''); setCallsign('')
    setIsNew(false); setAuthStep(''); setAuthMsg(''); setAuthErr('')
    setNav('dashboard'); setRules(INIT_RULES); setLog(INIT_LOG)
    setQueue(INIT_QUEUE); setAppStat('ONLINE'); setSideOpen(false)
    SFX.stopDrone()
  }

  async function doAuth(selectedWallet) {
    setAuthErr(''); setPhase('auth')
    try {
      setAuthStep('connecting'); setAuthMsg('CONNECTING WALLET...')
      if(!hasWallet()) throw {code:'NO_WALLET',message:'NO WALLET DETECTED. INSTALL METAMASK.'}
      if(selectedWallet?.provider) setActiveProvider(selectedWallet.provider)
      const addr = await connectWallet(selectedWallet?.provider)
      setAddress(addr)
      setAuthStep('signing'); setAuthMsg('SIGN MESSAGE TO AUTHENTICATE...')
      await signSiwe(addr)
      setAuthStep('checking'); setAuthMsg('CHECKING ON-CHAIN AGENT...')
      const [has,total] = await Promise.all([checkHasAgent(addr),getTotalAgents()])
      setTotalUsers(total)
      let agentAddress
      if(has) { agentAddress = await getAgentAddress(addr); setAgentAddr(agentAddress||'') }
      else {
        setIsNew(true)
        setAuthStep('deploying'); setAuthMsg('DEPLOYING YOUR CFO AGENT ON ARBITRUM...')
        SFX.deploy()
        try {
          if(FACTORY_ADDR && FACTORY_ADDR!=='') agentAddress = await deployAgent()
          else throw new Error('no factory')
        } catch(de) { agentAddress = addr.slice(0,22)+'1e77' }
        setAgentAddr(agentAddress||'')
      }
      setCallsign(selectedWallet?.name?.toUpperCase().slice(0,10)||'AGENT')
      SFX.done(); setPhase('app')
    } catch(err) {
      SFX.err()
      setAuthErr((err.message||'UNKNOWN ERROR').toUpperCase().slice(0,80))
      setPhase('auth_err')
    }
  }

  function simExec() {
    const active = rules.filter(r=>r.active)
    if(!active.length) return
    const rule = active[Math.floor(Math.random()*active.length)]
    const amount = Number(rule.amount)

    // Check spend limit
    if(dailySpent + amount > DAILY_CAP) {
      const nj = { id:jobId.current++, rule:rule.name, ruleId:rule.id, priority:'NORMAL', status:'BLOCKED', attempts:0, maxRetries:3, createdAt:'JUST NOW', blockReason:'DAILY CAP EXCEEDED' }
      setQueue(q=>[nj,...q]); SFX.err()
      return
    }

    const nj = { id:jobId.current++, rule:rule.name, ruleId:rule.id, priority:'NORMAL', status:'QUEUED', attempts:0, maxRetries:3, createdAt:'JUST NOW' }
    setQueue(q=>[nj,...q]); setAppStat('EXECUTING'); SFX.exec()
    setTimeout(()=>{
      setQueue(q=>q.map(j=>j.id===nj.id?{...j,status:'EXECUTING'}:j))
      setTimeout(()=>{
        const fakeTx = '0x'+Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b=>b.toString(16).padStart(2,'0')).join('')
        setQueue(q=>q.map(j=>j.id===nj.id?{...j,status:'COMPLETED'}:j))
        setLog(l=>[{id:logId.current++,rule:rule.name,token:rule.token,amount:'+'+rule.amount,to:rule.recipient,time:'JUST NOW',txHash:fakeTx},...l])
        setRules(r=>r.map(rl=>rl.id===rule.id?{...rl,last:'JUST NOW',execCount:(rl.execCount||0)+1}:rl))
        setDailySpent(s=>s+amount)
        setAppStat('ONLINE'); SFX.done()
      },1800)
    },1000)
  }

  function addRule(r) {
    setRules(prev=>[...prev,{id:Date.now(),name:(r.name||'UNNAMED').toUpperCase(),type:r.type,token:r.token,recipient:r.recipient||'0x0000...0000',amount:r.amount,interval:r.type==='SCHEDULED'?fmtInt(r.interval):'',limit:r.limit,cond:r.type==='CONDITIONAL'?`BALANCE > ${r.condVal} ${r.token}`:'',active:true,last:'NEVER',execCount:0}])
    setShowAdd(false); setForm(BLANK)
  }

  function addPayrollSplit(recipients, token, interval) {
    const total = recipients.reduce((s,r)=>s+Number(r.amount||0),0)
    setRules(prev=>[...prev,{id:Date.now(),name:'PAYROLL SPLIT',type:'SCHEDULED',token,recipient:`${recipients.length} WALLETS`,amount:String(total),interval:fmtInt(interval),limit:String(Math.ceil(total*1.1)),active:true,last:'NEVER',isSplit:true,recipients,execCount:0}])
    setShowPayroll(false)
    recipients.forEach((r,i)=>setTimeout(()=>setLog(l=>[{id:logId.current++,rule:'PAYROLL SPLIT',token,amount:'+'+r.amount,to:r.address||'0xABCD...'+i,time:'JUST NOW',txHash:'0x'+Math.random().toString(16).slice(2,34)},...l]),i*300))
    SFX.deploy()
  }

  // Savings calculation
  const totalExecs  = log.length
  const hoursSaved  = (totalExecs * 0.5).toFixed(1)
  const gasSaved    = (totalExecs * 0.08).toFixed(2)
  const usdcRouted  = log.filter(l=>l.token==='USDC').reduce((s,l)=>s+Number(l.amount.replace('+','')),0)
  const capPct      = Math.round((dailySpent/DAILY_CAP)*100)

  const activeCount = rules.filter(r=>r.active).length
  const queueDepth  = queue.filter(j=>['QUEUED','EXECUTING'].includes(j.status)).length
  const blockedJobs = queue.filter(j=>j.status==='BLOCKED').length
  const statColor   = {ONLINE:'var(--acid)',EXECUTING:'var(--teal)'}[appStat]||'var(--acid)'

  if(phase==='intro') return <Intro wallets={getAvailableWallets()} onComplete={doAuth}/>

  if(phase==='auth') return (
    <div className="fullscreen crt" style={{flexDirection:'column',gap:20}}>
      <div className="scanline"/>
      <Logo size={48}/>
      <div style={{fontFamily:"'VT323',monospace",fontSize:'clamp(18px,5vw,28px)',letterSpacing:'0.15em',color:'#d4d0b8'}}>CFO AGENT</div>
      <div style={{width:'clamp(200px,50vw,320px)',height:2,background:'#1a1a16',overflow:'hidden'}}>
        <motion.div style={{height:'100%',background:'#c8ff47'}}
          initial={{width:'0%'}}
          animate={{width:authStep==='connecting'?'25%':authStep==='signing'?'50%':authStep==='checking'?'75%':'95%'}}
          transition={{duration:0.6,ease:'easeInOut'}}/>
      </div>
      <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(12px,3vw,15px)',letterSpacing:'0.1em',color:'#5a5848'}}>&gt; {authMsg}</div>
      {authStep==='deploying'&&<div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(11px,2.5vw,13px)',letterSpacing:'0.08em',color:'#47ffd4',maxWidth:340,textAlign:'center'}}>&gt; FIRST TIME USER. DEPLOYING YOUR PERSONAL CFO AGENT ON-CHAIN...</div>}
    </div>
  )

  if(phase==='auth_err') return (
    <div className="fullscreen crt" style={{flexDirection:'column',gap:16}}>
      <div className="scanline"/>
      <div style={{fontFamily:"'VT323',monospace",fontSize:'clamp(20px,5vw,28px)',letterSpacing:'0.12em',color:'#ff5c5c'}}>AUTH FAILED</div>
      <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(11px,2.5vw,14px)',letterSpacing:'0.08em',color:'#ff5c5c',maxWidth:400,textAlign:'center',padding:'0 20px'}}>&gt; {authErr}</div>
      <motion.button style={{fontFamily:"'VT323',monospace",fontSize:'clamp(16px,4vw,20px)',letterSpacing:'0.15em',background:'#c8ff47',color:'#000',border:'none',padding:'12px 32px',cursor:'pointer',marginTop:8}}
        whileHover={{scale:1.04}} whileTap={{scale:0.96}} onClick={()=>setPhase('intro')}>&gt; TRY AGAIN</motion.button>
    </div>
  )

  return (
    <motion.div className="app-wrap crt" variants={fadeIn} initial="hidden" animate="visible">
      <div className="scanline"/>
      {sideOpen&&<div className="side-overlay" onClick={()=>setSideOpen(false)}/>}

      <aside className={`side ${sideOpen?'side-open':''}`}>
        <div className="side-top">
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <Logo size={24}/>
            <div><div className="logo-text">CFO AGENT</div><div className="logo-sub">CALLSIGN: {callsign||'AGENT'}</div></div>
          </div>
          <button className="side-close" onClick={()=>setSideOpen(false)}>✕</button>
        </div>
        <nav className="side-nav">
          <div className="nav-label">// OVERVIEW</div>
          {[{id:'dashboard',label:'DASHBOARD'},{id:'analytics',label:'ANALYTICS'},{id:'log',label:'ACTIVITY'}].map(item=>(
            <button key={item.id} className={`nav ${nav===item.id?'on':''}`}
              onClick={()=>{setNav(item.id);setSideOpen(false);SFX.key()}}
              onMouseEnter={()=>SFX.hover()}>{item.label}</button>
          ))}
          <div className="nav-label">// AUTOMATION</div>
          <button className={`nav ${nav==='sequencer'?'on':''}`}
            onClick={()=>{setNav('sequencer');setSideOpen(false);SFX.key()}}
            onMouseEnter={()=>SFX.hover()}>
            SEQUENCER
            {queueDepth>0&&<span className="nav-badge">{queueDepth}</span>}
            {blockedJobs>0&&<span className="nav-badge" style={{background:'var(--red)',marginLeft:3}}>{blockedJobs}</span>}
          </button>
          <button className={`nav ${nav==='rules'?'on':''}`}
            onClick={()=>{setNav('rules');setSideOpen(false);SFX.key()}}
            onMouseEnter={()=>SFX.hover()}>RULES</button>
          <button className={`nav ${nav==='templates'?'on':''}`}
            onClick={()=>{setNav('templates');setSideOpen(false);SFX.key()}}
            onMouseEnter={()=>SFX.hover()}>
            <span>TEMPLATES</span><span className="ai-badge" style={{background:'var(--teal)',color:'#000'}}>6</span>
          </button>
          <button className={`nav ai-nav ${nav==='ai'?'on':''}`}
            onClick={()=>{setNav('ai');setSideOpen(false);SFX.key()}}
            onMouseEnter={()=>SFX.hover()}>
            <span>AI SUGGESTER</span><span className="ai-badge">AI</span>
          </button>
          <button className={`nav ${nav==='settings'?'on':''}`}
            onClick={()=>{setNav('settings');setSideOpen(false);SFX.key()}}
            onMouseEnter={()=>SFX.hover()}>SETTINGS</button>
        </nav>
        <div className="side-foot">
          <div className="wallet-label"><div className="w-dot"/>CONNECTED</div>
          <div className="wallet-addr">{truncAddr(address)||'0x71C7...976F'}</div>
          <div className="agent-addr">AGENT: {truncAddr(agentAddr)||'0x9aB4...1e77'}</div>
          {isNew&&<div className="new-badge">NEW AGENT DEPLOYED</div>}
          <div className="agent-addr" style={{marginTop:4}}>TOTAL USERS: {totalUsers.toString()}</div>
          <div style={{marginTop:8,padding:'6px 0',borderTop:'1px solid #1a1a16'}}>
            <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,letterSpacing:'0.1em',color:'var(--muted2)',marginBottom:4}}>ACTIVE CHAIN</div>
            <div style={{display:'flex',gap:4}}>
              {Object.entries(CHAINS).map(([key,c])=>(
                <button key={key}
                  onClick={()=>switchChain(key)}
                  style={{flex:1,padding:'4px 0',fontFamily:"'VT323',monospace",fontSize:13,letterSpacing:'0.08em',
                    background:activeChain===key?c.color:'transparent',
                    color:activeChain===key?'#000':c.color,
                    border:`1px solid ${c.color}`,cursor:'pointer',transition:'all .15s'}}>
                  {c.tag}
                </button>
              ))}
            </div>
            <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,letterSpacing:'0.06em',color:'var(--muted2)',marginTop:6,wordBreak:'break-all'}}>
              FACTORY: {chain.factory.slice(0,12)}...
            </div>
          </div>
          <motion.button onClick={logout} onMouseEnter={()=>SFX.hover()}
            whileHover={{borderColor:'var(--red)',color:'var(--red)'}} whileTap={{scale:0.97}}
            style={{marginTop:10,width:'100%',background:'none',border:'1px solid #2a2820',color:'var(--muted2)',fontFamily:"'VT323',monospace",fontSize:15,letterSpacing:'0.12em',padding:'6px 0',cursor:'pointer',transition:'border-color .15s,color .15s'}}>
            &gt; DISCONNECT
          </motion.button>
        </div>
      </aside>

      <div className="main">
        <div className="main-bar">
          <div className="main-bar-left">
            <button className="burger" onClick={()=>setSideOpen(true)}>☰</button>
            <span style={{display:'flex',alignItems:'center',gap:8}}>
              <motion.span style={{width:6,height:6,borderRadius:'50%',background:statColor,display:'inline-block'}}
                animate={{opacity:[1,0.3,1]}} transition={{repeat:Infinity,duration:1.5}}/>
              <span className="stat-label">STATUS : <span style={{color:statColor}}>{appStat}</span></span>
            </span>
            {blockedJobs>0&&<span style={{color:'var(--red)',fontFamily:"'VT323',monospace",fontSize:14,letterSpacing:'0.1em',animation:'pulse 1s infinite'}}>{blockedJobs} BLOCKED</span>}
            <span className="ping-label">PING : {String(ping).padStart(3,'0')} MS</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <span className="time-label">{time}</span>
            {/* Chain selector */}
            <div className="chain-selector">
              {Object.entries(CHAINS).map(([key,c])=>(
                <motion.button key={key}
                  className={`chain-btn ${activeChain===key?'chain-btn-active':''}`}
                  style={activeChain===key?{borderColor:c.color,color:c.color}:{}}
                  onClick={()=>switchChain(key)}
                  whileHover={{scale:1.04}} whileTap={{scale:0.96}}
                  onMouseEnter={()=>SFX.hover()}>
                  {c.icon} {c.tag}
                </motion.button>
              ))}
            </div>
            <MuteBtn muted={muted} toggle={toggleMute} inline/>
            <motion.button className="disconnect-btn" onClick={logout}
              whileHover={{scale:1.05,borderColor:'var(--red)',color:'var(--red)'}} whileTap={{scale:0.95}}>
              DISCONNECT
            </motion.button>
          </div>
        </div>

        <div className="main-content">
          <AnimatePresence mode="wait">
            {nav==='dashboard'&&<motion.div key="db" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
              <Dashboard rules={rules} log={log} queue={queue} agentOn={agentOn} setAgentOn={setAgentOn}
                simulate={simExec} activeCount={activeCount} queueDepth={queueDepth}
                setNav={setNav} hoursSaved={hoursSaved} gasSaved={gasSaved}
                usdcRouted={usdcRouted} capPct={capPct} dailySpent={dailySpent} blockedJobs={blockedJobs}
                chain={chain}/>
            </motion.div>}
            {nav==='analytics'&&<motion.div key="an" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
              <Analytics rules={rules} log={log} dailySpent={dailySpent} hoursSaved={hoursSaved} gasSaved={gasSaved} usdcRouted={usdcRouted} capPct={capPct}/>
            </motion.div>}
            {nav==='sequencer'&&<motion.div key="sq" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
              <Sequencer queue={queue} simulate={simExec}
                cancelJob={id=>setQueue(q=>q.map(j=>j.id===id?{...j,status:'CANCELLED'}:j))}
                boostJob={id=>setQueue(q=>q.map(j=>j.id===id?{...j,priority:'CRITICAL'}:j))}/>
            </motion.div>}
            {nav==='rules'&&<motion.div key="rl" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
              <Rules rules={rules} showAdd={showAdd} setShowAdd={setShowAdd}
                showPayroll={showPayroll} setShowPayroll={setShowPayroll}
                form={form} setForm={setForm} addRule={addRule} addPayrollSplit={addPayrollSplit}
                toggleRule={id=>setRules(r=>r.map(rl=>rl.id===id?{...rl,active:!rl.active}:rl))}
                deleteRule={id=>setRules(r=>r.filter(rl=>rl.id!==id))}/>
            </motion.div>}
            {nav==='templates'&&<motion.div key="tp" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
              <Templates addRule={addRule} setNav={setNav}/>
            </motion.div>}
            {nav==='ai'&&<motion.div key="ai" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
              <AIRuleSuggester rules={rules} addRule={addRule}/>
            </motion.div>}
            {nav==='log'&&<motion.div key="lg" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
              <Log log={log} simulate={simExec} txBase={chain.txBase}/>
            </motion.div>}
            {nav==='settings'&&<motion.div key="st" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
              <Settings agentOn={agentOn} setAgentOn={setAgentOn} address={address} agentAddr={agentAddr} chain={chain} chains={CHAINS} activeChain={activeChain} switchChain={switchChain}/>
            </motion.div>}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// ---- LOGO ----
function Logo({ size=40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect x="1" y="1" width="38" height="38" rx="4" stroke="var(--acid)" strokeWidth="1.5"/>
      <rect x="7" y="7" width="26" height="26" rx="2" stroke="var(--acid)" strokeWidth="0.8" strokeOpacity="0.4"/>
      <path d="M26 14 H18 Q14 14 14 18 V22 Q14 26 18 26 H26" stroke="var(--acid)" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
      <line x1="20" y1="11" x2="20" y2="29" stroke="var(--acid)" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.7"/>
      <rect x="2" y="2" width="4" height="4" fill="var(--acid)" opacity="0.6"/>
      <rect x="34" y="34" width="4" height="4" fill="var(--acid)" opacity="0.6"/>
    </svg>
  )
}

function MuteBtn({ muted, toggle, inline }) {
  return (
    <motion.button className={`mute-btn ${inline?'mute-inline':''}`} onClick={toggle}
      whileHover={{scale:1.05}} whileTap={{scale:0.95}}>
      {muted?'[ MUTED ]':(
        <span style={{display:'flex',alignItems:'center',gap:6}}>
          <motion.span style={{display:'inline-block',width:6,height:6,borderRadius:'50%',background:'var(--acid)'}}
            animate={{opacity:[1,0.2,1]}} transition={{repeat:Infinity,duration:1.2}}/>
          AUDIO
        </span>
      )}
    </motion.button>
  )
}

// ---- DASHBOARD ----
function Dashboard({ rules,log,queue,agentOn,setAgentOn,simulate,activeCount,queueDepth,setNav,hoursSaved,gasSaved,usdcRouted,capPct,dailySpent,blockedJobs,chain }) {
  return (
    <>
      <div className="ph">
        <div><div className="pt">DASHBOARD</div><div className="ps">{chain?.shortName||'ARB SEPOLIA'} // LIVE // YOUR ON-CHAIN CFO</div></div>
        <motion.button className="btn" onClick={simulate} whileHover={{scale:1.04}} whileTap={{scale:0.96}} onMouseEnter={()=>SFX.hover()}>&gt; SIMULATE</motion.button>
      </div>

      {/* PITCH BANNER */}
      <motion.div className="pitch-banner" variants={fadeUp} initial="hidden" animate="visible">
        <div className="pitch-icon">⚡</div>
        <div className="pitch-text">
          <div className="pitch-title">YOUR AUTONOMOUS TREASURY AGENT IS LIVE</div>
          <div className="pitch-sub">CFO Agent executes your payment rules 24/7 on Arbitrum. No manual transactions. No missed payments. No human error. This is your programmable CFO.</div>
        </div>
      </motion.div>

      <motion.div className="stats" variants={stagger} initial="hidden" animate="visible">
        {[
          {label:'TREASURY BALANCE',value:'4,820',sub:'USDC AVAILABLE',accent:true},
          {label:'ACTIVE RULES',value:activeCount,sub:`OF ${rules.length} CONFIGURED`},
          {label:'QUEUE DEPTH',value:queueDepth,sub:`${blockedJobs} BLOCKED BY CAP`},
          {label:'DAILY CAP',value:`${capPct}%`,sub:`${dailySpent} OF 2,000 USDC USED`},
        ].map(c=>(
          <motion.div key={c.label} className="sc" variants={fadeUp}>
            <div className="sl">{c.label}</div>
            <div className={`sv ${c.accent?'accent':''}`}>{c.value}</div>
            <div className="ss">{c.sub}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* SAVINGS STRIP */}
      <motion.div className="savings-strip" variants={fadeUp} initial="hidden" animate="visible">
        <div className="saving-item"><span className="saving-val">{hoursSaved}h</span><span className="saving-lbl">TIME SAVED</span></div>
        <div className="saving-div"/>
        <div className="saving-item"><span className="saving-val">${gasSaved}</span><span className="saving-lbl">GAS SAVED</span></div>
        <div className="saving-div"/>
        <div className="saving-item"><span className="saving-val">{usdcRouted}</span><span className="saving-lbl">USDC ROUTED</span></div>
        <div className="saving-div"/>
        <div className="saving-item"><span className="saving-val">{log.length}</span><span className="saving-lbl">EXECUTIONS</span></div>
      </motion.div>

      {/* CAP ALERT */}
      {capPct >= 80 && (
        <motion.div className="cap-alert" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
          <span style={{color:'var(--amber)'}}>⚠ DAILY CAP {capPct}% USED.</span> Rules exceeding the cap will be BLOCKED until midnight reset.
        </motion.div>
      )}

      <motion.div className="status-bar-app" variants={fadeUp} initial="hidden" animate="visible">
        <div className="sb-left">
          <div className="w-dot" style={agentOn?{}:{background:'var(--red)'}}/>
          <div>
            <div className="sb-label">AGENT {agentOn?'RUNNING':'PAUSED'}</div>
            <div className="sb-sub">{agentOn?'EXECUTING YOUR RULES AUTONOMOUSLY // PRIORITY ORDER':'ALL EXECUTION SUSPENDED // NO TRANSACTIONS UNTIL REACTIVATED'}</div>
          </div>
        </div>
        <div className="sb-right">
          <span className="sb-status" style={{color:agentOn?'var(--acid)':'var(--red)'}}>{agentOn?'ONLINE':'OFFLINE'}</span>
          <motion.div className={`tog ${agentOn?'on':''}`} onClick={()=>setAgentOn(v=>!v)} whileHover={{scale:1.1}} whileTap={{scale:0.9}}><div className="tthumb"/></motion.div>
        </div>
      </motion.div>

      <motion.div className="ai-cta" variants={fadeUp} initial="hidden" animate="visible"
        onClick={()=>setNav('ai')} whileHover={{scale:1.01}} style={{cursor:'pointer'}}>
        <div className="ai-cta-icon">AI</div>
        <div>
          <div className="ai-cta-title">AI RULE SUGGESTER</div>
          <div className="ai-cta-sub">Describe your business in plain English. Claude generates optimal payment automation rules instantly.</div>
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
          <div className="sh"><div className="st">// EXECUTION QUEUE</div></div>
          <motion.div className="q-mini" variants={stagger} initial="hidden" animate="visible">
            {queue.slice(0,4).map(j=>(<motion.div key={j.id} variants={slideR}><QueueMini job={j}/></motion.div>))}
            {queue.length===0&&<div className="empty">QUEUE EMPTY</div>}
          </motion.div>
        </div>
      </div>
    </>
  )
}

// ---- ANALYTICS ----
function Analytics({ rules, log, dailySpent, hoursSaved, gasSaved, usdcRouted, capPct }) {
  const execByRule = rules.map(r=>({ name:r.name.slice(0,12), execs:r.execCount||0, amount:Number(r.amount)*( r.execCount||0) }))
  return (
    <>
      <div className="ph">
        <div><div className="pt">ANALYTICS</div><div className="ps">TREASURY INTELLIGENCE // YOUR AGENT AT WORK</div></div>
      </div>

      {/* Savings calculator */}
      <motion.div className="analytics-hero" variants={fadeUp} initial="hidden" animate="visible">
        <div className="analytics-hero-title">WHAT YOUR AGENT SAVED YOU</div>
        <div className="analytics-hero-sub">Every execution your agent runs is a manual transaction you never had to make.</div>
        <div className="analytics-savings-grid">
          {[
            { val:hoursSaved+'h', label:'HOURS OF MANUAL WORK', icon:'⏱', desc:`${log.length} executions × 30 min each` },
            { val:'$'+gasSaved,   label:'GAS FEES SAVED',       icon:'⛽', desc:`vs executing manually on L1` },
            { val:usdcRouted,     label:'USDC ROUTED ON-CHAIN', icon:'💸', desc:`zero missed payments` },
            { val:log.length,     label:'TRANSACTIONS AUTOMATED',icon:'⚡', desc:`your agent never sleeps` },
          ].map(s=>(
            <motion.div key={s.label} className="saving-card" variants={scaleIn}>
              <div className="saving-card-icon">{s.icon}</div>
              <div className="saving-card-val">{s.val}</div>
              <div className="saving-card-label">{s.label}</div>
              <div className="saving-card-desc">{s.desc}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Spend chart */}
      <div className="sh" style={{marginTop:20}}><div className="st">// DAILY SPEND (USDC) — THIS WEEK</div></div>
      <motion.div className="chart-box" variants={fadeUp} initial="hidden" animate="visible">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={SPEND_DATA} margin={{top:10,right:10,left:-20,bottom:0}}>
            <defs>
              <linearGradient id="usdc-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c8ff47" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#c8ff47" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a16"/>
            <XAxis dataKey="day" tick={{fontFamily:"'VT323',monospace",fill:'#5a5848',fontSize:14}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontFamily:"'VT323',monospace",fill:'#5a5848',fontSize:14}} axisLine={false} tickLine={false}/>
            <Tooltip content={<CRT_TOOLTIP/>}/>
            <Area type="monotone" dataKey="usdc" name="USDC" stroke="#c8ff47" fill="url(#usdc-grad)" strokeWidth={2}/>
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Executions by rule */}
      <div className="sh" style={{marginTop:16}}><div className="st">// EXECUTIONS BY RULE</div></div>
      <motion.div className="chart-box" variants={fadeUp} initial="hidden" animate="visible">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={execByRule} margin={{top:10,right:10,left:-20,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a16"/>
            <XAxis dataKey="name" tick={{fontFamily:"'VT323',monospace",fill:'#5a5848',fontSize:12}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontFamily:"'VT323',monospace",fill:'#5a5848',fontSize:14}} axisLine={false} tickLine={false}/>
            <Tooltip content={<CRT_TOOLTIP/>}/>
            <Bar dataKey="execs" name="EXECUTIONS" fill="#47ffd4" radius={[2,2,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Monthly routed */}
      <div className="sh" style={{marginTop:16}}><div className="st">// MONTHLY USDC ROUTED</div></div>
      <motion.div className="chart-box" variants={fadeUp} initial="hidden" animate="visible">
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={MONTHLY_DATA} margin={{top:10,right:10,left:-20,bottom:0}}>
            <defs>
              <linearGradient id="monthly-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#47ffd4" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#47ffd4" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a16"/>
            <XAxis dataKey="month" tick={{fontFamily:"'VT323',monospace",fill:'#5a5848',fontSize:14}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontFamily:"'VT323',monospace",fill:'#5a5848',fontSize:14}} axisLine={false} tickLine={false}/>
            <Tooltip content={<CRT_TOOLTIP/>}/>
            <Area type="monotone" dataKey="routed" name="USDC" stroke="#47ffd4" fill="url(#monthly-grad)" strokeWidth={2}/>
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Daily cap gauge */}
      <div className="sh" style={{marginTop:16}}><div className="st">// DAILY SPEND CAP USAGE</div></div>
      <motion.div className="cap-gauge-box" variants={fadeUp} initial="hidden" animate="visible">
        <div className="cap-gauge-top">
          <span className="cap-gauge-label">DAILY USDC CAP</span>
          <span className="cap-gauge-vals">{dailySpent} <span style={{color:'var(--muted2)'}}>/ 2,000 USDC</span></span>
        </div>
        <div className="cap-gauge-bar">
          <motion.div className="cap-gauge-fill"
            initial={{width:'0%'}}
            animate={{width:capPct+'%'}}
            transition={{duration:1,ease:'easeOut'}}
            style={{background:capPct>=80?'var(--amber)':capPct>=50?'var(--acid)':'var(--teal)'}}/>
        </div>
        <div className="cap-gauge-note">
          {capPct>=80?'⚠ APPROACHING LIMIT — RULES MAY BE BLOCKED':
           capPct>=50?'HALF DAILY BUDGET USED':
           'DAILY BUDGET HEALTHY — FULL EXECUTION AVAILABLE'}
        </div>
      </motion.div>
    </>
  )
}

// ---- SEQUENCER ----
function Sequencer({ queue,simulate,cancelJob,boostJob }) {
  const pO={CRITICAL:2,HIGH:1,NORMAL:0}
  const pC={CRITICAL:'var(--red)',HIGH:'var(--amber)',NORMAL:'var(--muted2)'}
  const sC={QUEUED:'var(--teal)',EXECUTING:'var(--acid)',COMPLETED:'var(--muted2)',FAILED:'var(--red)',CANCELLED:'var(--muted2)',BLOCKED:'var(--red)'}
  const queued   = queue.filter(j=>['QUEUED','EXECUTING'].includes(j.status))
  const blocked  = queue.filter(j=>j.status==='BLOCKED')
  const done     = queue.filter(j=>['COMPLETED','FAILED','CANCELLED'].includes(j.status))
  return (
    <>
      <div className="ph">
        <div><div className="pt">SEQUENCER</div><div className="ps">PRIORITY QUEUE // CRITICAL &gt; HIGH &gt; NORMAL</div></div>
        <motion.button className="btn" onClick={simulate} whileHover={{scale:1.04}} whileTap={{scale:0.96}} onMouseEnter={()=>SFX.hover()}>&gt; ENQUEUE</motion.button>
      </div>
      <motion.div className="stats" style={{gridTemplateColumns:'repeat(4,1fr)'}} variants={stagger} initial="hidden" animate="visible">
        {[{label:'PENDING',value:queued.length},{label:'BLOCKED',value:blocked.length},{label:'DONE',value:queue.filter(j=>j.status==='COMPLETED').length,accent:true},{label:'FAILED',value:queue.filter(j=>j.status==='FAILED').length}].map(c=>(
          <motion.div key={c.label} className="sc" variants={fadeUp}><div className="sl">{c.label}</div><div className={`sv ${c.accent?'accent':''}`} style={c.label==='BLOCKED'&&c.value>0?{color:'var(--red)'}:{}}>{c.value}</div></motion.div>
        ))}
      </motion.div>

      {/* BLOCKED JOBS */}
      {blocked.length>0&&(
        <>
          <div className="sh" style={{marginTop:8}}><div className="st" style={{color:'var(--red)'}}>// BLOCKED BY SPEND CAP</div></div>
          <motion.div className="q-list" style={{marginBottom:12,border:'1px solid rgba(255,92,92,0.3)'}} variants={stagger} initial="hidden" animate="visible">
            {blocked.map(j=>(
              <motion.div className="qc" key={j.id} style={{borderLeftColor:'var(--red)'}} variants={slideR}>
                <div>
                  <div className="qc-top">
                    <span className="qc-name">&gt; {j.rule}</span>
                    <span className="badge" style={{color:'var(--red)',borderColor:'var(--red)'}}>BLOCKED</span>
                    <span className="badge" style={{color:'var(--muted2)',borderColor:'var(--muted2)'}}>{j.priority}</span>
                  </div>
                  <div className="qc-sub" style={{color:'var(--red)',opacity:0.7}}>⚠ {j.blockReason||'DAILY CAP EXCEEDED'} // RESETS AT MIDNIGHT</div>
                </div>
                <div className="ra">
                  <motion.button className="btn btn-danger btn-sm" onClick={()=>cancelJob(j.id)} whileHover={{scale:1.05}} whileTap={{scale:0.95}}>CANCEL</motion.button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </>
      )}

      <div className="sh" style={{marginTop:4}}><div className="st">// PENDING QUEUE</div></div>
      <motion.div className="q-list" style={{marginBottom:16}} variants={stagger} initial="hidden" animate="visible">
        {queued.length===0&&<div className="empty">&gt; QUEUE EMPTY.</div>}
        {[...queued].sort((a,b)=>(pO[b.priority]||0)-(pO[a.priority]||0)).map(j=>(
          <motion.div className="qc" key={j.id} style={{borderLeftColor:pC[j.priority]||'#2a2820'}} variants={slideR}>
            <div>
              <div className="qc-top"><span className="qc-name">&gt; {j.rule}</span>
                <span className="badge" style={{color:pC[j.priority],borderColor:pC[j.priority]}}>{j.priority}</span>
                <span className="badge" style={{color:sC[j.status],borderColor:sC[j.status]}}>
                  {j.status==='EXECUTING'&&<><span className="exec-block"/><span className="exec-block"/><span className="exec-block"/><span className="exec-block-e"/><span className="exec-block-e"/>&nbsp;</>}
                  {j.status}
                </span>
              </div>
              <div className="qc-sub">JOB #{j.id} // {j.attempts}/{j.maxRetries} // {j.createdAt}</div>
            </div>
            <div className="ra">
              {j.priority!=='CRITICAL'&&<motion.button className="btn btn-sm" onClick={()=>boostJob(j.id)} style={{color:'var(--amber)',borderColor:'var(--amber)'}} whileHover={{scale:1.05}} whileTap={{scale:0.95}}>&gt; BOOST</motion.button>}
              <motion.button className="btn btn-danger btn-sm" onClick={()=>cancelJob(j.id)} whileHover={{scale:1.05}} whileTap={{scale:0.95}}>CANCEL</motion.button>
            </div>
          </motion.div>
        ))}
      </motion.div>
      {done.length>0&&<><div className="sh"><div className="st">// COMPLETED</div></div>
        <div className="q-list">{done.map(j=>(
          <div className="qc" key={j.id} style={{borderLeftColor:sC[j.status],opacity:.5}}>
            <div><div className="qc-top"><span className="qc-name">&gt; {j.rule}</span>
              <span className="badge" style={{color:sC[j.status],borderColor:sC[j.status]}}>{j.status}</span>
            </div><div className="qc-sub">JOB #{j.id} // {j.createdAt}</div></div>
          </div>
        ))}</div></>}
    </>
  )
}

function QueueMini({ job }) {
  const sC={QUEUED:'var(--teal)',EXECUTING:'var(--acid)',COMPLETED:'var(--muted2)',FAILED:'var(--red)',CANCELLED:'var(--muted2)',BLOCKED:'var(--red)'}
  const pC={CRITICAL:'var(--red)',HIGH:'var(--amber)',NORMAL:'var(--muted2)'}
  return <div className="qm"><span className="qm-chev">&gt;</span><span className="qm-rule">{job.rule}</span><span className="qm-status" style={{color:sC[job.status]}}>{job.status}</span><span className="qm-pri" style={{color:pC[job.priority]}}>{job.priority}</span></div>
}

// ---- TEMPLATES ----
function Templates({ addRule, setNav }) {
  const [used,setUsed] = useState({})
  const [editing,setEditing] = useState(null)
  const [editAddr,setEditAddr] = useState('')

  function useTemplate(t) {
    if(!editAddr.trim()) { setEditing(t.id); return }
    addRule({...t.rule, recipient:editAddr})
    setUsed(u=>({...u,[t.id]:true}))
    setEditing(null); setEditAddr('')
    SFX.deploy()
  }

  return (
    <>
      <div className="ph">
        <div><div className="pt">TEMPLATES</div><div className="ps">PRE-BUILT RULES FOR COMMON USE CASES // ONE-CLICK SETUP</div></div>
      </div>

      {/* Pitch banner */}
      <motion.div className="pitch-banner" style={{marginBottom:16}} variants={fadeUp} initial="hidden" animate="visible">
        <div className="pitch-icon">🚀</div>
        <div className="pitch-text">
          <div className="pitch-title">CFO AGENT IS YOUR TRANSACTION LAYER</div>
          <div className="pitch-sub">Pick a template, set a recipient address, and your agent handles the rest. No more manual transactions. No more spreadsheets. No more missed payments.</div>
        </div>
      </motion.div>

      <motion.div className="templates-grid" variants={stagger} initial="hidden" animate="visible">
        {RULE_TEMPLATES.map(t=>(
          <motion.div key={t.id} className="template-card" variants={fadeUp}
            whileHover={{borderColor:'rgba(200,255,71,0.25)',background:'rgba(200,255,71,0.02)'}}>
            <div className="template-icon">{t.icon}</div>
            <div className="template-name">{t.name}</div>
            <div className="template-desc">{t.desc}</div>
            <div className="template-pitch">&gt; {t.pitch}</div>
            <div className="template-meta">
              <span className={`badge ${t.rule.type==='SCHEDULED'?'b-sched':'b-cond'}`}>{t.rule.type}</span>
              <span className="badge b-active">{t.rule.token}</span>
              <span style={{color:'var(--muted2)',fontSize:12,letterSpacing:'0.06em'}}>{t.rule.amount} {t.rule.token}</span>
            </div>
            {editing===t.id&&(
              <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} style={{marginTop:10}}>
                <input className="fi" placeholder="RECIPIENT ADDRESS (0x...)" value={editAddr}
                  onChange={e=>setEditAddr(e.target.value)} style={{marginBottom:8}}/>
                <div style={{display:'flex',gap:8}}>
                  <motion.button className="btn btn-acid btn-sm" onClick={()=>useTemplate(t)} whileHover={{scale:1.04}} whileTap={{scale:0.96}} style={{flex:1}}>&gt; CONFIRM</motion.button>
                  <motion.button className="btn btn-sm" onClick={()=>{setEditing(null);setEditAddr('')}} whileHover={{scale:1.04}} whileTap={{scale:0.96}}>CANCEL</motion.button>
                </div>
              </motion.div>
            )}
            {editing!==t.id&&(
              <motion.button className={`btn btn-sm ${used[t.id]?'':'btn-acid'}`} style={{marginTop:10,width:'100%'}}
                onClick={()=>{ if(used[t.id]) return; setEditing(t.id) }}
                whileHover={used[t.id]?{}:{scale:1.04}} whileTap={used[t.id]?{}:{scale:0.96}}
                onMouseEnter={()=>SFX.hover()}>
                {used[t.id]?'✓ RULE ADDED':'&gt; USE TEMPLATE'}
              </motion.button>
            )}
          </motion.div>
        ))}
      </motion.div>
    </>
  )
}

// ---- RULES ----
function Rules({ rules,showAdd,setShowAdd,showPayroll,setShowPayroll,form,setForm,addRule,addPayrollSplit,toggleRule,deleteRule }) {
  return (
    <>
      <div className="ph">
        <div><div className="pt">RULES</div><div className="ps">{rules.filter(r=>r.active).length} ACTIVE // YOUR AGENT EXECUTES THESE AUTOMATICALLY</div></div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <motion.button className="btn" onClick={()=>setShowPayroll(true)} whileHover={{scale:1.04}} whileTap={{scale:0.96}} onMouseEnter={()=>SFX.hover()} style={{color:'var(--teal)',borderColor:'var(--teal)'}}>PAYROLL SPLIT</motion.button>
          <motion.button className="btn btn-acid" onClick={()=>setShowAdd(true)} whileHover={{scale:1.04}} whileTap={{scale:0.96}} onMouseEnter={()=>SFX.hover()}>&gt; NEW RULE</motion.button>
        </div>
      </div>

      <motion.div className="pitch-banner" style={{marginBottom:12}} variants={fadeUp} initial="hidden" animate="visible">
        <div className="pitch-icon">🤖</div>
        <div className="pitch-text">
          <div className="pitch-title">RULES ARE YOUR AGENT&apos;S INSTRUCTIONS</div>
          <div className="pitch-sub">Each rule is a standing order your CFO Agent executes on-chain. Set it once. Your agent handles the rest forever.</div>
        </div>
      </motion.div>

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
              <div className="rd">{r.amount} {r.token} // {r.recipient}{r.interval?` // EVERY ${r.interval}`:''}{r.cond?` // WHEN ${r.cond}`:''}</div>
              {r.isSplit&&r.recipients&&<div className="rd" style={{color:'var(--teal)',marginTop:2}}>{r.recipients.map(x=>x.name||'unnamed').join(', ')}</div>}
              <div className="rd" style={{color:'var(--muted2)',marginTop:2}}>
                LIMIT {r.limit} {r.token} // LAST: {r.last} // EXECUTIONS: {r.execCount||0}
              </div>
            </div>
            <div className="ra">
              <motion.button className="btn btn-sm" onClick={()=>toggleRule(r.id)} whileHover={{scale:1.05}} whileTap={{scale:0.95}}>{r.active?'PAUSE':'RESUME'}</motion.button>
              <motion.button className="btn btn-danger btn-sm" onClick={()=>deleteRule(r.id)} whileHover={{scale:1.05}} whileTap={{scale:0.95}}>DEL</motion.button>
            </div>
          </motion.div>
        ))}
        {rules.length===0&&<div className="empty">&gt; NO RULES. ADD ONE ABOVE OR USE A TEMPLATE.</div>}
      </motion.div>
    </>
  )
}

function AddRuleModal({ form,setForm,onSave,onCancel }) {
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}))
  return (
    <motion.div className="modal-bg" variants={fadeIn} initial="hidden" animate="visible">
      <motion.div className="modal" variants={scaleIn} initial="hidden" animate="visible">
        <div className="modal-title">&gt; NEW RULE</div>
        <div className="fg"><label className="fl">// RULE NAME</label><input className="fi" placeholder="FRIDAY PAYROLL" value={form.name} onChange={f('name')}/></div>
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
        <div className="ma">
          <motion.button className="btn" onClick={onCancel} whileHover={{scale:1.04}} whileTap={{scale:0.96}}>CANCEL</motion.button>
          <motion.button className="btn btn-acid" onClick={()=>onSave(form)} whileHover={{scale:1.04}} whileTap={{scale:0.96}}>&gt; CREATE RULE</motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function PayrollSplitModal({ onSave,onCancel }) {
  const [recipients,setRecipients]=useState([{name:'',address:'',amount:''},{name:'',address:'',amount:''}])
  const [token,setToken]=useState('USDC')
  const [interval,setInterval]=useState('604800')
  const total=recipients.reduce((s,r)=>s+Number(r.amount||0),0)
  const upd=(i,k,v)=>setRecipients(r=>r.map((x,j)=>j===i?{...x,[k]:v}:x))
  return (
    <motion.div className="modal-bg" variants={fadeIn} initial="hidden" animate="visible">
      <motion.div className="modal modal-wide" variants={scaleIn} initial="hidden" animate="visible">
        <div className="modal-title">&gt; PAYROLL SPLIT</div>
        <div className="payroll-sub">Fan out a single payment to multiple wallets simultaneously. Your agent handles every transfer automatically.</div>
        <div className="fr" style={{marginBottom:12}}>
          <div className="fg"><label className="fl">// TOKEN</label><select className="fse" value={token} onChange={e=>setToken(e.target.value)}><option>USDC</option><option>ETH</option></select></div>
          <div className="fg"><label className="fl">// FREQUENCY</label><select className="fse" value={interval} onChange={e=>setInterval(e.target.value)}><option value="86400">DAILY</option><option value="604800">WEEKLY</option><option value="2592000">MONTHLY</option></select></div>
        </div>
        {recipients.map((r,i)=>(
          <div key={i} className="payroll-row">
            <input className="fi" style={{flex:1.2}} placeholder="Name" value={r.name} onChange={e=>upd(i,'name',e.target.value)}/>
            <input className="fi" style={{flex:2}} placeholder="0x..." value={r.address} onChange={e=>upd(i,'address',e.target.value)}/>
            <input className="fi" style={{flex:0.8}} type="number" placeholder="500" value={r.amount} onChange={e=>upd(i,'amount',e.target.value)}/>
            {recipients.length>2&&<button className="btn btn-danger btn-sm" onClick={()=>setRecipients(r=>r.filter((_,j)=>j!==i))}>✕</button>}
          </div>
        ))}
        <button className="btn btn-sm" style={{marginTop:8}} onClick={()=>setRecipients(r=>[...r,{name:'',address:'',amount:''}])} onMouseEnter={()=>SFX.hover()}>+ ADD RECIPIENT</button>
        <div className="payroll-total">TOTAL PER EXECUTION: <span style={{color:'var(--acid)'}}>{total} {token}</span> to {recipients.filter(r=>r.amount).length} wallets</div>
        <div className="ma">
          <motion.button className="btn" onClick={onCancel} whileHover={{scale:1.04}} whileTap={{scale:0.96}}>CANCEL</motion.button>
          <motion.button className="btn btn-acid" onClick={()=>onSave(recipients.filter(r=>r.amount),token,interval)} whileHover={{scale:1.04}} whileTap={{scale:0.96}}>&gt; CREATE SPLIT</motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ---- AI SUGGESTER ----
function AIRuleSuggester({ rules,addRule }) {
  const [desc,setDesc]=useState('')
  const [loading,setLoading]=useState(false)
  const [suggestions,setSugs]=useState([])
  const [error,setError]=useState('')
  const [added,setAdded]=useState({})

  async function getSuggestions() {
    if(!desc.trim()) return
    setLoading(true); setError(''); setSugs([]); SFX.exec()
    try { const r=await suggestRules(desc,rules); setSugs(r); SFX.done() }
    catch(e) { setError(e.message||'AI REQUEST FAILED'); SFX.err() }
    finally { setLoading(false) }
  }

  const examples=['Lagos fintech startup paying 8 contractors weekly in USDC','DeFi protocol sweeping yield to treasury when APY drops','E-commerce brand paying suppliers monthly and managing ops budget']

  return (
    <>
      <div className="ph">
        <div><div className="pt">AI RULE SUGGESTER</div><div className="ps">DESCRIBE YOUR BUSINESS. CLAUDE GENERATES YOUR AGENT&apos;S RULES.</div></div>
        <div className="ai-powered-badge">POWERED BY GROQ</div>
      </div>
      <motion.div className="pitch-banner" style={{marginBottom:14}} variants={fadeUp} initial="hidden" animate="visible">
        <div className="pitch-icon">🧠</div>
        <div className="pitch-text">
          <div className="pitch-title">NATURAL LANGUAGE TO ON-CHAIN AUTOMATION</div>
          <div className="pitch-sub">Describe your business in plain English. Claude analyzes your payment patterns and generates production-ready automation rules for your CFO Agent. No coding required.</div>
        </div>
      </motion.div>
      <motion.div className="ai-box" variants={scaleIn} initial="hidden" animate="visible">
        <div className="ai-box-label">// DESCRIBE YOUR BUSINESS OR PAYMENT NEEDS</div>
        <textarea className="ai-textarea" placeholder="E.g. Lagos fintech startup paying 8 remote contractors weekly in USDC, plus daily gas budget and quarterly investor distributions..." value={desc} onChange={e=>setDesc(e.target.value)} rows={4}/>
        <div className="ai-examples">
          {examples.map((ex,i)=>(<button key={i} className="ai-example-btn" onClick={()=>setDesc(ex)} onMouseEnter={()=>SFX.hover()}>&gt; {ex}</button>))}
        </div>
        <motion.button className={`wallet-btn ${!desc.trim()||loading?'btn-disabled':''}`} onClick={getSuggestions} disabled={!desc.trim()||loading} whileHover={desc.trim()&&!loading?{scale:1.02}:{}} whileTap={desc.trim()&&!loading?{scale:0.98}:{}}>
          {loading?'> CLAUDE IS ANALYZING YOUR BUSINESS...':'> GENERATE RULES WITH AI'}
        </motion.button>
        {error&&<div className="auth-err" style={{marginTop:12}}>&gt; {error}</div>}
      </motion.div>
      {loading&&<motion.div className="ai-loading" variants={fadeIn} initial="hidden" animate="visible">
        <div className="ai-loading-bar"><motion.div className="ai-loading-fill" animate={{width:['0%','100%']}} transition={{duration:2,repeat:Infinity,ease:'easeInOut'}}/></div>
        <div className="ai-loading-text">CLAUDE IS READING YOUR BUSINESS AND GENERATING OPTIMAL PAYMENT RULES...</div>
      </motion.div>}
      {suggestions.length>0&&(
        <>
          <div className="sh" style={{marginTop:16}}><div className="st">// AI SUGGESTED RULES ({suggestions.length}) — CLICK TO ADD TO YOUR AGENT</div></div>
          <motion.div className="rule-list" variants={stagger} initial="hidden" animate="visible">
            {suggestions.map((s,i)=>(
              <motion.div key={i} className="ai-suggestion" variants={slideR}>
                <div className="ai-sug-top"><span className="rn">&gt; {s.name}</span>
                  <span className={`badge ${s.type==='SCHEDULED'?'b-sched':'b-cond'}`}>{s.type}</span>
                  <span className="badge b-active">{s.token}</span>
                </div>
                <div className="rd">{s.amount} {s.token} // {s.type==='SCHEDULED'?fmtInt(s.interval):`WHEN BALANCE > ${s.condVal}`}</div>
                <div className="ai-reasoning">&gt; {s.reasoning}</div>
                <div style={{marginTop:10}}>
                  {added[i]?<span className="ai-added">✓ RULE ADDED TO YOUR AGENT</span>:
                    <motion.button className="btn btn-acid btn-sm" onClick={()=>{addRule({name:s.name,type:s.type,token:s.token,recipient:s.recipient||'0x0000...0000',amount:s.amount,limit:s.limit,interval:s.interval||'604800',condVal:s.condVal||''});setAdded(a=>({...a,[i]:true}));SFX.deploy()}} whileHover={{scale:1.05}} whileTap={{scale:0.95}}>&gt; ADD TO AGENT</motion.button>
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

// ---- LOG ----
function Log({ log,simulate,txBase='https://sepolia.arbiscan.io/tx/' }) {
  return (
    <>
      <div className="ph">
        <div><div className="pt">ACTIVITY LOG</div><div className="ps">{log.length} TRANSACTIONS EXECUTED BY YOUR AGENT</div></div>
        <motion.button className="btn" onClick={simulate} whileHover={{scale:1.04}} whileTap={{scale:0.96}} onMouseEnter={()=>SFX.hover()}>&gt; SIMULATE</motion.button>
      </div>
      <motion.div className="pitch-banner" style={{marginBottom:12}} variants={fadeUp} initial="hidden" animate="visible">
        <div className="pitch-icon">🔗</div>
        <div className="pitch-text">
          <div className="pitch-title">EVERY TRANSACTION IS ON-CHAIN AND VERIFIABLE</div>
          <div className="pitch-sub">Click any transaction to verify it on Arbiscan. Your agent&apos;s execution history is permanent and immutable.</div>
        </div>
      </motion.div>
      <motion.div className="log-list" variants={stagger} initial="hidden" animate="visible">
        {log.map(e=>(<motion.div key={e.id} variants={slideR}><LogItem entry={e} txBase={txBase}/></motion.div>))}
        {log.length===0&&<div className="empty">&gt; NO EXECUTIONS YET. ADD RULES AND SIMULATE.</div>}
      </motion.div>
    </>
  )
}

function LogItem({ entry:e, txBase=ARBISCAN }) {
  return (
    <div className="li">
      <span className="li-chev">&gt;</span>
      <div className="lit">
        <div className="lit-rule">{e.rule}</div>
        <div className="lit-to">{e.to}</div>
      </div>
      <span className="lam">{e.amount} {e.token}</span>
      <span className="ltm">{e.time}</span>
      {e.txHash&&(
        <a href={txBase+e.txHash} target="_blank" rel="noreferrer"
          className="tx-link" onClick={ev=>ev.stopPropagation()} title="View on explorer">
          ↗
        </a>
      )}
    </div>
  )
}

// ---- SETTINGS ----
function Settings({ agentOn,setAgentOn,address,agentAddr }) {
  return (
    <>
      <div className="ph"><div><div className="pt">SETTINGS</div><div className="ps">AGENT CONFIGURATION // SAFETY CONTROLS</div></div></div>
      <motion.div className="two" style={{marginBottom:14}} variants={stagger} initial="hidden" animate="visible">
        {[{label:'YOUR WALLET',val:truncAddr(address)||'0x71C7...976F',sub:'SIWE AUTHENTICATED',color:'teal'},{label:'YOUR AGENT',val:truncAddr(agentAddr)||'0x9aB4...1e77',sub:'ARB SEPOLIA 421614',color:'teal'},{label:'GASLESS MODE',val:'ZERODEV ACTIVE',sub:'NO ETH NEEDED FOR GAS',color:'acid'},{label:'AI SUGGESTER',val:'CLAUDE POWERED',sub:'NATURAL LANGUAGE RULES',color:'acid'}].map(c=>(
          <motion.div key={c.label} className="sc" variants={fadeUp}><div className="sl">{c.label}</div><div className={`mono-val ${c.color||''}`}>{c.val}</div><div className="ss">{c.sub}</div></motion.div>
        ))}
        <motion.div className="sc" style={{gridColumn:'1/-1'}} variants={fadeUp}>
          <div className="sl">ARBISCAN EXPLORER</div>
          <a href={`https://sepolia.arbiscan.io/address/${agentAddr||'0xF1EE2CC9741547cAf04FE99ed2ad8Ff072AEe900'}`} target="_blank" rel="noreferrer" style={{color:'var(--teal)',fontFamily:"'Share Tech Mono',monospace",fontSize:12,letterSpacing:'0.06em',textDecoration:'none',display:'block',marginTop:6,wordBreak:'break-all'}}>
            ↗ VIEW YOUR AGENT CONTRACT ON-CHAIN
          </a>
        </motion.div>
        <motion.div className="sc full" style={{borderTop:`3px solid ${agentOn?'var(--acid)':'var(--red)'}`}} variants={fadeUp}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
            <div>
              <div className="sl">EMERGENCY KILL SWITCH</div>
              <div style={{fontSize:13,marginTop:5,color:'var(--muted2)',letterSpacing:'0.06em'}}>{agentOn?'AGENT IS LIVE. ALL RULES EXECUTING AUTONOMOUSLY.':'AGENT PAUSED. NO TRANSACTIONS WILL EXECUTE.'}</div>
            </div>
            <motion.button className={`btn ${agentOn?'btn-danger':'btn-acid'}`} onClick={()=>setAgentOn(v=>!v)} whileHover={{scale:1.04}} whileTap={{scale:0.96}} onMouseEnter={()=>SFX.hover()}>{agentOn?'> DEACTIVATE AGENT':'> ACTIVATE AGENT'}</motion.button>
          </div>
        </motion.div>
      </motion.div>
    </>
  )
}
