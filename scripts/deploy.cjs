const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("=".repeat(50));
  console.log("CFO AGENT DEPLOYMENT");
  console.log("=".repeat(50));
  console.log("Network:    ", network.name, `(${network.chainId})`);
  console.log("Deployer:   ", deployer.address);
  console.log("Balance:    ", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("=".repeat(50));

  const KEEPER = process.env.KEEPER_ADDRESS || deployer.address;

  // 1. RuleRegistry
  console.log("\n[1/4] Deploying RuleRegistry...");
  const RuleRegistry = await ethers.getContractFactory("RuleRegistry");
  const registry = await RuleRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("      RuleRegistry:", registryAddr);

  // 2. CFOAgent (template - not used directly, factory deploys instances)
  console.log("\n[2/4] Deploying AgentFactory...");
  const AgentFactory = await ethers.getContractFactory("AgentFactory");
  const factory = await AgentFactory.deploy(registryAddr, KEEPER);
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log("      AgentFactory:", factoryAddr);

  // 3. ExecutionSequencer
  console.log("\n[3/4] Deploying ExecutionSequencer...");
  const ExecutionSequencer = await ethers.getContractFactory("ExecutionSequencer");
  const sequencer = await ExecutionSequencer.deploy(KEEPER);
  await sequencer.waitForDeployment();
  const sequencerAddr = await sequencer.getAddress();
  console.log("      Sequencer:   ", sequencerAddr);

  // 4. Write .env file for frontend
  console.log("\n[4/4] Writing environment files...");

  const envContent = [
    `VITE_FACTORY_ADDRESS=${factoryAddr}`,
    `VITE_REGISTRY_ADDRESS=${registryAddr}`,
    `VITE_SEQUENCER_ADDRESS=${sequencerAddr}`,
    `VITE_CHAIN_ID=421614`,
    `VITE_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc`,
  ].join('\n');

  fs.writeFileSync(path.join(__dirname, '../.env'), envContent);
  console.log("      .env written");

  // Also write a deployments JSON for reference
  const deployments = {
    network: network.name,
    chainId: network.chainId.toString(),
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    keeper: KEEPER,
    contracts: {
      RuleRegistry: registryAddr,
      AgentFactory: factoryAddr,
      ExecutionSequencer: sequencerAddr,
    }
  };

  fs.writeFileSync(
    path.join(__dirname, '../deployments.json'),
    JSON.stringify(deployments, null, 2)
  );
  console.log("      deployments.json written");

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(50));
  console.log("RuleRegistry:      ", registryAddr);
  console.log("AgentFactory:      ", factoryAddr);
  console.log("ExecutionSequencer:", sequencerAddr);
  console.log("Explorer: https://sepolia.arbiscan.io/address/" + factoryAddr);
  console.log("=".repeat(50));

  // Keeper env block
  console.log("\n--- keeper .env ---");
  console.log(`AGENT_ADDRESS=<user_agent_address>`);
  console.log(`REGISTRY_ADDRESS=${registryAddr}`);
  console.log(`SEQUENCER_ADDRESS=${sequencerAddr}`);
  console.log(`FACTORY_ADDRESS=${factoryAddr}`);
  console.log("PRIVATE_KEY=<keeper_wallet_key>");
  console.log("RPC_URL=https://sepolia-rollup.arbitrum.io/rpc");
  console.log("POLL_INTERVAL_MS=30000");
}

main().catch((err) => {
  console.error("\nDEPLOYMENT FAILED:", err.message);
  process.exit(1);
});
