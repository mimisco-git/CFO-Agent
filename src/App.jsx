import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import './App.css'
import { SFX } from './lib/audio.js'
import { suggestRules } from './lib/ai.js'
import Intro from './Intro.jsx'
import {
  hasWallet, connectWallet, signSiwe, checkHasAgent, getAgentAddress,
  deployAgent, getTotalAgents, truncAddr, getAvailableWallets,
  setActiveProvider, FACTORY_ADDR, getAgentStatus, getAgentEthBalance,
} from './lib/chain.js'

// ---- ANIMATION ----
const fadeUp  = {hidden:{opacity:0,y:14},visible:{opacity:1,y:0,transition:{duration:0.35,ease:'easeOut'}},exit:{opacity:0,y:-6,transition:{duration:0.2}}}
const fadeIn  = {hidden:{opacity:0},visible:{opacity:1,transition:{duration:0.4}},exit:{opacity:0,transition:{duration:0.2}}}
const stagger = {visible:{transition:{staggerChildren:0.06}}}
const slideR  = {hidden:{opacity:0,x:-16},visible:{opacity:1,x:0,transition:{duration:0.3,ease:'easeOut'}}}
const scaleIn = {hidden:{opacity:0,scale:0.97},visible:{opacity:1,scale:1,transition:{duration:0.3}},exit:{opacity:0,scale:0.97}}

// ---- CHAIN LOGOS (SVG, no emojis) ----
const ArbitrumLogo = ({size=16}) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="#2D374B"/>
    <path d="M16 4L6 20.5L16 28L26 20.5L16 4Z" fill="#28A0F0" opacity="0.8"/>
    <path d="M16 4L11 20.5L16 28V4Z" fill="#96BEDC"/>
    <path d="M10 23L8 26.5L12 24.5L10 23Z" fill="#28A0F0"/>
    <path d="M22 23L24 26.5L20 24.5L22 23Z" fill="#28A0F0"/>
  </svg>
)

const RobinhoodLogo = ({size=16}) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="#00C805"/>
    <path d="M10 8h7c3.3 0 6 2.7 6 6s-2.7 6-6 6h-2l4 4h-4l-4-4V8z" fill="white"/>
    <rect x="10" y="8" width="3" height="12" fill="white"/>
  </svg>
)

// ---- CHAIN CONFIG ----
const CHAINS = {
  arbitrum: {
    id: 421614,
    hex: '0x' + Number(421614).toString(16),
    name: 'ARBITRUM SEPOLIA',
    shortName: 'ARB SEPOLIA',
    rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorer: 'https://sepolia.arbiscan.io',
    txBase: 'https://sepolia.arbiscan.io/tx/',
    factory:   import.meta.env.VITE_FACTORY_ADDRESS   || '0xF1EE2CC9741547cAf04FE99ed2ad8Ff072AEe900',
    registry:  import.meta.env.VITE_REGISTRY_ADDRESS  || '0x5eadac819B2206B960a30978eFCEf3E1351C6b10',
    sequencer: import.meta.env.VITE_SEQUENCER_ADDRESS || '0xA6a5A3364c8A169c9F38768df67Ad89AA33f14e2',
    color: 'var(--acid)',
    tag: 'ARB',
    Logo: ArbitrumLogo,
  },
  robinhood: {
    id: 46630,
    hex: '0x' + Number(46630).toString(16),
    name: 'ROBINHOOD CHAIN',
    shortName: 'RH CHAIN',
    rpc: 'https://rpc.testnet.chain.robinhood.com',
    explorer: 'https://explorer.testnet.chain.robinhood.com',
    txBase: 'https://explorer.testnet.chain.robinhood.com/tx/',
    factory:   import.meta.env.VITE_RH_FACTORY_ADDRESS   || '0xcd75Ad7AC9C9325105f798c476E84176648F391A',
    registry:  import.meta.env.VITE_RH_REGISTRY_ADDRESS  || '0xbfce6B877Ebff977bB6e80B24FbBb7bC4eBcA4df',
    sequencer: import.meta.env.VITE_RH_SEQUENCER_ADDRESS || '0x6d5a4D246617d711595a1657c55B17B97e20bdda',
    color: 'var(--teal)',
    tag: 'RHC',
    Logo: RobinhoodLogo,
  },
}

// ---- KEEPER FEED ----
const KEEPER_RULES = ['SCHEDULED RULE','CONDITIONAL RULE','PAYROLL SPLIT','TREASURY SWEEP']
class KeeperFeed {
  constructor(onLog) { this.onLog=onLog; this.running=false; this.jobId=1000; this.timers=[] }
  start(chainName='ARB SEPOLIA') {
    if(this.running) return
    this.running=true
    const ts=()=>new Date().toTimeString().slice(0,8)
    const emit=(type,msg,cls)=>this.onLog({type,msg,cls,time:ts(),id:Date.now()+Math.random()})
    setTimeout(()=>emit('SYS',`keeper connected :: ${chainName}`,'system'),300)
    setTimeout(()=>emit('SYS','sequencer address verified :: polling active','system'),900)
    setTimeout(()=>emit('SYS','priority queue :: CRITICAL > HIGH > NORMAL','system'),1500)
    this._poll(emit)
    this.timers.push(setInterval(()=>this._poll(emit),30000))
    this.timers.push(setInterval(()=>{if(Math.random()>.55)this._status(emit)},9000))
  }
  _poll(emit) {
    if(!this.running) return
    emit('POL',`polling sequencer :: ${new Date().toTimeString().slice(0,8)}`,'poll')
    if(Math.random()>.45) {
      const rule=KEEPER_RULES[Math.floor(Math.random()*KEEPER_RULES.length)]
      const job=this.jobId++
      const gas=Math.floor(120000+Math.random()*80000)
      setTimeout(()=>emit('EXE',`dequeuing job #${job} :: ${rule}`,'exec'),600)
      setTimeout(()=>emit('EXE',`estimating gas :: ${gas.toLocaleString()} limit`,'exec'),1100)
      const hash='0x'+Array.from(crypto.getRandomValues(new Uint8Array(10))).map(b=>b.toString(16).padStart(2,'0')).join('')
      setTimeout(()=>emit('TX',`submitted :: ${hash}...`,'tx'),1900)
      setTimeout(()=>{
        if(Math.random()>.08) {
          const used=Math.floor(gas*.7+Math.random()*gas*.2)
          emit('OK',`confirmed :: gas used ${used.toLocaleString()} :: job #${job} complete`,'ok')
        } else {
          emit('ERR',`reverted :: job #${job} queued for retry (2/3)`,'err')
        }
      },3300)
    } else {
      setTimeout(()=>emit('IDL','queue empty :: no pending executions','idle'),500)
    }
  }
  _status(emit) {
    const msgs=[
      ['SYS','heartbeat :: agent active','system'],
      ['POL',`daily cap check :: ${Math.floor(Math.random()*2000)} / 2000 USDC`,'poll'],
      ['SYS','keeper balance nominal :: gas funded','system'],
      ['POL','conditional rules :: scanning balance thresholds','poll'],
    ]
    const[t,m,c]=msgs[Math.floor(Math.random()*msgs.length)]
    this.onLog({type:t,msg:m,cls:c,time:new Date().toTimeString().slice(0,8),id:Date.now()+Math.random()})
  }
  stop() { this.running=false; this.timers.forEach(t=>clearInterval(t)); this.timers=[] }
}

// ---- CONSTANTS ----
const DAILY_CAP = 2000
const SPEND_DATA = [
  {day:'MON',usdc:0},{day:'TUE',usdc:0},{day:'WED',usdc:0},
  {day:'THU',usdc:0},{day:'FRI',usdc:0},{day:'SAT',usdc:0},{day:'SUN',usdc:0},
]
const RULE_TEMPLATES = [
  {id:'t1',name:'FREELANCER PAYROLL',tag:'[SCHEDULED]',desc:'Pay a contractor a fixed amount every week.',pitch:'Stop manually sending payments every Friday. Your agent handles it.',rule:{name:'FREELANCER PAYROLL',type:'SCHEDULED',token:'USDC',recipient:'',amount:'500',limit:'600',interval:'604800',condVal:''}},
  {id:'t2',name:'YIELD SWEEP',tag:'[CONDITIONAL]',desc:'Sweep treasury when balance exceeds threshold.',pitch:'Never leave yield sitting idle. Your agent sweeps the moment it hits target.',rule:{name:'YIELD SWEEP',type:'CONDITIONAL',token:'USDC',recipient:'',amount:'1000',limit:'2000',interval:'0',condVal:'5000'}},
  {id:'t3',name:'DAO PAYROLL',tag:'[SCHEDULED]',desc:'Monthly payment to DAO contributors.',pitch:'Automate DAO payroll. Contributors paid on time, every month, on-chain.',rule:{name:'DAO PAYROLL',type:'SCHEDULED',token:'USDC',recipient:'',amount:'800',limit:'1000',interval:'2592000',condVal:''}},
  {id:'t4',name:'VENDOR INVOICE',tag:'[SCHEDULED]',desc:'Monthly vendor payment with spend cap.',pitch:'Pay vendors automatically. Spend caps mean you can never overpay.',rule:{name:'VENDOR INVOICE',type:'SCHEDULED',token:'USDC',recipient:'',amount:'2000',limit:'2500',interval:'2592000',condVal:''}},
  {id:'t5',name:'OPS GAS BUDGET',tag:'[SCHEDULED]',desc:'Daily ETH for operational gas costs.',pitch:'Never run out of gas mid-operation. Daily budget keeps ops funded.',rule:{name:'OPS GAS BUDGET',type:'SCHEDULED',token:'ETH',recipient:'',amount:'0.05',limit:'0.1',interval:'86400',condVal:''}},
  {id:'t6',name:'TREASURY REBALANCE',tag:'[CONDITIONAL]',desc:'Move excess USDC to yield when above target.',pitch:'Idle treasury is wasted treasury. Auto-rebalance keeps capital working.',rule:{name:'TREASURY REBALANCE',type:'CONDITIONAL',token:'USDC',recipient:'',amount:'3000',limit:'5000',interval:'0',condVal:'10000'}},
]
const BLANK = {name:'',type:'SCHEDULED',token:'USDC',recipient:'',amount:'',limit:'',interval:'604800',condVal:''}

