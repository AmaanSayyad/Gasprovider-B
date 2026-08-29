import hardhat, { network } from "hardhat";
import type { Address } from "viem";

/**
 * Deploy GasStation to Coston2 Testnet with Flare Integrations
 * 
 * This script deploys mock contracts for testing on Coston2:
 * 1. MockERC20 (USDC)
 * 2. MockWETH (Wrapped FLR)
 * 3. MockSwapRouter (Simple swap simulation)
 * 4. GasStation (Main contract with Flare integrations)
 * 
 * Flare Contract Addresses on Coston2:
 * - FTSO FastUpdater: 0x58fb598EC6DB6901aA6F26a9A2087E9274128E59
 * - FDC Verification: 0x0c13aDA1C7143Cf0a0795FFaB93eEBb6FAD6e4e3
 * - State Connector: 0x0c13aDA1C7143Cf0a0795FFaB93eEBb6FAD6e4e3
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-coston2.ts --network coston2
 */

async function main() {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();

  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYING TO COSTON2 TESTNET");
  console.log("=".repeat(70));
  
  const chainId = await publicClient.getChainId();
  console.log("\nChain ID:", chainId);
  console.log("Deployer:", deployer.account.address);
  
  const deployerBal = await publicClient.getBalance({ address: deployer.account.address });
  console.log("Deployer balance:", (Number(deployerBal) / 1e18).toFixed(4), "C2FLR");
  
  if (chainId !== 114) {
    throw new Error(`Expected Coston2 (chainId 114), got ${chainId}`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("STEP 1: Deploy Mock USDC");
  console.log("=".repeat(70));
  
  // Deploy Mock USDC (6 decimals like real USDC)
  const mockUSDC = await viem.deployContract("MockERC20", ["Mock USDC", "USDC", 6], {
    client: { wallet: deployer },
  });
  console.log("✓ Mock USDC deployed to:", mockUSDC.address);

  console.log("\n" + "=".repeat(70));
  console.log("STEP 2: Deploy Mock WETH (Wrapped FLR)");
  console.log("=".repeat(70));
  
  // Deploy Mock WETH (18 decimals)
  const mockWETH = await viem.deployContract("MockWETH", [], {
    client: { wallet: deployer },
  });
  console.log("✓ Mock WETH deployed to:", mockWETH.address);

  console.log("\n" + "=".repeat(70));
  console.log("STEP 3: Deploy Mock Swap Router");
  console.log("=".repeat(70));
  
  // Deploy Mock Swap Router
  const mockRouter = await viem.deployContract("MockSwapRouter", [mockUSDC.address, mockWETH.address], {
    client: { wallet: deployer },
  });
  console.log("✓ Mock Swap Router deployed to:", mockRouter.address);

  console.log("\n" + "=".repeat(70));
  console.log("STEP 4: Configure Flare Contract Addresses");
  console.log("=".repeat(70));
  
  // Flare contract addresses on Coston2
  const FTSO_FAST_UPDATER = "0x58fb598EC6DB6901aA6F26a9A2087E9274128E59" as Address;
  const FDC_VERIFICATION = "0x0c13aDA1C7143Cf0a0795FFaB93eEBb6FAD6e4e3" as Address;
  
  console.log("FTSO FastUpdater:", FTSO_FAST_UPDATER);
  console.log("FDC Verification:", FDC_VERIFICATION);

  console.log("\n" + "=".repeat(70));
  console.log("STEP 5: Deploy GasStation with Flare Integrations");
  console.log("=".repeat(70));
  
  // Deploy GasStation with mock contracts and Flare integrations
  const poolFee = 3000; // 0.3% fee tier
  const gasStation = await viem.deployContract(
    "GasStation",
    [
      mockUSDC.address, 
      mockRouter.address, 
      mockWETH.address, 
      poolFee,
      FTSO_FAST_UPDATER,
      FDC_VERIFICATION
    ],
    { client: { wallet: deployer } }
  );
  console.log("✓ GasStation deployed to:", gasStation.address);

  console.log("\n" + "=".repeat(70));
  console.log("STEP 6: Configure FAsset Support (Optional)");
  console.log("=".repeat(70));
  
  // Example FAsset addresses on Coston2 (these are placeholders - update with real addresses)
  // Uncomment and update when FAssets are available on Coston2
  /*
  const FBTC_ADDRESS = "0x..." as Address;
  const FXRP_ADDRESS = "0x..." as Address;
  
  console.log("Adding FAsset support...");
  await gasStation.write.addFAsset([FBTC_ADDRESS, "BTC"], { client: { wallet: deployer } });
  console.log("✓ Added FBTC support");
  
  await gasStation.write.addFAsset([FXRP_ADDRESS, "XRP"], { client: { wallet: deployer } });
  console.log("✓ Added FXRP support");
  */
  console.log("⚠ FAsset support not configured (update script with real addresses)");

  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(70));
  console.log("\nContract Addresses:");
  console.log("  Mock USDC:         ", mockUSDC.address);
  console.log("  Mock WETH:         ", mockWETH.address);
  console.log("  Mock Router:       ", mockRouter.address);
  console.log("  GasStation:        ", gasStation.address);
  console.log("\nFlare Integration Addresses:");
  console.log("  FTSO FastUpdater:  ", FTSO_FAST_UPDATER);
  console.log("  FDC Verification:  ", FDC_VERIFICATION);
  
  console.log("\n" + "=".repeat(70));
  console.log("NEXT STEPS");
  console.log("=".repeat(70));
  console.log("\n1. Update backend/.env.flare.local:");
  console.log(`   CONTRACT_ADDRESS_114=${gasStation.address}`);
  console.log(`   FTSO_FAST_UPDATER_ADDRESS=${FTSO_FAST_UPDATER}`);
  console.log(`   FDC_VERIFICATION_ADDRESS=${FDC_VERIFICATION}`);
  console.log("\n2. Mint test USDC tokens:");
  console.log(`   npx hardhat run scripts/mint-test-tokens.ts --network coston2`);
  console.log("\n3. Test FTSO integration:");
  console.log(`   npx hardhat run scripts/test-ftso-coston2.ts --network coston2`);
  console.log("\n4. Test deposit with FDC verification:");
  console.log(`   npx hardhat run scripts/test-deposit-coston2.ts --network coston2`);
  console.log("\n5. View on explorer:");
  console.log(`   https://coston2-explorer.flare.network/address/${gasStation.address}`);
  console.log("\n6. Verify contract:");
  console.log(`   npx hardhat verify --network coston2 ${gasStation.address} \\`);
  console.log(`     "${mockUSDC.address}" "${mockRouter.address}" "${mockWETH.address}" \\`);
  console.log(`     ${poolFee} "${FTSO_FAST_UPDATER}" "${FDC_VERIFICATION}"`);
  console.log("\n" + "=".repeat(70) + "\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
