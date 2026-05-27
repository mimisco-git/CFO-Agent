/**
 * chain.js
 * All on-chain interactions for CFO Agent frontend.
 * Uses window.ethereum directly - no external wallet library needed.
 * Compatible with MetaMask, Coinbase Wallet, WalletConnect.
 */

export const CHAIN_ID     = Number(import.meta.env.VITE_CHAIN_ID)     || 421614
export const FACTORY_ADDR = import.meta.env.VITE_FACTORY_ADDRESS       || ''
export const REGISTRY_ADDR= import.meta.env.VITE_REGISTRY_ADDRESS      || ''
export const SEQUENCER_ADDR=import.meta.env.VITE_SEQUENCER_ADDRESS     || ''
export const RPC_URL      = import.meta.env.VITE_RPC_URL               || 'https://sepolia-rollup.arbitrum.io/rpc'

const CHAIN_HEX  = '0x' + CHAIN_ID.toString(16)
const CHAIN_NAME = 'Arbitrum Sepolia'

// ---- ABI selectors ----
// These are the keccak256 first 4 bytes of each function signature.
// Computed offline and hardcoded to avoid a library dependency.
const SEL = {
  hasAgent:       '0x4aa11248', // hasAgent(address)
  agentOf:        '0xac3c0e30', // agentOf(address)
  totalAgents:    '0xc5053712', // totalAgents()
  deployAgent:    '0x9752f163', // deployAgent()
  active:         '0x02fb0c5e', // active()
  totalExec:      '0x642f7d5e', // totalExecutions()
  ethBalance:     '0x4e6630b0', // ethBalance()
  tokenBalance:   '0xeedc966a', // tokenBalance(address)
  queueDepth:     '0x179eb1d9', // queueDepth()
}

// ---- Low-level helpers ----

function pad32(val) {
  if (typeof val === 'string' && val.startsWith('0x')) {
    return val.slice(2).padStart(64, '0')
  }
  return BigInt(val).toString(16).padStart(64, '0')
}

function encodeCall(selector, ...args) {
  return selector + args.map(pad32).join('')
}

async function rpcCall(method, params) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  return json.result
}

async function ethCall(to, data) {
  return rpcCall('eth_call', [{ to, data }, 'latest'])
}

function decodeAddress(hex) {
  return '0x' + hex.slice(-40)
}

function decodeBool(hex) {
  return hex.slice(-1) === '1'
}

function decodeUint(hex) {
  return BigInt('0x' + hex.slice(2))
}

// ---- Wallet connection ----

export function hasWallet() {
  return !!window.ethereum
}

export async function getAccounts() {
  if (!hasWallet()) return []
  try {
    return await window.ethereum.request({ method: 'eth_accounts' })
  } catch { return [] }
}

export async function connectWallet() {
  if (!hasWallet()) throw { code: 'NO_WALLET', message: 'No wallet detected. Install MetaMask.' }
  await switchToArbitrum()
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
  return accounts[0]
}

export async function switchToArbitrum() {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CHAIN_HEX }],
    })
  } catch (e) {
    if (e.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: CHAIN_HEX,
          chainName: CHAIN_NAME,
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: [RPC_URL],
          blockExplorerUrls: ['https://sepolia.arbiscan.io'],
        }],
      })
    } else throw e
  }
}

export function onAccountChange(cb) {
  if (!hasWallet()) return
  window.ethereum.on('accountsChanged', accounts => cb(accounts[0] || null))
}

export function onChainChange(cb) {
  if (!hasWallet()) return
  window.ethereum.on('chainChanged', chainId => cb(Number(chainId)))
}

// ---- SIWE ----

export function buildSiweMessage(address, nonce) {
  const domain = window.location.hostname || 'cfo-agent.vercel.app'
  const origin = window.location.origin || `https://${domain}`
  const now = new Date()
  const exp = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    '',
    'Sign in to CFO Agent — Arbitrum Treasury OS',
    '',
    `URI: ${origin}`,
    'Version: 1',
    `Chain ID: ${CHAIN_ID}`,
    `Nonce: ${nonce}`,
    `Issued At: ${now.toISOString()}`,
    `Expiration Time: ${exp.toISOString()}`,
  ].join('\n')
}

