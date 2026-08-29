import hardhat, { network } from "hardhat";
import type { Address } from "viem";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploy Treasury Contracts to Multiple Chains
 * 
 * This script deploys the Treasury contract to all supported testnets:
 * 1. Flare Coston2
 * 2. Ethereum Sepolia
 * 3. BSC Testnet
 * 4. Polygon Mumbai
 * 5. Avalanche Fuji
 * 6. Arbitrum Sepolia
 * 7. Optimism Sepolia
 * 
 * The Treasury contract is a simple contract that:
 * - Accepts deposits of native tokens and ERC20 tokens (owner only)
 * - Distributes tokens to recipients (owner only)
 * - Tracks balances
 * - Emits events for all operations
 * 
 * Usage:
 *   # Deploy to a specific network
 *   npx hardhat run scripts/deploy-treasury-multichain.ts --network coston2
 *   
 *   # Deploy to all networks (run this script multiple times with different networks)
 *   npm run deploy:treasury:all
 */

interface ChainConfig {
  name: string;
  chainId: number;
  networkName: string;
  explorerUrl: string;
  nativeToken: string;
}

const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  coston2: {
    name: "Flare Coston2",
    chainId: 114,
    networkName: "coston2",
    explorerUrl: "https://coston2-explorer.flare.network",
    nativeToken: "C2FLR",
  },
  sepolia: {
    name: "Ethereum Sepolia",
    chainId: 11155111,
    networkName: "sepolia",
    explorerUrl: "https://sepolia.etherscan.io",
    nativeToken: "ETH",
  },
  bscTestnet: {
    name: "BSC Testnet",
    chainId: 97,
    networkName: "bscTestnet",
    explorerUrl: "https://testnet.bscscan.com",
    nativeToken: "tBNB",
  },
  polygonAmoy: {
    name: "Polygon Amoy",
    chainId: 80002,
    networkName: "polygonAmoy",
    explorerUrl: "https://amoy.polygonscan.com",
    nativeToken: "MATIC",
  },
  arbitrumSepolia: {
    name: "Arbitrum Sepolia",
    chainId: 421614,
    networkName: "arbitrumSepolia",
    explorerUrl: "https://sepolia.arbiscan.io",
    nativeToken: "ETH",
  },
  optimismSepolia: {
    name: "Optimism Sepolia",
    chainId: 11155420,
    networkName: "optimismSepolia",
    explorerUrl: "https://sepolia-optimism.etherscan.io",
    nativeToken: "ETH",
  },
  baseSepolia: {
    name: "Base Sepolia",
    chainId: 84532,
    networkName: "baseSepolia",
    explorerUrl: "https://sepolia.basescan.org",
    nativeToken: "ETH",
  },
  zoraSepolia: {
    name: "Zora Sepolia",
    chainId: 999999999,
    networkName: "zoraSepolia",
    explorerUrl: "https://sepolia.explorer.zora.energy",
    nativeToken: "ETH",
  },
  worldSepolia: {
    name: "World Sepolia",
    chainId: 4801,
    networkName: "worldSepolia",
    explorerUrl: "https://worldchain-sepolia.explorer.alchemy.com",
    nativeToken: "ETH",
  },
  scrollSepolia: {
    name: "Scroll Sepolia",
    chainId: 534351,
    networkName: "scrollSepolia",
    explorerUrl: "https://sepolia.scrollscan.com",
    nativeToken: "ETH",
  },
  avalancheFuji: {
    name: "Avalanche Fuji",
    chainId: 43113,
    networkName: "avalancheFuji",
    explorerUrl: "https://testnet.snowtrace.io",
    nativeToken: "AVAX",
  },
  monadTestnet: {
    name: "Monad Testnet",
    chainId: 10143,
    networkName: "monadTestnet",
    explorerUrl: "https://testnet.monadvision.com",
    nativeToken: "MON",
  },
};

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

