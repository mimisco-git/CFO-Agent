const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const KEEPER = process.env.KEEPER_ADDRESS || deployer.address;

  // 1. RuleRegistry
  console.log("\n1. Deploying RuleRegistry...");
  const RuleRegistry = await ethers.getContractFactory("RuleRegistry");
  const registry = await RuleRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("   RuleRegistry:", registryAddr);

  // 2. CFOAgent
  console.log("2. Deploying CFOAgent...");
  const CFOAgent = await ethers.getContractFactory("CFOAgent");
  const agent = await CFOAgent.deploy(registryAddr, KEEPER);
  await agent.waitForDeployment();
  const agentAddr = await agent.getAddress();
  console.log("   CFOAgent:    ", agentAddr);

  // 3. ExecutionSequencer
  console.log("3. Deploying ExecutionSequencer...");
  const ExecutionSequencer = await ethers.getContractFactory("ExecutionSequencer");
  const sequencer = await ExecutionSequencer.deploy(KEEPER);
  await sequencer.waitForDeployment();
  const sequencerAddr = await sequencer.getAddress();
  console.log("   Sequencer:   ", sequencerAddr);

  // Summary
  const network = await ethers.provider.getNetwork();
  console.log("\n--- Deployment Summary ---");
  console.log("Network:     ", network.name, `(${network.chainId})`);
  console.log("RuleRegistry:", registryAddr);
  console.log("CFOAgent:    ", agentAddr);
  console.log("Sequencer:   ", sequencerAddr);
  console.log("Owner:       ", deployer.address);
  console.log("Keeper:      ", KEEPER);

  console.log("\n--- Copy to .env ---");
  console.log(`AGENT_ADDRESS=${agentAddr}`);
  console.log(`REGISTRY_ADDRESS=${registryAddr}`);
  console.log(`SEQUENCER_ADDRESS=${sequencerAddr}`);
  console.log("PRIVATE_KEY=<keeper wallet private key>");
  console.log("RPC_URL=https://sepolia-rollup.arbitrum.io/rpc");
  console.log("POLL_INTERVAL_MS=30000");
}

main().catch((err) => { console.error(err); process.exit(1); });