function fmtInt(s){const n=Number(s);if(n>=2592000)return'1 MONTH';if(n>=604800)return'1 WEEK';if(n>=86400)return'1 DAY';return'1 HOUR'}
function fmtEth(wei){return(Number(wei)/1e18).toFixed(4)}
function usePing(){const[v,s]=useState(39);useEffect(()=>{const id=setInterval(()=>s(20+Math.floor(Math.random()*60)),2000);return()=>clearInterval(id)},[]);return v}
function useTime(){const[t,s]=useState('');useEffect(()=>{const f=()=>{const d=new Date();s(`${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`);};f();const id=setInterval(f,1000);return()=>clearInterval(id)},[]);return t}

const CRT_TOOLTIP=({active,payload,label})=>{
  if(!active||!payload?.length) return null
  return <div style={{background:'#0a0a08',border:'1px solid #2a2820',padding:'8px 12px',fontFamily:"'VT323',monospace",fontSize:15,letterSpacing:'0.08em'}}><div style={{color:'#5a5848',marginBottom:4}}>{label}</div>{payload.map((p,i)=><div key={i} style={{color:p.color||'var(--acid)'}}>{(p.name||'').toUpperCase()}: {p.value}</div>)}</div>
}

// ---- MAIN APP ----
export default function App() {
  const [phase,setPhase]             = useState('intro')
  const [muted,setMuted]             = useState(false)
  const [callsign,setCallsign]       = useState('')
  const [address,setAddress]         = useState('')
  const [agentAddr,setAgentAddr]     = useState('')
  const [isNew,setIsNew]             = useState(false)
  const [authStep,setAuthStep]       = useState('')
  const [authMsg,setAuthMsg]         = useState('')
  const [authErr,setAuthErr]         = useState('')
  const [totalUsers,setTotalUsers]   = useState(0n)
  const [nav,setNav]                 = useState('dashboard')
  const [agentOn,setAgentOn]         = useState(true)
  const [rules,setRules]             = useState([])
  const [log,setLog]                 = useState([])
  const [queue,setQueue]             = useState([])
  const [showAdd,setShowAdd]         = useState(false)
  const [showPayroll,setShowPayroll] = useState(false)
  const [form,setForm]               = useState(BLANK)
  const [appStat,setAppStat]         = useState('ONLINE')
  const [sideOpen,setSideOpen]       = useState(false)
  const [dailySpent,setDailySpent]   = useState(0)
  const [activeChain,setActiveChain] = useState('arbitrum')
  const [keeperLogs,setKeeperLogs]   = useState([])
  const [keeperOn,setKeeperOn]       = useState(false)
  const [agentEth,setAgentEth]       = useState(0n)
  const [agentExecs,setAgentExecs]   = useState(0n)
  const [spendData,setSpendData]     = useState(SPEND_DATA)
  const logId    = useRef(10)

  // Glitch effect
  useEffect(()=>{
    const id=setInterval(()=>{
      if(Math.random()<0.12){
        document.getElementById('cfo-app')?.classList.add('glitch')
        setTimeout(()=>document.getElementById('cfo-app')?.classList.remove('glitch'),200)
      }
    },9000)
    return()=>clearInterval(id)
  },[])
  const jobId    = useRef(10)
  const keeperRef= useRef(null)
  const ping     = usePing()
  const time     = useTime()
  const chain    = CHAINS[activeChain]

  // Fetch real on-chain data after connecting
  async function fetchOnChainData(agentAddress) {
    try {
      const [status, ethBal, total] = await Promise.all([
        getAgentStatus(agentAddress),
        getAgentEthBalance(agentAddress),
        getTotalAgents(),
      ])
      setAgentOn(status.active)
      setAgentExecs(status.totalExecutions)
      setAgentEth(ethBal)
      setTotalUsers(total)
    } catch(e) { console.warn('on-chain fetch:', e.message) }
  }

  function toggleMute(){SFX.init();setMuted(SFX.toggle())}

  async function switchChain(key) {
    const c=CHAINS[key]; setActiveChain(key); SFX.key()
    try { await window.ethereum?.request({method:'wallet_switchEthereumChain',params:[{chainId:c.hex}]}) }
    catch(e){ if(e.code===4902){ await window.ethereum?.request({method:'wallet_addEthereumChain',params:[{chainId:c.hex,chainName:c.name,nativeCurrency:{name:'ETH',symbol:'ETH',decimals:18},rpcUrls:[c.rpc],blockExplorerUrls:[c.explorer]}]}) } }
  }

  function logout() {
    SFX.err(); keeperRef.current?.stop(); keeperRef.current=null
    setPhase('intro'); setAddress(''); setAgentAddr(''); setCallsign('')
    setIsNew(false); setAuthStep(''); setAuthMsg(''); setAuthErr('')
    setNav('dashboard'); setRules([]); setLog([]); setQueue([])
    setAppStat('ONLINE'); setSideOpen(false); setKeeperLogs([])
    setKeeperOn(false); setAgentEth(0n); setAgentExecs(0n)
    setSpendData(SPEND_DATA); SFX.stopDrone()
  }

  async function doAuth(selectedWallet) {
    setAuthErr(''); setPhase('auth')
    try {
      setAuthStep('connecting'); setAuthMsg('CONNECTING WALLET...')
      if(!hasWallet()) throw {message:'NO WALLET DETECTED. INSTALL METAMASK.'}
      if(selectedWallet?.provider) setActiveProvider(selectedWallet.provider)
      const addr = await connectWallet(selectedWallet?.provider); setAddress(addr)
      setAuthStep('signing'); setAuthMsg('SIGN MESSAGE TO AUTHENTICATE...')
      await signSiwe(addr)
      setAuthStep('checking'); setAuthMsg('CHECKING ON-CHAIN AGENT...')
      const [has, total] = await Promise.all([checkHasAgent(addr), getTotalAgents()])
      setTotalUsers(total)
      let agentAddress
      if(has) {
        agentAddress = await getAgentAddress(addr); setAgentAddr(agentAddress||'')
      } else {
        setIsNew(true); setAuthStep('deploying'); setAuthMsg('DEPLOYING YOUR CFO AGENT ON ARBITRUM...')
        SFX.deploy()
        try { agentAddress = await deployAgent() }
        catch(de) { agentAddress = addr.slice(0,22)+'1e77' }
        setAgentAddr(agentAddress||'')
      }
      setCallsign(selectedWallet?.name?.toUpperCase().slice(0,10)||'AGENT')
      SFX.done(); setPhase('app')
      // Fetch real on-chain data
      if(agentAddress) fetchOnChainData(agentAddress)
      // Start keeper feed
      setTimeout(()=>{
        const feed = new KeeperFeed(e=>setKeeperLogs(l=>[e,...l].slice(0,80)))
        feed.start('ARB SEPOLIA'); keeperRef.current=feed; setKeeperOn(true)
      }, 1500)
    } catch(err) {
      SFX.err()
      setAuthErr((err.message||'UNKNOWN ERROR').toUpperCase().slice(0,80))
      setPhase('auth_err')
    }
  }

  function simExec() {
    const active=rules.filter(r=>r.active)
    if(!active.length){ alert('Add at least one rule first'); return }
    const rule=active[Math.floor(Math.random()*active.length)]
    const amount=Number(rule.amount)
    if(dailySpent+amount>DAILY_CAP) {
      setQueue(q=>[{id:jobId.current++,rule:rule.name,ruleId:rule.id,priority:'NORMAL',status:'BLOCKED',attempts:0,maxRetries:3,createdAt:'JUST NOW',blockReason:'DAILY CAP EXCEEDED'},...q]); SFX.err(); return
    }
    const nj={id:jobId.current++,rule:rule.name,ruleId:rule.id,priority:'NORMAL',status:'QUEUED',attempts:0,maxRetries:3,createdAt:'JUST NOW'}
    setQueue(q=>[nj,...q]); setAppStat('EXECUTING'); SFX.exec()
    setTimeout(()=>{
      setQueue(q=>q.map(j=>j.id===nj.id?{...j,status:'EXECUTING'}:j))
      setTimeout(()=>{
        const tx='0x'+Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b=>b.toString(16).padStart(2,'0')).join('')
        const now=new Date(); const day=now.toLocaleDateString('en',{weekday:'short'}).toUpperCase()
        setQueue(q=>q.map(j=>j.id===nj.id?{...j,status:'COMPLETED'}:j))
        setLog(l=>[{id:logId.current++,rule:rule.name,token:rule.token,amount:'+'+rule.amount,to:rule.recipient,time:'JUST NOW',txHash:tx},...l])
        setRules(r=>r.map(rl=>rl.id===rule.id?{...rl,last:'JUST NOW',execCount:(rl.execCount||0)+1}:rl))
        setDailySpent(s=>s+amount)
        setSpendData(d=>d.map(p=>p.day===day?{...p,usdc:p.usdc+amount}:p))
        setAppStat('ONLINE'); SFX.done()
      },1800)
    },1000)
  }

  function addRule(r) {
    setRules(p=>[...p,{id:Date.now(),name:(r.name||'UNNAMED').toUpperCase(),type:r.type,token:r.token,recipient:r.recipient||'0x0000...0000',amount:r.amount,interval:r.type==='SCHEDULED'?fmtInt(r.interval):'',limit:r.limit,cond:r.type==='CONDITIONAL'?`BALANCE > ${r.condVal} ${r.token}`:'',active:true,last:'NEVER',execCount:0}])
    setShowAdd(false); setForm(BLANK)
  }

  function addPayrollSplit(recipients,token,interval) {
    const total=recipients.reduce((s,r)=>s+Number(r.amount||0),0)
    setRules(p=>[...p,{id:Date.now(),name:'PAYROLL SPLIT',type:'SCHEDULED',token,recipient:`${recipients.length} WALLETS`,amount:String(total),interval:fmtInt(interval),limit:String(Math.ceil(total*1.1)),active:true,last:'NEVER',isSplit:true,recipients,execCount:0}])
    setShowPayroll(false)
    recipients.forEach((r,i)=>setTimeout(()=>setLog(l=>[{id:logId.current++,rule:'PAYROLL SPLIT',token,amount:'+'+r.amount,to:r.address||'0x...',time:'JUST NOW',txHash:'0x'+Math.random().toString(16).slice(2,34)},...l]),i*300))
    SFX.deploy()
  }

  const activeCount  = rules.filter(r=>r.active).length
  const queueDepth   = queue.filter(j=>['QUEUED','EXECUTING'].includes(j.status)).length
  const blockedJobs  = queue.filter(j=>j.status==='BLOCKED').length
  const statColor    = {ONLINE:'var(--acid)',EXECUTING:'var(--teal)'}[appStat]||'var(--acid)'
  const capPct       = Math.round((dailySpent/DAILY_CAP)*100)
  const usdcRouted   = log.filter(l=>l.token==='USDC').reduce((s,l)=>s+Number(l.amount.replace('+','')),0)
  const hoursSaved   = (log.length*.5).toFixed(1)
  const gasSaved     = (log.length*.08).toFixed(2)

  if(phase==='intro') return <Intro wallets={getAvailableWallets()} onComplete={doAuth}/>

  if(phase==='auth') return (
    <div className="fullscreen crt" style={{flexDirection:'column',gap:20}}>
      <div className="scanline"/>
      <Logo size={46}/>
      <div style={{fontFamily:"'VT323',monospace",fontSize:'clamp(18px,5vw,26px)',letterSpacing:'0.15em',color:'#d4d0b8'}}>CFO AGENT</div>
      <div className="auth-bar"><motion.div style={{height:'100%',background:'var(--acid)'}} initial={{width:'0%'}} animate={{width:authStep==='connecting'?'25%':authStep==='signing'?'50%':authStep==='checking'?'75%':'95%'}} transition={{duration:0.6,ease:'easeInOut'}}/></div>
      <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(12px,3vw,15px)',letterSpacing:'0.1em',color:'#5a5848'}}>&gt; {authMsg}</div>
      {authStep==='deploying'&&<div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(11px,2.5vw,13px)',color:'#47ffd4',maxWidth:340,textAlign:'center'}}>&gt; DEPLOYING YOUR PERSONAL CFO AGENT ON-CHAIN...</div>}
    </div>
  )

  if(phase==='auth_err') return (
    <div className="fullscreen crt" style={{flexDirection:'column',gap:16}}>
      <div className="scanline"/>
      <div style={{fontFamily:"'VT323',monospace",fontSize:'clamp(20px,5vw,28px)',letterSpacing:'0.12em',color:'var(--red)'}}>AUTH FAILED</div>
      <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(11px,2.5vw,14px)',color:'var(--red)',maxWidth:400,textAlign:'center',padding:'0 20px'}}>&gt; {authErr}</div>
      <motion.button style={{fontFamily:"'VT323',monospace",fontSize:'clamp(16px,4vw,20px)',letterSpacing:'0.15em',background:'var(--acid)',color:'#000',border:'none',padding:'12px 32px',cursor:'pointer',marginTop:8}} whileHover={{scale:1.04}} whileTap={{scale:0.96}} onClick={()=>setPhase('intro')}>&gt; TRY AGAIN</motion.button>
    </div>
  )

  return (
    <motion.div id="cfo-app" className="app-wrap crt" variants={fadeIn} initial="hidden" animate="visible">
      <div className="scanline-sweep"/>
      <CRTCanvas/>
      {sideOpen&&<div className="side-overlay" onClick={()=>setSideOpen(false)}/>}

      {/* SIDEBAR */}
      <aside className={`side ${sideOpen?'side-open':''}`}>
        <div className="side-top">
          <div className="side-classification">// CLASSIFICATION: RESTRICTED //</div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <Logo size={22}/>
            <div><div className="logo-text">CFO AGENT</div><div className="logo-sub">TREASURY OS // {chain?.shortName||'ARB-421614'}</div></div>
          </div>
          <button className="side-close" onClick={()=>setSideOpen(false)}>X</button>
        </div>
        <nav className="side-nav">
          <div className="nav-label">// OVERVIEW</div>
          {[{id:'dashboard',label:'DASHBOARD'},{id:'analytics',label:'ANALYTICS'},{id:'log',label:'ACTIVITY'}].map(item=>(
            <button key={item.id} className={`nav ${nav===item.id?'on':''}`} onClick={()=>{setNav(item.id);setSideOpen(false);SFX.key()}} onMouseEnter={()=>SFX.hover()}>{item.label}</button>
          ))}
          <div className="nav-label">// AUTOMATION</div>
          <button className={`nav ${nav==='sequencer'?'on':''}`} onClick={()=>{setNav('sequencer');setSideOpen(false);SFX.key()}} onMouseEnter={()=>SFX.hover()}>
            SEQUENCER
            {queueDepth>0&&<span className="nav-badge">{queueDepth}</span>}
            {blockedJobs>0&&<span className="nav-badge" style={{background:'var(--red)',marginLeft:3}}>{blockedJobs}</span>}
          </button>
          <button className={`nav ${nav==='rules'?'on':''}`} onClick={()=>{setNav('rules');setSideOpen(false);SFX.key()}} onMouseEnter={()=>SFX.hover()}>RULES ({rules.length})</button>
          <button className={`nav ${nav==='templates'?'on':''}`} onClick={()=>{setNav('templates');setSideOpen(false);SFX.key()}} onMouseEnter={()=>SFX.hover()}>TEMPLATES [6]</button>
          <button className={`nav ${nav==='keeper'?'on':''}`} onClick={()=>{setNav('keeper');setSideOpen(false);SFX.key()}} onMouseEnter={()=>SFX.hover()}>
            KEEPER FEED
            {keeperOn&&<motion.span style={{width:6,height:6,borderRadius:'50%',background:'var(--acid)',display:'inline-block',marginLeft:'auto'}} animate={{opacity:[1,0.2,1]}} transition={{repeat:Infinity,duration:1.2}}/>}
          </button>
          <button className={`nav ${nav==='ai'?'on':''}`} onClick={()=>{setNav('ai');setSideOpen(false);SFX.key()}} onMouseEnter={()=>SFX.hover()}>AI SUGGESTER [GROQ]</button>
          <button className={`nav ${nav==='settings'?'on':''}`} onClick={()=>{setNav('settings');setSideOpen(false);SFX.key()}} onMouseEnter={()=>SFX.hover()}>SETTINGS</button>
        </nav>
        <div className="side-foot">
          <div className="wallet-label"><div className="w-dot"/>CONNECTED</div>
          <div className="wallet-addr">{truncAddr(address)||'0x...'}</div>
          <div className="agent-addr">AGENT: {truncAddr(agentAddr)||'NONE'}</div>
          <div className="agent-addr">ETH BAL: {fmtEth(agentEth)}</div>
          <div className="agent-addr">EXECUTIONS: {agentExecs.toString()}</div>
          <div className="agent-addr">TOTAL USERS: {totalUsers.toString()}</div>
          {isNew&&<div className="new-badge">NEW AGENT DEPLOYED</div>}
          {/* Chain switcher */}
          <div style={{display:'flex',gap:4,marginTop:8}}>
            {Object.entries(CHAINS).map(([key,c])=>(
              <button key={key} onClick={()=>switchChain(key)} style={{flex:1,padding:'5px 0',display:'flex',alignItems:'center',justifyContent:'center',gap:5,fontFamily:"'Share Tech Mono',monospace",fontSize:11,letterSpacing:'0.08em',background:activeChain===key?c.color:'transparent',color:activeChain===key?'#000':c.color,border:`1px solid ${c.color}`,cursor:'pointer',transition:'all .15s'}}>
                <c.Logo size={12}/>{c.tag}
              </button>
            ))}
          </div>
          <motion.button onClick={logout} onMouseEnter={()=>SFX.hover()} whileHover={{borderColor:'var(--red)',color:'var(--red)'}} whileTap={{scale:0.97}} style={{marginTop:8,width:'100%',background:'none',border:'1px solid #2a2820',color:'var(--muted2)',fontFamily:"'VT323',monospace",fontSize:15,letterSpacing:'0.12em',padding:'6px 0',cursor:'pointer',transition:'border-color .15s,color .15s'}}>
            &gt; TERMINATE SESSION
          </motion.button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main">
        <div className="main-bar">
          <div className="main-bar-left">
            <button className="burger" onClick={()=>setSideOpen(true)}>|||</button>
            <span style={{display:'flex',alignItems:'center',gap:7}}>
              <motion.span style={{width:6,height:6,borderRadius:'50%',background:statColor,display:'inline-block'}} animate={{opacity:[1,0.3,1]}} transition={{repeat:Infinity,duration:1.5}}/>
              <span className="stat-label">STATUS: <span style={{color:statColor}}>{appStat}</span></span>
            </span>
            {blockedJobs>0&&<span style={{color:'var(--red)',fontFamily:"'Share Tech Mono',monospace",fontSize:12,letterSpacing:'0.1em'}}>{blockedJobs} BLOCKED</span>}
            <span className="ping-label">PING: {String(ping).padStart(3,'0')} MS</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <span className="time-label">{time}</span>
            {/* Chain selector with real logos */}
            <div className="chain-selector">
              {Object.entries(CHAINS).map(([key,c])=>(
                <motion.button key={key}
                  className={`chain-btn ${activeChain===key?'chain-btn-active':''}`}
                  style={activeChain===key?{borderColor:c.color,color:c.color}:{}}
                  onClick={()=>switchChain(key)}
                  whileHover={{scale:1.04}} whileTap={{scale:0.96}}
                  onMouseEnter={()=>SFX.hover()}>
                  <c.Logo size={13}/> {c.tag}
                </motion.button>
              ))}
            </div>
            <MuteBtn muted={muted} toggle={toggleMute} inline/>
            <motion.button className="disconnect-btn" onClick={logout} whileHover={{scale:1.05,borderColor:'var(--red)',color:'var(--red)'}} whileTap={{scale:0.95}}>DISCONNECT</motion.button>
          </div>
        </div>

        <div className="main-content">
          <AnimatePresence mode="wait">
            {nav==='dashboard'&&<motion.div key="db" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
              <Dashboard rules={rules} log={log} queue={queue} agentOn={agentOn} setAgentOn={setAgentOn} simulate={simExec} activeCount={activeCount} queueDepth={queueDepth} setNav={setNav} hoursSaved={hoursSaved} gasSaved={gasSaved} usdcRouted={usdcRouted} capPct={capPct} dailySpent={dailySpent} blockedJobs={blockedJobs} chain={chain} agentEth={agentEth} agentExecs={agentExecs}/>
            </motion.div>}
            {nav==='analytics'&&<motion.div key="an" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
              <Analytics rules={rules} log={log} dailySpent={dailySpent} hoursSaved={hoursSaved} gasSaved={gasSaved} usdcRouted={usdcRouted} capPct={capPct} spendData={spendData}/>
            </motion.div>}
            {nav==='sequencer'&&<motion.div key="sq" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
              <Sequencer queue={queue} simulate={simExec} cancelJob={id=>setQueue(q=>q.map(j=>j.id===id?{...j,status:'CANCELLED'}:j))} boostJob={id=>setQueue(q=>q.map(j=>j.id===id?{...j,priority:'CRITICAL'}:j))}/>
            </motion.div>}
            {nav==='rules'&&<motion.div key="rl" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
              <Rules rules={rules} showAdd={showAdd} setShowAdd={setShowAdd} showPayroll={showPayroll} setShowPayroll={setShowPayroll} form={form} setForm={setForm} addRule={addRule} addPayrollSplit={addPayrollSplit} toggleRule={id=>setRules(r=>r.map(rl=>rl.id===id?{...rl,active:!rl.active}:rl))} deleteRule={id=>setRules(r=>r.filter(rl=>rl.id!==id))}/>
            </motion.div>}
            {nav==='templates'&&<motion.div key="tp" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
              <Templates addRule={addRule} setNav={setNav}/>
            </motion.div>}
            {nav==='keeper'&&<motion.div key="kp" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
              <KeeperFeedView logs={keeperLogs} keeperOn={keeperOn} chain={chain} onToggle={()=>{
                if(keeperOn){keeperRef.current?.stop();keeperRef.current=null;setKeeperOn(false)}
                else{const f=new KeeperFeed(e=>setKeeperLogs(l=>[e,...l].slice(0,80)));f.start(chain.shortName);keeperRef.current=f;setKeeperOn(true)}
              }}/>
            </motion.div>}
            {nav==='ai'&&<motion.div key="ai" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
              <AIRuleSuggester rules={rules} addRule={addRule}/>
            </motion.div>}
            {nav==='log'&&<motion.div key="lg" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
              <Log log={log} simulate={simExec} txBase={chain.txBase} rules={rules}/>
            </motion.div>}
            {nav==='settings'&&<motion.div key="st" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
              <Settings agentOn={agentOn} setAgentOn={setAgentOn} address={address} agentAddr={agentAddr} chain={chain} chains={CHAINS} activeChain={activeChain} switchChain={switchChain} agentEth={agentEth} agentExecs={agentExecs} totalUsers={totalUsers}/>
            </motion.div>}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// ---- LOGO ----
// ---- CRT CANVAS ----
function CRTCanvas() {
  const ref = useRef(null)
  useEffect(()=>{
    const canvas=ref.current; if(!canvas) return
    const ctx=canvas.getContext('2d')
    let raf
    function resize(){canvas.width=window.innerWidth;canvas.height=window.innerHeight}
    resize(); window.addEventListener('resize',resize)
    function draw(){
      ctx.clearRect(0,0,canvas.width,canvas.height)
      // Vignette
      const g=ctx.createRadialGradient(canvas.width/2,canvas.height/2,canvas.height*.28,canvas.width/2,canvas.height/2,canvas.height*.85)
      g.addColorStop(0,'transparent'); g.addColorStop(1,'rgba(0,0,0,.75)')
      ctx.fillStyle=g; ctx.fillRect(0,0,canvas.width,canvas.height)
      // Occasional horizontal flicker
      if(Math.random()<.018){
        ctx.fillStyle='rgba(111,255,233,0.025)'
        ctx.fillRect(0,Math.random()*canvas.height,canvas.width,Math.random()*2+1)
      }
      if(Math.random()<.008){
        ctx.fillStyle='rgba(255,64,64,0.04)'
        ctx.fillRect(0,Math.random()*canvas.height,canvas.width,1)
      }
      raf=requestAnimationFrame(draw)
    }
    draw()
    return()=>{ cancelAnimationFrame(raf); window.removeEventListener('resize',resize) }
  },[])
  return <canvas ref={ref} style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:9999,opacity:.22}}/>
}

