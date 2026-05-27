/**
 * Intro.jsx - Hermians-style multi-scene intro
 * Scene 0: PRESS ANY KEY / TAP TO BEGIN
 * Scene 1: Character rain
 * Scene 2: ASCII art reveal
 * Scene 3: Terminal boot
 * Scene 4: Wallet node selection
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SFX } from './lib/audio.js'

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

// ---- SCENE 0: Press any key ----
function GateScene({ onStart }) {
  return (
    <div style={{
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      height:'100%', padding:24, textAlign:'center',
      cursor:'pointer',
    }} onClick={onStart}>
      <div style={{
        fontFamily:"'VT323',monospace",
        fontSize:'clamp(16px,4.5vw,22px)',
        letterSpacing:'0.25em',
        color:'#5a5848',
        animation:'blink 1.8s infinite',
        marginBottom:16,
        lineHeight:1.5,
      }}>
        PRESS ANY KEY TO BEGIN<br/>TRANSMISSION
      </div>
      <div style={{
        fontFamily:"'Share Tech Mono',monospace",
        fontSize:'clamp(10px,2.5vw,12px)',
        letterSpacing:'0.15em',
        color:'#2a2820',
      }}>
        CFO AGENT // ARBITRUM TREASURY OS
      </div>
    </div>
  )
}

// ---- SCENE 1: Character rain ----
function RainScene({ onDone }) {
  const [lines, setLines] = useState([])
  const [fade, setFade] = useState(1)
  const cols = Math.floor(Math.min(window.innerWidth, 700) / 9)

  useEffect(() => {
    let count = 0
    const id = setInterval(() => {
      setLines(prev => {
        const next = [...prev]
        const row = Math.floor(Math.random() * 16)
        next[row] = randStr(cols)
        return next
      })
      SFX.rain()
      count++
      if (count > 55) clearInterval(id)
    }, 45)

    const fadeTimer = setTimeout(() => {
      setFade(0)
      setTimeout(onDone, 500)
    }, 2600)

    return () => { clearInterval(id); clearTimeout(fadeTimer) }
  }, [])

  return (
    <div style={{
      width:'100%', height:'100%',
      display:'flex', flexDirection:'column',
      justifyContent:'flex-end', padding:'16px 12px',
      opacity:fade, transition:'opacity 0.5s ease',
    }}>
      {Array.from({length:16},(_,i)=>(
        <div key={i} style={{
          fontFamily:"'Share Tech Mono',monospace",
          fontSize:'clamp(9px,2vw,12px)',
          color:'#4a4838',
          letterSpacing:'0.05em',
          whiteSpace:'pre',
          lineHeight:1.5,
          overflow:'hidden',
        }}>
          {lines[i] || randStr(Math.floor(Math.random()*cols*0.4))}
        </div>
      ))}
      <div style={{
        fontFamily:"'Share Tech Mono',monospace",
        fontSize:'clamp(9px,2vw,11px)',
        color:'#2a2820',
        letterSpacing:'0.12em',
        marginTop:12,
      }}>
        // CFO AGENT / TREASURY OS &bull; AWAITING SCENE 02 / TRANSMISSION_
      </div>
    </div>
  )
}

// ---- SCENE 2: ASCII art ----
function AsciiScene({ onDone }) {
  const [lines, setLines] = useState([])
  const artLines = CFO_ASCII.trim().split('\n')

  useEffect(() => {
    let i = 0
    const id = setInterval(() => {
      if (i >= artLines.length) {
        clearInterval(id)
        setTimeout(onDone, 1000)
        return
      }
      setLines(prev => [...prev, artLines[i]])
      SFX.rain()
      i++
    }, 75)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      height:'100%', padding:20,
    }}>
      <div style={{
        fontFamily:"'Share Tech Mono',monospace",
        fontSize:'clamp(11px,2.5vw,15px)',
        color:'#4a4838',
        letterSpacing:'0.04em',
        lineHeight:1.5,
        textAlign:'center',
      }}>
        {lines.map((l,i)=>(
          <div key={i} style={{whiteSpace:'pre'}}>{l}</div>
        ))}
      </div>
      {lines.length >= artLines.length && (
        <div style={{
          fontFamily:"'VT323',monospace",
          fontSize:'clamp(14px,3.5vw,18px)',
          color:'#b8b49e',
          letterSpacing:'0.2em',
          marginTop:20,
          animation:'blink 1s infinite',
        }}>
          // SIGNAL DETECTED / INITIALIZING...
        </div>
      )}
    </div>
  )
}

// ---- SCENE 3: Terminal boot ----
const BOOT_LINES = [
  { text:'cfo-agent@arbitrum:~$ init --connect 2026', color:'#c8ff47' },
  { text:'[OK] signal acquired :: treasury relay online', color:'#47ffd4' },
  { text:'[OK] 03 modules :: rule-engine :: sequencer :: ai', color:'#47ffd4' },
  { text:'[OK] factory :: 0xF1EE2CC9741547cAf0...', color:'#47ffd4' },
  { text:'[OK] registry :: 0x5eadac819B2206B960...', color:'#47ffd4' },
  { text:'[OK] groq ai :: llama3-8b :: READY', color:'#c8ff47' },
  { text:'> select wallet to continue:', color:'#b8b49e' },
]

function BootScene({ onDone }) {
  const [visible, setVisible] = useState([])

  useEffect(() => {
    BOOT_LINES.forEach((l, i) => {
      setTimeout(() => {
        setVisible(prev => [...prev, l])
        SFX.line()
        if (i === BOOT_LINES.length - 1) setTimeout(onDone, 500)
      }, i * 500)
    })
  }, [])

  return (
    <div style={{
      display:'flex', flexDirection:'column',
      justifyContent:'center', height:'100%',
      padding:'clamp(16px,4vw,24px)',
      paddingTop:32,
    }}>
      {visible.map((l, i) => (
        <motion.div key={i}
          initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}}
          transition={{duration:0.2}}
          style={{
            fontFamily:"'Share Tech Mono',monospace",
            fontSize:'clamp(11px,2.5vw,14px)',
            color:l.color,
            letterSpacing:'0.07em',
            lineHeight:2,
            wordBreak:'break-all',
          }}>
          &gt; {l.text}
        </motion.div>
      ))}
      {visible.length > 0 && (
        <div style={{
          display:'inline-block',
          width:8, height:15,
          background:'#c8c4a8',
          animation:'blink 0.7s infinite',
          marginTop:4,
        }}/>
      )}
    </div>
  )
}

// ---- SCENE 4: Node/wallet selection ----
const WALLET_NODES = [
  { id:'metamask', label:'NODE_01', name:'METAMASK',      icon:'🦊', cmd:'./connect --wallet metamask',  color:'#c8ff47' },
  { id:'coinbase', label:'NODE_02', name:'COINBASE',       icon:'🔵', cmd:'./connect --wallet coinbase',  color:'#47ffd4' },
  { id:'brave',    label:'NODE_03', name:'BRAVE WALLET',   icon:'🦁', cmd:'./connect --wallet brave',     color:'#ffb347' },
  { id:'injected', label:'NODE_04', name:'ANY WALLET',     icon:'🔗', cmd:'./connect --wallet injected',  color:'#b8b49e' },
]

function NodeScene({ wallets, onSelect }) {
  const available = wallets.length > 0
    ? WALLET_NODES.filter(n => wallets.some(w=>w.id===n.id) || n.id==='injected')
    : WALLET_NODES

  return (
    <div style={{
      display:'flex', flexDirection:'column',
      height:'100%', padding:'clamp(12px,3vw,20px)',
      paddingTop:40, overflowY:'auto',
    }}>
      {/* Terminal header */}
      <div style={{
        fontFamily:"'Share Tech Mono',monospace",
        fontSize:'clamp(11px,2.5vw,14px)',
        letterSpacing:'0.08em',
        color:'#c8ff47',
        marginBottom:4,
        lineHeight:2,
      }}>
        &gt; cfo-agent@arbitrum:~$ init --connect 2026
      </div>
      <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(10px,2vw,13px)',letterSpacing:'0.08em',color:'#47ffd4',marginBottom:2,lineHeight:2}}>
        &gt; [OK] signal acquired :: relay online
      </div>
      <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(10px,2vw,13px)',letterSpacing:'0.08em',color:'#b8b49e',marginBottom:16,lineHeight:2}}>
        &gt; {available.length} nodes detected :: select wallet:
      </div>

      {/* Wallet cards */}
      <div style={{display:'flex',flexDirection:'column',gap:8,flex:1}}>
        {available.map((node,i)=>(
          <motion.div key={node.id}
            initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}}
            transition={{delay:i*0.12,duration:0.3}}
            onClick={()=>{SFX.launch();onSelect(wallets.find(w=>w.id===node.id)||wallets[0]||null)}}
            onMouseEnter={()=>SFX.hover()}
            style={{
              border:`1px solid #2a2820`,
              padding:'clamp(12px,3vw,16px)',
              cursor:'pointer',
              background:'rgba(0,0,0,0.5)',
            }}
            whileHover={{borderColor:node.color,background:'rgba(200,255,71,0.02)'}}
            whileTap={{scale:0.98}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(10px,2vw,12px)',letterSpacing:'0.15em',color:'#3a3830'}}>[ {node.label} ]</span>
              <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(10px,2vw,12px)',letterSpacing:'0.12em',color:'#47ffd4'}}>// LIVE</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
              <span style={{fontSize:'clamp(18px,5vw,24px)'}}>{node.icon}</span>
              <div>
                <div style={{fontFamily:"'VT323',monospace",fontSize:'clamp(18px,5vw,24px)',letterSpacing:'0.1em',color:'#d4d0b8'}}>{node.name}</div>
                <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(9px,2vw,11px)',letterSpacing:'0.08em',color:'#3a3830',marginTop:2}}>// DIRECT INTERFACE</div>
              </div>
            </div>
            <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(9px,2vw,11px)',letterSpacing:'0.07em',color:'#3a3830',borderTop:'1px solid #1a1a16',paddingTop:8}}>
              &gt; {node.cmd}
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{display:'flex',justifyContent:'space-between',marginTop:12,fontFamily:"'Share Tech Mono',monospace",fontSize:'clamp(9px,2vw,11px)',letterSpacing:'0.12em',color:'#2a2820'}}>
        <span>// CFO AGENT / TREASURY OS</span>
        <span>CLICK TO ENTER</span>
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

  // Global keydown for scene 0
  useEffect(() => {
    if (scene !== 0) return
    const h = e => {
      if (['Shift','Control','Alt','Meta','Tab','CapsLock'].includes(e.key)) return
      handleStart()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [scene])

  return (
    <div style={{
      position:'fixed', inset:0,
      background:'#000',
      overflow:'hidden',
      fontFamily:"'VT323',monospace",
      display:'flex',
      flexDirection:'column',
    }} className="crt">
      <div className="scanline"/>

      {/* Status bar - scene 1+ */}
      {scene >= 1 && (
        <div style={{
          display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'6px clamp(12px,4vw,20px)',
          borderBottom:'1px solid #1a1a16',
          fontFamily:"'Share Tech Mono',monospace",
          fontSize:'clamp(10px,2.5vw,13px)',
          letterSpacing:'0.12em',
          flexShrink:0,
        }}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{
              width:7,height:7,borderRadius:'50%',
              background:scene>=3?'#c8ff47':'#ffb347',
              display:'inline-block',
              animation:'pulse 1.2s infinite',
            }}/>
            <span style={{color:scene>=3?'#c8ff47':'#ffb347'}}>
              {scene>=3?'SIGNAL : LOCKED':'SIGNAL : UNSTABLE'}
            </span>
          </div>
          <span style={{color:'#3a3830'}}>2140 / CFO-AGENT</span>
        </div>
      )}

      {/* Scene content - takes remaining height */}
      <div style={{flex:1, overflow:'hidden', position:'relative'}}>
        <AnimatePresence mode="wait">
          {scene===0 && (
            <motion.div key="s0" style={{position:'absolute',inset:0}}
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
              <GateScene onStart={handleStart}/>
            </motion.div>
          )}
          {scene===1 && (
            <motion.div key="s1" style={{position:'absolute',inset:0}}
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0,transition:{duration:0.5}}}>
              <RainScene onDone={next}/>
            </motion.div>
          )}
          {scene===2 && (
            <motion.div key="s2" style={{position:'absolute',inset:0}}
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
              <AsciiScene onDone={next}/>
            </motion.div>
          )}
          {scene===3 && (
            <motion.div key="s3" style={{position:'absolute',inset:0}}
              initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
              <BootScene onDone={next}/>
            </motion.div>
          )}
          {scene===4 && (
            <motion.div key="s4" style={{position:'absolute',inset:0}}
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
              <NodeScene wallets={wallets} onSelect={onComplete}/>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
