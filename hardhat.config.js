require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
      viaIR: true,
    },
  },
  networks: {
    creditcoinTestnet: {
      url: process.env.CREDITCOIN_TESTNET_RPC || "https://rpc.usc-testnet2.creditcoin.network",
      chainId: 102036,
      accounts: [DEPLOYER_PRIVATE_KEY],
      gasPrice: 1000000000, // 1 gwei — explicit to avoid pallet-evm estimation quirks
      timeout: 600000, // 10 min — USC attestation waits can exceed Hardhat's 60s default
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
      chainId: 11155111,
      accounts: [DEPLOYER_PRIVATE_KEY],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  etherscan: {
    apiKey: {
      creditcoinTestnet: "no-api-key-needed",
    },
    customChains: [
      {
        network: "creditcoinTestnet",
        chainId: 102036,
        urls: {
          apiURL: "https://blockscout.usc-testnet2.creditcoin.network/api",
          browserURL: "https://explorer.usc-testnet2.creditcoin.network",
        },
      },
    ],
  },
};
