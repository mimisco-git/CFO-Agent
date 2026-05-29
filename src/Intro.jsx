import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SFX } from './lib/audio.js'

// ---- ASCII ART ----
const CFO_ASCII = `
  .-------------.
  | | | | | | | |
  | | | | | | | |
  \\ \\ \\V/ / / /
  .'---.---.--.
  / CFO  AGENT  \\
  | TREASURY OS |
  | ARBITRUM NET|
  \\ ___________/
   '-----v-----'
         |
  .------+------.
  | RULE ENGINE |
  | SEQUENCER   |
  | AI SUGGEST  |
  '-------------'`

const CHARS = '0123456789ABCDEF@#$%^&+=<>?[]{}|~'
function randChar() { return CHARS[Math.floor(Math.random() * CHARS.length)] }
function randStr(len) { return Array.from({length:len},()=>randChar()).join('') }

// ---- WALLET LOGOS (SVG, no emojis) ----
const MetaMaskLogo = () => (
  <svg width="22" height="22" viewBox="0 0 35 33" fill="none">
    <polygon points="32.9,1 19.4,10.7 21.9,4.6" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round"/>
    <polygon points="2.1,1 15.5,10.8 13.1,4.6" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
    <polygon points="28.1,23.5 24.4,29.1 32.1,31.2 34.3,23.6" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
    <polygon points="0.7,23.6 2.9,31.2 10.6,29.1 6.9,23.5" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
    <polygon points="10.2,14.5 8,17.8 15.7,18.1 15.4,9.8" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
    <polygon points="24.8,14.5 19.5,9.7 19.4,18.1 27.0,17.8" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
    <polygon points="10.6,29.1 15.2,26.8 11.2,23.7" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
    <polygon points="19.8,26.8 24.4,29.1 23.8,23.7" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const CoinbaseLogo = () => (
  <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="14" fill="#0052FF"/>
    <circle cx="14" cy="14" r="8.5" fill="white"/>
    <rect x="10.5" y="12" width="7" height="4" rx="1" fill="#0052FF"/>
  </svg>
)

const BraveLogo = () => (
  <svg width="22" height="22" viewBox="0 0 24 28" fill="none">
    <path d="M22.5 8.5L24 6l-1.5-1.5L21 6l-1.5-1.5L18 6l1.5 2.5-1 3.5 1.5 5 1.5-1L23 14l-.5-5.5z" fill="#FF4724"/>
    <path d="M12 1L1 5.5l1.5 11L12 27l9.5-10.5L23 5.5z" fill="#FF4724"/>
    <path d="M12 1L1 5.5l1.5 11L12 27V1z" fill="#FF6C40"/>
    <path d="M8 12l1 4 3-1 3 1 1-4-2-2H10z" fill="white"/>
  </svg>
)

const WalletLogo = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="5" width="20" height="15" rx="3" stroke="var(--acid)" strokeWidth="1.5"/>
    <path d="M16 12.5C16 13.33 16.67 14 17.5 14S19 13.33 19 12.5 18.33 11 17.5 11 16 11.67 16 12.5z" fill="var(--acid)"/>
    <path d="M2 9h20" stroke="var(--acid)" strokeWidth="1.5"/>
  </svg>
)

// ---- BOOT LINES ----
const BOOT_LINES = [
  { text:'cfo-agent@arbitrum:~$ init --connect 2026', color:'#c8ff47' },
  { text:'[OK] signal acquired :: treasury relay online', color:'#47ffd4' },
  { text:'[OK] 03 modules :: rule-engine :: sequencer :: ai', color:'#47ffd4' },
  { text:'[OK] factory    :: 0xF1EE2CC9741547cAf0...', color:'#47ffd4' },
  { text:'[OK] registry   :: 0x5eadac819B2206B960...', color:'#47ffd4' },
  { text:'[OK] groq ai    :: llama-3.3-70b :: READY', color:'#c8ff47' },
  { text:'> select wallet node to continue:', color:'#b8b49e' },
]

const WALLET_NODES = [
  { id:'metamask', label:'NODE_01', name:'METAMASK',     Logo:MetaMaskLogo,  cmd:'./connect --wallet metamask',  color:'#c8ff47' },
  { id:'coinbase', label:'NODE_02', name:'COINBASE',     Logo:CoinbaseLogo,  cmd:'./connect --wallet coinbase',  color:'#47ffd4' },
  { id:'brave',    label:'NODE_03', name:'BRAVE WALLET', Logo:BraveLogo,     cmd:'./connect --wallet brave',     color:'#ffb347' },
  { id:'injected', label:'NODE_04', name:'ANY WALLET',   Logo:WalletLogo,    cmd:'./connect --wallet injected',  color:'#b8b49e' },
]