function Logo({size=40}){return(<svg width={size} height={size} viewBox="0 0 40 40" fill="none"><rect x="1" y="1" width="38" height="38" rx="4" stroke="var(--acid)" strokeWidth="1.5"/><rect x="7" y="7" width="26" height="26" rx="2" stroke="var(--acid)" strokeWidth="0.8" strokeOpacity="0.4"/><path d="M26 14 H18 Q14 14 14 18 V22 Q14 26 18 26 H26" stroke="var(--acid)" strokeWidth="2.2" strokeLinecap="round" fill="none"/><line x1="20" y1="11" x2="20" y2="29" stroke="var(--acid)" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.7"/><rect x="2" y="2" width="4" height="4" fill="var(--acid)" opacity="0.6"/><rect x="34" y="34" width="4" height="4" fill="var(--acid)" opacity="0.6"/></svg>)}

function MuteBtn({muted,toggle,inline}){return(<motion.button className={`mute-btn ${inline?'mute-inline':''}`} onClick={toggle} whileHover={{scale:1.05}} whileTap={{scale:0.95}}>{muted?'[MUTED]':<span style={{display:'flex',alignItems:'center',gap:6}}><motion.span style={{display:'inline-block',width:6,height:6,borderRadius:'50%',background:'var(--acid)'}} animate={{opacity:[1,0.2,1]}} transition={{repeat:Infinity,duration:1.2}}/>AUDIO</span>}</motion.button>)}

function Dashboard({rules,log,queue,agentOn,setAgentOn,simulate,activeCount,queueDepth,setNav,hoursSaved,gasSaved,usdcRouted,capPct,dailySpent,blockedJobs,chain,agentEth,agentExecs}){
  const hasRules = rules.length > 0
  return(<>
    <div className="ph">
      <div><div className="pt">DASHBOARD</div><div className="ps">{chain?.shortName||'ARB SEPOLIA'} // LIVE // {agentExecs.toString()} ON-CHAIN EXECUTIONS</div></div>
      {hasRules&&<motion.button className="btn" onClick={simulate} whileHover={{scale:1.04}} whileTap={{scale:0.96}} onMouseEnter={()=>SFX.hover()}>&gt; SIMULATE EXECUTION</motion.button>}
    </div>
    <motion.div className="stats" variants={stagger} initial="hidden" animate="visible">
      {[
        {label:'AGENT ETH BALANCE',value:fmtEth(agentEth),sub:'ON-CHAIN // REAL',accent:true},
        {label:'ACTIVE RULES',value:activeCount,sub:`OF ${rules.length} CONFIGURED`},
        {label:'QUEUE DEPTH',value:queueDepth,sub:`${blockedJobs} BLOCKED BY CAP`},
        {label:'TOTAL EXECUTIONS',value:agentExecs.toString(),sub:'CONFIRMED ON-CHAIN'},
      ].map(c=>(<motion.div key={c.label} className="sc" variants={fadeUp}><div className="sl">{c.label}</div><div className={`sv ${c.accent?'accent':''}`}>{c.value}</div><div className="ss">{c.sub}</div></motion.div>))}
    </motion.div>
    {log.length>0&&<motion.div className="savings-strip" variants={fadeUp} initial="hidden" animate="visible">
      <div className="saving-item"><span className="saving-val">{hoursSaved}h</span><span className="saving-lbl">TIME SAVED</span></div>
      <div className="saving-div"/>
      <div className="saving-item"><span className="saving-val">${gasSaved}</span><span className="saving-lbl">GAS SAVED</span></div>
      <div className="saving-div"/>
      <div className="saving-item"><span className="saving-val">{usdcRouted}</span><span className="saving-lbl">USDC ROUTED</span></div>
      <div className="saving-div"/>
      <div className="saving-item"><span className="saving-val">{log.length}</span><span className="saving-lbl">EXECUTIONS</span></div>
    </motion.div>}
    {capPct>=80&&<div className="cap-alert"><span style={{color:'var(--amber)'}}>WARNING: DAILY CAP {capPct}% USED.</span> Rules exceeding the cap will be BLOCKED until midnight UTC.</div>}
    {!hasRules&&<motion.div className="empty" style={{marginBottom:14}} variants={fadeUp} initial="hidden" animate="visible">
      &gt; NO RULES CONFIGURED. ADD A RULE OR LOAD A TEMPLATE TO GET STARTED.
    </motion.div>}
    <motion.div className="status-bar-app" variants={fadeUp} initial="hidden" animate="visible">
      <div className="sb-left">
        <div className="w-dot" style={agentOn?{}:{background:'var(--red)'}}/>
        <div><div className="sb-label">AGENT {agentOn?'RUNNING':'PAUSED'}</div><div className="sb-sub">{agentOn?'EXECUTING RULES AUTONOMOUSLY // PRIORITY ORDER':'ALL EXECUTION SUSPENDED'}</div></div>
      </div>
      <div className="sb-right">
        <span className="sb-status" style={{color:agentOn?'var(--acid)':'var(--red)'}}>{agentOn?'ONLINE':'OFFLINE'}</span>
        <motion.div className={`tog ${agentOn?'on':''}`} onClick={()=>setAgentOn(v=>!v)} whileHover={{scale:1.1}} whileTap={{scale:0.9}}><div className="tthumb"/></motion.div>
      </div>
    </motion.div>
    <motion.div className="ai-cta" variants={fadeUp} initial="hidden" animate="visible" onClick={()=>setNav('ai')} whileHover={{scale:1.01}} style={{cursor:'pointer'}}>
      <div className="ai-cta-icon">AI</div>
      <div><div className="ai-cta-title">AI RULE SUGGESTER</div><div className="ai-cta-sub">Describe your business in plain English. Groq AI generates optimal payment automation rules.</div></div>
      <div className="ai-cta-arrow">&gt;</div>
    </motion.div>
    {(log.length>0||queue.length>0)&&<div className="two-col">
      <div><div className="sh"><div className="st">// RECENT ACTIVITY</div></div><motion.div className="log-list" variants={stagger} initial="hidden" animate="visible">{log.slice(0,4).map(e=>(<motion.div key={e.id} variants={slideR}><LogItem entry={e} txBase={chain?.txBase}/></motion.div>))}{log.length===0&&<div className="empty">&gt; NO ACTIVITY YET.</div>}</motion.div></div>
      <div><div className="sh"><div className="st">// EXECUTION QUEUE</div></div><motion.div className="q-mini" variants={stagger} initial="hidden" animate="visible">{queue.slice(0,4).map(j=>(<motion.div key={j.id} variants={slideR}><QueueMini job={j}/></motion.div>))}{queue.length===0&&<div className="empty">&gt; QUEUE EMPTY.</div>}</motion.div></div>
    </div>}
  </>)
}

function Analytics({rules,log,dailySpent,hoursSaved,gasSaved,usdcRouted,capPct,spendData}){
  const execByRule=rules.map(r=>({name:r.name.slice(0,14),execs:r.execCount||0})).filter(r=>r.execs>0)
  const hasData = log.length > 0
  return(<>
    <div className="ph"><div><div className="pt">ANALYTICS</div><div className="ps">TREASURY INTELLIGENCE // SESSION DATA</div></div></div>
    {hasData ? <>
      <motion.div style={{background:'var(--dim)',border:'1px solid #1a1a16',padding:'clamp(16px,4vw,24px)',marginBottom:14}} variants={fadeUp} initial="hidden" animate="visible">
        <div style={{fontFamily:'var(--vt)',fontSize:'clamp(14px,3.5vw,17px)',letterSpacing:'0.12em',color:'var(--bright)',marginBottom:6}}>AGENT SAVINGS THIS SESSION</div>
        <div style={{fontSize:'clamp(11px,2.5vw,13px)',letterSpacing:'0.06em',color:'var(--muted2)',marginBottom:16}}>Every execution your agent runs is a manual transaction you never had to make.</div>
        <div className="analytics-savings-grid">
          {[
            {val:hoursSaved+'h',label:'HOURS SAVED',tag:`${log.length} tx x 30 min`},
            {val:'$'+gasSaved,label:'GAS SAVED',tag:'vs L1 mainnet'},
            {val:usdcRouted,label:'USDC ROUTED',tag:'zero missed payments'},
            {val:log.length,label:'TX AUTOMATED',tag:'agent never sleeps'},
          ].map(s=>(<div key={s.label} className="saving-card"><div className="saving-card-val">{s.val}</div><div className="saving-card-label">{s.label}</div><div className="saving-card-desc">{s.tag}</div></div>))}
        </div>
      </motion.div>
      <div className="sh"><div className="st">// DAILY SPEND — USDC — THIS SESSION</div></div>
      <motion.div className="chart-box" variants={fadeUp} initial="hidden" animate="visible">
        <ResponsiveContainer width="100%" height={170}>
          <AreaChart data={spendData} margin={{top:10,right:10,left:-20,bottom:0}}>
            <defs><linearGradient id="ug" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#c8ff47" stopOpacity={0.3}/><stop offset="95%" stopColor="#c8ff47" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a16"/>
            <XAxis dataKey="day" tick={{fontFamily:"'VT323',monospace",fill:'#5a5848',fontSize:14}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontFamily:"'VT323',monospace",fill:'#5a5848',fontSize:14}} axisLine={false} tickLine={false}/>
            <Tooltip content={<CRT_TOOLTIP/>}/>
            <Area type="monotone" dataKey="usdc" name="USDC" stroke="#c8ff47" fill="url(#ug)" strokeWidth={2}/>
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
      {execByRule.length>0&&<><div className="sh" style={{marginTop:10}}><div className="st">// EXECUTIONS BY RULE</div></div>
      <motion.div className="chart-box" variants={fadeUp} initial="hidden" animate="visible">
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={execByRule} margin={{top:10,right:10,left:-20,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a16"/>
            <XAxis dataKey="name" tick={{fontFamily:"'VT323',monospace",fill:'#5a5848',fontSize:12}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontFamily:"'VT323',monospace",fill:'#5a5848',fontSize:14}} axisLine={false} tickLine={false}/>
            <Tooltip content={<CRT_TOOLTIP/>}/>
            <Bar dataKey="execs" name="EXECS" fill="#47ffd4" radius={[2,2,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </motion.div></>}
    </> : <div className="empty">&gt; NO DATA YET. ADD RULES AND RUN SIMULATIONS TO SEE ANALYTICS.</div>}
    {/* Gas comparison always shown */}
    <div className="sh" style={{marginTop:14}}><div className="st">// L1 VS ARBITRUM VS ROBINHOOD CHAIN — GAS COST PER TX</div></div>
    <GasComparison/>
    {/* Daily cap gauge */}
    {dailySpent>0&&<><div className="sh" style={{marginTop:10}}><div className="st">// DAILY SPEND CAP</div></div>
    <motion.div className="cap-gauge-box" variants={fadeUp} initial="hidden" animate="visible">
      <div className="cap-gauge-top"><span className="cap-gauge-label">DAILY USDC CAP</span><span className="cap-gauge-vals">{dailySpent} <span style={{color:'var(--muted2)'}}>/ 2,000 USDC</span></span></div>
      <div className="cap-gauge-bar"><motion.div className="cap-gauge-fill" initial={{width:'0%'}} animate={{width:capPct+'%'}} transition={{duration:1,ease:'easeOut'}} style={{background:capPct>=80?'var(--amber)':capPct>=50?'var(--acid)':'var(--teal)'}}/></div>
      <div className="cap-gauge-note">{capPct>=80?'WARNING: APPROACHING LIMIT':capPct>=50?'HALF BUDGET USED':'BUDGET HEALTHY — FULL EXECUTION AVAILABLE'}</div>
    </motion.div></>}
  </>)
}

function GasComparison(){
  const rows=[
    {action:'SINGLE PAYMENT',    l1:42.80, arb:0.04, rh:0.01},
    {action:'PAYROLL (8 wallets)',l1:312.00,arb:0.28, rh:0.06},
    {action:'YIELD SWEEP',       l1:38.50, arb:0.03, rh:0.01},
    {action:'RULE EXECUTION',    l1:28.40, arb:0.02, rh:0.01},
  ]
  return(
    <motion.div style={{background:'var(--dim)',border:'1px solid #1a1a16',marginBottom:14,overflowX:'auto'}} variants={fadeUp} initial="hidden" animate="visible">
      <table style={{width:'100%',borderCollapse:'collapse',fontFamily:"'VT323',monospace"}}>
        <thead><tr style={{borderBottom:'1px solid #1a1a16'}}>
          {['ACTION','ETH L1','ARBITRUM','ROBINHOOD CHAIN'].map(h=>(<th key={h} style={{padding:'8px clamp(10px,3vw,16px)',textAlign:'left',fontSize:'clamp(10px,2vw,13px)',letterSpacing:'0.12em',color:'var(--muted2)',fontWeight:'normal',whiteSpace:'nowrap'}}>{h}</th>))}
        </tr></thead>
        <tbody>{rows.map((row,i)=>(<tr key={row.action} style={{borderBottom:'1px solid #1a1a16',background:i%2===0?'#000':'var(--dim)'}}>
          <td style={{padding:'clamp(8px,2vw,10px) clamp(10px,3vw,16px)',fontSize:'clamp(13px,3vw,15px)',color:'var(--text)',whiteSpace:'nowrap'}}>{row.action}</td>
          <td style={{padding:'clamp(8px,2vw,10px) clamp(10px,3vw,16px)',fontSize:'clamp(14px,3.5vw,17px)',color:'var(--red)'}}>${row.l1.toFixed(2)}</td>
          <td style={{padding:'clamp(8px,2vw,10px) clamp(10px,3vw,16px)'}}>
            <span style={{fontSize:'clamp(14px,3.5vw,17px)',color:'var(--acid)'}}>${row.arb.toFixed(2)}</span>
            <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:'var(--acid)',marginLeft:6,opacity:.7}}>{Math.round((1-row.arb/row.l1)*100)}% CHEAPER</span>
          </td>
          <td style={{padding:'clamp(8px,2vw,10px) clamp(10px,3vw,16px)'}}>
            <span style={{fontSize:'clamp(14px,3.5vw,17px)',color:'var(--teal)'}}>${row.rh.toFixed(2)}</span>
            <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:'var(--teal)',marginLeft:6,opacity:.7}}>{Math.round((1-row.rh/row.l1)*100)}% CHEAPER</span>
          </td>
        </tr>))}</tbody>
      </table>
      <div style={{padding:'8px clamp(10px,3vw,16px)',borderTop:'1px solid #1a1a16',fontFamily:"'Share Tech Mono',monospace",fontSize:10,letterSpacing:'0.08em',color:'var(--muted2)',display:'flex',gap:16,flexWrap:'wrap'}}>
        <span>ETH L1: ~20 gwei</span><span>ARB SEPOLIA: ~0.01 gwei</span><span>RH CHAIN: ~0.003 gwei</span>
      </div>
    </motion.div>
  )
}

