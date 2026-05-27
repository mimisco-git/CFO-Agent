const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const isRobinhood = network.chainId === 46630n;

  console.log("=".repeat(52));
  console.log("CFO AGENT DEPLOYMENT");
  console.log("=".repeat(52));
  console.log("Network:    ", network.name, `(${network.chainId})`);
  console.log("Chain:      ", isRobinhood ? "ROBINHOOD CHAIN TESTNET" : "ARBITRUM SEPOLIA");
  console.log("Deployer:   ", deployer.address);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:    ", ethers.formatEther(bal), "ETH");
  console.log("=".repeat(52));

  const KEEPER = process.env.KEEPER_ADDRESS || deployer.address;

  console.log("\n[1/3] Deploying RuleRegistry...");
  const RuleRegistry = await ethers.getContractFactory("RuleRegistry");
  const registry = await RuleRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("      RuleRegistry:", registryAddr);

  console.log("\n[2/3] Deploying AgentFactory...");
  const AgentFactory = await ethers.getContractFactory("AgentFactory");
  const factory = await AgentFactory.deploy(registryAddr, KEEPER);
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log("      AgentFactory:", factoryAddr);

  console.log("\n[3/3] Deploying ExecutionSequencer...");
  const ExecutionSequencer = await ethers.getContractFactory("ExecutionSequencer");
  const sequencer = await ExecutionSequencer.deploy(KEEPER);
  await sequencer.waitForDeployment();
  const sequencerAddr = await sequencer.getAddress();
  console.log("      Sequencer:   ", sequencerAddr);

  // Write env
  const prefix = isRobinhood ? "RH_" : "ARB_";
  const envPath = path.join(__dirname, '../.env');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

  const newVars = isRobinhood ? [
    `VITE_RH_FACTORY_ADDRESS=${factoryAddr}`,
    `VITE_RH_REGISTRY_ADDRESS=${registryAddr}`,
    `VITE_RH_SEQUENCER_ADDRESS=${sequencerAddr}`,
  ] : [
    `VITE_FACTORY_ADDRESS=${factoryAddr}`,
    `VITE_REGISTRY_ADDRESS=${registryAddr}`,
    `VITE_SEQUENCER_ADDRESS=${sequencerAddr}`,
  ];

  newVars.forEach(v => {
    const key = v.split('=')[0];
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, v);
    } else {
      envContent += '\n' + v;
    }
  });

  fs.writeFileSync(envPath, envContent.trim() + '\n');

  // Save deployments
  const depPath = path.join(__dirname, '../deployments.json');
  const deps = fs.existsSync(depPath) ? JSON.parse(fs.readFileSync(depPath, 'utf8')) : {};
  const networkKey = isRobinhood ? 'robinhoodTestnet' : 'arbitrumSepolia';
  deps[networkKey] = {
    chainId: network.chainId.toString(),
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: { RuleRegistry: registryAddr, AgentFactory: factoryAddr, ExecutionSequencer: sequencerAddr }
  };
  fs.writeFileSync(depPath, JSON.stringify(deps, null, 2));

  const explorer = isRobinhood
    ? `https://explorer.testnet.chain.robinhood.com/address/${factoryAddr}`
    : `https://sepolia.arbiscan.io/address/${factoryAddr}`;

  console.log("\n" + "=".repeat(52));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(52));
  console.log("RuleRegistry:      ", registryAddr);
  console.log("AgentFactory:      ", factoryAddr);
  console.log("ExecutionSequencer:", sequencerAddr);
  console.log("Explorer:", explorer);
  console.log("=".repeat(52));
}

main().catch(err => { console.error("FAILED:", err.message); process.exit(1); });
