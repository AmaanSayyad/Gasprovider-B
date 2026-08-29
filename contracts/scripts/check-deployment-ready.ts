import { network } from "hardhat";

/**
 * Check if deployment prerequisites are met
 */
async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("CHECKING DEPLOYMENT PREREQUISITES");
  console.log("=".repeat(70));

  try {
    const { viem } = await network.connect();
    const publicClient = await viem.getPublicClient();
    const [deployer] = await viem.getWalletClients();

    const chainId = await publicClient.getChainId();
    console.log("\n✓ Network connection successful");
    console.log("  Chain ID:", chainId);
    console.log("  Network:", chainId === 114 ? "Coston2 Testnet" : "Unknown");

    console.log("\n✓ Wallet configured");
    console.log("  Address:", deployer.account.address);

    const balance = await publicClient.getBalance({ 
      address: deployer.account.address 
    });
    const balanceInFLR = Number(balance) / 1e18;
    
    console.log("\n✓ Balance check");
    console.log("  Balance:", balanceInFLR.toFixed(4), "C2FLR");

    if (balanceInFLR < 1) {
      console.log("\n⚠ WARNING: Low balance!");
      console.log("  You need at least 1 C2FLR for deployment");
      console.log("  Get testnet tokens from: https://faucet.flare.network/");
      console.log("\n" + "=".repeat(70));
      console.log("STATUS: NOT READY - Please fund your wallet");
      console.log("=".repeat(70) + "\n");
      process.exit(1);
    }

    console.log("\n" + "=".repeat(70));
    console.log("STATUS: READY FOR DEPLOYMENT ✓");
    console.log("=".repeat(70));
    console.log("\nYou can now run:");
    console.log("  npx hardhat run scripts/deploy-coston2.ts --network coston2");
    console.log("\n" + "=".repeat(70) + "\n");

  } catch (error: any) {
    console.log("\n✗ Error:", error.message);
    console.log("\n" + "=".repeat(70));
    console.log("STATUS: NOT READY");
    console.log("=".repeat(70));
    console.log("\nPlease check:");
    console.log("  1. PRIVATE_KEY environment variable is set");
    console.log("  2. Network configuration in hardhat.config.ts");
    console.log("  3. Internet connection");
    console.log("\n" + "=".repeat(70) + "\n");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
