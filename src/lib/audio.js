/**
 * audio.js
 * Full audio engine for CFO Agent.
 * Generates all sounds synthetically via Web Audio API.
 * No audio files needed. Works like Howler.js but zero dependencies.
 *
 * Features:
 * - Ambient drone: layered oscillators with LFO modulation
 * - UI sound effects: clicks, boots, glitches, executions
 * - Global mute toggle
 * - Autoplay safe: all sounds require user interaction first
 */

class AudioEngine {
  constructor() {
    this.ctx       = null
    this.master    = null   // master gain node
    this.drone     = null   // ambient drone nodes
    this.muted     = false
    this.droneOn   = false
    this.droneVol  = 0.12
    this._ready    = false
  }

  // Call once on first user interaction
  init() {
    if (this._ready) return
    try {
      this.ctx    = new (window.AudioContext || window.webkitAudioContext)()
      this.master = this.ctx.createGain()
      this.master.gain.value = 1
      this.master.connect(this.ctx.destination)
      this._ready = true
    } catch(e) {
      console.warn('Web Audio not supported', e)
    }
  }

  get ready() { return this._ready }

  setMute(muted) {
    this.muted = muted
    if (!this.master) return
    this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.1)
  }

  toggle() {
    this.setMute(!this.muted)
    return this.muted
  }

  // ---- Ambient Drone ----
  // Layered oscillators: bass + mid + high harmonics with LFO modulation
  // Creates a deep cinematic synth drone with organic movement

  startDrone() {
    if (!this._ready || this.droneOn) return
    this.droneOn = true

    const ctx = this.ctx
    const now = ctx.currentTime

    // Master drone gain with fade-in
    const droneGain = ctx.createGain()
    droneGain.gain.setValueAtTime(0, now)
    droneGain.gain.linearRampToValueAtTime(this.droneVol, now + 4)
    droneGain.connect(this.master)

    // Low-pass filter for warmth
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 800
    filter.Q.value = 1.2
    filter.connect(droneGain)

    // Layer 1: Deep sub bass
    const osc1 = ctx.createOscillator()
    const g1   = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(55, now)      // A1
    g1.gain.value = 0.6
    osc1.connect(g1); g1.connect(filter)
    osc1.start(now)

    // Layer 2: Low harmonic
    const osc2 = ctx.createOscillator()
    const g2   = ctx.createGain()
    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(110, now)     // A2
    g2.gain.value = 0.3
    osc2.connect(g2); g2.connect(filter)
    osc2.start(now)

    // Layer 3: Mid frequency pad
    const osc3 = ctx.createOscillator()
    const g3   = ctx.createGain()
    osc3.type = 'sawtooth'
    osc3.frequency.setValueAtTime(165, now)     // E3 (fifth)
    g3.gain.value = 0.08
    osc3.connect(g3); g3.connect(filter)
    osc3.start(now)

    // Layer 4: High shimmer
    const osc4 = ctx.createOscillator()
    const g4   = ctx.createGain()
    osc4.type = 'sine'
    osc4.frequency.setValueAtTime(220, now)     // A3
    g4.gain.value = 0.06
    osc4.connect(g4); g4.connect(filter)
    osc4.start(now)

    // LFO 1: slow volume tremolo on bass
    const lfo1 = ctx.createOscillator()
    const lfoG1 = ctx.createGain()
    lfo1.type = 'sine'
    lfo1.frequency.value = 0.08   // very slow
    lfoG1.gain.value = 0.15
    lfo1.connect(lfoG1)
    lfoG1.connect(g1.gain)
    lfo1.start(now)

    // LFO 2: slow filter sweep
    const lfo2 = ctx.createOscillator()
    const lfoG2 = ctx.createGain()
    lfo2.type = 'sine'
    lfo2.frequency.value = 0.05
    lfoG2.gain.value = 200
    lfo2.connect(lfoG2)
    lfoG2.connect(filter.frequency)
    lfo2.start(now)

    // LFO 3: subtle pitch wobble on mid
    const lfo3 = ctx.createOscillator()
    const lfoG3 = ctx.createGain()
    lfo3.type = 'sine'
    lfo3.frequency.value = 0.12
    lfoG3.gain.value = 1.5
    lfo3.connect(lfoG3)
    lfoG3.connect(osc3.frequency)
    lfo3.start(now)

    this.drone = { droneGain, filter, oscs: [osc1,osc2,osc3,osc4], lfos: [lfo1,lfo2,lfo3] }
  }

  stopDrone() {
    if (!this.drone || !this.droneOn) return
    const { droneGain, oscs, lfos } = this.drone
    const now = this.ctx.currentTime
    droneGain.gain.linearRampToValueAtTime(0, now + 2);
    [...oscs, ...lfos].forEach(n => { try { n.stop(now + 2.1) } catch(e){} })
    this.droneOn = false
    this.drone = null
  }

  // ---- UI Sound Effects ----

  _osc(freq, dur, vol=0.08, type='sine', detune=0) {
    if (!this._ready) return
    const ctx = this.ctx
    const now = ctx.currentTime
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(this.master)
    o.type = type
    o.frequency.value = freq
    o.detune.value = detune
    g.gain.setValueAtTime(vol, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + dur)
    o.start(now)
    o.stop(now + dur)
  }

  key() {
    if (!this._ready) return
    const freq = 700 + Math.random() * 500
    this._osc(freq, 0.03, 0.04, 'square')
  }

  boot() {
    if (!this._ready) return
    this._osc(440, 0.08, 0.1, 'sine')
    setTimeout(() => this._osc(660, 0.06, 0.07, 'sine'), 100)
    setTimeout(() => this._osc(880, 0.1, 0.06, 'sine'), 200)
  }

  line() {
    if (!this._ready) return
    this._osc(500 + Math.random() * 300, 0.04, 0.04, 'square')
  }

  lock() {
    if (!this._ready) return
    const notes = [1100, 880, 660, 440]
    notes.forEach((f, i) => setTimeout(() => this._osc(f, 0.1, 0.07, 'sine'), i * 90))
  }

  launch() {
    if (!this._ready) return
    const chord = [440, 554, 659, 880]
    chord.forEach((f, i) => setTimeout(() => this._osc(f, 0.15, 0.06, 'sine'), i * 70))
  }

  exec() {
    if (!this._ready) return
    this._osc(220, 0.2, 0.07, 'sawtooth')
    setTimeout(() => this._osc(110, 0.15, 0.05, 'sawtooth'), 80)
  }

  done() {
    if (!this._ready) return
    [660, 880, 1100].forEach((f, i) => setTimeout(() => this._osc(f, 0.15, 0.06, 'sine'), i * 100))
  }

  deploy() {
    if (!this._ready) return
    [220, 330, 440, 550, 660, 880].forEach((f, i) => setTimeout(() => this._osc(f, 0.18, 0.07, 'sine'), i * 90))
  }

  glitch() {
    if (!this._ready) return
    // Noise burst
    const ctx = this.ctx
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.3
    const src = ctx.createBufferSource()
    const g   = ctx.createGain()
    const f   = ctx.createBiquadFilter()
    f.type = 'bandpass'; f.frequency.value = 2000; f.Q.value = 0.5
    src.buffer = buf
    src.connect(f); f.connect(g); g.connect(this.master)
    g.gain.setValueAtTime(0.3, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    src.start()
  }

  err() {
    if (!this._ready) return
    [400, 300, 200].forEach((f, i) => setTimeout(() => this._osc(f, 0.12, 0.08, 'square'), i * 80))
  }

  hover() {
    if (!this._ready) return
    this._osc(800, 0.06, 0.02, 'sine')
  }

  initialize() {
    // The big sound when entering from the gate
    if (!this._ready) return
    this.glitch()
    setTimeout(() => {
      [110, 220, 440].forEach((f, i) => setTimeout(() => this._osc(f, 0.4, 0.08, 'sawtooth'), i * 60))
    }, 100)
    setTimeout(() => this.boot(), 400)
  }
}

export const SFX = new AudioEngine()