export function genNonce() {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

export async function signSiwe(address) {
  const nonce = genNonce()
  const message = buildSiweMessage(address, nonce)
  const signature = await window.ethereum.request({
    method: 'personal_sign',
    params: [message, address],
  })
  return { message, signature, nonce, address }
}

// ---- Factory ----

export async function checkHasAgent(walletAddress) {
  if (!FACTORY_ADDR) return false
  try {
    const data = encodeCall(SEL.hasAgent, walletAddress)
    const result = await ethCall(FACTORY_ADDR, data)
    return decodeBool(result)
  } catch { return false }
}

export async function getAgentAddress(walletAddress) {
  if (!FACTORY_ADDR) return null
  try {
    const data = encodeCall(SEL.agentOf, walletAddress)
    const result = await ethCall(FACTORY_ADDR, data)
    const addr = decodeAddress(result)
    return addr === '0x0000000000000000000000000000000000000000' ? null : addr
  } catch { return null }
}

export async function getTotalAgents() {
  if (!FACTORY_ADDR) return 0n
  try {
    const result = await ethCall(FACTORY_ADDR, SEL.totalAgents)
    return decodeUint(result)
  } catch { return 0n }
}

export async function deployAgent() {
  if (!FACTORY_ADDR) throw new Error('Factory not deployed')
  const accounts = await getAccounts()
  if (!accounts[0]) throw new Error('No wallet connected')

  const txHash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{
      from: accounts[0],
      to: FACTORY_ADDR,
      data: SEL.deployAgent,
      gas: '0x' + (500000).toString(16),
    }],
  })

  // Wait for receipt
  let receipt = null
  let tries = 0
  while (!receipt && tries < 40) {
    await sleep(2000)
    receipt = await rpcCall('eth_getTransactionReceipt', [txHash])
    tries++
  }

  if (!receipt) throw new Error('Transaction not confirmed after 80s')
  if (receipt.status === '0x0') throw new Error('Transaction reverted')

  // Get agent address from logs or re-read
  return getAgentAddress(accounts[0])
}

// ---- Agent reads ----

export async function getAgentStatus(agentAddress) {
  if (!agentAddress) return { active: false, totalExecutions: 0n }
  try {
    const [activeRes, execRes] = await Promise.all([
      ethCall(agentAddress, SEL.active),
      ethCall(agentAddress, SEL.totalExec),
    ])
    return {
      active: decodeBool(activeRes),
      totalExecutions: decodeUint(execRes),
    }
  } catch { return { active: false, totalExecutions: 0n } }
}

export async function getAgentEthBalance(agentAddress) {
  if (!agentAddress) return 0n
  try {
    const result = await ethCall(agentAddress, SEL.ethBalance)
    return decodeUint(result)
  } catch { return 0n }
}

export async function getAgentTokenBalance(agentAddress, tokenAddress) {
  if (!agentAddress || !tokenAddress) return 0n
  try {
    const data = encodeCall(SEL.tokenBalance, tokenAddress)
    const result = await ethCall(agentAddress, data)
    return decodeUint(result)
  } catch { return 0n }
}

// ---- Rule operations ----

export async function addRuleOnChain(agentAddress, rule) {
  const accounts = await getAccounts()
  if (!accounts[0]) throw new Error('No wallet connected')

  // RuleType: 0=SCHEDULED, 1=CONDITIONAL
  const ruleType = rule.type === 'SCHEDULED' ? 0 : 1
  // ConditionType: 0=NONE, 1=BALANCE_ABOVE, 2=BALANCE_BELOW
  const condType = rule.conditionType || 0

  // Encode: addRule(uint8,uint8,address,address,uint256,uint256,uint256,uint256)
  const data = SEL.addRule +
    ruleType.toString(16).padStart(64, '0') +
    condType.toString(16).padStart(64, '0') +
    pad32(rule.token || '0x0000000000000000000000000000000000000000') +
    pad32(rule.recipient) +
    pad32(BigInt(rule.amount)) +
    pad32(BigInt(rule.spendLimit || rule.amount)) +
    pad32(BigInt(rule.interval || 0)) +
    pad32(BigInt(rule.conditionValue || 0))

  const txHash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{
      from: accounts[0],
      to: agentAddress,
      data,
      gas: '0x' + (300000).toString(16),
    }],
  })

  return txHash
}

// ---- Sequencer ----

export async function getQueueDepth() {
  if (!SEQUENCER_ADDR) return 0n
  try {
    const result = await ethCall(SEQUENCER_ADDR, '0x67e3e13b') // queueDepth()
    return decodeUint(result)
  } catch { return 0n }
}

// ---- Utilities ----

export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

export function truncAddr(a, start = 6, end = 4) {
  if (!a) return ''
  if (a.includes('...')) return a
  return a.slice(0, start) + '...' + a.slice(-end)
}

export function formatUnits(value, decimals = 18) {
  if (!value) return '0'
  const divisor = BigInt(10 ** decimals)
  const int  = value / divisor
  const frac = value % divisor
  if (frac === 0n) return int.toString()
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, 4).replace(/0+$/, '')
  return `${int}.${fracStr}`
}

export function formatUsdc(value) {
  return formatUnits(value, 6)
}
