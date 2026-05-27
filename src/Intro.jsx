/**
 * Intro.jsx
 * Hermians-style multi-scene intro sequence for CFO Agent.
 *
 * Scene 0: PRESS ANY KEY TO BEGIN TRANSMISSION
 * Scene 1: Character rain flood (random chars streaming)
 * Scene 2: ASCII art reveal (CFO Agent face/logo)
 * Scene 3: Terminal boot - init sequence
 * Scene 4: Node/wallet selection
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SFX } from './lib/audio.js'

// ---- ASCII ART ----
const CFO_ASCII = `
         .-------.
        /  _   _  \\
       |  | | | |  |
       |  | | | |  |
        \\  \\_/ /  /
    .----'-----'----.
   /  CFO  AGENT     \\
  |  TREASURY  OS    |
  |  ARBITRUM  NET   |
   \\                /
    '------v-------'
           |
    .------+------.
   |  RULE ENGINE  |
   |  SEQUENCER    |
   |  AI SUGGESTER |
    '--------------'
`

const CHARS = '0123456789ABCDEF@#$%^&*()<>?[]{}|~`!+=_\\/'

function randChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)]
}

function randStr(len) {
  return Array.from({length: len}, () => randChar()).join('')
}

// ---- CHARACTER RAIN COMPONENT ----
function CharRain({ onDone }) {
  const [lines, setLines] = useState([])
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    // Build random char lines rapidly
    let count = 0
    const rows = 18
    const cols = 50
    const id = setInterval(() => {
      setLines(prev => {
        const next = [...prev]
        const row = Math.floor(Math.random() * rows)
        if (!next[row]) next[row] = ''
        next[row] = randStr(cols)
        return next
      })
      SFX.rain()
      count++
      if (count > 60) clearInterval(id)
    }, 40)

    // Fade out after rain
    const fadeTimer = setTimeout(() => {
      setOpacity(0)
      setTimeout(onDone, 600)
    }, 2600)

    return () => { clearInterval(id); clearTimeout(fadeTimer) }
  }, [])

  return (
    <div style={{
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: 'clamp(9px,1.8vw,13px)',
      color: '#b8b49e',
      letterSpacing: '0.05em',
      lineHeight: 1.6,
      opacity,
      transition: 'opacity 0.6s ease',
      padding: '20px',
      width: '100%',
      maxWidth: 680,
    }}>
      {Array.from({length: 18}, (_, i) => (
        <div key={i} style={{whiteSpace:'pre', minHeight:'1.6em'}}>
          {lines[i] || randStr(Math.floor(Math.random() * 20))}
        </div>
      ))}
      <div style={{
        marginTop: 16,
        color: '#5a5848',
        fontSize: 'clamp(9px,1.5vw,11px)',
        letterSpacing: '0.15em',
      }}>
        {'// CFO AGENT / TREASURY OS  •  AWAITING SCENE 02 / TRANSMISSION_'}
      </div>
    </div>
  )
}

// ---- ASCII ART SCENE ----
function AsciiScene({ onDone }) {
  const [lines, setLines] = useState([])
  const [done, setDone] = useState(false)
  const artLines = CFO_ASCII.trim().split('\n')

  useEffect(() => {
    let i = 0
    const id = setInterval(() => {
      if (i >= artLines.length) {
        clearInterval(id)
        setDone(true)
        setTimeout(onDone, 1200)
        return
      }
      setLines(prev => [...prev, artLines[i]])
      SFX.rain()
      i++
    }, 80)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: 'clamp(10px,2vw,14px)',
      color: '#6a6858',
      letterSpacing: '0.04em',
      lineHeight: 1.5,
      padding: '20px',
      width: '100%',
      maxWidth: 600,
      textAlign: 'center',
    }}>
      {lines.map((l, i) => (
        <div key={i} style={{whiteSpace:'pre'}}>{l}</div>
      ))}
      {done && (
        <div style={{
          marginTop: 16,
          color: '#b8b49e',
          fontSize: 'clamp(11px,2.5vw,15px)',
          letterSpacing: '0.2em',
          animation: 'blink 1s infinite',
        }}>
          {'// SIGNAL DETECTED / INITIALIZING...'}
        </div>
      )}
    </div>
  )
}

// ---- TERMINAL BOOT SCENE ----
const BOOT_LINES_INTRO = [
  { text: `cfo-agent@arbitrum:~$ init --connect 2026`, color: '#c8ff47', delay: 0 },
  { text: `[OK] signal acquired :: treasury relay online`, color: '#47ffd4', delay: 600 },
  { text: `[OK] 03 modules detected :: 03 active :: 00 sealed`, color: '#47ffd4', delay: 1200 },
  { text: `[OK] rule registry :: 0x5eadac819B2206B960`, color: '#47ffd4', delay: 1800 },
  { text: `[OK] execution sequencer :: 0xA6a5A3364c8A169`, color: '#47ffd4', delay: 2400 },
  { text: `[OK] agent factory :: 0xF1EE2CC9741547cA`, color: '#47ffd4', delay: 3000 },
  { text: `> select node:`, color: '#b8b49e', delay: 3600 },
]

function TerminalBootScene({ onDone }) {
  const [visible, setVisible] = useState([])

  useEffect(() => {
    BOOT_LINES_INTRO.forEach((l, i) => {
      setTimeout(() => {
        setVisible(prev => [...prev, l])
        SFX.line()
        if (i === BOOT_LINES_INTRO.length - 1) {
          setTimeout(onDone, 600)
        }
      }, l.delay)
    })
  }, [])

  return (
    <div style={{
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: 'clamp(12px,2.5vw,16px)',
      letterSpacing: '0.08em',
      lineHeight: 2,
      padding: '20px',
      width: '100%',
      maxWidth: 640,
      borderTop: '1px solid #1a1a16',
    }}>
      <div style={{
        fontSize: 'clamp(10px,2vw,12px)',
        letterSpacing: '0.15em',
        color: '#3a3830',
        marginBottom: 16,
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>{'// CFO AGENT / TREASURY OS'}</span>
        <span>{'CLICK TO ENTER'}</span>
      </div>
      {visible.map((l, i) => (
        <motion.div key={i}
          initial={{opacity:0, x:-8}}
          animate={{opacity:1, x:0}}
          transition={{duration:0.2}}
          style={{color: l.color, whiteSpace:'pre-wrap', wordBreak:'break-all'}}>
          {'> '}{l.text}
        </motion.div>
      ))}
      {visible.length > 0 && (
        <div style={{color:'#3a3830', marginTop:4}}>
          {'> '}
          <span style={{
            display:'inline-block', width:10, height:16,
            background:'#c8c4a8',
            animation:'blink 0.7s infinite',
            verticalAlign:'middle',
          }}/>
        </div>
      )}
    </div>
  )
}

// ---- NODE SELECTION (wallet picker) ----
function NodeSelectScene({ wallets, onSelect }) {
  const nodes = [
    { id: 'metamask',  label: 'NODE_01', name: 'METAMASK', status: 'LIVE', icon: '🦊', cmd: './connect --wallet metamask' },
    { id: 'coinbase',  label: 'NODE_02', name: 'COINBASE WALLET', status: 'LIVE', icon: '🔵', cmd: './connect --wallet coinbase' },
    { id: 'brave',     label: 'NODE_03', name: 'BRAVE WALLET', status: 'LIVE', icon: '🦁', cmd: './connect --wallet brave' },
    { id: 'injected',  label: 'NODE_04', name: 'BROWSER WALLET', status: 'LIVE', icon: '💼', cmd: './connect --wallet injected' },
  ]

  // Filter to only available wallets
  const available = wallets.length > 0
    ? nodes.filter(n => wallets.some(w => w.id === n.id) || n.id === 'injected')
    : nodes

  return (
    <div style={{
      fontFamily: "'Share Tech Mono', monospace",
      width: '100%',
      maxWidth: 680,
      padding: '0 20px',
    }}>
      <div style={{
        fontSize: 'clamp(12px,2.5vw,16px)',
        letterSpacing: '0.08em',
        color: '#b8b49e',
        marginBottom: 20,
        lineHeight: 2,
      }}>
        <div style={{color:'#c8ff47'}}>{'> hermians@ghostline:~$ init --connect 2026'}</div>
        <div style={{color:'#47ffd4'}}>{'> [OK] signal acquired :: relay AYA online'}</div>
        <div>{'> [OK] '}<span style={{color:'#47ffd4'}}>{available.length} live</span>{' :: '}<span style={{color:'#ff5c5c'}}>00 sealed</span></div>
        <div style={{color:'#b8b49e'}}>{'> select node:'}</div>
      </div>

      <div style={{display:'flex', flexDirection:'column', gap:12}}>
        {available.map((node, i) => (
          <motion.div
            key={node.id}
            initial={{opacity:0, x:-20}}
            animate={{opacity:1, x:0}}
            transition={{delay: i * 0.15, duration:0.3}}
            onClick={()=>{ SFX.launch(); onSelect(wallets.find(w=>w.id===node.id)||wallets[0]||null) }}
            onMouseEnter={()=>SFX.hover()}
            style={{
              border: '1px solid #2a2820',
              padding: '16px',
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
            whileHover={{borderColor:'#c8ff47', backgroundColor:'rgba(200,255,71,0.03)'}}
            whileTap={{scale:0.98}}
          >
            <div style={{
              display:'flex', justifyContent:'space-between',
              alignItems:'center', marginBottom:8,
            }}>
              <span style={{
                fontSize:'clamp(11px,2vw,13px)',
                letterSpacing:'0.15em',
                color:'#5a5848',
              }}>[ {node.label} ]</span>
              <span style={{
                fontSize:'clamp(10px,2vw,12px)',
                letterSpacing:'0.12em',
                color: '#47ffd4',
              }}>// {node.status}</span>
            </div>

            <div style={{
              display:'flex', alignItems:'center', gap:12, marginBottom:8,
            }}>
              <span style={{fontSize:20}}>{node.icon}</span>
              <div>
                <div style={{
                  fontSize:'clamp(15px,3vw,20px)',
                  letterSpacing:'0.1em',
                  color:'#d4d0b8',
                  fontWeight:600,
                }}>{node.name}</div>
                <div style={{
                  fontSize:'clamp(10px,2vw,12px)',
                  letterSpacing:'0.08em',
                  color:'#3a3830',
                  marginTop:2,
                }}>// DIRECT INTERFACE</div>
              </div>
            </div>

            <div style={{
              fontSize:'clamp(11px,2vw,13px)',
              letterSpacing:'0.08em',
              color:'#5a5848',
              borderTop:'1px solid #1a1a16',
              paddingTop:8,
            }}>
              {'> '}{node.cmd}
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{
        marginTop:16,
        fontSize:'clamp(10px,2vw,12px)',
        letterSpacing:'0.15em',
        color:'#3a3830',
        display:'flex',
        justifyContent:'space-between',
      }}>
        <span>{'// CFO AGENT / TREASURY OS'}</span>
        <span>{'NODE -- / 04'}</span>
      </div>
    </div>
  )
}

// ---- MAIN INTRO COMPONENT ----
export default function Intro({ onComplete, wallets = [] }) {
  const [scene, setScene] = useState(0)
  // 0: press any key
  // 1: char rain
  // 2: ascii art
  // 3: terminal boot
  // 4: node select

  function next() { setScene(s => s + 1) }

  function handleGateClick() {
    SFX.init()
    SFX.initialize()
    setTimeout(() => { SFX.startDrone(); next() }, 400)
  }

  function handleNodeSelect(wallet) {
    onComplete(wallet)
  }

  return (
    <div style={{
      position:'fixed', inset:0,
      background:'#000',
      display:'flex',
      flexDirection:'column',
      alignItems:'center',
      justifyContent:'center',
      overflow:'hidden',
      fontFamily:"'VT323', monospace",
    }}
      className="crt"
      onClick={scene === 0 ? handleGateClick : undefined}
    >
      <div className="scanline"/>

      {/* Status bar - shown from scene 1 onward */}
      {scene >= 1 && (
        <div style={{
          position:'fixed', top:0, left:0, right:0,
          display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'7px 20px',
          borderBottom:'1px solid #1a1a16',
          fontFamily:"'Share Tech Mono', monospace",
          fontSize:'clamp(10px,2vw,13px)',
          letterSpacing:'0.12em',
          color:'#3a3830',
          zIndex:10,
        }}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <span style={{
              width:7, height:7, borderRadius:'50%',
              background: scene >= 3 ? '#c8ff47' : '#ffb347',
              display:'inline-block',
              animation:'pulse 1.2s infinite',
            }}/>
            <span style={{color: scene >= 3 ? '#c8ff47' : '#ffb347'}}>
              {scene >= 3 ? 'SIGNAL : LOCKED' : 'SIGNAL : UNSTABLE'}
            </span>
          </div>
          <span>2140 / CFO-AGENT</span>
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* Scene 0: Press any key */}
        {scene === 0 && (
          <motion.div key="s0"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{textAlign:'center', cursor:'pointer', padding:24}}>
            <div style={{
              fontFamily:"'VT323', monospace",
              fontSize:'clamp(16px,4vw,22px)',
              letterSpacing:'0.25em',
              color:'#5a5848',
              animation:'blink 1.8s infinite',
              marginBottom:24,
            }}>
              PRESS ANY KEY TO BEGIN TRANSMISSION
            </div>
            <div style={{
              fontFamily:"'Share Tech Mono', monospace",
              fontSize:'clamp(10px,2vw,12px)',
              letterSpacing:'0.15em',
              color:'#3a3830',
            }}>
              CFO AGENT // ARBITRUM TREASURY OS
            </div>
          </motion.div>
        )}

        {/* Scene 1: Character rain */}
        {scene === 1 && (
          <motion.div key="s1"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0, transition:{duration:0.6}}}>
            <CharRain onDone={next}/>
          </motion.div>
        )}

        {/* Scene 2: ASCII art */}
        {scene === 2 && (
          <motion.div key="s2"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <AsciiScene onDone={next}/>
          </motion.div>
        )}

        {/* Scene 3: Terminal boot */}
        {scene === 3 && (
          <motion.div key="s3"
            initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0}}
            style={{width:'100%', display:'flex', justifyContent:'center', padding:'60px 0 0'}}>
            <TerminalBootScene onDone={next}/>
          </motion.div>
        )}

        {/* Scene 4: Node/wallet selection */}
        {scene === 4 && (
          <motion.div key="s4"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{width:'100%', display:'flex', justifyContent:'center',
              padding:'60px 0 20px', overflowY:'auto', maxHeight:'100vh'}}>
            <NodeSelectScene wallets={wallets} onSelect={handleNodeSelect}/>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