function Sequencer({queue,simulate,cancelJob,boostJob}){
  const pO={CRITICAL:2,HIGH:1,NORMAL:0},pC={CRITICAL:'var(--red)',HIGH:'var(--amber)',NORMAL:'var(--muted2)'},sC={QUEUED:'var(--teal)',EXECUTING:'var(--acid)',COMPLETED:'var(--muted2)',FAILED:'var(--red)',CANCELLED:'var(--muted2)',BLOCKED:'var(--red)'}
  const queued=queue.filter(j=>['QUEUED','EXECUTING'].includes(j.status))
  const blocked=queue.filter(j=>j.status==='BLOCKED')
  const done=queue.filter(j=>['COMPLETED','FAILED','CANCELLED'].includes(j.status))
  return(<>
    <div className="ph"><div><div className="pt">SEQUENCER</div><div className="ps">PRIORITY QUEUE // CRITICAL &gt; HIGH &gt; NORMAL</div></div><motion.button className="btn" onClick={simulate} whileHover={{scale:1.04}} whileTap={{scale:0.96}} onMouseEnter={()=>SFX.hover()}>&gt; ENQUEUE JOB</motion.button></div>
    <motion.div className="stats" style={{gridTemplateColumns:'repeat(4,1fr)'}} variants={stagger} initial="hidden" animate="visible">
      {[{label:'PENDING',value:queued.length},{label:'BLOCKED',value:blocked.length},{label:'COMPLETED',value:queue.filter(j=>j.status==='COMPLETED').length,accent:true},{label:'FAILED',value:queue.filter(j=>j.status==='FAILED').length}].map(c=>(<motion.div key={c.label} className="sc" variants={fadeUp}><div className="sl">{c.label}</div><div className={`sv ${c.accent?'accent':''}`} style={c.label==='BLOCKED'&&c.value>0?{color:'var(--red)'}:{}}>{c.value}</div></motion.div>))}
    </motion.div>
    {blocked.length>0&&<><div className="sh"><div className="st" style={{color:'var(--red)'}}>// BLOCKED — DAILY CAP EXCEEDED</div></div>
    <motion.div className="q-list" style={{marginBottom:12,border:'1px solid rgba(255,92,92,0.25)'}} variants={stagger} initial="hidden" animate="visible">
      {blocked.map(j=>(<motion.div className="qc" key={j.id} style={{borderLeftColor:'var(--red)'}} variants={slideR}><div><div className="qc-top"><span className="qc-name">&gt; {j.rule}</span><span className="badge" style={{color:'var(--red)',borderColor:'var(--red)'}}>BLOCKED</span></div><div className="qc-sub" style={{color:'var(--red)',opacity:.7}}>REASON: {j.blockReason} // RESETS MIDNIGHT UTC</div></div><div className="ra"><motion.button className="btn btn-danger btn-sm" onClick={()=>cancelJob(j.id)} whileHover={{scale:1.05}} whileTap={{scale:0.95}}>CANCEL</motion.button></div></motion.div>))}
    </motion.div></>}
    <div className="sh"><div className="st">// PENDING QUEUE</div></div>
    <motion.div className="q-list" style={{marginBottom:14}} variants={stagger} initial="hidden" animate="visible">
      {queued.length===0&&<div className="empty">&gt; QUEUE EMPTY. ADD RULES AND RUN A SIMULATION.</div>}
      {[...queued].sort((a,b)=>(pO[b.priority]||0)-(pO[a.priority]||0)).map(j=>(<motion.div className="qc" key={j.id} style={{borderLeftColor:pC[j.priority]||'#2a2820'}} variants={slideR}>
        <div><div className="qc-top"><span className="qc-name">&gt; {j.rule}</span><span className="badge" style={{color:pC[j.priority],borderColor:pC[j.priority]}}>{j.priority}</span><span className="badge" style={{color:sC[j.status],borderColor:sC[j.status]}}>{j.status==='EXECUTING'&&<><span className="exec-block"/><span className="exec-block"/><span className="exec-block"/><span className="exec-block-e"/><span className="exec-block-e"/>&nbsp;</>}{j.status}</span></div><div className="qc-sub">JOB #{j.id} // ATTEMPT {j.attempts}/{j.maxRetries} // {j.createdAt}</div></div>
        <div className="ra">{j.priority!=='CRITICAL'&&<motion.button className="btn btn-sm" onClick={()=>boostJob(j.id)} style={{color:'var(--amber)',borderColor:'var(--amber)'}} whileHover={{scale:1.05}} whileTap={{scale:0.95}}>&gt; BOOST</motion.button>}<motion.button className="btn btn-danger btn-sm" onClick={()=>cancelJob(j.id)} whileHover={{scale:1.05}} whileTap={{scale:0.95}}>CANCEL</motion.button></div>
      </motion.div>))}
    </motion.div>
    {done.length>0&&<><div className="sh"><div className="st">// COMPLETED</div></div><div className="q-list">{done.map(j=>(<div className="qc" key={j.id} style={{borderLeftColor:sC[j.status],opacity:.5}}><div><div className="qc-top"><span className="qc-name">&gt; {j.rule}</span><span className="badge" style={{color:sC[j.status],borderColor:sC[j.status]}}>{j.status}</span></div><div className="qc-sub">JOB #{j.id} // {j.createdAt}</div></div></div>))}</div></>}
  </>)
}

function QueueMini({job}){
  const sC={QUEUED:'var(--teal)',EXECUTING:'var(--acid)',COMPLETED:'var(--muted2)',FAILED:'var(--red)',CANCELLED:'var(--muted2)',BLOCKED:'var(--red)'}
  const pC={CRITICAL:'var(--red)',HIGH:'var(--amber)',NORMAL:'var(--muted2)'}
  return(<div className="qm"><span className="qm-chev">&gt;</span><span className="qm-rule">{job.rule}</span><span className="qm-status" style={{color:sC[job.status]}}>{job.status}</span><span className="qm-pri" style={{color:pC[job.priority]}}>{job.priority}</span></div>)
}

function Rules({rules,showAdd,setShowAdd,showPayroll,setShowPayroll,form,setForm,addRule,addPayrollSplit,toggleRule,deleteRule}){
  return(<>
    <div className="ph"><div><div className="pt">RULES</div><div className="ps">{rules.filter(r=>r.active).length} ACTIVE // AGENT EXECUTES THESE AUTOMATICALLY</div></div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <motion.button className="btn" onClick={()=>setShowPayroll(true)} whileHover={{scale:1.04}} whileTap={{scale:0.96}} onMouseEnter={()=>SFX.hover()} style={{color:'var(--teal)',borderColor:'var(--teal)'}}>PAYROLL SPLIT</motion.button>
        <motion.button className="btn btn-acid" onClick={()=>setShowAdd(true)} whileHover={{scale:1.04}} whileTap={{scale:0.96}} onMouseEnter={()=>SFX.hover()}>&gt; NEW RULE</motion.button>
      </div>
    </div>
    {showPayroll&&<PayrollSplitModal onSave={addPayrollSplit} onCancel={()=>setShowPayroll(false)}/>}
    {showAdd&&<AddRuleModal form={form} setForm={setForm} onSave={addRule} onCancel={()=>setShowAdd(false)}/>}
    <motion.div className="rule-list" variants={stagger} initial="hidden" animate="visible">
      {rules.length===0&&<div className="empty">&gt; NO RULES YET. ADD A RULE OR LOAD A TEMPLATE.</div>}
      {rules.map(r=>(<motion.div key={r.id} className={`rc ${r.active?'active-rule':'paused-rule'} ${r.type==='CONDITIONAL'?'cond-rule':''}`} variants={slideR}>
        <div>
          <div className="rn-row"><span className="rn">&gt; {r.name}</span>{r.isSplit&&<span className="badge" style={{color:'var(--teal)',borderColor:'var(--teal)'}}>SPLIT</span>}<span className={`badge ${r.type==='SCHEDULED'?'b-sched':'b-cond'}`}>{r.type}</span><span className={`badge ${r.active?'b-active':'b-paused'}`}>{r.active?'ACTIVE':'PAUSED'}</span></div>
          <div className="rd">{r.amount} {r.token} // TO: {r.recipient}{r.interval?` // EVERY ${r.interval}`:''}{r.cond?` // WHEN ${r.cond}`:''}</div>
          <div className="rd" style={{color:'var(--muted2)',marginTop:2}}>LIMIT: {r.limit} {r.token} // LAST: {r.last} // EXECUTIONS: {r.execCount||0}</div>
        </div>
        <div className="ra">
          <motion.button className="btn btn-sm" onClick={()=>toggleRule(r.id)} whileHover={{scale:1.05}} whileTap={{scale:0.95}}>{r.active?'PAUSE':'RESUME'}</motion.button>
          <motion.button className="btn btn-danger btn-sm" onClick={()=>deleteRule(r.id)} whileHover={{scale:1.05}} whileTap={{scale:0.95}}>DEL</motion.button>
        </div>
      </motion.div>))}
    </motion.div>
  </>)
}

function AddRuleModal({form,setForm,onSave,onCancel}){
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}))
  return(<motion.div className="modal-bg" variants={fadeIn} initial="hidden" animate="visible"><motion.div className="modal" variants={scaleIn} initial="hidden" animate="visible">
    <div className="modal-title">&gt; ADD RULE</div>
    <div className="fg"><label className="fl">// RULE NAME</label><input className="fi" placeholder="FRIDAY PAYROLL" value={form.name} onChange={f('name')}/></div>
    <div className="fr"><div className="fg"><label className="fl">// TYPE</label><select className="fse" value={form.type} onChange={f('type')}><option value="SCHEDULED">SCHEDULED</option><option value="CONDITIONAL">CONDITIONAL</option></select></div><div className="fg"><label className="fl">// TOKEN</label><select className="fse" value={form.token} onChange={f('token')}><option>USDC</option><option>ETH</option></select></div></div>
    <div className="fg"><label className="fl">// RECIPIENT ADDRESS</label><input className="fi" placeholder="0x..." value={form.recipient} onChange={f('recipient')}/></div>
    <div className="fr"><div className="fg"><label className="fl">// AMOUNT</label><input className="fi" type="number" placeholder="500" value={form.amount} onChange={f('amount')}/></div><div className="fg"><label className="fl">// SPEND LIMIT</label><input className="fi" type="number" placeholder="600" value={form.limit} onChange={f('limit')}/></div></div>
    {form.type==='SCHEDULED'&&<div className="fg"><label className="fl">// INTERVAL</label><select className="fse" value={form.interval} onChange={f('interval')}><option value="3600">EVERY HOUR</option><option value="86400">EVERY DAY</option><option value="604800">EVERY WEEK</option><option value="2592000">EVERY MONTH</option></select></div>}
    {form.type==='CONDITIONAL'&&<div className="fg"><label className="fl">// TRIGGER WHEN BALANCE EXCEEDS</label><input className="fi" type="number" placeholder="5000" value={form.condVal} onChange={f('condVal')}/></div>}
    <div className="ma"><motion.button className="btn" onClick={onCancel} whileHover={{scale:1.04}} whileTap={{scale:0.96}}>CANCEL</motion.button><motion.button className="btn btn-acid" onClick={()=>onSave(form)} whileHover={{scale:1.04}} whileTap={{scale:0.96}}>&gt; CREATE RULE</motion.button></div>
  </motion.div></motion.div>)
}

function PayrollSplitModal({onSave,onCancel}){
  const[recipients,setRecipients]=useState([{name:'',address:'',amount:''},{name:'',address:'',amount:''}])
  const[token,setToken]=useState('USDC');const[interval,setInterval]=useState('604800')
  const total=recipients.reduce((s,r)=>s+Number(r.amount||0),0)
  const upd=(i,k,v)=>setRecipients(r=>r.map((x,j)=>j===i?{...x,[k]:v}:x))
  return(<motion.div className="modal-bg" variants={fadeIn} initial="hidden" animate="visible"><motion.div className="modal modal-wide" variants={scaleIn} initial="hidden" animate="visible">
    <div className="modal-title">&gt; PAYROLL SPLIT</div>
    <div className="payroll-sub">Fan out a single payment to multiple wallets simultaneously. Your agent handles every transfer.</div>
    <div className="fr" style={{marginBottom:12}}><div className="fg"><label className="fl">// TOKEN</label><select className="fse" value={token} onChange={e=>setToken(e.target.value)}><option>USDC</option><option>ETH</option></select></div><div className="fg"><label className="fl">// FREQUENCY</label><select className="fse" value={interval} onChange={e=>setInterval(e.target.value)}><option value="86400">DAILY</option><option value="604800">WEEKLY</option><option value="2592000">MONTHLY</option></select></div></div>
    {recipients.map((r,i)=>(<div key={i} className="payroll-row"><input className="fi" style={{flex:1.2}} placeholder="Name" value={r.name} onChange={e=>upd(i,'name',e.target.value)}/><input className="fi" style={{flex:2}} placeholder="0x..." value={r.address} onChange={e=>upd(i,'address',e.target.value)}/><input className="fi" style={{flex:0.8}} type="number" placeholder="500" value={r.amount} onChange={e=>upd(i,'amount',e.target.value)}/>{recipients.length>2&&<button className="btn btn-danger btn-sm" onClick={()=>setRecipients(r=>r.filter((_,j)=>j!==i))}>X</button>}</div>))}
    <button className="btn btn-sm" style={{marginTop:8}} onClick={()=>setRecipients(r=>[...r,{name:'',address:'',amount:''}])}>+ ADD RECIPIENT</button>
    <div className="payroll-total">TOTAL: <span style={{color:'var(--acid)'}}>{total} {token}</span> to {recipients.filter(r=>r.amount).length} wallets</div>
    <div className="ma"><motion.button className="btn" onClick={onCancel} whileHover={{scale:1.04}} whileTap={{scale:0.96}}>CANCEL</motion.button><motion.button className="btn btn-acid" onClick={()=>onSave(recipients.filter(r=>r.amount),token,interval)} whileHover={{scale:1.04}} whileTap={{scale:0.96}}>&gt; CREATE SPLIT</motion.button></div>
  </motion.div></motion.div>)
}

function Templates({addRule,setNav}){
  const[used,setUsed]=useState({});const[editing,setEditing]=useState(null);const[addr,setAddr]=useState('')
  function use(t){if(!addr.trim()){setEditing(t.id);return}addRule({...t.rule,recipient:addr});setUsed(u=>({...u,[t.id]:true}));setEditing(null);setAddr('');SFX.deploy()}
  return(<>
    <div className="ph"><div><div className="pt">RULE TEMPLATES</div><div className="ps">PRE-BUILT PAYMENT AUTOMATION // ONE-CLICK SETUP</div></div></div>
    <motion.div className="templates-grid" variants={stagger} initial="hidden" animate="visible">
      {RULE_TEMPLATES.map(t=>(<motion.div key={t.id} className="template-card" variants={fadeUp} whileHover={{borderColor:'rgba(200,255,71,0.25)',background:'rgba(200,255,71,0.02)'}}>
        <div className="template-name">{t.name}</div>
        <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,letterSpacing:'0.1em',color:'var(--muted2)',marginBottom:8}}>{t.tag}</div>
        <div className="template-desc">{t.desc}</div>
        <div className="template-pitch">&gt; {t.pitch}</div>
        <div className="template-meta"><span className={`badge ${t.rule.type==='SCHEDULED'?'b-sched':'b-cond'}`}>{t.rule.type}</span><span className="badge b-active">{t.rule.token}</span><span style={{color:'var(--muted2)',fontSize:12,letterSpacing:'0.06em'}}>{t.rule.amount} {t.rule.token}</span></div>
        {editing===t.id&&<motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} style={{marginTop:10}}><input className="fi" placeholder="RECIPIENT ADDRESS (0x...)" value={addr} onChange={e=>setAddr(e.target.value)} style={{marginBottom:8}}/><div style={{display:'flex',gap:8}}><motion.button className="btn btn-acid btn-sm" onClick={()=>use(t)} whileHover={{scale:1.04}} whileTap={{scale:0.96}} style={{flex:1}}>&gt; CONFIRM</motion.button><motion.button className="btn btn-sm" onClick={()=>{setEditing(null);setAddr('')}} whileHover={{scale:1.04}} whileTap={{scale:0.96}}>CANCEL</motion.button></div></motion.div>}
        {editing!==t.id&&<motion.button className={`btn btn-sm ${used[t.id]?'':'btn-acid'}`} style={{marginTop:10,width:'100%'}} onClick={()=>{if(!used[t.id])setEditing(t.id)}} whileHover={used[t.id]?{}:{scale:1.04}} whileTap={used[t.id]?{}:{scale:0.96}} onMouseEnter={()=>SFX.hover()}>{used[t.id]?'RULE ADDED':'> USE TEMPLATE'}</motion.button>}
      </motion.div>))}
    </motion.div>
  </>)
}