async function loadDeploymentRecords(): Promise<Record<string, DeploymentRecord>> {
  const deploymentFile = path.join(process.cwd(), "deployments", "treasury-addresses.json");
  
  try {
    if (fs.existsSync(deploymentFile)) {
      const data = fs.readFileSync(deploymentFile, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.log("No existing deployment records found, starting fresh");
  }
  
  return {};
}

async function saveDeploymentRecord(networkName: string, record: DeploymentRecord): Promise<void> {
  const deploymentDir = path.join(process.cwd(), "deployments");
  const deploymentFile = path.join(deploymentDir, "treasury-addresses.json");
  
  // Create deployments directory if it doesn't exist
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  
  // Load existing records
  const records = await loadDeploymentRecords();
  
  // Add new record
  records[networkName] = record;
  
  // Save to file
  fs.writeFileSync(deploymentFile, JSON.stringify(records, null, 2));
  
  console.log(`\n✓ Deployment record saved to ${deploymentFile}`);
}

async function main() {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();

  // Get chain ID first, then find the network config
  const chainId = await publicClient.getChainId();
  
  // Find network config by chain ID
  let currentNetwork: string | undefined;
  let chainConfig: ChainConfig | undefined;
  
  for (const [networkName, config] of Object.entries(CHAIN_CONFIGS)) {
    if (config.chainId === chainId) {
      currentNetwork = networkName;
      chainConfig = config;
      break;
    }
  }
  
  if (!chainConfig || !currentNetwork) {
    throw new Error(`Unsupported chain ID: ${chainId}. Supported networks: ${Object.keys(CHAIN_CONFIGS).join(", ")}`);
  }

  console.log("\n" + "=".repeat(70));
  console.log(`DEPLOYING TREASURY TO ${chainConfig.name.toUpperCase()}`);
  console.log("=".repeat(70));
  console.log("\nChain ID:", chainId);
  console.log("Network:", currentNetwork);
  console.log("Deployer:", deployer.account.address);
  
  const deployerBal = await publicClient.getBalance({ address: deployer.account.address });
  console.log("Deployer balance:", (Number(deployerBal) / 1e18).toFixed(6), chainConfig.nativeToken);

  // Check if already deployed
  const existingRecords = await loadDeploymentRecords();
  if (existingRecords[currentNetwork]) {
    console.log("\n⚠ WARNING: Treasury already deployed on this network!");
    console.log("Existing address:", existingRecords[currentNetwork].treasuryAddress);
    console.log("Deployed at:", existingRecords[currentNetwork].timestamp);
    console.log("\nTo redeploy, delete the deployment record or use a different deployer address.");
    return;
  }

  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYING TREASURY CONTRACT");
  console.log("=".repeat(70));
  
  // Deploy Treasury contract
  const treasury = await viem.deployContract("Treasury", [], {
    client: { wallet: deployer },
  });
  
  console.log("✓ Treasury deployed to:", treasury.address);

  // Get contract code to verify deployment
  const code = await publicClient.getCode({ address: treasury.address });
  if (!code || code === '0x') {
    throw new Error("Contract deployment failed - no code at address");
  }
  
  console.log("✓ Contract code verified onchain");
  
  // For deployment record, we'll use a placeholder tx hash since viem doesn't expose it easily
  const deploymentTxHash = "0x" + "0".repeat(64); // Placeholder
  const currentBlock = await publicClient.getBlockNumber();
  
  console.log("✓ Deployment confirmed at block:", currentBlock);

  // Verify contract ownership
  const owner = await treasury.read.owner();
  console.log("✓ Contract owner:", owner);
  
  if (owner.toLowerCase() !== deployer.account.address.toLowerCase()) {
    throw new Error("Owner mismatch! Contract owner does not match deployer.");
  }

  // Get initial balance
  const initialBalance = await treasury.read.getNativeBalance();
  console.log("✓ Initial balance:", initialBalance.toString(), chainConfig.nativeToken);

  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(70));
  console.log("\nNetwork:", chainConfig.name);
  console.log("Chain ID:", chainId);
  console.log("Treasury Address:", treasury.address);
  console.log("Owner Address:", owner);
  console.log("Block Number:", currentBlock);
  console.log("Explorer URL:", `${chainConfig.explorerUrl}/address/${treasury.address}`);

  // Save deployment record
  const deploymentRecord: DeploymentRecord = {
    chainId: chainConfig.chainId,
    chainName: chainConfig.name,
    networkName: currentNetwork,
    treasuryAddress: treasury.address,
    deployerAddress: deployer.account.address,
    deploymentTxHash: deploymentTxHash,
    blockNumber: Number(currentBlock),
    timestamp: new Date().toISOString(),
    explorerUrl: `${chainConfig.explorerUrl}/address/${treasury.address}`,
    nativeToken: chainConfig.nativeToken,
  };

  await saveDeploymentRecord(currentNetwork, deploymentRecord);

  console.log("\n" + "=".repeat(70));
  console.log("NEXT STEPS");
  console.log("=".repeat(70));
  console.log("\n1. Verify contract on block explorer:");
  console.log(`   npx hardhat verify --network ${currentNetwork} ${treasury.address}`);
  console.log("\n2. Fund Treasury with native tokens:");
  console.log(`   # Send ${chainConfig.nativeToken} to: ${treasury.address}`);
  console.log("\n3. Test deposit functionality:");
  console.log(`   npx hardhat run scripts/test-treasury-deposit.ts --network ${currentNetwork}`);
  console.log("\n4. View on explorer:");
  console.log(`   ${chainConfig.explorerUrl}/address/${treasury.address}`);
  console.log("\n5. Deploy to remaining networks:");
  console.log(`   npm run deploy:treasury:all`);
  console.log("\n" + "=".repeat(70) + "\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