// ---- SCENE 0: PRESS ANY KEY ----
function GateScene({ onStart }) {
  return (
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',padding:24,textAlign:'center'}} onClick={onStart}>
      <div style={{fontFamily:"'VT323',monospace",fontSize:'clamp(16px,4.5vw,22px)',letterSpacing:'0.25em',color:'#5a5848',animation:'blink 1.8s infinite',marginBottom:16,lineHeight:1.6}}>
        PRESS ANY KEY TO BEGIN<br/>TRANSMISSION
      </div>
      <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(10px,2.5vw,12px)',letterSpacing:'0.15em',color:'#2a2820'}}>
        CFO AGENT // ARBITRUM TREASURY OS // 2026
      </div>
    </div>
  )
}

// ---- SCENE 1: CHARACTER RAIN ----
function RainScene({ onDone }) {
  const [lines, setLines] = useState([])
  const [fade, setFade]   = useState(1)
  const cols = Math.max(20, Math.floor(Math.min(window.innerWidth * 0.9, 680) / 9))

  useEffect(() => {
    let count = 0
    const id = setInterval(() => {
      setLines(prev => {
        const next = [...prev]
        next[Math.floor(Math.random() * 14)] = randStr(cols)
        return next
      })
      SFX.rain(); count++
      if(count > 55) clearInterval(id)
    }, 45)
    const ft = setTimeout(() => { setFade(0); setTimeout(onDone, 500) }, 2600)
    return () => { clearInterval(id); clearTimeout(ft) }
  }, [])

  return (
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',justifyContent:'flex-end',padding:'16px 12px',opacity:fade,transition:'opacity 0.5s ease'}}>
      {Array.from({length:14},(_,i)=>(
        <div key={i} style={{fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(9px,2vw,12px)',color:'#4a4838',letterSpacing:'0.05em',whiteSpace:'nowrap',overflow:'hidden',lineHeight:1.6}}>
          {lines[i] || randStr(Math.floor(Math.random()*cols*.3))}
        </div>
      ))}
      <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(9px,2vw,11px)',color:'#2a2820',letterSpacing:'0.1em',marginTop:10}}>
        // CFO AGENT / TREASURY OS &bull; AWAITING SCENE 02 / TRANSMISSION_
      </div>
    </div>
  )
}

// ---- SCENE 2: ASCII ART ----
function AsciiScene({ onDone }) {
  const [lines, setLines] = useState([])
  const artLines = CFO_ASCII.trim().split('\n')

  useEffect(() => {
    let i = 0
    const id = setInterval(() => {
      if(i >= artLines.length) { clearInterval(id); setTimeout(onDone, 900); return }
      setLines(prev => [...prev, artLines[i]])
      SFX.rain(); i++
    }, 75)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(11px,2.5vw,15px)',color:'#4a4838',letterSpacing:'0.04em',lineHeight:1.5,textAlign:'center'}}>
        {lines.map((l,i)=><div key={i} style={{whiteSpace:'pre'}}>{l}</div>)}
      </div>
      {lines.length >= artLines.length && (
        <div style={{fontFamily:"'VT323',monospace",fontSize:'clamp(14px,3.5vw,18px)',color:'#b8b49e',letterSpacing:'0.2em',marginTop:20,animation:'blink 1s infinite'}}>
          // SIGNAL DETECTED / INITIALIZING...
        </div>
      )}
    </div>
  )
}

// ---- SCENE 3: TERMINAL BOOT - CENTERED ----
function BootScene({ onDone }) {
  const [visible, setVisible] = useState([])

  useEffect(() => {
    BOOT_LINES.forEach((l, i) => {
      setTimeout(() => {
        setVisible(prev => [...prev, l]); SFX.line()
        if(i === BOOT_LINES.length - 1) setTimeout(onDone, 500)
      }, i * 480)
    })
  }, [])

  return (
    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',padding:'clamp(16px,5vw,40px)'}}>
      <div style={{width:'100%',maxWidth:560}}>
        {visible.map((l, i) => (
          <motion.div key={i} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} transition={{duration:0.2}} style={{fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(11px,2.5vw,14px)',color:l.color,letterSpacing:'0.07em',lineHeight:2.2,wordBreak:'break-all'}}>
            &gt; {l.text}
          </motion.div>
        ))}
        {visible.length > 0 && (
          <motion.div animate={{opacity:[1,0,1]}} transition={{repeat:Infinity,duration:0.7}} style={{display:'inline-block',width:9,height:16,background:'#c8c4a8',marginTop:4,verticalAlign:'middle'}}/>
        )}
      </div>
    </div>
  )
}

// ---- SCENE 4: WALLET NODE SELECTION - CENTERED CARD ----
function NodeScene({ wallets, onSelect }) {
  const detected = wallets.map(w => w.id)

  return (
    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',padding:'clamp(12px,4vw,24px)',overflowY:'auto'}}>
      <div style={{width:'100%',maxWidth:480,background:'rgba(0,0,0,0.9)',border:'1px solid #2a2820'}}>
        {/* Terminal header */}
        <div style={{padding:'clamp(10px,3vw,14px) clamp(12px,3vw,16px)',borderBottom:'1px solid #1a1a16'}}>
          <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(10px,2vw,12px)',letterSpacing:'0.08em',color:'#c8ff47',lineHeight:2}}>&gt; cfo-agent@arbitrum:~$ init --connect 2026</div>
          <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(10px,2vw,12px)',letterSpacing:'0.08em',color:'#47ffd4',lineHeight:2}}>&gt; [OK] signal acquired :: relay online</div>
          <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(10px,2vw,12px)',letterSpacing:'0.08em',color:'#b8b49e',lineHeight:2}}>&gt; {WALLET_NODES.length} nodes detected :: select wallet:</div>
        </div>

        {/* Wallet rows */}
        <div style={{display:'flex',flexDirection:'column',gap:1,background:'#1a1a16'}}>
          {WALLET_NODES.map((node, i) => {
            const isDetected = detected.includes(node.id)
            return (
              <motion.div key={node.id}
                initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}}
                transition={{delay:i*0.1,duration:0.25}}
                onClick={()=>{
                  SFX.launch()
                  const found = wallets.find(w=>w.id===node.id)
                  onSelect(found || wallets[0] || null)
                }}
                onMouseEnter={()=>SFX.hover()}
                style={{background:'#000',padding:'clamp(12px,3vw,16px)',cursor:'pointer',display:'flex',alignItems:'center',gap:14,borderLeft:'3px solid transparent',transition:'border-color .15s,background .15s'}}
                whileHover={{borderColor:node.color,backgroundColor:'#0a0a08'}}
                whileTap={{scale:0.98}}>
                <div style={{flexShrink:0}}><node.Logo/></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'VT323',monospace",fontSize:'clamp(17px,5vw,22px)',letterSpacing:'0.1em',color:'#d4d0b8'}}>{node.name}</div>
                  <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(9px,2vw,11px)',letterSpacing:'0.07em',color:'#3a3830',marginTop:2}}>&gt; {node.cmd}</div>
                </div>
                <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(9px,2vw,11px)',letterSpacing:'0.1em',color:isDetected?'#47ffd4':'#3a3830',flexShrink:0}}>
                  {isDetected ? '// LIVE' : '// CONNECT'}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{padding:'8px clamp(12px,3vw,16px)',borderTop:'1px solid #1a1a16',display:'flex',justifyContent:'space-between',fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(9px,2vw,11px)',letterSpacing:'0.12em',color:'#2a2820'}}>
          <span>// CFO AGENT / ARB TREASURY OS</span>
          <span>CLICK TO ENTER</span>
        </div>
      </div>
    </div>
  )
}

// ---- MAIN INTRO ----
export default function Intro({ onComplete, wallets = [] }) {
  const [scene, setScene] = useState(0)

  function next() { setScene(s => s + 1) }

  function handleStart() {
    SFX.init(); SFX.initialize()
    setTimeout(() => { SFX.startDrone(); next() }, 400)
  }

  useEffect(() => {
    if(scene !== 0) return
    const h = e => {
      if(['Shift','Control','Alt','Meta','Tab','CapsLock'].includes(e.key)) return
      handleStart()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [scene])

  return (
    <div style={{position:'fixed',inset:0,background:'#000',overflow:'hidden',fontFamily:"'VT323',monospace"}} className="crt">
      <div className="scanline"/>

      {/* Status bar */}
      {scene >= 1 && (
        <div style={{position:'absolute',top:0,left:0,right:0,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px clamp(12px,4vw,20px)',borderBottom:'1px solid #1a1a16',fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(10px,2.5vw,13px)',letterSpacing:'0.12em',zIndex:10,background:'#000'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{width:7,height:7,borderRadius:'50%',background:scene>=3?'#c8ff47':'#ffb347',display:'inline-block',animation:'pulse 1.2s infinite'}}/>
            <span style={{color:scene>=3?'#c8ff47':'#ffb347'}}>SIGNAL : {scene>=3?'LOCKED':'UNSTABLE'}</span>
          </div>
          <span style={{color:'#3a3830'}}>2140 / CFO-AGENT</span>
        </div>
      )}

      {/* Scene content */}
      <div style={{position:'absolute',top:scene>=1?33:0,left:0,right:0,bottom:0}}>
        <AnimatePresence mode="wait">
          {scene===0&&<motion.div key="s0" style={{position:'absolute',inset:0}} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0,transition:{duration:0.3}}}><GateScene onStart={handleStart}/></motion.div>}
          {scene===1&&<motion.div key="s1" style={{position:'absolute',inset:0}} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0,transition:{duration:0.5}}}><RainScene onDone={next}/></motion.div>}
          {scene===2&&<motion.div key="s2" style={{position:'absolute',inset:0}} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><AsciiScene onDone={next}/></motion.div>}
          {scene===3&&<motion.div key="s3" style={{position:'absolute',inset:0}} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}><BootScene onDone={next}/></motion.div>}
          {scene===4&&<motion.div key="s4" style={{position:'absolute',inset:0}} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><NodeScene wallets={wallets} onSelect={onComplete}/></motion.div>}
        </AnimatePresence>
      </div>
    </div>
  )
}
