# CFO Agent

A programmable treasury agent on Arbitrum. You give it rules, it executes payments onchain autonomously, 24/7.

**Built for the Arbitrum Open House London Buildathon.**

---

## What it does

CFO Agent is a smart wallet that holds funds and executes payment rules automatically. No manual intervention needed once deployed.

Examples of rules you can set:
- "Pay 0x4f3a... 500 USDC every Friday"
- "Sweep to yield wallet when balance exceeds 5,000 USDC"
- "Pay team wallets 0.05 ETH every day"

---

## Architecture

```
Owner wallet
    |
    | sets rules
    v
RuleRegistry.sol          <-- stores all rule definitions
    |
    | reads rules
    v
CFOAgent.sol              <-- holds funds, executes rules, safety controls
    |
    | triggered by
    v
keeper.js                 <-- off-chain bot, polls every 60s
```

---

## Project structure

```
cfo-agent/
  contracts/
    RuleRegistry.sol      Rule storage and management
    CFOAgent.sol          Main agent: holds funds, runs rules
  scripts/
    deploy.cjs            Hardhat deploy script
  test/
    CFOAgent.test.cjs     Hardhat tests
  src/
    App.jsx               React dashboard
    App.css               Styles
    main.jsx              Entry point
    index.css             Base reset
  keeper.js               Off-chain keeper bot
  hardhat.config.cjs      Hardhat configuration
  vite.config.js          Vite configuration
  .env.example            Environment variables template
```

---

## Quick start

### 1. Install

```bash
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
# Fill in PRIVATE_KEY and RPC_URL
```

### 3. Run the frontend

```bash
npm run dev
# Opens at http://localhost:5173
```

### 4. Compile contracts

```bash
npm run compile
```

### 5. Run tests

```bash
npm test
```

### 6. Deploy to Arbitrum Sepolia

Get testnet ETH from:
- https://arbitrum.faucet.dev/
- https://faucet.quicknode.com/arbitrum/sepolia

Then deploy:

```bash
npm run deploy:sepolia
```

Copy the output contract addresses into your `.env`.

### 7. Run the keeper bot

```bash
npm run keeper
```

---

## Contracts

### RuleRegistry.sol

Stores rule structs per agent. Pure data contract, holds no funds.

Key functions:
- `addRule(...)` - create a new rule
- `deactivateRule(id)` - pause a rule
- `activateRule(id)` - resume a rule
- `getActiveRules(agent)` - fetch all active rules (used by keeper)
- `isRuleReady(agent, id)` - check if a rule can execute now
- `recordExecution(agent, id)` - update lastExecuted timestamp

### CFOAgent.sol

Holds funds and executes rules. Owned by you, callable by keeper.

Key functions:
- `depositERC20(token, amount)` - deposit ERC20 tokens
- `receive()` - deposit ETH
- `executeRule(id)` - execute a single rule (keeper only)
- `executeRules(ids[])` - batch execute (keeper only)
- `deactivate()` - global kill switch (owner only)
- `activate()` - resume (owner only)
- `setDailySpendCap(token, cap)` - set max daily spend (owner only)
- `emergencyWithdraw(token, amount)` - pull all funds out (owner only)

---

## Deploying to Remix (browser, no local setup)

1. Go to https://remix.ethereum.org
2. Create `contracts/RuleRegistry.sol` and `contracts/CFOAgent.sol`
3. Install OpenZeppelin: in the terminal tab run `npm install @openzeppelin/contracts`
4. Compile both contracts (Solidity 0.8.20)
5. Deploy `RuleRegistry` first, copy its address
6. Deploy `CFOAgent` with `(registryAddress, yourWalletAddress)`
7. Connect MetaMask to Arbitrum Sepolia

---

## Frontend deployment (Vercel)

1. Push this repo to GitHub
2. Go to https://vercel.com and import the repo
3. Framework: Vite
4. Build command: `npm run build`
5. Output directory: `dist`
6. Deploy

---

## Prize strategy

This project targets three prize tracks:

| Track | How |
|---|---|
| Overall ($70k) | Payments + AI Agents categories |
| Best Agentic Project ($15k) | Keeper bot is the autonomous agent |
| Robinhood Chain slot | Deploy to Robinhood Chain (uncomment in hardhat.config.cjs) |

---

## Week 2 roadmap

- Payroll split: one rule fans out to multiple recipients
- APY-based yield sweep via Chainlink oracle
- ZeroDev smart account integration for gasless UX
- Robinhood Chain deployment

## Week 3 roadmap

- Full wallet connection (wagmi + ethers)
- Live rule execution from the dashboard
- Hackathon demo video
- Submission writeup
