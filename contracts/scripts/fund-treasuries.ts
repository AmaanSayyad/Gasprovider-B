import hardhat, { network } from "hardhat";
import { parseEther } from "viem";
import * as fs from "fs";
import * as path from "path";

/**
 * Fund Treasury Contracts with Native Tokens
 * 
 * This script sends native tokens from the deployer account to each Treasury contract.
 * It reads the deployment records and sends a specified amount to each Treasury.
 * 
 * Usage:
 *   # Fund a specific network
 *   npx hardhat run scripts/fund-treasuries.ts --network coston2
 *   
 *   # Fund all networks (run multiple times with different networks)
 *   npm run fund:treasuries:all
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

// Amount to send to each Treasury (in native tokens)
const FUNDING_AMOUNTS: Record<string, string> = {
  coston2: "10",        // 10 C2FLR
  sepolia: "0.01",      // 0.01 ETH
  bscTestnet: "0.01",   // 0.01 tBNB
  polygonAmoy: "0.03",  // 0.03 MATIC (reduced due to low balance)
  arbitrumSepolia: "0.01", // 0.01 ETH
  optimismSepolia: "0.01", // 0.01 ETH
  baseSepolia: "0.01",  // 0.01 ETH
  zoraSepolia: "0.01",  // 0.01 ETH
  worldSepolia: "0.01", // 0.01 ETH
  scrollSepolia: "0.01", // 0.01 ETH
  avalancheFuji: "0.1", // 0.1 AVAX
  monadTestnet: "1",    // 1 MON
};

async function loadDeploymentRecords(): Promise<Record<string, DeploymentRecord>> {
  const deploymentFile = path.join(process.cwd(), "deployments", "treasury-addresses.json");
  
  if (!fs.existsSync(deploymentFile)) {
    throw new Error("Deployment records not found. Please deploy Treasury contracts first.");
  }
  
  const data = fs.readFileSync(deploymentFile, "utf-8");
  return JSON.parse(data);
}

async function main() {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();

  // Get chain ID and find network config
  const chainId = await publicClient.getChainId();
  const deploymentRecords = await loadDeploymentRecords();
  
  // Find the deployment record for this network
  let currentNetwork: string | undefined;
  let deploymentRecord: DeploymentRecord | undefined;
  
  for (const [networkName, record] of Object.entries(deploymentRecords)) {
    if (record.chainId === chainId) {
      currentNetwork = networkName;
      deploymentRecord = record;
      break;
    }
  }
  
  if (!deploymentRecord || !currentNetwork) {
    throw new Error(`No deployment record found for chain ID: ${chainId}`);
  }

  console.log("\n" + "=".repeat(70));
  console.log(`FUNDING TREASURY ON ${deploymentRecord.chainName.toUpperCase()}`);
  console.log("=".repeat(70));
  
  console.log("\nChain ID:", chainId);
  console.log("Network:", currentNetwork);
  console.log("Treasury Address:", deploymentRecord.treasuryAddress);
  console.log("Deployer:", deployer.account.address);
  
  const deployerBal = await publicClient.getBalance({ address: deployer.account.address });
  console.log("Deployer balance:", (Number(deployerBal) / 1e18).toFixed(6), deploymentRecord.nativeToken);

  // Get funding amount for this network
  const fundingAmount = FUNDING_AMOUNTS[currentNetwork];
  if (!fundingAmount) {
    throw new Error(`No funding amount configured for network: ${currentNetwork}`);
  }

  const amountWei = parseEther(fundingAmount);
  console.log("\nFunding amount:", fundingAmount, deploymentRecord.nativeToken);
  console.log("Amount in wei:", amountWei.toString());

  // Check if deployer has enough balance
  if (deployerBal < amountWei) {
    throw new Error(`Insufficient balance. Need ${fundingAmount} ${deploymentRecord.nativeToken}, have ${(Number(deployerBal) / 1e18).toFixed(6)}`);
  }

  // Get Treasury balance before funding
  const treasuryBalBefore = await publicClient.getBalance({ 
    address: deploymentRecord.treasuryAddress as `0x${string}` 
  });
  console.log("\nTreasury balance before:", (Number(treasuryBalBefore) / 1e18).toFixed(6), deploymentRecord.nativeToken);

  console.log("\n" + "=".repeat(70));
  console.log("SENDING FUNDS TO TREASURY");
  console.log("=".repeat(70));

  // Send funds to Treasury
  const txHash = await deployer.sendTransaction({
    to: deploymentRecord.treasuryAddress as `0x${string}`,
    value: amountWei,
  });

  console.log("✓ Transaction sent:", txHash);
  console.log("  Waiting for confirmation...");

  // Wait for transaction confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  
  console.log("✓ Transaction confirmed!");
  console.log("  Block number:", receipt.blockNumber);
  console.log("  Gas used:", receipt.gasUsed.toString());

  // Get Treasury balance after funding
  const treasuryBalAfter = await publicClient.getBalance({ 
    address: deploymentRecord.treasuryAddress as `0x${string}` 
  });
  console.log("\nTreasury balance after:", (Number(treasuryBalAfter) / 1e18).toFixed(6), deploymentRecord.nativeToken);
  console.log("Increase:", (Number(treasuryBalAfter - treasuryBalBefore) / 1e18).toFixed(6), deploymentRecord.nativeToken);

  // Get deployer balance after
  const deployerBalAfter = await publicClient.getBalance({ address: deployer.account.address });
  console.log("\nDeployer balance after:", (Number(deployerBalAfter) / 1e18).toFixed(6), deploymentRecord.nativeToken);

  console.log("\n" + "=".repeat(70));
  console.log("FUNDING SUMMARY");
  console.log("=".repeat(70));
  console.log("\nNetwork:", deploymentRecord.chainName);
  console.log("Treasury Address:", deploymentRecord.treasuryAddress);
  console.log("Amount Sent:", fundingAmount, deploymentRecord.nativeToken);
  console.log("Transaction Hash:", txHash);
  console.log("Block Number:", receipt.blockNumber);
  console.log("Explorer:", `${deploymentRecord.explorerUrl.replace('/address/', '/tx/')}${txHash}`);

  console.log("\n" + "=".repeat(70));
  console.log("NEXT STEPS");
  console.log("=".repeat(70));
  console.log("\n1. View transaction on explorer:");
  console.log(`   ${deploymentRecord.explorerUrl.replace('/address/', '/tx/')}${txHash}`);
  console.log("\n2. Verify Treasury balance:");
  console.log(`   ${deploymentRecord.explorerUrl}`);
  console.log("\n3. Fund remaining networks:");
  console.log(`   npm run fund:treasuries:all`);
  console.log("\n" + "=".repeat(70) + "\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
