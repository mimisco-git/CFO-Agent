/**
 * keeperFeed.js
 * Simulates a live keeper bot execution feed in the browser.
 * In production this would connect to a WebSocket server running the keeper bot.
 * For the demo: generates realistic keeper activity that mirrors what the real bot does.
 */

const RULES = ['FRIDAY PAYROLL', 'YIELD SWEEP', 'DAILY OPS BUDGET', 'PAYROLL SPLIT']
const PRIORITIES = ['NORMAL', 'HIGH', 'CRITICAL']
const STATUSES = ['QUEUED', 'EXECUTING', 'CONFIRMED', 'CONFIRMED', 'CONFIRMED']

function randHex(len) {
  return '0x' + Array.from(
    crypto.getRandomValues(new Uint8Array(Math.ceil(len/2)))
  ).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,len)
}

function randAddr() { return randHex(40) }
function randTx()   { return randHex(64) }
function pad(n)     { return String(n).padStart(2,'0') }

function timestamp() {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export class KeeperFeed {
  constructor(onLog) {
    this.onLog = onLog
    this.running = false
    this.jobId = 1000
    this.timers = []
  }

  start(chainName = 'ARB SEPOLIA') {
    if (this.running) return
    this.running = true
    this.chainName = chainName

    // Initial connection log
    setTimeout(() => this.emit('SYSTEM', `keeper bot connected :: ${chainName}`, 'system'), 200)
    setTimeout(() => this.emit('SYSTEM', `polling every 30s :: priority queue active`, 'system'), 700)
    setTimeout(() => this.emit('SYSTEM', `agent factory :: 0xF1EE...Ee900`, 'system'), 1200)

    // Start the polling simulation
    this._poll()
    this.timers.push(setInterval(() => this._poll(), 30000))

    // Occasional random activity
    this.timers.push(setInterval(() => {
      if (Math.random() > 0.6) this._randomActivity()
    }, 8000))
  }

  stop() {
    this.running = false
    this.timers.forEach(t => clearInterval(t))
    this.timers = []
  }

  _poll() {
    if (!this.running) return
    const ts = timestamp()
    this.emit('POLL', `polling sequencer :: ${ts}`, 'poll')

    const hasJob = Math.random() > 0.4
    if (!hasJob) {
      setTimeout(() => this.emit('POLL', `queue empty :: nothing to execute`, 'idle'), 400)
      return
    }

    // Simulate job execution
    const rule = RULES[Math.floor(Math.random() * RULES.length)]
    const priority = PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)]
    const jobId = this.jobId++
    const gas = Math.floor(120000 + Math.random() * 80000)

    setTimeout(() => this.emit('EXEC', `dequeuing job #${jobId} :: ${rule} :: ${priority}`, 'exec'), 600)
    setTimeout(() => this.emit('EXEC', `submitting tx :: gas limit ${gas.toLocaleString()}`, 'exec'), 1100)
    setTimeout(() => this.emit('TX',   `tx submitted :: ${randTx().slice(0,18)}...`, 'tx'), 1800)
    setTimeout(() => {
      const success = Math.random() > 0.1
      if (success) {
        const gasUsed = Math.floor(gas * 0.7 + Math.random() * gas * 0.2)
        this.emit('OK', `confirmed :: gas used ${gasUsed.toLocaleString()} :: job #${jobId} done`, 'ok')
      } else {
        this.emit('ERR', `execution failed :: job #${jobId} will retry (attempt 2/3)`, 'err')
      }
    }, 3200)
  }

  _randomActivity() {
    const msgs = [
      ['POLL', `heartbeat :: agent active :: treasury healthy`, 'poll'],
      ['POLL', `checking conditional rules :: balance threshold`, 'poll'],
      ['POLL', `daily cap: ${Math.floor(Math.random()*2000)} / 2000 USDC used`, 'poll'],
      ['SYSTEM', `keeper wallet balance: ${(0.005 + Math.random()*0.01).toFixed(4)} ETH`, 'system'],
      ['EXEC', `priority boost detected :: CRITICAL job incoming`, 'exec'],
    ]
    const [type, msg, cls] = msgs[Math.floor(Math.random() * msgs.length)]
    this.emit(type, msg, cls)
  }

  emit(type, msg, cls) {
    this.onLog({ type, msg, cls, time: timestamp(), id: Date.now() + Math.random() })
  }
}
