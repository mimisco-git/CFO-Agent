/**
 * keeper.js
 *
 * Off-chain keeper bot for CFOAgent.
 * Polls the RuleRegistry every 60 seconds, checks which rules are ready,
 * and calls executeRule() on the CFOAgent contract.
 *
 * Usage:
 *   node keeper.js
 *
 * Requires a .env file with:
 *   PRIVATE_KEY, RPC_URL, AGENT_ADDRESS, REGISTRY_ADDRESS
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
  "function executeRules(uint256[] calldata ruleIds) external",
  "function active() view returns (bool)",
  "function totalExecutions() view returns (uint256)",
  "event RuleExecuted(uint256 indexed ruleId, address indexed token, address indexed recipient, uint256 amount)",
];

const {
  PRIVATE_KEY,
  RPC_URL,
  AGENT_ADDRESS,
  REGISTRY_ADDRESS,
  POLL_INTERVAL_MS = "60000",
} = process.env;

if (!PRIVATE_KEY || !RPC_URL || !AGENT_ADDRESS || !REGISTRY_ADDRESS) {
  console.error("Missing env vars: PRIVATE_KEY, RPC_URL, AGENT_ADDRESS, REGISTRY_ADDRESS");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);
const agent    = new ethers.Contract(AGENT_ADDRESS, AGENT_ABI, wallet);

let consecutiveErrors = 0;
const MAX_ERRORS = 5;

async function checkAndExecute() {
  try {
    const isActive = await agent.active();
    if (!isActive) { log("Agent deactivated. Skipping."); return; }

    const rules = await registry.getActiveRules(AGENT_ADDRESS);
    if (!rules.length) { log("No active rules."); return; }

    log(`Checking ${rules.length} rule(s)...`);
    const readyIds = [];

    for (const rule of rules) {
      const ready = await registry.isRuleReady(AGENT_ADDRESS, rule.id);
      if (ready) {
        log(`Rule ${rule.id} ready: send ${rule.amount} to ${rule.recipient}`);
        readyIds.push(rule.id);
      } else {
        log(`Rule ${rule.id} not ready. Next: ${nextExecTime(rule)}`);
      }
    }

    if (!readyIds.length) { log("Nothing to execute."); return; }

    if (readyIds.length === 1) {
      await executeSingle(readyIds[0]);
    } else {
      await executeBatch(readyIds);
    }

    consecutiveErrors = 0;
  } catch (err) {
    consecutiveErrors++;
    log(`Cycle error: ${err.message}`);
    if (consecutiveErrors >= MAX_ERRORS) {
      log(`${MAX_ERRORS} consecutive errors. Check setup.`);
    }
  }
}

async function executeSingle(ruleId) {
  log(`Executing rule ${ruleId}...`);
  try {
    const tx = await agent.executeRule(ruleId, { gasLimit: 300_000 });
    log(`Tx: ${tx.hash}`);
    const receipt = await tx.wait();
    log(`Done. Gas used: ${receipt.gasUsed}`);
    printEvents(receipt);
  } catch (err) {
    log(`Rule ${ruleId} failed: ${parseRevert(err)}`);
  }
}

async function executeBatch(ids) {
  log(`Batch: [${ids.join(", ")}]`);
  try {
    const tx = await agent.executeRules(ids, { gasLimit: 300_000 * ids.length });
    log(`Batch tx: ${tx.hash}`);
    const receipt = await tx.wait();
    log(`Batch done. Gas used: ${receipt.gasUsed}`);
    printEvents(receipt);
  } catch (err) {
    log(`Batch failed: ${parseRevert(err)}. Falling back to individual...`);
    for (const id of ids) await executeSingle(id);
  }
}

function nextExecTime(rule) {
  if (rule.ruleType !== 0) return "condition-based";
  const nextTs = Number(rule.lastExecuted) + Number(rule.interval);
  const left = nextTs - Math.floor(Date.now() / 1000);
  if (left <= 0) return "overdue";
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function printEvents(receipt) {
  const iface = new ethers.Interface(AGENT_ABI);
  for (const l of receipt.logs) {
    try {
      const parsed = iface.parseLog(l);
      if (parsed?.name === "RuleExecuted") {
        const { ruleId, token, recipient, amount } = parsed.args;
        console.log(`  RuleExecuted: rule=${ruleId} token=${token} recipient=${recipient} amount=${amount}`);
      }
    } catch {}
  }
}

function parseRevert(err) {
  if (err.reason) return err.reason;
  return err.message;
}

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function main() {
  const network = await provider.getNetwork();
  log(`Keeper started on chain ${network.chainId}`);
  log(`Agent:    ${AGENT_ADDRESS}`);
  log(`Registry: ${REGISTRY_ADDRESS}`);
  log(`Keeper:   ${wallet.address}`);
  log(`Polling every ${Number(POLL_INTERVAL_MS) / 1000}s`);

  await checkAndExecute();
  setInterval(checkAndExecute, Number(POLL_INTERVAL_MS));
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