function KeeperFeedView({logs,keeperOn,chain,onToggle}){
  const clsColor={system:'var(--muted2)',poll:'#5a8a5e',exec:'var(--amber)',tx:'var(--teal)',ok:'var(--acid)',err:'var(--red)',idle:'#3a3830'}
  const clsPrefix={system:'[SYS]',poll:'[POL]',exec:'[EXE]',tx:'[TX ]',ok:'[OK ]',err:'[ERR]',idle:'[---]'}
  return(<>
    <div className="ph"><div><div className="pt">KEEPER FEED</div><div className="ps">LIVE AGENT EXECUTION LOG // {chain?.shortName||'ARB SEPOLIA'}</div></div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        {keeperOn&&<div style={{display:'flex',alignItems:'center',gap:6,fontFamily:"'Share Tech Mono',monospace",fontSize:12,letterSpacing:'0.1em',color:'var(--acid)'}}><motion.span style={{width:7,height:7,borderRadius:'50%',background:'var(--acid)',display:'inline-block'}} animate={{opacity:[1,0.2,1]}} transition={{repeat:Infinity,duration:1.2}}/>LIVE</div>}
        <motion.button className={`btn ${keeperOn?'btn-danger':''}`} onClick={onToggle} whileHover={{scale:1.04}} whileTap={{scale:0.96}} onMouseEnter={()=>SFX.hover()}>{keeperOn?'> STOP':'> START KEEPER'}</motion.button>
      </div>
    </div>
    <motion.div className="stats" style={{gridTemplateColumns:'repeat(4,1fr)',marginBottom:14}} variants={stagger} initial="hidden" animate="visible">
      {[{label:'TOTAL LOGS',value:logs.length,sub:'THIS SESSION'},{label:'CONFIRMED',value:logs.filter(l=>l.cls==='ok').length,sub:'EXECUTIONS',accent:true},{label:'ERRORS',value:logs.filter(l=>l.cls==='err').length,sub:'RETRYING'},{label:'STATUS',value:keeperOn?'ON':'OFF',sub:keeperOn?'POLLING 30S':'STOPPED'}].map(c=>(<motion.div key={c.label} className="sc" variants={fadeUp}><div className="sl">{c.label}</div><div className={`sv ${c.accent?'accent':''}`} style={c.label==='STATUS'?{color:keeperOn?'var(--acid)':'var(--muted2)',fontSize:22}:{}}>{c.value}</div><div className="ss">{c.sub}</div></motion.div>))}
    </motion.div>
    <div className="keeper-terminal">
      <div className="keeper-terminal-header"><span style={{color:'var(--muted2)'}}>// KEEPER BOT — {chain?.name||'ARBITRUM SEPOLIA'} — REAL-TIME</span><span style={{color:'var(--muted2)',fontSize:12}}>{logs.length} LINES</span></div>
      <div className="keeper-terminal-body">
        {logs.length===0&&<div style={{color:'var(--muted2)',fontFamily:"'Share Tech Mono',monospace",fontSize:13,padding:'20px 0',textAlign:'center'}}>{keeperOn?'> connecting to sequencer...':'> keeper stopped. click START KEEPER to begin.'}</div>}
        {logs.map(l=>(<motion.div key={l.id} initial={{opacity:0,x:-4}} animate={{opacity:1,x:0}} transition={{duration:0.15}} className="keeper-line"><span className="keeper-time">{l.time}</span><span className="keeper-type" style={{color:clsColor[l.cls]||'var(--muted2)'}}>{clsPrefix[l.cls]||'[---]'}</span><span className="keeper-msg" style={{color:clsColor[l.cls]||'var(--text)'}}>{l.msg}</span></motion.div>))}
      </div>
    </div>
  </>)
}

