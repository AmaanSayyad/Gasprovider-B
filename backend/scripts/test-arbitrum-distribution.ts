/**
 * Test Arbitrum Sepolia Distribution
 * 
 * This script tests the distribution functionality on Arbitrum Sepolia
 * to verify the gas estimation and ownership fixes
 */

import { ethers } from "ethers";

const ARBITRUM_SEPOLIA_RPC = process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";
const TREASURY_ADDRESS = "0x5b402676535a3ba75c851c14e1e249a4257d2265";
const DISTRIBUTOR_PRIVATE_KEY =
  process.env.DISTRIBUTOR_PRIVATE_KEY ||
  process.env.PRIVATE_KEY ||
  process.env.RELAYER_PRIVATE_KEY;

const TREASURY_ABI = [
  "function owner() external view returns (address)",
  "function distribute(address payable recipient, uint256 amount, bytes32 intentId) external returns (bytes32)",
  "function getNativeBalance() external view returns (uint256)",
];

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("TESTING ARBITRUM SEPOLIA DISTRIBUTION");
  console.log("=".repeat(70));

  if (!DISTRIBUTOR_PRIVATE_KEY || DISTRIBUTOR_PRIVATE_KEY === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.error("❌ DISTRIBUTOR_PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA_RPC, 421614);
  const wallet = new ethers.Wallet(DISTRIBUTOR_PRIVATE_KEY, provider);
  
  console.log("\nDistributor Address:", wallet.address);
  
  // Check wallet balance
  const balance = await provider.getBalance(wallet.address);
  console.log("Distributor Balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.error("❌ Distributor has no ETH for gas fees!");
    console.log("   Get testnet ETH from: https://faucet.quicknode.com/arbitrum/sepolia");
    process.exit(1);
  }

  // Connect to Treasury contract
  const treasury = new ethers.Contract(TREASURY_ADDRESS, TREASURY_ABI, wallet);
  
  console.log("\nTreasury Address:", TREASURY_ADDRESS);
  
  // Check owner
  const owner = await treasury.owner();
  console.log("Treasury Owner:", owner);
  
  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    console.error("❌ Wallet is not the owner of the Treasury!");
    console.log("   Owner:", owner);
    console.log("   Wallet:", wallet.address);
    process.exit(1);
  }
  
  console.log("✅ Wallet is the Treasury owner");
  
  // Check Treasury balance
  const treasuryBalance = await treasury.getNativeBalance();
  console.log("Treasury Balance:", ethers.formatEther(treasuryBalance), "ETH");
  
  if (treasuryBalance === 0n) {
    console.error("❌ Treasury has no ETH to distribute!");
    console.log("   Send ETH to Treasury at:", TREASURY_ADDRESS);
    process.exit(1);
  }

  // Test gas estimation
  console.log("\n" + "=".repeat(70));
  console.log("TESTING GAS ESTIMATION");
  console.log("=".repeat(70));
  
  const testRecipient = "0x71197e7a1CA5A2cb2AD82432B924F69B1E3dB123";
  const testAmount = ethers.parseEther("0.001"); // 0.001 ETH
  const testIntentId = ethers.id("test-intent-" + Date.now());
  
  try {
    const gasEstimate = await treasury.distribute.estimateGas(
      testRecipient,
      testAmount,
      testIntentId
    );
    console.log("✅ Gas estimation successful:", gasEstimate.toString());
  } catch (error: any) {
    console.error("❌ Gas estimation failed:", error.message);
    process.exit(1);
  }

  // Get current gas prices
  const feeData = await provider.getFeeData();
  console.log("\nCurrent Gas Prices:");
  console.log("  maxFeePerGas:", feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, "gwei") + " gwei" : "N/A");
  console.log("  maxPriorityFeePerGas:", feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, "gwei") + " gwei" : "N/A");
  console.log("  gasPrice:", feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, "gwei") + " gwei" : "N/A");

  // Test distribution (dry run - don't actually send)
  console.log("\n" + "=".repeat(70));
  console.log("TEST DISTRIBUTION PARAMETERS");
  console.log("=".repeat(70));
  console.log("\nRecipient:", testRecipient);
  console.log("Amount:", ethers.formatEther(testAmount), "ETH");
  console.log("Intent ID:", testIntentId);
  
  console.log("\n✅ All checks passed! Distribution should work.");
  console.log("\nTo test actual distribution, uncomment the transaction code in this script.");
  
  // Uncomment to actually send a test transaction:
  /*
  console.log("\n" + "=".repeat(70));
  console.log("SENDING TEST DISTRIBUTION");
  console.log("=".repeat(70));
  
  const tx = await treasury.distribute(testRecipient, testAmount, testIntentId);
  console.log("\n✅ Transaction sent:", tx.hash);
  console.log("   Waiting for confirmation...");
  
  const receipt = await tx.wait();
  console.log("✅ Transaction confirmed!");
  console.log("   Block:", receipt.blockNumber);
  console.log("   Gas used:", receipt.gasUsed.toString());
  console.log("   Status:", receipt.status === 1 ? "Success" : "Failed");
  */
  
  console.log("\n" + "=".repeat(70) + "\n");
}

main().catch((error) => {
  console.error("\n❌ Error:", error);
  process.exitCode = 1;
});
