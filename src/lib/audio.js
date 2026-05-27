/**
 * audio.js - CFO Agent Audio Engine
 * Cinematic hacker-style sounds via Web Audio API.
 * No external files. No bundle bloat.
 */

class AudioEngine {
  constructor() {
    this.ctx       = null
    this.master    = null
    this.drone     = null
    this.droneOn   = false
    this.muted     = false
    this._ready    = false
  }

  init() {
    if (this._ready) return
    try {
      this.ctx    = new (window.AudioContext || window.webkitAudioContext)()
      this.master = this.ctx.createGain()
      this.master.gain.value = 1
      this.master.connect(this.ctx.destination)
      this._ready = true
    } catch(e) {}
  }

  setMute(v) {
    this.muted = v
    if (this.master) this.master.gain.setTargetAtTime(v ? 0 : 1, this.ctx.currentTime, 0.1)
  }

  toggle() { this.setMute(!this.muted); return this.muted }

  // Deep cinematic ambient drone
  startDrone() {
    if (!this._ready || this.droneOn) return
    this.droneOn = true
    const ctx = this.ctx, now = ctx.currentTime
    const out = ctx.createGain()
    out.gain.setValueAtTime(0, now)
    out.gain.linearRampToValueAtTime(0.12, now + 5)
    out.connect(this.master)

    const filt = ctx.createBiquadFilter()
    filt.type = 'lowpass'; filt.frequency.value = 700; filt.Q.value = 1.5
    filt.connect(out)

    // Layered oscillators
    [[55,'sine',0.6],[110,'triangle',0.3],[165,'sawtooth',0.07],[220,'sine',0.05]].forEach(([f,t,g]) => {
      const o = ctx.createOscillator(), gn = ctx.createGain()
      o.type = t; o.frequency.value = f; gn.gain.value = g
      o.connect(gn); gn.connect(filt); o.start(now)
    })

    // LFOs for movement
    const lfo1 = ctx.createOscillator(), lg1 = ctx.createGain()
    lfo1.frequency.value = 0.07; lg1.gain.value = 180
    lfo1.connect(lg1); lg1.connect(filt.frequency); lfo1.start(now)

    const lfo2 = ctx.createOscillator(), lg2 = ctx.createGain()
    lfo2.frequency.value = 0.04; lg2.gain.value = 0.04
    lfo2.connect(lg2); lg2.connect(out.gain); lfo2.start(now)

    this.drone = { out }
  }

  stopDrone() {
    if (!this.drone) return
    const now = this.ctx.currentTime
    this.drone.out.gain.linearRampToValueAtTime(0, now + 2)
    this.droneOn = false
  }

  _beep(freq=880, dur=0.04, vol=0.06, type='square') {
    if (!this._ready) return
    try {
      const ctx = this.ctx, now = ctx.currentTime
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.connect(g); g.connect(this.master)
      o.type = type; o.frequency.value = freq
      g.gain.setValueAtTime(vol, now)
      g.gain.exponentialRampToValueAtTime(0.001, now + dur)
      o.start(now); o.stop(now + dur)
    } catch(e) {}
  }

  _noise(dur=0.1, vol=0.3, bandFreq=2000) {
    if (!this._ready) return
    try {
      const ctx = this.ctx
      const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1)
      const src = ctx.createBufferSource()
      const g = ctx.createGain()
      const f = ctx.createBiquadFilter()
      f.type = 'bandpass'; f.frequency.value = bandFreq; f.Q.value = 0.6
      src.buffer = buf
      src.connect(f); f.connect(g); g.connect(this.master)
      g.gain.setValueAtTime(vol, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
      src.start()
    } catch(e) {}
  }

  key()    { this._beep(1000 + Math.random()*800, 0.018, 0.025, 'square') }
  rain()   { this._beep(600 + Math.random()*1400, 0.012, 0.015, 'square') }
  hover()  { this._beep(900, 0.04, 0.015, 'sine') }
  line()   { this._beep(500 + Math.random()*400, 0.03, 0.035, 'square') }
  err()    { [400,300,200].forEach((f,i)=>setTimeout(()=>this._beep(f,.12,.08,'square'),i*70)) }

  boot() {
    [220,330,440,550,660].forEach((f,i)=>setTimeout(()=>this._beep(f,.09,.07,'sine'),i*65))
  }

  lock() {
    [1100,880,660,440,330].forEach((f,i)=>setTimeout(()=>this._beep(f,.1,.07,'sine'),i*75))
    setTimeout(()=>this._noise(0.08,0.1,3000), 50)
  }

  launch() {
    [440,554,659,880,1100].forEach((f,i)=>setTimeout(()=>this._beep(f,.13,.07,'sine'),i*55))
  }

  exec() {
    this._beep(160,.3,.08,'sawtooth')
    setTimeout(()=>this._beep(220,.2,.06,'sawtooth'),90)
    setTimeout(()=>this._noise(0.15,0.15,1500),50)
  }

  done() {
    [660,880,1100,1320].forEach((f,i)=>setTimeout(()=>this._beep(f,.13,.06,'sine'),i*90))
  }

  deploy() {
    [110,220,330,440,660,880].forEach((f,i)=>setTimeout(()=>this._beep(f,.16,.06,'sine'),i*80))
  }

  glitch() {
    this._noise(0.2, 0.35, 2000)
    setTimeout(()=>this._noise(0.1, 0.2, 4000), 80)
    setTimeout(()=>this._noise(0.08, 0.15, 800), 140)
  }

  initialize() {
    this.glitch()
    setTimeout(()=>{
      [80,120,180,260].forEach((f,i)=>setTimeout(()=>this._beep(f,.4,.07,'sawtooth'),i*50))
    }, 120)
    setTimeout(()=>this.boot(), 500)
  }
}

export const SFX = new AudioEngine()