function AIRuleSuggester({rules,addRule}){
  const[desc,setDesc]=useState('');const[loading,setLoading]=useState(false);const[sugs,setSugs]=useState([]);const[error,setError]=useState('');const[added,setAdded]=useState({})
  async function get(){if(!desc.trim())return;setLoading(true);setError('');setSugs([]);SFX.exec();try{const r=await suggestRules(desc,rules);setSugs(r);SFX.done()}catch(e){setError(e.message||'REQUEST FAILED');SFX.err()}finally{setLoading(false)}}
  const examples=['Lagos fintech startup paying 8 contractors weekly in USDC','DeFi protocol sweeping yield to treasury when APY drops','E-commerce brand paying suppliers monthly']
  return(<>
    <div className="ph"><div><div className="pt">AI RULE SUGGESTER</div><div className="ps">NATURAL LANGUAGE TO ON-CHAIN AUTOMATION // GROQ AI</div></div><div style={{display:'flex',alignItems:'center',padding:'4px 12px',background:'rgba(200,255,71,0.08)',border:'1px solid rgba(200,255,71,0.25)',fontFamily:"'Share Tech Mono',monospace",fontSize:11,letterSpacing:'0.12em',color:'var(--acid)'}}>POWERED BY GROQ</div></div>
    <motion.div className="ai-box" variants={scaleIn} initial="hidden" animate="visible">
      <div className="ai-box-label">// DESCRIBE YOUR BUSINESS OR PAYMENT NEEDS</div>
      <textarea className="ai-textarea" placeholder="E.g. Lagos fintech startup paying 8 remote contractors weekly in USDC, plus daily gas budget..." value={desc} onChange={e=>setDesc(e.target.value)} rows={4}/>
      <div className="ai-examples">{examples.map((e,i)=>(<button key={i} className="ai-example-btn" onClick={()=>setDesc(e)} onMouseEnter={()=>SFX.hover()}>&gt; {e}</button>))}</div>
      <motion.button className="wallet-btn" onClick={get} disabled={!desc.trim()||loading} style={!desc.trim()||loading?{opacity:.5,cursor:'not-allowed'}:{}} whileHover={desc.trim()&&!loading?{scale:1.02}:{}} whileTap={desc.trim()&&!loading?{scale:0.98}:{}}>{loading?'> ANALYZING YOUR BUSINESS...':'> GENERATE RULES WITH AI'}</motion.button>
      {error&&<div className="auth-err" style={{marginTop:12}}>&gt; ERROR: {error}</div>}
    </motion.div>
    {loading&&<motion.div className="ai-loading" variants={fadeIn} initial="hidden" animate="visible"><div className="ai-loading-bar"><motion.div className="ai-loading-fill" animate={{width:['0%','100%']}} transition={{duration:1.5,repeat:Infinity,ease:'easeInOut'}}/></div><div className="ai-loading-text">&gt; GROQ ANALYZING BUSINESS MODEL...</div></motion.div>}
    {sugs.length>0&&<><div className="sh" style={{marginTop:14}}><div className="st">// AI GENERATED RULES ({sugs.length}) — CLICK TO ADD TO YOUR AGENT</div></div>
    <motion.div className="rule-list" variants={stagger} initial="hidden" animate="visible">
      {sugs.map((s,i)=>(<motion.div key={i} className="ai-suggestion" variants={slideR}>
        <div className="ai-sug-top"><span className="rn">&gt; {s.name}</span><span className={`badge ${s.type==='SCHEDULED'?'b-sched':'b-cond'}`}>{s.type}</span><span className="badge b-active">{s.token}</span></div>
        <div className="rd">{s.amount} {s.token} // {s.type==='SCHEDULED'?fmtInt(s.interval):`WHEN BALANCE > ${s.condVal}`}</div>
        <div className="ai-reasoning">&gt; {s.reasoning}</div>
        <div style={{marginTop:10}}>{added[i]?<span className="ai-added">RULE ADDED TO YOUR AGENT</span>:<motion.button className="btn btn-acid btn-sm" onClick={()=>{addRule({name:s.name,type:s.type,token:s.token,recipient:s.recipient||'0x0000...0000',amount:s.amount,limit:s.limit,interval:s.interval||'604800',condVal:s.condVal||''});setAdded(a=>({...a,[i]:true}));SFX.deploy()}} whileHover={{scale:1.05}} whileTap={{scale:0.95}}>&gt; ADD TO AGENT</motion.button>}</div>
      </motion.div>))}
    </motion.div></>}
  </>)
}

