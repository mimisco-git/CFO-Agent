/**
 * audio.js - CFO Agent Cinematic Audio Engine
 * 
 * Deep ambient intelligence terminal soundscape.
 * All sounds synthesized via Web Audio API.
 * No files. No latency. Pure synthesis.
 * 
 * Design: classified military terminal / AI operating system
 * Style: mysterious, premium, cinematic, subtle
 */

class AudioEngine {
  constructor() {
    this.ctx       = null
    this.master    = null
    this.drone     = null
    this.droneOn   = false
    this.muted     = false
    this._ready    = false
    this._droneSrc = []
  }

  init() {
    if (this._ready) return
    try {
      this.ctx    = new (window.AudioContext || window.webkitAudioContext)()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.85
      this.master.connect(this.ctx.destination)
      this._ready = true
    } catch(e) {}
  }

  setMute(v) {
    this.muted = v
    if (this.master) {
      this.master.gain.setTargetAtTime(v ? 0 : 0.85, this.ctx.currentTime, 0.2)
    }
  }

  toggle() { this.setMute(!this.muted); return this.muted }

  // ---- AMBIENT DRONE ----
  // Layered: deep sub bass + CRT hum + signal carrier + shimmer
  startDrone() {
    if (!this._ready || this.droneOn) return
    this.droneOn = true
    const ctx = this.ctx
    const now  = ctx.currentTime

    // Master drone bus
    const bus  = ctx.createGain()
    bus.gain.setValueAtTime(0, now)
    bus.gain.linearRampToValueAtTime(0.08, now + 4)
    bus.connect(this.master)

    // Global reverb
    const rev  = this._createReverb(3.5, 0.25)
    const revG = ctx.createGain(); revG.gain.value = 0.3
    rev.connect(revG); revG.connect(bus)

    // Layer 1: Deep sub bass (40 Hz) - the foundation
    const sub  = ctx.createOscillator()
    const subG = ctx.createGain()
    sub.type = 'sine'; sub.frequency.value = 40
    subG.gain.value = 0.5
    sub.connect(subG); subG.connect(bus)
    sub.start(now)
    this._droneSrc.push(sub)

    // Layer 2: CRT monitor hum (60 Hz + harmonics)
    const crt  = ctx.createOscillator()
    const crtG = ctx.createGain()
    crt.type = 'triangle'; crt.frequency.value = 60
    crtG.gain.value = 0.18
    crt.connect(crtG); crtG.connect(bus)
    crt.connect(rev)
    crt.start(now)
    this._droneSrc.push(crt)

    // Layer 3: Signal carrier (220 Hz) - intelligence transmission feel
    const carrier  = ctx.createOscillator()
    const carrierG = ctx.createGain()
    const carrierF = ctx.createBiquadFilter()
    carrier.type = 'sawtooth'; carrier.frequency.value = 220
    carrierF.type = 'lowpass'; carrierF.frequency.value = 400; carrierF.Q.value = 2
    carrierG.gain.value = 0.04
    carrier.connect(carrierF); carrierF.connect(carrierG); carrierG.connect(bus)
    carrier.connect(rev)
    carrier.start(now)
    this._droneSrc.push(carrier)

    // Layer 4: High shimmer (880 Hz) - ethereal
    const shim  = ctx.createOscillator()
    const shimG = ctx.createGain()
    shim.type = 'sine'; shim.frequency.value = 880
    shimG.gain.value = 0.015
    shim.connect(shimG); shimG.connect(bus)
    shim.connect(rev)
    shim.start(now)
    this._droneSrc.push(shim)

    // LFO 1: Slow frequency modulation on carrier (0.05 Hz)
    const lfo1  = ctx.createOscillator()
    const lfo1G = ctx.createGain()
    lfo1.type = 'sine'; lfo1.frequency.value = 0.05
    lfo1G.gain.value = 25
    lfo1.connect(lfo1G); lfo1G.connect(carrier.frequency)
    lfo1.start(now)
    this._droneSrc.push(lfo1)

    // LFO 2: Volume breathing (0.03 Hz)
    const lfo2  = ctx.createOscillator()
    const lfo2G = ctx.createGain()
    lfo2.type = 'sine'; lfo2.frequency.value = 0.03
    lfo2G.gain.value = 0.018
    lfo2.connect(lfo2G); lfo2G.connect(bus.gain)
    lfo2.start(now)
    this._droneSrc.push(lfo2)

    // LFO 3: Shimmer tremolo (0.12 Hz)
    const lfo3  = ctx.createOscillator()
    const lfo3G = ctx.createGain()
    lfo3.type = 'sine'; lfo3.frequency.value = 0.12
    lfo3G.gain.value = 0.008
    lfo3.connect(lfo3G); lfo3G.connect(shimG.gain)
    lfo3.start(now)
    this._droneSrc.push(lfo3)

    // Periodic soft signal pulse every 8s
    this._pulsInterval = setInterval(() => {
      if (this._ready && !this.muted) this._signalPulse()
    }, 8000)

    this.drone = { bus }
  }

  stopDrone() {
    if (!this.drone) return
    const now = this.ctx.currentTime
    this.drone.bus.gain.linearRampToValueAtTime(0, now + 2.5)
    this._droneSrc.forEach(s => { try { s.stop(now + 3) } catch(e){} })
    this._droneSrc = []
    clearInterval(this._pulsInterval)
    this.droneOn = false
    this.drone   = null
  }

