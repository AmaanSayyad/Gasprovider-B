import hardhat, { network } from "hardhat";
import { ethers } from "ethers";

/**
 * Check Treasury Contract Owner
 * 
 * This script checks the owner of Treasury contracts on all chains
 * to verify ownership configuration
 */

const TREASURY_ADDRESSES: Record<number, string> = {
  114: "0xc031c437d6b915dbdc946dbd8613a1ac9dd75d63",       // Coston2
  11155111: "0x5b402676535a3ba75c851c14e1e249a4257d2265",  // Sepolia
  80002: "0x5b402676535a3ba75c851c14e1e249a4257d2265",     // Polygon Amoy
  421614: "0x5b402676535a3ba75c851c14e1e249a4257d2265",    // Arbitrum Sepolia
  11155420: "0x5b402676535a3ba75c851c14e1e249a4257d2265",  // Optimism Sepolia
  84532: "0x5b402676535a3ba75c851c14e1e249a4257d2265",     // Base Sepolia
  4801: "0x5b402676535a3ba75c851c14e1e249a4257d2265",      // World Sepolia
  999999999: "0x5b402676535a3ba75c851c14e1e249a4257d2265", // Zora Sepolia
  534351: "0x5b402676535a3ba75c851c14e1e249a4257d2265",    // Scroll Sepolia
  43113: "0x5b402676535a3ba75c851c14e1e249a4257d2265",     // Avalanche Fuji
  97: "0x5b402676535a3ba75c851c14e1e249a4257d2265",        // BSC Testnet
};

const CHAIN_NAMES: Record<number, string> = {
  114: "Coston2",
  11155111: "Sepolia",
  80002: "Polygon Amoy",
  421614: "Arbitrum Sepolia",
  11155420: "Optimism Sepolia",
  84532: "Base Sepolia",
  4801: "World Sepolia",
  999999999: "Zora Sepolia",
  534351: "Scroll Sepolia",
  43113: "Avalanche Fuji",
  97: "BSC Testnet",
};

const TREASURY_ABI = [
  "function owner() external view returns (address)",
];

async function main() {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const chainId = await publicClient.getChainId();

  console.log("\n" + "=".repeat(70));
  console.log(`CHECKING TREASURY OWNER ON ${CHAIN_NAMES[chainId] || `CHAIN ${chainId}`}`);
  console.log("=".repeat(70));

  const treasuryAddress = TREASURY_ADDRESSES[chainId];
  if (!treasuryAddress) {
    console.error(`❌ No Treasury address configured for chain ${chainId}`);
    process.exit(1);
  }

  console.log("\nTreasury Address:", treasuryAddress);

  // Check if contract exists
  const code = await publicClient.getCode({ address: treasuryAddress as `0x${string}` });
  if (!code || code === '0x') {
    console.error("❌ No contract found at this address!");
    process.exit(1);
  }

  console.log("✓ Contract exists");

  // Get owner
  try {
    const treasury = await viem.getContractAt("Treasury", treasuryAddress as `0x${string}`);
    const owner = await treasury.read.owner();
    
    console.log("\nContract Owner:", owner);
    
    // Check if owner matches expected deployer
    const expectedOwner = "0x56b9768f769b88c861955ca2ea3ec1f91870d61c";
    if (owner.toLowerCase() === expectedOwner.toLowerCase()) {
      console.log("✅ Owner matches expected deployer address");
    } else {
      console.log("⚠️  Owner does NOT match expected deployer!");
      console.log("   Expected:", expectedOwner);
      console.log("   Actual:  ", owner);
    }

    // Check balance
    const balance = await treasury.read.getNativeBalance();
    console.log("\nTreasury Balance:", ethers.formatEther(balance), CHAIN_NAMES[chainId] === "Coston2" ? "C2FLR" : "ETH");

  } catch (error: any) {
    console.error("❌ Error reading contract:", error.message);
    process.exit(1);
  }

  console.log("\n" + "=".repeat(70) + "\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
