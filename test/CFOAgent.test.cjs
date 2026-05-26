const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CFOAgent", function () {
  let registry, agent;
  let owner, keeper, recipient, other;

  const USDC_DECIMALS = 6;
  const ONE_USDC = ethers.parseUnits("1", USDC_DECIMALS);
  const WEEK = 7 * 24 * 60 * 60;

  beforeEach(async () => {
    [owner, keeper, recipient, other] = await ethers.getSigners();

    const RuleRegistry = await ethers.getContractFactory("RuleRegistry");
    registry = await RuleRegistry.deploy();

    const CFOAgent = await ethers.getContractFactory("CFOAgent");
    agent = await CFOAgent.deploy(await registry.getAddress(), keeper.address);

    // Fund the agent with ETH
    await owner.sendTransaction({ to: await agent.getAddress(), value: ethers.parseEther("1") });
  });

  describe("Deployment", () => {
    it("sets the owner correctly", async () => {
      expect(await agent.owner()).to.equal(owner.address);
    });

    it("sets the keeper correctly", async () => {
      expect(await agent.keeper()).to.equal(keeper.address);
    });

    it("starts active", async () => {
      expect(await agent.active()).to.equal(true);
    });

    it("receives ETH deposits", async () => {
      expect(await agent.ethBalance()).to.equal(ethers.parseEther("1"));
    });
  });

  describe("Rule management", () => {
    it("adds a scheduled rule", async () => {
      const agentAddress = await agent.getAddress();
      await registry.connect(owner).addRule(
        0, // SCHEDULED
        0, // NONE
        ethers.ZeroAddress, // ETH
        recipient.address,
        ethers.parseEther("0.1"),
        ethers.parseEther("0.2"),
        WEEK,
        0
      );
      // Note: in production, rules are added by the agent address.
      // For testing, we add from owner and verify the registry state.
      expect(await registry.getRuleCount(owner.address)).to.equal(1);
    });

    it("deactivates a rule", async () => {
      await registry.connect(owner).addRule(0, 0, ethers.ZeroAddress, recipient.address,
        ethers.parseEther("0.1"), ethers.parseEther("0.2"), WEEK, 0);
      await registry.connect(owner).deactivateRule(0);
      const rule = await registry.getRule(owner.address, 0);
      expect(rule.active).to.equal(false);
    });
  });

  describe("Kill switch", () => {
    it("owner can deactivate the agent", async () => {
      await agent.connect(owner).deactivate();
      expect(await agent.active()).to.equal(false);
    });

    it("owner can reactivate the agent", async () => {
      await agent.connect(owner).deactivate();
      await agent.connect(owner).activate();
      expect(await agent.active()).to.equal(true);
    });

    it("non-owner cannot deactivate", async () => {
      await expect(agent.connect(other).deactivate()).to.be.reverted;
    });
  });

  describe("Emergency withdrawal", () => {
    it("owner can withdraw ETH", async () => {
      const before = await ethers.provider.getBalance(owner.address);
      await agent.connect(owner).emergencyWithdraw(ethers.ZeroAddress, ethers.parseEther("0.5"));
      const after = await ethers.provider.getBalance(owner.address);
      expect(after).to.be.greaterThan(before);
    });

    it("non-owner cannot withdraw", async () => {
      await expect(
        agent.connect(other).emergencyWithdraw(ethers.ZeroAddress, ethers.parseEther("0.1"))
      ).to.be.reverted;
    });
  });

  describe("Daily spend cap", () => {
    it("owner can set a daily cap", async () => {
      await agent.connect(owner).setDailySpendCap(ethers.ZeroAddress, ethers.parseEther("2"));
      expect(await agent.dailySpendCap(ethers.ZeroAddress)).to.equal(ethers.parseEther("2"));
    });
  });

  describe("Keeper management", () => {
    it("owner can update keeper", async () => {
      await agent.connect(owner).setKeeper(other.address);
      expect(await agent.keeper()).to.equal(other.address);
    });

    it("cannot set zero address as keeper", async () => {
      await expect(agent.connect(owner).setKeeper(ethers.ZeroAddress)).to.be.reverted;
    });
  });
});
