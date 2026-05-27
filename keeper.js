/**
 * keeper.js - CFO Agent Keeper Bot
 * Polls the sequencer every 30 seconds and executes ready rules.
 * Supports both Arbitrum Sepolia and Robinhood Chain.
 *
 * Usage:
 *   AGENT_ADDRESS=0x... PRIVATE_KEY=0x... node keeper.js
 *
 * Env vars:
 *   AGENT_ADDRESS     - your deployed CFOAgent address
 *   REGISTRY_ADDRESS  - RuleRegistry contract address
 *   SEQUENCER_ADDRESS - ExecutionSequencer address
 *   PRIVATE_KEY       - keeper wallet private key
 *   RPC_URL           - JSON-RPC endpoint
 *   POLL_INTERVAL_MS  - polling interval (default 30000)
 *   NETWORK_NAME      - display name (default "Arbitrum Sepolia")
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const {
  AGENT_ADDRESS,
  REGISTRY_ADDRESS     = '0x5eadac819B2206B960a30978eFCEf3E1351C6b10',
  SEQUENCER_ADDRESS    = '0xA6a5A3364c8A169c9F38768df67Ad89AA33f14e2',
  PRIVATE_KEY,
  RPC_URL              = 'https://sepolia-rollup.arbitrum.io/rpc',
  POLL_INTERVAL_MS     = '30000',
  NETWORK_NAME         = 'Arbitrum Sepolia',
} = process.env;

if (!AGENT_ADDRESS)  { console.error('[ERROR] AGENT_ADDRESS not set'); process.exit(1); }
if (!PRIVATE_KEY)    { console.error('[ERROR] PRIVATE_KEY not set');   process.exit(1); }

const POLL_MS = parseInt(POLL_INTERVAL_MS, 10);

const SEQUENCER_ABI = [
  'function queueDepth() view returns (uint256)',
  'function executeNext(address agent) returns (bool)',
  'function getQueuedJobs() view returns (tuple(uint256 id, address agent, uint256 ruleId, uint8 priority, uint8 status, uint256 attempts, uint256 maxRetries, uint256 createdAt)[])',
];

const AGENT_ABI = [
  'function active() view returns (bool)',
  'function totalExecutions() view returns (uint256)',
  'function owner() view returns (address)',
];

let provider, wallet, sequencer, agent;
let execCount = 0;
let pollCount = 0;
let lastExecTime = null;

function log(msg, level = 'INFO') {
  const ts = new Date().toISOString().replace('T',' ').slice(0,19);
  const prefix = { INFO:'[+]', WARN:'[!]', ERR:'[X]', OK:'[OK]' }[level] || '[.]';
  console.log(`${ts} ${prefix} ${msg}`);
}

async function init() {
  log(`CFO AGENT KEEPER BOT`);
  log(`Network:   ${NETWORK_NAME}`);
  log(`RPC:       ${RPC_URL}`);
  log(`Agent:     ${AGENT_ADDRESS}`);
  log(`Registry:  ${REGISTRY_ADDRESS}`);
  log(`Sequencer: ${SEQUENCER_ADDRESS}`);
  log(`Poll:      every ${POLL_MS/1000}s`);
  log('─'.repeat(52));

  provider  = new ethers.JsonRpcProvider(RPC_URL);
  wallet    = new ethers.Wallet(PRIVATE_KEY, provider);
  sequencer = new ethers.Contract(SEQUENCER_ADDRESS, SEQUENCER_ABI, wallet);
  agent     = new ethers.Contract(AGENT_ADDRESS, AGENT_ABI, provider);

  const [network, balance, agentActive, totalExecs] = await Promise.all([
    provider.getNetwork(),
    provider.getBalance(wallet.address),
    agent.active().catch(() => false),
    agent.totalExecutions().catch(() => 0n),
  ]);

  log(`Chain ID:  ${network.chainId}`);
  log(`Keeper:    ${wallet.address}`);
  log(`Balance:   ${ethers.formatEther(balance)} ETH`);
  log(`Agent:     ${agentActive ? 'ACTIVE' : 'PAUSED'}`);
  log(`Executions: ${totalExecs.toString()} total`);
  log('─'.repeat(52));

  if (!agentActive) {
    log('Agent is paused. Waiting for activation...', 'WARN');
  }
}

async function poll() {
  pollCount++;
  try {
    const [depth, active] = await Promise.all([
      sequencer.queueDepth().catch(() => 0n),
      agent.active().catch(() => false),
    ]);

    log(`Poll #${pollCount} | Queue: ${depth} | Agent: ${active ? 'ACTIVE' : 'PAUSED'}`);

    if (!active) {
      log('Agent paused, skipping execution', 'WARN');
      return;
    }

    if (depth === 0n) {
      log('Queue empty, nothing to execute');
      return;
    }

    log(`Executing next job from queue...`);
    const tx = await sequencer.executeNext(AGENT_ADDRESS, {
      gasLimit: 500000n,
    });

    log(`TX submitted: ${tx.hash}`);
    const receipt = await tx.wait();

    if (receipt.status === 1) {
      execCount++;
      lastExecTime = new Date().toISOString();
      log(`Execution SUCCESS | Gas: ${receipt.gasUsed.toString()} | Total: ${execCount}`, 'OK');
    } else {
      log(`Execution REVERTED`, 'ERR');
    }

  } catch (err) {
    if (err.message?.includes('Queue is empty')) {
      log('Queue empty (contract)');
    } else if (err.message?.includes('insufficient funds')) {
      log('INSUFFICIENT GAS - fund keeper wallet!', 'ERR');
    } else {
      log(`Poll error: ${err.message?.slice(0, 100)}`, 'ERR');
    }
  }
}

async function run() {
  await init();
  await poll(); // immediate first poll
  setInterval(poll, POLL_MS);
  log(`Keeper running. Ctrl+C to stop.`);
  log('─'.repeat(52));
}

// Graceful shutdown
process.on('SIGINT', () => {
  log(`\nShutting down. Total executions this session: ${execCount}`);
  if (lastExecTime) log(`Last execution: ${lastExecTime}`);
  process.exit(0);
});

run().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
