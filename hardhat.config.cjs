require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: { optimizer: { enabled: true, runs: 200 } }
  },
  networks: {
    arbitrumSepolia: {
      url: process.env.RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: [PRIVATE_KEY],
      chainId: 421614,
    },
    robinhoodTestnet: {
      url: "https://rpc.testnet.chain.robinhood.com",
      accounts: [PRIVATE_KEY],
      chainId: 46630,
    },
  },
  etherscan: {
    apiKey: {
      arbitrumSepolia: "DUMMY",
      robinhoodTestnet: "DUMMY",
    },
    customChains: [
      {
        network: "robinhoodTestnet",
        chainId: 46630,
        urls: {
          apiURL: "https://explorer.testnet.chain.robinhood.com/api",
          browserURL: "https://explorer.testnet.chain.robinhood.com",
        },
      },
    ],
  },
};