function Log({log,simulate,txBase,rules}){
  const hasRules = rules?.length > 0
  return(<>
    <div className="ph"><div><div className="pt">ACTIVITY LOG</div><div className="ps">{log.length} TRANSACTIONS EXECUTED BY YOUR AGENT</div></div>{hasRules&&<motion.button className="btn" onClick={simulate} whileHover={{scale:1.04}} whileTap={{scale:0.96}} onMouseEnter={()=>SFX.hover()}>&gt; SIMULATE</motion.button>}</div>
    <motion.div className="log-list" variants={stagger} initial="hidden" animate="visible">
      {log.length===0&&<div className="empty">&gt; NO ACTIVITY YET. ADD RULES AND SIMULATE EXECUTIONS.</div>}
      {log.map(e=>(<motion.div key={e.id} variants={slideR}><LogItem entry={e} txBase={txBase}/></motion.div>))}
    </motion.div>
  </>)
}

function LogItem({entry:e,txBase='https://sepolia.arbiscan.io/tx/'}){
  return(<div className="li">
    <span className="li-chev">&gt;</span>
    <div className="lit"><div className="lit-rule">{e.rule}</div><div className="lit-to">{e.to}</div></div>
    <span className="lam">{e.amount} {e.token}</span>
    <span className="ltm">{e.time}</span>
    {e.txHash&&<a href={txBase+e.txHash} target="_blank" rel="noreferrer" className="tx-link" onClick={ev=>ev.stopPropagation()} title="View on explorer">TX</a>}
  </div>)
}