  // ---- REVERB HELPER ----
  _createReverb(duration, decay) {
    const ctx    = this.ctx
    const rate   = ctx.sampleRate
    const length = Math.floor(rate * duration)
    const buf    = ctx.createBuffer(2, length, rate)
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c)
      for (let i = 0; i < length; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
      }
    }
    const node = ctx.createConvolver()
    node.buffer = buf
    return node
  }

  // ---- SIGNAL PULSE (periodic ambient) ----
  _signalPulse() {
    if (!this._ready || this.muted) return
    const ctx = this.ctx, now = ctx.currentTime
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 8
    o.type = 'sine'; o.frequency.value = 1200
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(0.025, now + 0.1)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.8)
    o.connect(f); f.connect(g); g.connect(this.master)
    o.start(now); o.stop(now + 0.9)
  }

  // ---- NOISE BURST ----
  _noise(dur=0.1, vol=0.08, freq=2000, q=0.8) {
    if (!this._ready || this.muted) return
    try {
      const ctx  = this.ctx
      const len  = Math.floor(ctx.sampleRate * dur)
      const buf  = ctx.createBuffer(1, len, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
      const src = ctx.createBufferSource()
      const g   = ctx.createGain()
      const f   = ctx.createBiquadFilter()
      f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q
      src.buffer = buf
      src.connect(f); f.connect(g); g.connect(this.master)
      g.gain.setValueAtTime(vol, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
      src.start()
    } catch(e) {}
  }

  // ---- TONE ----
  _tone(freq=880, dur=0.06, vol=0.05, type='sine', attack=0.005) {
    if (!this._ready || this.muted) return
    try {
      const ctx = this.ctx, now = ctx.currentTime
      const o   = ctx.createOscillator()
      const g   = ctx.createGain()
      o.connect(g); g.connect(this.master)
      o.type = type; o.frequency.value = freq
      g.gain.setValueAtTime(0, now)
      g.gain.linearRampToValueAtTime(vol, now + attack)
      g.gain.exponentialRampToValueAtTime(0.001, now + dur)
      o.start(now); o.stop(now + dur + 0.01)
    } catch(e) {}
  }

  // ---- UI SOUNDS ----

  // Subtle nav click - very short, clean
  key() {
    this._tone(1800, 0.025, 0.03, 'sine', 0.003)
    setTimeout(() => this._tone(900, 0.02, 0.015, 'sine', 0.002), 15)
  }

  // Even subtler hover
  hover() {
    this._tone(2200, 0.02, 0.012, 'sine', 0.004)
  }

  // Character rain typing
  rain() {
    if (Math.random() > 0.4) return // sparse, not every char
    const f = 800 + Math.random() * 1600
    this._tone(f, 0.015, 0.01, 'square', 0.001)
  }

  // Terminal line appear
  line() {
    const f = 1000 + Math.random() * 600
    this._tone(f, 0.025, 0.025, 'sine', 0.003)
  }

  // Error - descending, ominous
  err() {
    [380, 280, 180, 120].forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.18, 0.07, 'square', 0.01), i * 80)
    })
    setTimeout(() => this._noise(0.2, 0.05, 300, 0.5), 100)
  }

  // Boot up - ascending intelligence system initialization
  boot() {
    const freqs = [110, 165, 220, 330, 440, 660, 880]
    freqs.forEach((f, i) => {
      setTimeout(() => {
        this._tone(f, 0.12, 0.055, 'sine', 0.008)
        if (i === freqs.length - 1) {
          setTimeout(() => this._noise(0.06, 0.03, 3000, 2), 60)
        }
      }, i * 70)
    })
  }

  // Signal locked - confirmation
  lock() {
    [1320, 880, 660, 880, 1100].forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.14, 0.055, 'sine', 0.01), i * 80)
    })
    setTimeout(() => this._noise(0.1, 0.04, 4000, 3), 200)
  }

  // Wallet connect / launch
  launch() {
    [440, 554, 659, 831, 1046].forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.16, 0.05, 'sine', 0.01), i * 65)
    })
  }

  // Execute rule - industrial, authoritative
  exec() {
    // Low thud
    this._tone(55, 0.4, 0.1, 'sawtooth', 0.005)
    this._tone(110, 0.3, 0.07, 'sawtooth', 0.005)
    // Data burst
    setTimeout(() => this._noise(0.12, 0.06, 1800, 1.5), 60)
    // High click
    setTimeout(() => this._tone(2400, 0.04, 0.04, 'square', 0.002), 120)
  }

  // Execution confirmed - satisfying
  done() {
    [660, 784, 880, 1047, 1319].forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.18, 0.05, 'sine', 0.012), i * 85)
    })
    setTimeout(() => this._noise(0.08, 0.025, 5000, 4), 300)
  }

  // Deploy agent - epic, ascending
  deploy() {
    const freqs = [55, 110, 165, 220, 330, 440, 660, 880, 1100]
    freqs.forEach((f, i) => {
      setTimeout(() => {
        this._tone(f, 0.2, 0.055, i < 4 ? 'sawtooth' : 'sine', 0.01)
      }, i * 90)
    })
    setTimeout(() => this._noise(0.15, 0.05, 2500, 2), 400)
  }

  // Glitch / interference
  glitch() {
    this._noise(0.08, 0.12, 1500, 1.2)
    setTimeout(() => this._noise(0.06, 0.09, 4000, 0.8), 60)
    setTimeout(() => this._noise(0.05, 0.07, 600, 0.6), 110)
    setTimeout(() => this._tone(120, 0.15, 0.06, 'sawtooth', 0.003), 80)
  }

  // Full system initialize (intro press any key)
  initialize() {
    this.glitch()
    setTimeout(() => {
      // Rising power-on sweep
      [40, 60, 90, 130, 180, 250, 340].forEach((f, i) => {
        setTimeout(() => this._tone(f, 0.5, 0.06, 'sawtooth', 0.02), i * 45)
      })
    }, 100)
    setTimeout(() => this.boot(), 550)
  }
}

export const SFX = new AudioEngine()
