import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";
import hardhatVerify from "@nomicfoundation/hardhat-verify";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin, hardhatVerify],
  paths: {
    sources: "src",
  },
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  verify: {
    etherscan: {
      apiKey: "P3F9SBASS1JZE3PMG4HSC9DD2KVDBUAXKN",
    },
    blockscout: {
      enabled: false,
    },
    sourcify: {
      enabled: false,
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    // Testnet Networks Only
    coston2: {
      type: "http",
      chainType: "l1",
      url: "https://coston2-api.flare.network/ext/C/rpc",
      accounts: [configVariable("PRIVATE_KEY")],
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: [configVariable("PRIVATE_KEY")],
    },
    bscTestnet: {
      type: "http",
      chainType: "l1",
      url: "https://bsc-testnet-rpc.publicnode.com",
      accounts: [configVariable("PRIVATE_KEY")],
    },
    polygonAmoy: {
      type: "http",
      chainType: "l1",
      url: "https://rpc-amoy.polygon.technology",
      accounts: [configVariable("PRIVATE_KEY")],
    },
    avalancheFuji: {
      type: "http",
      chainType: "l1",
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [configVariable("PRIVATE_KEY")],
    },
    arbitrumSepolia: {
      type: "http",
      chainType: "l1",
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: [configVariable("PRIVATE_KEY")],
    },
    optimismSepolia: {
      type: "http",
      chainType: "l1",
      url: "https://sepolia.optimism.io",
      accounts: [configVariable("PRIVATE_KEY")],
    },
    baseSepolia: {
      type: "http",
      chainType: "l1",
      url: "https://sepolia.base.org",
      accounts: [configVariable("PRIVATE_KEY")],
    },
    zoraSepolia: {
      type: "http",
      chainType: "l1",
      url: "https://sepolia.rpc.zora.energy",
      accounts: [configVariable("PRIVATE_KEY")],
    },
    worldSepolia: {
      type: "http",
      chainType: "l1",
      url: "https://worldchain-sepolia.g.alchemy.com/public",
      accounts: [configVariable("PRIVATE_KEY")],
    },
    scrollSepolia: {
      type: "http",
      chainType: "l1",
      url: "https://sepolia-rpc.scroll.io",
      accounts: [configVariable("PRIVATE_KEY")],
    },
    monadTestnet: {
      type: "http",
      chainType: "l1",
      url: "https://testnet-rpc.monad.xyz",
      accounts: [configVariable("PRIVATE_KEY")],
    },
  },
});