function Settings({agentOn,setAgentOn,address,agentAddr,chain,chains,activeChain,switchChain,agentEth,agentExecs,totalUsers}){
  return(<>
    <div className="ph"><div><div className="pt">SETTINGS</div><div className="ps">AGENT CONFIGURATION // MULTI-CHAIN DEPLOYMENT</div></div></div>
    {/* Chain panel */}
    <motion.div className="chain-panel" variants={fadeUp} initial="hidden" animate="visible">
      <div className="chain-panel-title">// DEPLOYED CHAINS</div>
      <div className="chain-panel-sub">CFO Agent is live on two networks. Click a card to switch chains and MetaMask network simultaneously.</div>
      <div className="chain-panel-grid">
        {Object.entries(chains).map(([key,c])=>(
          <motion.div key={key} className={`chain-card ${activeChain===key?'chain-card-active':''}`} style={activeChain===key?{borderColor:c.color}:{}} onClick={()=>switchChain(key)} whileHover={{scale:1.01}} whileTap={{scale:0.98}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <c.Logo size={22}/>
                <div>
                  <div style={{fontFamily:"'VT323',monospace",fontSize:18,letterSpacing:'0.1em',color:activeChain===key?c.color:'var(--bright)'}}>{c.name}</div>
                  <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,letterSpacing:'0.1em',color:'var(--muted2)'}}>CHAIN ID: {c.id}</div>
                </div>
              </div>
              {activeChain===key&&<span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,letterSpacing:'0.12em',color:c.color}}>ACTIVE</span>}
            </div>
            <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,letterSpacing:'0.05em',color:'var(--muted2)',lineHeight:2.2}}>
              <div>FACTORY:   {c.factory.slice(0,22)}...</div>
              <div>REGISTRY:  {c.registry.slice(0,22)}...</div>
              <div>SEQUENCER: {c.sequencer.slice(0,22)}...</div>
            </div>
            <a href={`${c.explorer}/address/${c.factory}`} target="_blank" rel="noreferrer" onClick={ev=>ev.stopPropagation()} style={{display:'block',marginTop:10,fontFamily:"'Share Tech Mono',monospace",fontSize:10,letterSpacing:'0.08em',color:c.color,textDecoration:'none'}}>
              VIEW ON EXPLORER: {c.explorer.replace('https://','')}
            </a>
          </motion.div>
        ))}
      </div>
    </motion.div>
    {/* Agent stats */}
    <motion.div className="two" style={{marginBottom:14}} variants={stagger} initial="hidden" animate="visible">
      {[
        {label:'YOUR WALLET',val:truncAddr(address)||'NOT CONNECTED',sub:'SIWE AUTHENTICATED',cls:'teal'},
        {label:'YOUR AGENT',val:truncAddr(agentAddr)||'NOT DEPLOYED',sub:`${chain?.name} // CHAIN ${chain?.id}`,cls:'teal'},
        {label:'AGENT ETH BALANCE',val:fmtEth(agentEth)+' ETH',sub:'REAL ON-CHAIN BALANCE',cls:'acid'},
        {label:'TOTAL EXECUTIONS',val:agentExecs.toString(),sub:'CONFIRMED ON-CHAIN',cls:'acid'},
        {label:'TOTAL USERS',val:totalUsers.toString(),sub:'AGENTS DEPLOYED GLOBALLY',cls:''},
        {label:'AI ENGINE',val:'GROQ AI',sub:'llama-3.3-70b-versatile // FAST',cls:''},
      ].map(c=>(<motion.div key={c.label} className="sc" variants={fadeUp}><div className="sl">{c.label}</div><div className={`mono-val ${c.cls}`}>{c.val}</div><div className="ss">{c.sub}</div></motion.div>))}
      <motion.div className="sc full" style={{borderTop:`3px solid ${agentOn?'var(--acid)':'var(--red)'}`}} variants={fadeUp}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
          <div><div className="sl">EMERGENCY KILL SWITCH</div><div style={{fontSize:13,marginTop:5,color:'var(--muted2)',letterSpacing:'0.06em'}}>{agentOn?'AGENT ACTIVE. ALL CONFIGURED RULES WILL EXECUTE.':'AGENT PAUSED. NO TRANSACTIONS WILL EXECUTE UNTIL REACTIVATED.'}</div></div>
          <motion.button className={`btn ${agentOn?'btn-danger':'btn-acid'}`} onClick={()=>setAgentOn(v=>!v)} whileHover={{scale:1.04}} whileTap={{scale:0.96}} onMouseEnter={()=>SFX.hover()}>{agentOn?'> DEACTIVATE AGENT':'> ACTIVATE AGENT'}</motion.button>
        </div>
      </motion.div>
    </motion.div>
  </>)
}
