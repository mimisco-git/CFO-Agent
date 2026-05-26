const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying with:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  // 1. Deploy RuleRegistry
  console.log("\nDeploying RuleRegistry...");
  const RuleRegistry = await ethers.getContractFactory("RuleRegistry");
  const registry = await RuleRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("RuleRegistry:", registryAddress);

  // 2. Deploy CFOAgent
  const KEEPER_ADDRESS = process.env.KEEPER_ADDRESS || deployer.address;
  console.log("\nDeploying CFOAgent...");
  const CFOAgent = await ethers.getContractFactory("CFOAgent");
  const agent = await CFOAgent.deploy(registryAddress, KEEPER_ADDRESS);
  await agent.waitForDeployment();
  const agentAddress = await agent.getAddress();
  console.log("CFOAgent:", agentAddress);

  // 3. Summary
  const network = await ethers.provider.getNetwork();
  console.log("\n--- Deployment Summary ---");
  console.log("Network:      ", network.name, `(${network.chainId})`);
  console.log("RuleRegistry: ", registryAddress);
  console.log("CFOAgent:     ", agentAddress);
  console.log("Owner:        ", deployer.address);
  console.log("Keeper:       ", KEEPER_ADDRESS);

  // 4. Print env block for keeper.js
  console.log("\n--- Copy to .env ---");
  console.log(`AGENT_ADDRESS=${agentAddress}`);
  console.log(`REGISTRY_ADDRESS=${registryAddress}`);
  console.log("PRIVATE_KEY=<keeper wallet private key>");
  console.log("RPC_URL=https://sepolia-rollup.arbitrum.io/rpc");
  console.log("POLL_INTERVAL_MS=60000");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
