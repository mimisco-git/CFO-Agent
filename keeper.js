/**
 * keeper.js
 *
 * Off-chain keeper bot for CFOAgent + ExecutionSequencer.
 * 1. Scans active rules from RuleRegistry
 * 2. Enqueues ready rules into ExecutionSequencer
 * 3. Dequeues jobs in priority order and executes on CFOAgent
 * 4. Marks jobs complete or failed with retry logic
 */

import { ethers } from "ethers";
import { config } from "dotenv";
config();

const REGISTRY_ABI = [
  "function getActiveRules(address agent) view returns (tuple(uint256 id, uint8 ruleType, uint8 conditionType, address token, address recipient, uint256 amount, uint256 spendLimit, uint256 interval, uint256 lastExecuted, uint256 conditionValue, bool active)[])",
  "function isRuleReady(address agent, uint256 ruleId) view returns (bool)",
];

const AGENT_ABI = [
  "function executeRule(uint256 ruleId) external",
  "function active() view returns (bool)",
  "function totalExecutions() view returns (uint256)",
  "event RuleExecuted(uint256 indexed ruleId, address indexed token, address indexed recipient, uint256 amount)",
];

const SEQUENCER_ABI = [
  "function enqueue(address agent, uint256 ruleId, uint8 priority, uint256 scheduledFor, uint256 maxRetries) returns (uint256 jobId)",
  "function startJob(uint256 jobId) external",
  "function completeJob(uint256 jobId) external",
  "function failJob(uint256 jobId, string reason) external",
  "function cancelJob(uint256 jobId) external",
  "function getNextJob() view returns (tuple(uint256 id, address agent, uint256 ruleId, uint8 priority, uint8 status, uint256 attempts, uint256 maxRetries, uint256 createdAt, uint256 executedAt, uint256 scheduledFor, string failReason), bool found)",
  "function hasActiveJob(address agent, uint256 ruleId) view returns (bool)",
  "function queueDepth() view returns (uint256)",
  "event JobQueued(uint256 indexed jobId, address indexed agent, uint256 ruleId, uint8 priority)",
  "event JobCompleted(uint256 indexed jobId, address indexed agent, uint256 ruleId)",
  "event JobFailed(uint256 indexed jobId, string reason, uint256 attempts)",
];

const {
  PRIVATE_KEY,
  RPC_URL,
  AGENT_ADDRESS,
  REGISTRY_ADDRESS,
  SEQUENCER_ADDRESS,
  POLL_INTERVAL_MS = "30000",
} = process.env;

if (!PRIVATE_KEY || !RPC_URL || !AGENT_ADDRESS || !REGISTRY_ADDRESS) {
  console.error("Missing env vars: PRIVATE_KEY, RPC_URL, AGENT_ADDRESS, REGISTRY_ADDRESS");
  process.exit(1);
}

const provider  = new ethers.JsonRpcProvider(RPC_URL);
const wallet    = new ethers.Wallet(PRIVATE_KEY, provider);
const registry  = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);
const agent     = new ethers.Contract(AGENT_ADDRESS, AGENT_ABI, wallet);
const sequencer = SEQUENCER_ADDRESS
  ? new ethers.Contract(SEQUENCER_ADDRESS, SEQUENCER_ABI, wallet)
  : null;

let errors = 0;

async function run() {
  try {
    const isActive = await agent.active();
    if (!isActive) { log("Agent deactivated."); return; }

    if (sequencer) {
      await scanAndEnqueue();
      await dequeueAndExecute();
    } else {
      await legacyExecute();
    }

    errors = 0;
  } catch (err) {
    errors++;
    log(`Error: ${err.message}`);
    if (errors >= 5) log("5 consecutive errors. Check setup.");
  }
}

// ---- Sequencer mode ----

async function scanAndEnqueue() {
  const rules = await registry.getActiveRules(AGENT_ADDRESS);
  log(`Scanning ${rules.length} rule(s) for queue...`);

  for (const rule of rules) {
    const ready = await registry.isRuleReady(AGENT_ADDRESS, rule.id);
    if (!ready) continue;

    const alreadyQueued = await sequencer.hasActiveJob(AGENT_ADDRESS, rule.id);
    if (alreadyQueued) { log(`Rule ${rule.id} already queued.`); continue; }

    const priority = 0; // NORMAL. Bump to 1 (HIGH) or 2 (CRITICAL) for urgent rules.
    const tx = await sequencer.enqueue(AGENT_ADDRESS, rule.id, priority, 0, 3);
    const receipt = await tx.wait();
    log(`Rule ${rule.id} enqueued. Tx: ${receipt.hash}`);
  }
}

async function dequeueAndExecute() {
  const depth = await sequencer.queueDepth();
  log(`Queue depth: ${depth}`);
  if (depth === 0n) return;

  const [job, found] = await sequencer.getNextJob();
  if (!found) return;

  log(`Dequeuing job ${job.id} (rule ${job.ruleId}, priority ${['NORMAL','HIGH','CRITICAL'][job.priority]})`);

  try {
    const startTx = await sequencer.startJob(job.id);
    await startTx.wait();

    const execTx = await agent.executeRule(job.ruleId, { gasLimit: 400_000 });
    log(`Executing tx: ${execTx.hash}`);
    const receipt = await execTx.wait();

    const completeTx = await sequencer.completeJob(job.id);
    await completeTx.wait();

    log(`Job ${job.id} completed. Gas: ${receipt.gasUsed}`);
    printEvents(receipt);
  } catch (err) {
    const reason = parseRevert(err);
    log(`Job ${job.id} failed: ${reason}. Attempt ${Number(job.attempts) + 1}/${job.maxRetries}`);
    const failTx = await sequencer.failJob(job.id, reason.slice(0, 200));
    await failTx.wait();
  }
}

// ---- Legacy mode (no sequencer deployed yet) ----

async function legacyExecute() {
  const rules = await registry.getActiveRules(AGENT_ADDRESS);
  for (const rule of rules) {
    const ready = await registry.isRuleReady(AGENT_ADDRESS, rule.id);
    if (!ready) continue;
    try {
      const tx = await agent.executeRule(rule.id, { gasLimit: 300_000 });
      const receipt = await tx.wait();
      log(`Rule ${rule.id} executed. Gas: ${receipt.gasUsed}`);
    } catch (err) {
      log(`Rule ${rule.id} failed: ${parseRevert(err)}`);
    }
  }
}

// ---- Helpers ----

function printEvents(receipt) {
  const iface = new ethers.Interface(AGENT_ABI);
  for (const l of receipt.logs) {
    try {
      const parsed = iface.parseLog(l);
      if (parsed?.name === "RuleExecuted") {
        const { ruleId, token, recipient, amount } = parsed.args;
        console.log(`  RuleExecuted: rule=${ruleId} token=${token} to=${recipient} amount=${amount}`);
      }
    } catch {}
  }
}

function parseRevert(err) {
  return err.reason ?? err.shortMessage ?? err.message ?? "unknown error";
}

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function main() {
  const network = await provider.getNetwork();
  log(`Keeper v2 started on chain ${network.chainId}`);
  log(`Agent:      ${AGENT_ADDRESS}`);
  log(`Registry:   ${REGISTRY_ADDRESS}`);
  log(`Sequencer:  ${SEQUENCER_ADDRESS ?? "not deployed (legacy mode)"}`);
  log(`Keeper:     ${wallet.address}`);
  log(`Polling every ${Number(POLL_INTERVAL_MS) / 1000}s`);

  await run();
  setInterval(run, Number(POLL_INTERVAL_MS));
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
