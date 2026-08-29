import hardhat from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Verify Treasury Balances Across All Networks
 * 
 * This script checks the balance of all deployed Treasury contracts
 * and generates a summary report.
 */

interface DeploymentRecord {
  chainId: number;
  chainName: string;
  networkName: string;
  treasuryAddress: string;
  deployerAddress: string;
  deploymentTxHash: string;
  blockNumber: number;
  timestamp: string;
  explorerUrl: string;
  nativeToken: string;
}

interface NetworkConfig {
  name: string;
  rpcUrl: string;
}

const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  coston2: {
    name: "Flare Coston2",
    rpcUrl: "https://coston2-api.flare.network/ext/C/rpc",
  },
  sepolia: {
    name: "Ethereum Sepolia",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
  },
  polygonAmoy: {
    name: "Polygon Amoy",
    rpcUrl: "https://rpc-amoy.polygon.technology",
  },
  arbitrumSepolia: {
    name: "Arbitrum Sepolia",
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  },
  optimismSepolia: {
    name: "Optimism Sepolia",
    rpcUrl: "https://sepolia.optimism.io",
  },
  baseSepolia: {
    name: "Base Sepolia",
    rpcUrl: "https://sepolia.base.org",
  },
  zoraSepolia: {
    name: "Zora Sepolia",
    rpcUrl: "https://sepolia.rpc.zora.energy",
  },
  worldSepolia: {
    name: "World Sepolia",
    rpcUrl: "https://worldchain-sepolia.g.alchemy.com/public",
  },
  scrollSepolia: {
    name: "Scroll Sepolia",
    rpcUrl: "https://sepolia-rpc.scroll.io",
  },
  avalancheFuji: {
    name: "Avalanche Fuji",
    rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  },
  monadTestnet: {
    name: "Monad Testnet",
    rpcUrl: "https://testnet-rpc.monad.xyz",
  },
};

async function loadDeploymentRecords(): Promise<Record<string, DeploymentRecord>> {
  const deploymentFile = path.join(process.cwd(), "deployments", "treasury-addresses.json");
  
  if (!fs.existsSync(deploymentFile)) {
    throw new Error("Deployment records not found.");
  }
  
  const data = fs.readFileSync(deploymentFile, "utf-8");
  return JSON.parse(data);
}

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("VERIFYING TREASURY BALANCES ACROSS ALL NETWORKS");
  console.log("=".repeat(70));

  const deploymentRecords = await loadDeploymentRecords();
  const results: Array<{
    network: string;
    chainName: string;
    address: string;
    balance: string;
    nativeToken: string;
    explorerUrl: string;
  }> = [];

  for (const [networkName, record] of Object.entries(deploymentRecords)) {
    console.log(`\nChecking ${record.chainName}...`);
    
    try {
      const config = NETWORK_CONFIGS[networkName];
      if (!config) {
        console.log(`  ⚠ No RPC config for ${networkName}, skipping`);
        continue;
      }

      // Create a public client for this network
      const { createPublicClient, http } = await import("viem");
      const publicClient = createPublicClient({
        transport: http(config.rpcUrl),
      });

      // Get balance
      const balance = await publicClient.getBalance({
        address: record.treasuryAddress as `0x${string}`,
      });

      const balanceFormatted = (Number(balance) / 1e18).toFixed(6);
      console.log(`  ✓ Balance: ${balanceFormatted} ${record.nativeToken}`);

      results.push({
        network: networkName,
        chainName: record.chainName,
        address: record.treasuryAddress,
        balance: balanceFormatted,
        nativeToken: record.nativeToken,
        explorerUrl: record.explorerUrl,
      });
    } catch (error) {
      console.log(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("BALANCE SUMMARY");
  console.log("=".repeat(70));
  console.log();

  for (const result of results) {
    console.log(`${result.chainName}:`);
    console.log(`  Address: ${result.address}`);
    console.log(`  Balance: ${result.balance} ${result.nativeToken}`);
    console.log(`  Explorer: ${result.explorerUrl}`);
    console.log();
  }

  console.log("=".repeat(70));
  console.log(`Total Networks: ${results.length}`);
  console.log("=".repeat(70) + "\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
